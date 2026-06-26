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
import { computeEcriForFacility } from "@/lib/ecri";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(
    request,
    RATE_LIMIT_TIERS.AUTHENTICATED,
    "ecri",
  );
  if (limited) return limited;
  const origin = getOrigin(request);
  const denied = await requireAdminKey(request);
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const result = await computeEcriForFacility(facilityId);
    return jsonResponse(result, 200, origin);
  } catch (err) {
    console.error("[ecri] query failed", err);
    return errorResponse("Failed to load ECRI data", 500, origin);
  }
}
