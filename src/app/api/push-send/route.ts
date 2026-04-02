import { NextRequest } from "next/server";
import {
  corsResponse,
  jsonResponse,
  errorResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { sendPushToAll } from "@/lib/push";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "push-send");
  if (limited) return limited;
  const origin = request.headers.get("origin");
  const denied = requireAdminKey(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { title, body: pushBody, url, tag, userType, userId } = body || {};

  if (!title || !pushBody) {
    return errorResponse("title and body are required", 400, origin);
  }

  try {
    await sendPushToAll(
      { title, body: pushBody, url, tag },
      { userType, userId }
    );
    return jsonResponse({ ok: true }, 200, origin);
  } catch {
    return errorResponse(
      "Failed to send push notification",
      500,
      origin
    );
  }
}
