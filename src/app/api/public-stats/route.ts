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
 */
export async function GET(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const [
      adsGenerated,
      auditsRun,
      facilities,
      moveInAgg,
    ] = await Promise.all([
      db.ad_variations.count(),
      db.shared_audits.count(),
      db.facilities.count({ where: { organization_id: { not: null } } }),
      // cost per move-in only where we have move-in data
      db.creative_performance.aggregate({
        _sum: { spend: true, move_ins: true },
        where: { move_ins: { gt: 0 } },
      }),
    ]);

    const totalSpend = Number(moveInAgg._sum.spend || 0);
    const totalMoveIns = moveInAgg._sum.move_ins || 0;
    const avgCostPerMoveIn = totalMoveIns > 0 ? Math.round(totalSpend / totalMoveIns) : null;

    return NextResponse.json(
      {
        adsGenerated,
        auditsRun,
        facilities,
        avgCostPerMoveIn,
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
