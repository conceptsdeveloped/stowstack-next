import { NextRequest } from "next/server";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { computeEcriPortfolio } from "@/lib/ecri";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(
    request,
    RATE_LIMIT_TIERS.AUTHENTICATED,
    "ecri-portfolio",
  );
  if (limited) return limited;
  const origin = getOrigin(request);
  const denied = await requireAdminKey(request);
  if (denied) return denied;

  try {
    const result = await computeEcriPortfolio();
    return jsonResponse(result, 200, origin);
  } catch (err) {
    console.error("[ecri-portfolio] failed", err);
    return errorResponse("Failed to load ECRI portfolio", 500, origin);
  }
}
