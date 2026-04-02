import { NextRequest } from "next/server";
import { getSession } from "@/lib/session-auth";
import { jsonResponse, errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "auth-me");
  if (limited) return limited;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) {
    return errorResponse("Unauthorized", 401, origin);
  }
  return jsonResponse({ user: session.user, organization: session.organization }, 200, origin);
}
