import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";

function serializeBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = serializeBigInts(v);
    }
    return result;
  }
  return obj;
}

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const denied = requireAdminKey(request);
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const [units, snapshots, tenantRates, revenueHistoryRaw, agingRows] =
      await Promise.all([
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT *,
            (total_count * COALESCE(street_rate, 0)) as gross_potential,
            (occupied_count * COALESCE(actual_avg_rate, street_rate, 0)) as actual_revenue,
            ((total_count - occupied_count) * COALESCE(street_rate, 0)) as lost_revenue,
            CASE WHEN street_rate > 0 AND actual_avg_rate > 0
              THEN ROUND((actual_avg_rate / street_rate * 100)::numeric, 1)
              ELSE NULL END as rate_capture_pct,
            CASE WHEN total_count > 0 AND street_rate > 0
              THEN ROUND((occupied_count * COALESCE(actual_avg_rate, street_rate, 0)) / (total_count * street_rate) * 100, 1)
              ELSE NULL END as economic_occupancy
          FROM facility_pms_units
          WHERE facility_id = $1::uuid
          ORDER BY sqft ASC NULLS LAST, street_rate ASC`,
          facilityId
        ),
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM facility_pms_snapshots
           WHERE facility_id = $1::uuid
           ORDER BY snapshot_date DESC LIMIT 1`,
          facilityId
        ),
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM facility_pms_tenant_rates
           WHERE facility_id = $1::uuid
           ORDER BY rate_variance ASC`,
          facilityId
        ),
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM facility_pms_revenue_history
           WHERE facility_id = $1::uuid
           ORDER BY year DESC,
             CASE month
               WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
               WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
               WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
               WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
             END DESC
           LIMIT 24`,
          facilityId
        ),
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT
            COUNT(*) as delinquent_count,
            SUM(bucket_0_30) as total_0_30,
            SUM(bucket_31_60) as total_31_60,
            SUM(bucket_61_90) as total_61_90,
            SUM(bucket_91_120) as total_91_120,
            SUM(bucket_120_plus) as total_120_plus,
            SUM(total) as total_outstanding,
            COUNT(CASE WHEN move_out_date IS NOT NULL THEN 1 END) as moved_out_count
          FROM facility_pms_aging
          WHERE facility_id = $1::uuid
            AND snapshot_date = (SELECT MAX(snapshot_date) FROM facility_pms_aging WHERE facility_id = $1::uuid)`,
          facilityId
        ),
      ]);

    const snapshot = snapshots[0] || null;
    const revenueHistory = [...revenueHistoryRaw].reverse();
    const agingSummary = agingRows[0] || null;

    const totalGrossPotential = units.reduce(
      (s, u) => s + parseFloat(String(u.gross_potential || 0)),
      0
    );
    const totalActualRevenue = units.reduce(
      (s, u) => s + parseFloat(String(u.actual_revenue || 0)),
      0
    );
    const totalLostRevenue = units.reduce(
      (s, u) => s + parseFloat(String(u.lost_revenue || 0)),
      0
    );
    const overallRevenueCapture =
      totalGrossPotential > 0
        ? Math.round((totalActualRevenue / totalGrossPotential) * 1000) / 10
        : 0;

    const ecriTenants = tenantRates.filter((t) => t.ecri_flag);
    const totalEcriLift = ecriTenants.reduce(
      (s, t) => s + parseFloat(String(t.ecri_revenue_lift || 0)),
      0
    );
    const totalEcriAnnual = totalEcriLift * 12;

    const aboveStreet = tenantRates.filter(
      (t) => parseFloat(String(t.rate_variance)) > 0
    );
    const atStreet = tenantRates.filter(
      (t) => parseFloat(String(t.rate_variance)) === 0
    );
    const belowStreet = tenantRates.filter(
      (t) => parseFloat(String(t.rate_variance)) < 0
    );

    let revenueTrend: number | null = null;
    if (revenueHistory.length >= 2) {
      const recent = parseFloat(
        String(revenueHistory[revenueHistory.length - 1]?.revenue || 0)
      );
      const prior = parseFloat(
        String(revenueHistory[revenueHistory.length - 2]?.revenue || 0)
      );
      if (prior > 0) {
        revenueTrend = Math.round(((recent - prior) / prior) * 1000) / 10;
      }
    }

    const unitIntel = units.map((u) => {
      const streetRate = parseFloat(String(u.street_rate || 0));
      const avgRate = parseFloat(String(u.actual_avg_rate || 0));
      const totalCount = parseInt(String(u.total_count || 0));
      const occupied = parseInt(String(u.occupied_count || 0));
      const vacant = totalCount - occupied;

      let rateSignal = "neutral";
      if (avgRate > streetRate * 1.15) rateSignal = "premium";
      else if (avgRate > streetRate) rateSignal = "above";
      else if (avgRate < streetRate * 0.85) rateSignal = "underpriced";
      else if (avgRate < streetRate) rateSignal = "below";

      let occSignal = "healthy";
      const occPct = totalCount > 0 ? (occupied / totalCount) * 100 : 0;
      if (occPct >= 95) occSignal = "full";
      else if (occPct >= 85) occSignal = "healthy";
      else if (occPct >= 70) occSignal = "moderate";
      else occSignal = "low";

      let action = "";
      if (occSignal === "full" && rateSignal !== "premium")
        action = "Raise rates — near full occupancy";
      else if (occSignal === "low" && rateSignal === "underpriced")
        action = "Run promotion to fill — already priced low";
      else if (occSignal === "low")
        action = "Lower web rate or run special to fill vacancies";
      else if (rateSignal === "underpriced")
        action = "ECRI opportunity — tenants paying well below street";
      else if (rateSignal === "premium" && occSignal === "healthy")
        action = "Strong performance — maintain current strategy";
      else action = "Monitor — performing within range";

      return {
        ...u,
        rate_signal: rateSignal,
        occ_signal: occSignal,
        action,
        vacant_lost_monthly: vacant * streetRate,
        vacant_lost_annual: vacant * streetRate * 12,
      };
    });

    const totalUnits = units.reduce(
      (s, u) => s + parseInt(String(u.total_count || 0)),
      0
    );
    const totalOccupied = units.reduce(
      (s, u) => s + parseInt(String(u.occupied_count || 0)),
      0
    );
    const physicalOccPct =
      totalUnits > 0 ? (totalOccupied / totalUnits) * 100 : 0;

    const occScore = Math.min((physicalOccPct / 0.92) * 100, 100);
    const rateScore = Math.min((overallRevenueCapture / 0.95) * 100, 100);
    const ecriHealthScore =
      tenantRates.length > 0
        ? Math.max(
            0,
            100 - (ecriTenants.length / tenantRates.length) * 100 * 3
          )
        : 80;
    const delinquencyScore =
      agingSummary && totalActualRevenue > 0
        ? Math.max(
            0,
            100 -
              (parseFloat(String(agingSummary.total_outstanding || 0)) /
                totalActualRevenue) *
                100 *
                2
          )
        : 85;
    const trendScore =
      revenueTrend != null
        ? Math.min(100, Math.max(0, 50 + revenueTrend * 5))
        : 50;

    const healthScore = Math.round(
      occScore * 0.3 +
        rateScore * 0.25 +
        ecriHealthScore * 0.15 +
        delinquencyScore * 0.15 +
        trendScore * 0.15
    );

    const healthBreakdown = {
      overall: healthScore,
      occupancy: {
        score: Math.round(occScore),
        weight: 30,
        value: physicalOccPct,
      },
      rate_capture: {
        score: Math.round(rateScore),
        weight: 25,
        value: overallRevenueCapture,
      },
      rate_optimization: {
        score: Math.round(ecriHealthScore),
        weight: 15,
        value: ecriTenants.length,
      },
      delinquency: {
        score: Math.round(delinquencyScore),
        weight: 15,
        value: parseFloat(String(agingSummary?.total_outstanding || 0)),
      },
      trend: {
        score: Math.round(trendScore),
        weight: 15,
        value: revenueTrend,
      },
    };

    const totalRateGap = tenantRates.reduce((s, t) => {
      const v = parseFloat(String(t.rate_variance || 0));
      return v < 0 ? s + Math.abs(v) : s;
    }, 0);
    const delinquencyAmount = parseFloat(
      String(agingSummary?.total_outstanding || 0)
    );

    const waterfall = {
      gross_potential: totalGrossPotential,
      vacancy_loss: totalLostRevenue,
      rate_gap_loss: totalRateGap,
      delinquency_loss: delinquencyAmount,
      net_effective: totalActualRevenue - delinquencyAmount,
      actual_collected: totalActualRevenue,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic unit intel shape from aggregation
    const sqftAnalysis = unitIntel.map((u: any) => {
      const sqft = parseFloat(String(u.sqft || 0));
      const totalSqft = sqft * parseInt(String(u.total_count || 0));
      const occSqft = sqft * parseInt(String(u.occupied_count || 0));
      return {
        unit_type: u.unit_type,
        sqft,
        total_sqft: totalSqft,
        occupied_sqft: occSqft,
        revenue_per_sqft:
          occSqft > 0
            ? Math.round(
                (parseFloat(String(u.actual_revenue || 0)) / occSqft) * 100
              ) / 100
            : 0,
        potential_per_sqft:
          totalSqft > 0
            ? Math.round(
                (parseFloat(String(u.gross_potential || 0)) / totalSqft) * 100
              ) / 100
            : 0,
        street_per_sqft:
          sqft > 0
            ? Math.round(
                (parseFloat(String(u.street_rate || 0)) / sqft) * 100
              ) / 100
            : 0,
        actual_per_sqft:
          sqft > 0 && parseFloat(String(u.actual_avg_rate || 0)) > 0
            ? Math.round(
                (parseFloat(String(u.actual_avg_rate || 0)) / sqft) * 100
              ) / 100
            : 0,
      };
    });

    const MONTHS = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const seasonalPattern = MONTHS.map((month) => {
      const monthData = revenueHistory.filter((r) => r.month === month);
      return {
        month: month.slice(0, 3),
        avg_move_ins:
          monthData.length > 0
            ? Math.round(
                (monthData.reduce(
                  (s, r) => s + Number(r.move_ins || 0),
                  0
                ) /
                  monthData.length) *
                  10
              ) / 10
            : 0,
        avg_move_outs:
          monthData.length > 0
            ? Math.round(
                (monthData.reduce(
                  (s, r) => s + Number(r.move_outs || 0),
                  0
                ) /
                  monthData.length) *
                  10
              ) / 10
            : 0,
        avg_revenue:
          monthData.length > 0
            ? Math.round(
                monthData.reduce(
                  (s, r) => s + parseFloat(String(r.revenue || 0)),
                  0
                ) / monthData.length
              )
            : 0,
        years_of_data: monthData.length,
      };
    });

    const discountedTenants = tenantRates.filter(
      (t) => parseFloat(String(t.discount || 0)) > 0
    );
    const totalDiscountImpact = discountedTenants.reduce(
      (s, t) => s + parseFloat(String(t.discount || 0)),
      0
    );

    return jsonResponse(
      serializeBigInts({
        success: true,
        summary: {
          total_gross_potential: totalGrossPotential,
          total_actual_revenue: totalActualRevenue,
          total_lost_revenue: totalLostRevenue,
          revenue_capture_pct: overallRevenueCapture,
          revenue_trend_pct: revenueTrend,
          ecri_eligible_count: ecriTenants.length,
          ecri_monthly_lift: totalEcriLift,
          ecri_annual_lift: totalEcriAnnual,
          tenants_above_street: aboveStreet.length,
          tenants_at_street: atStreet.length,
          tenants_below_street: belowStreet.length,
          total_tenants_rated: tenantRates.length,
          total_discount_impact: totalDiscountImpact,
          discounted_tenants: discountedTenants.length,
        },
        health: healthBreakdown,
        waterfall,
        sqft_analysis: sqftAnalysis,
        seasonal_pattern: seasonalPattern,
        units: unitIntel,
        snapshot,
        ecri_tenants: ecriTenants,
        rate_distribution: {
          above: aboveStreet.map((t) => ({
            unit: t.unit,
            tenant: t.tenant_name,
            variance: parseFloat(String(t.rate_variance)),
            actual: parseFloat(String(t.actual_rate)),
            standard: parseFloat(String(t.standard_rate)),
            days: t.days_as_tenant,
          })),
          below: belowStreet.map((t) => ({
            unit: t.unit,
            tenant: t.tenant_name,
            variance: parseFloat(String(t.rate_variance)),
            actual: parseFloat(String(t.actual_rate)),
            standard: parseFloat(String(t.standard_rate)),
            days: t.days_as_tenant,
            ecri: t.ecri_flag,
            suggested: parseFloat(String(t.ecri_suggested || 0)),
            lift: parseFloat(String(t.ecri_revenue_lift || 0)),
          })),
        },
        revenue_history: revenueHistory,
        aging: agingSummary,
      }),
      200,
      origin
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500, origin);
  }
}
