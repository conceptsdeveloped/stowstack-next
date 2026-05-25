import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCorsHeaders, getOrigin, corsResponse } from "@/lib/api-helpers";

export const revalidate = 60; // cache on the edge for 60s

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/**
 * Public aggregate stats for the marketing homepage. No auth — numbers
 * are already aggregate + non-identifying. Cached for 60s so marketing
 * traffic doesn't hammer the DB.
 *
 * Returns totals + 7-day deltas on count metrics, plus impressionsServed
 * and moveInsAttributed for additional surface area in the §00·NUMBERS
 * strip.
 */
export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [
      adsGenerated,
      adsGenerated7d,
      auditsRun,
      auditsRun7d,
      facilities,
      facilities7d,
      cpmAgg,
      perfAgg,
    ] = await Promise.all([
      db.ad_variations.count(),
      db.ad_variations.count({ where: { created_at: { gte: sevenDaysAgo } } }),
      db.shared_audits.count(),
      db.shared_audits.count({ where: { created_at: { gte: sevenDaysAgo } } }),
      db.facilities.count({ where: { organization_id: { not: null } } }),
      db.facilities.count({
        where: {
          organization_id: { not: null },
          created_at: { gte: sevenDaysAgo },
        },
      }),
      // cost per move-in only where we have move-in data
      db.creative_performance.aggregate({
        _sum: { spend: true, move_ins: true },
        where: { move_ins: { gt: 0 } },
      }),
      // network-wide impressions + move-ins across all creative_performance
      db.creative_performance.aggregate({
        _sum: { impressions: true, move_ins: true },
      }),
    ]);

    const totalSpend = Number(cpmAgg._sum.spend || 0);
    const totalMoveInsForCpm = cpmAgg._sum.move_ins || 0;
    const avgCostPerMoveIn =
      totalMoveInsForCpm > 0 ? Math.round(totalSpend / totalMoveInsForCpm) : null;

    return NextResponse.json(
      {
        adsGenerated,
        adsGenerated7d,
        auditsRun,
        auditsRun7d,
        facilities,
        facilities7d,
        avgCostPerMoveIn,
        impressionsServed: perfAgg._sum.impressions || 0,
        moveInsAttributed: perfAgg._sum.move_ins || 0,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          ...getCorsHeaders(origin),
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load stats" },
      { status: 500, headers: getCorsHeaders(origin) },
    );
  }
}
