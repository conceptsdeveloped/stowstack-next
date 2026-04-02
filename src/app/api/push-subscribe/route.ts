import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  corsResponse,
  jsonResponse,
  errorResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "push-subscribe");
  if (limited) return limited;
  const origin = request.headers.get("origin");
  const denied = requireAdminKey(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { subscription, userType = "admin", userId } = body || {};

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
      VALUES (${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${userType}, ${userId || null}, ${request.headers.get("user-agent") || null})
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
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "push-subscribe");
  if (limited) return limited;
  const origin = request.headers.get("origin");
  const denied = requireAdminKey(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { endpoint } = body || {};

  if (!endpoint) {
    return errorResponse("endpoint is required", 400, origin);
  }

  try {
    await db.$executeRaw`
      UPDATE push_subscriptions SET active = false WHERE endpoint = ${endpoint}
    `;
    return jsonResponse({ ok: true }, 200, origin);
  } catch {
    return errorResponse("Failed to unsubscribe", 500, origin);
  }
}
