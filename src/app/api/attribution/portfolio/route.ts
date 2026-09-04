import { NextRequest } from "next/server";
import {
  corsResponse,
  errorResponse,
  getOrigin,
  isAdminRequest,
  jsonResponse,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { parseFacilityIds, portfolioAttribution } from "@/lib/attribution/portfolio";

/**
 * Cost per move-in across many facilities in a constant number of queries
 * (MISSION.md s8).
 *
 * Sits beside `/api/attribution` rather than inside it: that route's
 * campaign-cohort join carries a "must not change" note and belongs to the
 * ad-platform integration, and a portfolio owner is a different consumer from a
 * single-facility client anyway.
 *
 * Admin only for now. The natural second caller is an org session scoped to the
 * facilities that org owns — but there are zero organizations in production
 * today, so wiring that would be guessing at a shape nobody has used yet.
 */
export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "attribution-portfolio");
  if (limited) return limited;

  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  const { ids, error } = parseFacilityIds(req.nextUrl.searchParams.get("facilityIds"));
  if (error) return errorResponse(error, 400, origin);

  const startDate =
    req.nextUrl.searchParams.get("startDate") ||
    new Date(Date.now() - 90 * 86_400_000).toISOString().split("T")[0];
  const endDate =
    req.nextUrl.searchParams.get("endDate") || new Date().toISOString().split("T")[0];

  try {
    const { facilities, campaigns, totals } = await portfolioAttribution(ids, startDate, endDate);
    return jsonResponse(
      {
        facilities,
        campaigns,
        totals,
        dateRange: { start: startDate, end: endDate },
        hasData: totals.spend > 0 || totals.leads > 0,
      },
      200,
      origin
    );
  } catch (err) {
    console.error("[attribution/portfolio] failed:", err);
    return errorResponse("Failed to compute portfolio attribution", 500, origin);
  }
}
