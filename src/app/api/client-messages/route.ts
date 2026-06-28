import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { authenticatePortalRequest } from "@/lib/portal-auth";
import { sendPushToAll } from "@/lib/push";
import { sendEmail, SENDERS, resolveSiteUrl } from "@/lib/email";

/**
 * Two-way messaging (M4). Durable Postgres backend (`client_messages`) behind
 * the finished portal UI — replaces the old ephemeral Redis list (capped 200,
 * lost on eviction). The wire contract is unchanged: messages are
 * `{ id, from: "client"|"admin", text, timestamp }`.
 *
 * Auth is the canonical portal helper: a client is pinned to their own thread;
 * an admin (X-Admin-Key) addresses a thread by passing the client's accessCode.
 */

interface WireMessage {
  id: string;
  from: string;
  text: string;
  timestamp: string;
}

function toWire(row: {
  id: string;
  sender: string;
  body: string;
  created_at: Date;
}): WireMessage {
  return {
    id: row.id,
    from: row.sender,
    text: row.body,
    timestamp: row.created_at.toISOString(),
  };
}

/**
 * Resolve the thread's client id from the scope. A client owns exactly one
 * thread (their own); an admin names the target via accessCode. Returns null if
 * the accessCode doesn't resolve (admin addressing a bad code).
 */
async function resolveThreadClientId(
  scope: { kind: "admin" } | { kind: "client"; clientId: string },
  accessCode: string,
): Promise<string | null> {
  if (scope.kind === "client") return scope.clientId;
  const client = await db.clients.findUnique({
    where: { access_code: accessCode },
    select: { id: true },
  });
  return client?.id ?? null;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-messages");
  if (limited) return limited;
  const origin = getOrigin(req);

  const scope = await authenticatePortalRequest(req);
  if (scope instanceof NextResponse) return scope;

  const accessCode = new URL(req.url).searchParams.get("accessCode") ?? "";
  if (scope.kind === "admin" && !accessCode) {
    return errorResponse("Missing access code", 400, origin);
  }

  const clientId = await resolveThreadClientId(scope, accessCode);
  if (!clientId) return errorResponse("Client not found", 404, origin);

  try {
    const rows = await db.client_messages.findMany({
      where: { client_id: clientId },
      orderBy: { created_at: "asc" },
      take: 500,
      select: { id: true, sender: true, body: true, created_at: true },
    });

    // Mark the other party's messages as read now that this side has loaded the
    // thread (powers unread counts / new-message notifications without changing
    // the wire shape).
    const counterpart = scope.kind === "admin" ? "client" : "admin";
    await db.client_messages.updateMany({
      where: { client_id: clientId, sender: counterpart, read_at: null },
      data: { read_at: new Date() },
    });

    return jsonResponse({ messages: rows.map(toWire) }, 200, origin);
  } catch {
    return errorResponse("Failed to read messages", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-messages");
  if (limited) return limited;
  const origin = getOrigin(req);

  const scope = await authenticatePortalRequest(req);
  if (scope instanceof NextResponse) return scope;

  const accessCode = new URL(req.url).searchParams.get("accessCode") ?? "";
  if (scope.kind === "admin" && !accessCode) {
    return errorResponse("Missing access code", 400, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { text, from } = body as { text?: string; from?: string };

  if (!text || !from) {
    return errorResponse("Missing text or from", 400, origin);
  }
  if (!["client", "admin"].includes(from)) {
    return errorResponse('from must be "client" or "admin"', 400, origin);
  }
  if (text.length > 2000) {
    return errorResponse("Message too long (max 2000 chars)", 400, origin);
  }
  // Only an admin may speak as "admin"; a portal client can only post as a client.
  if (from === "admin" && scope.kind !== "admin") {
    return errorResponse("Unauthorized", 401, origin);
  }
  // A client may only ever post as a client.
  if (scope.kind === "client" && from !== "client") {
    return errorResponse("Unauthorized", 401, origin);
  }

  const clientId = await resolveThreadClientId(scope, accessCode);
  if (!clientId) return errorResponse("Client not found", 404, origin);

  try {
    const row = await db.client_messages.create({
      data: { client_id: clientId, sender: from, body: text.slice(0, 2000) },
      select: { id: true, sender: true, body: true, created_at: true },
    });

    // D6: notify the *recipient* of the new message (fire-and-forget — a
    // notification failure must never fail the send). An admin reply pushes to
    // that one client's devices AND emails the client; a client message pings
    // the admins' devices AND emails the founder inbox. Email is the reliable
    // channel for alpha (push needs an installed PWA almost no one has yet).
    void notifyRecipient(from, clientId, text, row.id);

    return jsonResponse({ success: true, message: toWire(row) }, 200, origin);
  } catch {
    return errorResponse("Failed to send message", 500, origin);
  }
}

/**
 * Notify whoever did NOT send the message, over BOTH channels:
 *   - push (instant, but only reaches an installed+subscribed PWA), and
 *   - email (the reliable channel — for alpha almost no one has the PWA).
 *
 * Best-effort end to end: each channel is independently wrapped so a failure in
 * one (or both) never fails the message POST. `sendPushToAll` no-ops without
 * VAPID keys; `sendEmail` no-ops without RESEND_API_KEY — neither throws.
 *
 * Push is dispatched FIRST and synchronously (before any await) so it fires on
 * the fastest path; the client lookup needed for email follows.
 */
async function notifyRecipient(
  from: string,
  clientId: string,
  text: string,
  messageId: string,
): Promise<void> {
  const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;

  // --- Channel 1: push -----------------------------------------------------
  try {
    if (from === "admin") {
      // Admin replied → notify this client on their own devices.
      await sendPushToAll(
        {
          title: "New message from your StorageAds team",
          body: preview,
          url: "/portal/messages",
          tag: "client-message",
        },
        { userType: "client", userId: clientId },
      );
    } else {
      // Client wrote in → notify the admins (no userId filter = all admins).
      await sendPushToAll(
        {
          title: "New client message",
          body: preview,
          url: "/admin/messages",
          tag: "admin-client-message",
        },
        { userType: "admin" },
      );
    }
  } catch (err) {
    console.error("[client-messages] push notify failed:", err);
  }

  // --- Channel 2: email ----------------------------------------------------
  try {
    const client = await db.clients.findUnique({
      where: { id: clientId },
      select: { email: true, name: true, facility_name: true },
    });
    if (!client) return;

    const who = client.facility_name || client.name || "your facility";
    const siteUrl = resolveSiteUrl();
    // Idempotency-keyed on the message id + direction so a retried POST (ours or
    // Resend's) can never double-send the same notification.
    if (from === "admin") {
      // Admin replied → email the client. Skip if the client has no address.
      if (!client.email) return;
      await sendEmail({
        from: SENDERS.team,
        to: client.email,
        replyTo: process.env.ADMIN_EMAIL || "blake@storageads.com",
        subject: "New message from your StorageAds team",
        idempotencyKey: `msg-notify-client-${messageId}`,
        html: messageEmailHtml({
          heading: `Hi ${client.name || "there"},`,
          intro: "Your StorageAds team just sent you a message:",
          preview,
          ctaLabel: "Open your messages",
          ctaUrl: `${siteUrl}/portal/messages`,
        }),
        text: `Your StorageAds team sent you a message:\n\n"${preview}"\n\nOpen your messages: ${siteUrl}/portal/messages`,
        tags: [{ name: "type", value: "portal-message" }],
      });
    } else {
      // Client wrote in → email the founder inbox; reply-to the client so a
      // direct reply reaches them (the threaded reply still happens in /admin).
      await sendEmail({
        from: SENDERS.notifications,
        to: process.env.ADMIN_EMAIL || "blake@storageads.com",
        replyTo: client.email || undefined,
        subject: `New portal message from ${who}`,
        idempotencyKey: `msg-notify-admin-${messageId}`,
        html: messageEmailHtml({
          heading: `${who} sent a message`,
          intro: client.name ? `From ${client.name}:` : "New client message:",
          preview,
          ctaLabel: "Reply in the inbox",
          ctaUrl: `${siteUrl}/admin/messages`,
        }),
        text: `${who} sent a portal message:\n\n"${preview}"\n\nReply in the inbox: ${siteUrl}/admin/messages`,
        tags: [{ name: "type", value: "admin-client-message" }],
      });
    }
  } catch (err) {
    console.error("[client-messages] email notify failed:", err);
  }
}

/** Minimal light-theme transactional email body (charcoal on cream, no gold). */
function messageEmailHtml(opts: {
  heading: string;
  intro: string;
  preview: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html><body style="margin:0;background:#f7f6f2;padding:24px;font-family:'Helvetica Neue',Arial,sans-serif;color:#26241f;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e6e3da;border-radius:10px;padding:28px;">
    <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#26241f;">${esc(opts.heading)}</p>
    <p style="margin:0 0 8px;font-size:14px;color:#57534a;">${esc(opts.intro)}</p>
    <blockquote style="margin:0 0 20px;padding:12px 16px;background:#f7f6f2;border-left:3px solid #26241f;border-radius:4px;font-size:14px;color:#26241f;">${esc(opts.preview)}</blockquote>
    <a href="${opts.ctaUrl}" style="display:inline-block;background:#26241f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:6px;">${esc(opts.ctaLabel)}</a>
    <p style="margin:24px 0 0;font-size:12px;color:#94908a;">StorageAds &middot; <a href="mailto:blake@storageads.com" style="color:#94908a;">blake@storageads.com</a></p>
  </div>
</body></html>`;
}
