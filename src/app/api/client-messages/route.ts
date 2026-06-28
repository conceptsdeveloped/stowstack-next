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

    // D6: notify the *recipient* of the new message (fire-and-forget — a push
    // failure must never fail the send). An admin reply pushes to that one
    // client's devices; a client message pings the admins' devices.
    void notifyRecipient(from, clientId, text);

    return jsonResponse({ success: true, message: toWire(row) }, 200, origin);
  } catch {
    return errorResponse("Failed to send message", 500, origin);
  }
}

/**
 * Push the new message to whoever did NOT send it. Best-effort: swallows its own
 * errors so the message POST always succeeds even if push delivery is down or
 * VAPID is unconfigured. `sendPushToAll` is itself a no-op without VAPID keys.
 */
async function notifyRecipient(
  from: string,
  clientId: string,
  text: string,
): Promise<void> {
  const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
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
}
