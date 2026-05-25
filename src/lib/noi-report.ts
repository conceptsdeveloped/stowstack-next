import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type DbExecutor = PrismaClient | Prisma.TransactionClient;

export type ReportPeriod = "weekly" | "monthly";

export interface NOIComputeOptions {
  facilityId: string;
  periodStart: Date;
  periodEnd: Date;
  period: ReportPeriod;
  /** Platform fee in dollars for this period. Defaults to 0 if unknown. */
  platformFee?: number;
}

export interface NOIComputeSourceNotes {
  revenue_source: "pms_snapshots" | "pms_revenue_history" | "unavailable";
  ecri_available: boolean;
  retention_saves_available: boolean;
  marketing_attribution_available: boolean;
  feature_07_pricing_engine: boolean;
}

export interface NOIComputeResult {
  facility_id: string;
  report_period: ReportPeriod;
  period_start: Date;
  period_end: Date;

  total_revenue: number;
  rent_revenue: number;
  fee_revenue: number;
  auction_revenue: number;

  new_move_ins: number;
  move_outs: number;
  net_units: number;

  dynamic_pricing_lift: number;
  ecri_realized_lift: number;
  retention_saves: number;
  retention_saves_value: number;

  marketing_spend: number;
  leads_generated: number;
  attributed_move_ins: number;
  attributed_revenue: number;

  vs_prior_period_revenue_delta: number;
  vs_year_ago_revenue_delta: number;

  estimated_noi_lift: number;
  platform_fee: number;
  net_value_delivered: number;

  pending_approvals: Array<{ type: string; count: number; link: string }>;
  source_notes: NOIComputeSourceNotes;
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v) || 0;
  const obj = v as { toNumber?: () => number };
  if (typeof obj.toNumber === "function") return obj.toNumber();
  return Number(v) || 0;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

/**
 * Compose a single facility's NOI snapshot for a given period. Reads from the
 * existing facility_pms_*, client_campaigns, churn_predictions, moveout_remarketing,
 * and tenants tables. Records in source_notes which feeds were available so the
 * report renderer can disclose data gaps.
 *
 * Roadmap 13 phase 1: pure composition, no source-data writes. Snapshot table
 * acts as a cache.
 */
export async function computeNOIForFacility(
  client: DbExecutor,
  opts: NOIComputeOptions,
): Promise<NOIComputeResult> {
  const { facilityId, periodStart, periodEnd, period } = opts;
  const startStr = ymd(periodStart);
  const endStr = ymd(periodEnd);

  const sourceNotes: NOIComputeSourceNotes = {
    revenue_source: "unavailable",
    ecri_available: false,
    retention_saves_available: false,
    marketing_attribution_available: false,
    feature_07_pricing_engine: false,
  };

  // --- Revenue: prefer daily snapshots, fall back to monthly prorated.
  let totalRevenue = 0;
  const snapshotRevenue = await client.$queryRaw<Array<{ actual_revenue: unknown }>>`
    SELECT actual_revenue FROM facility_pms_snapshots
    WHERE facility_id = ${facilityId}::uuid
      AND snapshot_date BETWEEN ${startStr}::date AND ${endStr}::date
    ORDER BY snapshot_date DESC LIMIT 1
  `;
  if (snapshotRevenue.length && snapshotRevenue[0].actual_revenue !== null) {
    totalRevenue = num(snapshotRevenue[0].actual_revenue);
    sourceNotes.revenue_source = "pms_snapshots";
  } else {
    // Monthly history fallback
    const monthRev = await client.$queryRaw<Array<{ revenue: unknown }>>`
      SELECT revenue FROM facility_pms_revenue_history
      WHERE facility_id = ${facilityId}::uuid
        AND year = ${periodStart.getUTCFullYear()}
        AND month = ${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}
    `;
    if (monthRev.length && monthRev[0].revenue !== null) {
      const monthlyRevenue = num(monthRev[0].revenue);
      // Prorate to period: days_in_period / 30
      const daysInPeriod =
        Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000) +
        1;
      totalRevenue = (monthlyRevenue * daysInPeriod) / 30;
      sourceNotes.revenue_source = "pms_revenue_history";
    }
  }

  // --- Move-ins and move-outs from tenants table (most accurate signal)
  const moveStats = await client.$queryRaw<
    Array<{ move_ins: bigint; move_outs: bigint }>
  >`
    SELECT
      COUNT(*) FILTER (WHERE move_in_date BETWEEN ${startStr}::date AND ${endStr}::date) AS move_ins,
      COUNT(*) FILTER (WHERE moved_out_date BETWEEN ${startStr}::date AND ${endStr}::date) AS move_outs
    FROM tenants WHERE facility_id = ${facilityId}::uuid
  `;
  const newMoveIns = Number(moveStats[0]?.move_ins ?? 0);
  const moveOuts = Number(moveStats[0]?.move_outs ?? 0);

  // --- ECRI realized lift: facility_pms_tenant_rates.ecri_revenue_lift summed
  // where ecri_flag = true and the row was created/updated in this period.
  const ecriRow = await client.$queryRaw<Array<{ ecri_sum: unknown }>>`
    SELECT COALESCE(SUM(ecri_revenue_lift), 0) AS ecri_sum
    FROM facility_pms_tenant_rates
    WHERE facility_id = ${facilityId}::uuid
      AND ecri_flag = true
      AND created_at BETWEEN ${startStr}::date AND (${endStr}::date + INTERVAL '1 day')
  `;
  const ecriRealizedLift = num(ecriRow[0]?.ecri_sum);
  sourceNotes.ecri_available = ecriRealizedLift > 0;

  // --- Retention saves: count moveout_remarketing rows that converted in period.
  const retentionRow = await client.$queryRaw<
    Array<{ saves: bigint; value_sum: unknown }>
  >`
    SELECT COUNT(*) AS saves,
           COALESCE(SUM(COALESCE(t.monthly_rate, 0) * 12), 0) AS value_sum
    FROM moveout_remarketing mr
    LEFT JOIN tenants t ON t.id = mr.new_tenant_id
    WHERE mr.facility_id = ${facilityId}::uuid
      AND mr.converted = true
      AND mr.converted_at BETWEEN ${startStr}::date AND (${endStr}::date + INTERVAL '1 day')
  `;
  const retentionSaves = Number(retentionRow[0]?.saves ?? 0);
  const retentionSavesValue = num(retentionRow[0]?.value_sum);
  sourceNotes.retention_saves_available = retentionSaves > 0;

  // --- Marketing attribution: client_campaigns is per-client per-month. Join via clients.
  let marketingSpend = 0;
  let leadsGenerated = 0;
  let attributedMoveIns = 0;
  let attributedRevenue = 0;

  const monthKey = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}`;
  const campaignRows = await client.$queryRaw<
    Array<{ spend: unknown; leads: bigint; move_ins: bigint; roas: unknown }>
  >`
    SELECT cc.spend, cc.leads, cc.move_ins, cc.roas
    FROM client_campaigns cc
    JOIN clients c ON c.id = cc.client_id
    WHERE c.facility_id = ${facilityId}::uuid AND cc.month = ${monthKey}
  `;
  if (campaignRows.length) {
    for (const row of campaignRows) {
      marketingSpend += num(row.spend);
      leadsGenerated += Number(row.leads ?? 0);
      attributedMoveIns += Number(row.move_ins ?? 0);
      attributedRevenue += num(row.spend) * num(row.roas);
    }
    // Prorate for weekly periods
    if (period === "weekly") {
      const daysInPeriod =
        Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000) +
        1;
      const factor = daysInPeriod / 30;
      marketingSpend *= factor;
      leadsGenerated = Math.round(leadsGenerated * factor);
      attributedMoveIns = Math.round(attributedMoveIns * factor);
      attributedRevenue *= factor;
    }
    sourceNotes.marketing_attribution_available = true;
  }

  // --- Comparisons: prior period and year-ago revenue
  const priorStart = addDays(periodStart, -(period === "weekly" ? 7 : 30));
  const priorEnd = addDays(periodEnd, -(period === "weekly" ? 7 : 30));
  let priorRevenue = 0;
  const priorRev = await client.$queryRaw<Array<{ actual_revenue: unknown }>>`
    SELECT actual_revenue FROM facility_pms_snapshots
    WHERE facility_id = ${facilityId}::uuid
      AND snapshot_date BETWEEN ${ymd(priorStart)}::date AND ${ymd(priorEnd)}::date
    ORDER BY snapshot_date DESC LIMIT 1
  `;
  if (priorRev.length && priorRev[0].actual_revenue !== null) {
    priorRevenue = num(priorRev[0].actual_revenue);
  }

  let yearAgoRevenue = 0;
  const yearAgoStart = new Date(periodStart);
  yearAgoStart.setUTCFullYear(yearAgoStart.getUTCFullYear() - 1);
  const yearAgoEnd = new Date(periodEnd);
  yearAgoEnd.setUTCFullYear(yearAgoEnd.getUTCFullYear() - 1);
  const yearRev = await client.$queryRaw<Array<{ actual_revenue: unknown }>>`
    SELECT actual_revenue FROM facility_pms_snapshots
    WHERE facility_id = ${facilityId}::uuid
      AND snapshot_date BETWEEN ${ymd(yearAgoStart)}::date AND ${ymd(yearAgoEnd)}::date
    ORDER BY snapshot_date DESC LIMIT 1
  `;
  if (yearRev.length && yearRev[0].actual_revenue !== null) {
    yearAgoRevenue = num(yearRev[0].actual_revenue);
  }

  // --- Pending approvals: critical-risk tenants not yet enrolled in retention
  const pendingChurn = await client.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*) AS c FROM churn_predictions
    WHERE facility_id = ${facilityId}::uuid
      AND risk_level IN ('critical', 'high')
      AND retention_status = 'none'
  `;
  const pendingApprovals: Array<{ type: string; count: number; link: string }> = [];
  const highRiskCount = Number(pendingChurn[0]?.c ?? 0);
  if (highRiskCount > 0) {
    pendingApprovals.push({
      type: "high_risk_tenants",
      count: highRiskCount,
      link: `/admin/retention?facility=${facilityId}`,
    });
  }

  // --- Final composition
  const dynamicPricingLift = 0; // file 07 not yet live
  const estimatedNOILift =
    dynamicPricingLift + ecriRealizedLift + retentionSavesValue;
  const platformFee = opts.platformFee ?? 0;
  const netValueDelivered = estimatedNOILift - platformFee - marketingSpend;

  return {
    facility_id: facilityId,
    report_period: period,
    period_start: periodStart,
    period_end: periodEnd,

    total_revenue: totalRevenue,
    rent_revenue: totalRevenue, // V1: no fee/auction split yet
    fee_revenue: 0,
    auction_revenue: 0,

    new_move_ins: newMoveIns,
    move_outs: moveOuts,
    net_units: newMoveIns - moveOuts,

    dynamic_pricing_lift: dynamicPricingLift,
    ecri_realized_lift: ecriRealizedLift,
    retention_saves: retentionSaves,
    retention_saves_value: retentionSavesValue,

    marketing_spend: marketingSpend,
    leads_generated: leadsGenerated,
    attributed_move_ins: attributedMoveIns,
    attributed_revenue: attributedRevenue,

    vs_prior_period_revenue_delta: totalRevenue - priorRevenue,
    vs_year_ago_revenue_delta: totalRevenue - yearAgoRevenue,

    estimated_noi_lift: estimatedNOILift,
    platform_fee: platformFee,
    net_value_delivered: netValueDelivered,

    pending_approvals: pendingApprovals,
    source_notes: sourceNotes,
  };
}

/**
 * Persist a computed NOI snapshot. Idempotent via the unique
 * (facility_id, report_period, period_start) constraint — re-runs overwrite.
 */
export async function persistNOISnapshot(
  client: DbExecutor,
  result: NOIComputeResult,
): Promise<void> {
  await client.$executeRaw`
    INSERT INTO noi_report_snapshots (
      facility_id, report_period, period_start, period_end,
      total_revenue, rent_revenue, fee_revenue, auction_revenue,
      new_move_ins, move_outs, net_units,
      dynamic_pricing_lift, ecri_realized_lift, retention_saves, retention_saves_value,
      marketing_spend, leads_generated, attributed_move_ins, attributed_revenue,
      vs_prior_period_revenue_delta, vs_year_ago_revenue_delta,
      estimated_noi_lift, platform_fee, net_value_delivered,
      pending_approvals, source_notes, computed_at
    ) VALUES (
      ${result.facility_id}::uuid, ${result.report_period}, ${ymd(result.period_start)}::date, ${ymd(result.period_end)}::date,
      ${result.total_revenue}, ${result.rent_revenue}, ${result.fee_revenue}, ${result.auction_revenue},
      ${result.new_move_ins}, ${result.move_outs}, ${result.net_units},
      ${result.dynamic_pricing_lift}, ${result.ecri_realized_lift}, ${result.retention_saves}, ${result.retention_saves_value},
      ${result.marketing_spend}, ${result.leads_generated}, ${result.attributed_move_ins}, ${result.attributed_revenue},
      ${result.vs_prior_period_revenue_delta}, ${result.vs_year_ago_revenue_delta},
      ${result.estimated_noi_lift}, ${result.platform_fee}, ${result.net_value_delivered},
      ${JSON.stringify(result.pending_approvals)}::jsonb, ${JSON.stringify(result.source_notes)}::jsonb, NOW()
    )
    ON CONFLICT (facility_id, report_period, period_start) DO UPDATE SET
      period_end = EXCLUDED.period_end,
      total_revenue = EXCLUDED.total_revenue,
      rent_revenue = EXCLUDED.rent_revenue,
      fee_revenue = EXCLUDED.fee_revenue,
      auction_revenue = EXCLUDED.auction_revenue,
      new_move_ins = EXCLUDED.new_move_ins,
      move_outs = EXCLUDED.move_outs,
      net_units = EXCLUDED.net_units,
      dynamic_pricing_lift = EXCLUDED.dynamic_pricing_lift,
      ecri_realized_lift = EXCLUDED.ecri_realized_lift,
      retention_saves = EXCLUDED.retention_saves,
      retention_saves_value = EXCLUDED.retention_saves_value,
      marketing_spend = EXCLUDED.marketing_spend,
      leads_generated = EXCLUDED.leads_generated,
      attributed_move_ins = EXCLUDED.attributed_move_ins,
      attributed_revenue = EXCLUDED.attributed_revenue,
      vs_prior_period_revenue_delta = EXCLUDED.vs_prior_period_revenue_delta,
      vs_year_ago_revenue_delta = EXCLUDED.vs_year_ago_revenue_delta,
      estimated_noi_lift = EXCLUDED.estimated_noi_lift,
      platform_fee = EXCLUDED.platform_fee,
      net_value_delivered = EXCLUDED.net_value_delivered,
      pending_approvals = EXCLUDED.pending_approvals,
      source_notes = EXCLUDED.source_notes,
      computed_at = NOW()
  `;
}

/**
 * Returns the Monday-Sunday week containing the given date, in UTC.
 */
export function weekRange(asOf: Date): { start: Date; end: Date } {
  const day = asOf.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const offsetToMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate() - offsetToMonday),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start, end };
}

/**
 * Generate and persist this-week NOI snapshots for every facility in the system.
 * Used by the Friday cron and admin-triggered bulk regenerate.
 */
export async function generateWeeklyNOISnapshots(
  client: DbExecutor,
  asOf: Date = new Date(),
): Promise<{ generated: number; errors: number }> {
  const { start, end } = weekRange(asOf);

  const facilities = await client.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM facilities WHERE deleted_at IS NULL
  `;

  let generated = 0;
  let errors = 0;

  for (const f of facilities) {
    try {
      const result = await computeNOIForFacility(client, {
        facilityId: f.id,
        periodStart: start,
        periodEnd: end,
        period: "weekly",
      });
      await persistNOISnapshot(client, result);
      generated++;
    } catch {
      errors++;
    }
  }

  return { generated, errors };
}
