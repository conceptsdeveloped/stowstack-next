import { db } from "@/lib/db";

interface FacilityPerformance {
  facilityId: string;
  facilityName: string;
  location: string;
  periods: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalLeads: number;
  totalMoveIns: number;
  avgCtr: number;
  avgCpl: number | null;
  costPerMoveIn: number | null;
  topAngle: string | null;
  worstAngle: string | null;
}

interface GlobalPerformance {
  facilities: number;
  totalSpend: number;
  avgCtrByAngle: Record<string, number>;
  avgCplByPlatform: Record<string, number>;
  bestPatterns: string[];
  worstPatterns: string[];
}

/**
 * Aggregate performance for a single facility.
 */
export async function aggregateFacilityPerformance(
  facilityId: string,
): Promise<FacilityPerformance | null> {
  const facility = await db.facilities.findUnique({
    where: { id: facilityId },
    select: { name: true, location: true },
  });
  if (!facility) return null;

  const rows = await db.$queryRaw<
    Array<{
      angle: string | null;
      periods: number;
      total_spend: number;
      total_impressions: number;
      total_clicks: number;
      total_leads: number;
      total_move_ins: number;
    }>
  >`
    SELECT
      av.angle,
      COUNT(DISTINCT cp.period)::int as periods,
      SUM(cp.spend)::numeric as total_spend,
      SUM(cp.impressions)::int as total_impressions,
      SUM(cp.clicks)::int as total_clicks,
      SUM(cp.leads)::int as total_leads,
      SUM(cp.move_ins)::int as total_move_ins
    FROM creative_performance cp
    JOIN ad_variations av ON av.id = cp.variation_id
    WHERE cp.facility_id = ${facilityId}::uuid
    GROUP BY av.angle
  `;

  if (rows.length === 0) return null;

  const totalSpend = rows.reduce((s, r) => s + Number(r.total_spend), 0);
  const totalImpressions = rows.reduce((s, r) => s + r.total_impressions, 0);
  const totalClicks = rows.reduce((s, r) => s + r.total_clicks, 0);
  const totalLeads = rows.reduce((s, r) => s + r.total_leads, 0);
  const totalMoveIns = rows.reduce((s, r) => s + r.total_move_ins, 0);
  const periods = Math.max(...rows.map((r) => r.periods));

  // Find best/worst angle by CTR
  const angleCtrs = rows
    .filter((r) => r.total_impressions >= 200 && r.angle)
    .map((r) => ({
      angle: r.angle!,
      ctr: r.total_clicks / r.total_impressions,
    }))
    .sort((a, b) => b.ctr - a.ctr);

  return {
    facilityId,
    facilityName: facility.name,
    location: facility.location,
    periods,
    totalSpend,
    totalImpressions,
    totalClicks,
    totalLeads,
    totalMoveIns,
    avgCtr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    avgCpl: totalLeads > 0 ? totalSpend / totalLeads : null,
    costPerMoveIn: totalMoveIns > 0 ? totalSpend / totalMoveIns : null,
    topAngle: angleCtrs[0]?.angle ?? null,
    worstAngle: angleCtrs.length > 1 ? angleCtrs[angleCtrs.length - 1].angle : null,
  };
}

/**
 * Aggregate cross-facility performance for global synthesis.
 */
export async function aggregateGlobalPerformance(): Promise<GlobalPerformance | null> {
  const angleRows = await db.$queryRaw<
    Array<{
      angle: string;
      total_impressions: number;
      total_clicks: number;
    }>
  >`
    SELECT
      av.angle,
      SUM(cp.impressions)::int as total_impressions,
      SUM(cp.clicks)::int as total_clicks
    FROM creative_performance cp
    JOIN ad_variations av ON av.id = cp.variation_id
    WHERE av.angle IS NOT NULL
    GROUP BY av.angle
    HAVING SUM(cp.impressions) >= 500
  `;

  const platformRows = await db.$queryRaw<
    Array<{
      platform: string;
      total_spend: number;
      total_leads: number;
    }>
  >`
    SELECT
      av.platform,
      SUM(cp.spend)::numeric as total_spend,
      SUM(cp.leads)::int as total_leads
    FROM creative_performance cp
    JOIN ad_variations av ON av.id = cp.variation_id
    GROUP BY av.platform
    HAVING SUM(cp.leads) > 0
  `;

  const facilityCount = await db.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(DISTINCT facility_id)::int as count FROM creative_performance
  `;

  if (angleRows.length === 0) return null;

  const avgCtrByAngle: Record<string, number> = {};
  for (const r of angleRows) {
    avgCtrByAngle[r.angle] = r.total_impressions > 0
      ? parseFloat((r.total_clicks / r.total_impressions).toFixed(4))
      : 0;
  }

  const avgCplByPlatform: Record<string, number> = {};
  for (const r of platformRows) {
    avgCplByPlatform[r.platform] = r.total_leads > 0
      ? parseFloat((Number(r.total_spend) / r.total_leads).toFixed(2))
      : 0;
  }

  const sortedAngles = Object.entries(avgCtrByAngle).sort((a, b) => b[1] - a[1]);
  const bestPatterns = sortedAngles.slice(0, 2).map(([a, ctr]) => `${a} (${(ctr * 100).toFixed(1)}% CTR)`);
  const worstPatterns = sortedAngles.slice(-2).map(([a, ctr]) => `${a} (${(ctr * 100).toFixed(1)}% CTR)`);

  return {
    facilities: facilityCount[0]?.count ?? 0,
    totalSpend: angleRows.reduce((s, r) => s + r.total_clicks, 0), // approximate
    avgCtrByAngle,
    avgCplByPlatform,
    bestPatterns,
    worstPatterns,
  };
}

/**
 * Format global performance data as synthesis input.
 */
export function formatForSynthesis(global: GlobalPerformance): string {
  const lines = [
    `Cross-facility performance data (${global.facilities} facilities):`,
    "",
    "CTR by ad angle:",
    ...Object.entries(global.avgCtrByAngle)
      .sort((a, b) => b[1] - a[1])
      .map(([angle, ctr]) => `  - ${angle}: ${(ctr * 100).toFixed(2)}%`),
    "",
    "Cost per lead by platform:",
    ...Object.entries(global.avgCplByPlatform)
      .map(([platform, cpl]) => `  - ${platform}: $${cpl}`),
    "",
    `Best performing patterns: ${global.bestPatterns.join(", ")}`,
    `Worst performing patterns: ${global.worstPatterns.join(", ")}`,
  ];
  return lines.join("\n");
}
