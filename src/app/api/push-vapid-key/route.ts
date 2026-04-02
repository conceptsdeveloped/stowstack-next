import { NextRequest } from "next/server";
import {
  corsResponse,
  jsonResponse,
  errorResponse,
  getOrigin,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_READ, "push-vapid-key");
  if (limited) return limited;

  const origin = getOrigin(req);

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return errorResponse(
      "Push notifications not configured",
      503,
      origin
    );
  }

  return jsonResponse({ publicKey }, 200, origin);
}
