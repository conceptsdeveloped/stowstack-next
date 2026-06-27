import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  corsResponse,
  jsonResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

/**
 * Client-portal push subscription endpoint. Unlike /api/push-subscribe (which is
 * admin-key gated), this authenticates the same way the rest of the portal does:
 * an access code + email in the request body. Subscriptions land in the shared
 * push_subscriptions table tagged user_type='client', user_id=<client id> so a
 * client can only ever touch their own rows.
 *
 * CSRF: exempted in proxy.ts (credential-in-body, no ambient cookie) — see the
 * isCsrfExempt() note for client-authenticated portal mutations.
 */
async function resolveClient(
  code: string | undefined,
  email: string | undefined
): Promise<{ id: string } | null> {
  const cleanCode = (code || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanCode || !cleanEmail) return null;

  // 4-digit login code → match by email, then resolve the client record.
  if (/^\d{4}$/.test(cleanCode)) {
    const loginCode = await db.portal_login_codes.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" }, code: cleanCode },
    });
    if (!loginCode) return null;
    const client = await db.clients.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      select: { id: true },
    });
    return client ? { id: client.id } : null;
  }

  // Legacy permanent access code → unique lookup + email match.
  const client = await db.clients.findUnique({
    where: { access_code: cleanCode },
    select: { id: true, email: true },
  });
  if (client && client.email.toLowerCase() === cleanEmail) {
    return { id: client.id };
  }
  return null;
}

export async function OPTIONS(request: NextRequest) {
  return corsResponse(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(
    request,
    RATE_LIMIT_TIERS.AUTHENTICATED,
    "portal-push-subscribe"
  );
  if (limited) return limited;
  const origin = request.headers.get("origin");

  const body = await request.json().catch(() => null);
  const { subscription, email, code } = body || {};

  const client = await resolveClient(code, email);
  if (!client) {
    return errorResponse("Invalid access code", 401, origin);
  }

  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return errorResponse("Invalid subscription object", 400, origin);
  }

  try {
    await db.$executeRaw`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_type, user_id, user_agent)
      VALUES (${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${"client"}, ${client.id}, ${request.headers.get("user-agent") || null})
      ON CONFLICT (endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        active = true,
        user_type = EXCLUDED.user_type,
        user_id = EXCLUDED.user_id,
        user_agent = EXCLUDED.user_agent
    `;
    return jsonResponse({ ok: true }, 200, origin);
  } catch {
    return errorResponse("Failed to save subscription", 500, origin);
  }
}

export async function DELETE(request: NextRequest) {
  const limited = await applyRateLimit(
    request,
    RATE_LIMIT_TIERS.AUTHENTICATED,
    "portal-push-subscribe"
  );
  if (limited) return limited;
  const origin = request.headers.get("origin");

  const body = await request.json().catch(() => null);
  const { endpoint, email, code } = body || {};

  const client = await resolveClient(code, email);
  if (!client) {
    return errorResponse("Invalid access code", 401, origin);
  }
  if (!endpoint) {
    return errorResponse("endpoint is required", 400, origin);
  }

  try {
    // Scope the deactivation to this client's own subscription row.
    await db.$executeRaw`
      UPDATE push_subscriptions
      SET active = false
      WHERE endpoint = ${endpoint} AND user_type = ${"client"} AND user_id = ${client.id}
    `;
    return jsonResponse({ ok: true }, 200, origin);
  } catch {
    return errorResponse("Failed to unsubscribe", 500, origin);
  }
}
