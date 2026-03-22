import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";

function money(val: number | null | undefined): string {
  if (val == null) return "$0";
  return "$" + Math.round(val).toLocaleString();
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
    const [unitsRaw, snapshotsRaw, tenantRates, agingRows, revenueHistory, rentRoll] =
      await Promise.all([
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT *,
            CASE WHEN total_count > 0
              THEN ROUND((occupied_count::numeric / total_count * 100), 1)
              ELSE 0 END as physical_occ_pct,
            (total_count * COALESCE(street_rate, 0)) as gross_potential,
            (occupied_count * COALESCE(actual_avg_rate, street_rate, 0)) as actual_revenue,
            CASE WHEN total_count > 0 AND street_rate > 0
              THEN ROUND((occupied_count * COALESCE(actual_avg_rate, street_rate, 0)) / (total_count * street_rate) * 100, 1)
              ELSE 0 END as economic_occ_pct,
            (total_count - occupied_count) as vacant_count,
            CASE WHEN occupied_count > 0 AND actual_avg_rate > 0 AND street_rate > 0
              THEN ROUND(((street_rate - actual_avg_rate) * occupied_count)::numeric, 2)
              ELSE 0 END as rate_gap_loss,
            CASE WHEN total_count > 0
              THEN ROUND(((total_count - occupied_count)::numeric / total_count * COALESCE(street_rate, 0))::numeric, 2)
              ELSE 0 END as vacancy_cost_per_unit_type
          FROM facility_pms_units
          WHERE facility_id = $1::uuid
          ORDER BY sqft ASC NULLS LAST, street_rate ASC`,
          facilityId
        ),
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM facility_pms_snapshots
           WHERE facility_id = $1::uuid
           ORDER BY snapshot_date DESC
           LIMIT 90`,
          facilityId
        ),
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT unit, unit_type, size_label, tenant_name,
            standard_rate, actual_rate, paid_rate, rate_variance,
            discount, discount_desc, days_as_tenant,
            ecri_flag, ecri_suggested, ecri_revenue_lift, moved_in
          FROM facility_pms_tenant_rates
          WHERE facility_id = $1::uuid
          ORDER BY rate_variance ASC`,
          facilityId
        ),
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM facility_pms_aging
           WHERE facility_id = $1::uuid
             AND snapshot_date = (SELECT MAX(snapshot_date) FROM facility_pms_aging WHERE facility_id = $1::uuid)`,
          facilityId
        ),
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM facility_pms_revenue_history
           WHERE facility_id = $1::uuid
           ORDER BY year ASC,
             CASE month
               WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
               WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
               WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
               WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
             END ASC`,
          facilityId
        ),
        db.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT unit, size_label, tenant_name, rent_rate, total_due, days_past_due, paid_thru
           FROM facility_pms_rent_roll
           WHERE facility_id = $1::uuid
             AND snapshot_date = (SELECT MAX(snapshot_date) FROM facility_pms_rent_roll WHERE facility_id = $1::uuid)
           ORDER BY days_past_due DESC`,
          facilityId
        ),
      ]);

    const units = unitsRaw;
    const snapshots = [...snapshotsRaw].reverse();

    const totalUnits = units.reduce(
      (s, u) => s + parseInt(String(u.total_count || 0)),
      0
    );
    const totalOccupied = units.reduce(
      (s, u) => s + parseInt(String(u.occupied_count || 0)),
      0
    );
    const totalVacant = totalUnits - totalOccupied;
    const physicalOccPct =
      totalUnits > 0
        ? Math.round((totalOccupied / totalUnits) * 1000) / 10
        : 0;

    const totalGrossPotential = units.reduce(
      (s, u) => s + parseFloat(String(u.gross_potential || 0)),
      0
    );
    const totalActualRevenue = units.reduce(
      (s, u) => s + parseFloat(String(u.actual_revenue || 0)),
      0
    );
    const economicOccPct =
      totalGrossPotential > 0
        ? Math.round((totalActualRevenue / totalGrossPotential) * 1000) / 10
        : 0;
    const occupancyGap =
      Math.round((physicalOccPct - economicOccPct) * 10) / 10;

    const vacancyLoss = units.reduce((s, u) => {
      const vacant =
        parseInt(String(u.total_count || 0)) -
        parseInt(String(u.occupied_count || 0));
      return s + vacant * parseFloat(String(u.street_rate || 0));
    }, 0);
    const vacancyDragPct =
      totalGrossPotential > 0
        ? Math.round((vacancyLoss / totalGrossPotential) * 1000) / 10
        : 0;

    const totalRateGapLoss = tenantRates.reduce((s, t) => {
      const variance = parseFloat(String(t.rate_variance || 0));
      return variance < 0 ? s + Math.abs(variance) : s;
    }, 0);
    const rateGapDragPct =
      totalGrossPotential > 0
        ? Math.round((totalRateGapLoss / totalGrossPotential) * 1000) / 10
        : 0;

    const totalDiscountDrag = tenantRates.reduce(
      (s, t) => s + parseFloat(String(t.discount || 0)),
      0
    );
    const discountDragPct =
      totalGrossPotential > 0
        ? Math.round((totalDiscountDrag / totalGrossPotential) * 1000) / 10
        : 0;

    const totalDelinquent = agingRows.reduce(
      (s, r) => s + parseFloat(String(r.total || 0)),
      0
    );
    const delinquencyDragPct =
      totalGrossPotential > 0
        ? Math.round((totalDelinquent / totalGrossPotential) * 1000) / 10
        : 0;

    const agingBuckets = {
      current: agingRows.reduce(
        (s, r) => s + parseFloat(String(r.bucket_0_30 || 0)),
        0
      ),
      days_31_60: agingRows.reduce(
        (s, r) => s + parseFloat(String(r.bucket_31_60 || 0)),
        0
      ),
      days_61_90: agingRows.reduce(
        (s, r) => s + parseFloat(String(r.bucket_61_90 || 0)),
        0
      ),
      days_91_120: agingRows.reduce(
        (s, r) => s + parseFloat(String(r.bucket_91_120 || 0)),
        0
      ),
      days_120_plus: agingRows.reduce(
        (s, r) => s + parseFloat(String(r.bucket_120_plus || 0)),
        0
      ),
      total: totalDelinquent,
      count: agingRows.length,
    };

    const unitOccupancy = units.map((u) => {
      const total = parseInt(String(u.total_count || 0));
      const occupied = parseInt(String(u.occupied_count || 0));
      const vacant = total - occupied;
      const streetRate = parseFloat(String(u.street_rate || 0));
      const avgActual = parseFloat(String(u.actual_avg_rate || 0));
      const physOcc =
        total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0;
      const econOcc = parseFloat(String(u.economic_occ_pct || 0));
      const gap = Math.round((physOcc - econOcc) * 10) / 10;
      const sqft = parseFloat(String(u.sqft || 0));
      const totalSqft = sqft * total;
      const occupiedSqft = sqft * occupied;
      const revenuePerSqft =
        occupiedSqft > 0
          ? Math.round((avgActual / sqft) * 100) / 100
          : 0;
      const potentialPerSqft =
        sqft > 0 ? Math.round((streetRate / sqft) * 100) / 100 : 0;

      let gapSignal = "aligned";
      if (gap > 10) gapSignal = "severe";
      else if (gap > 5) gapSignal = "moderate";
      else if (gap > 2) gapSignal = "mild";

      const rateGap =
        streetRate > 0 && avgActual > 0 ? streetRate - avgActual : 0;
      const rateGapTotal = rateGap > 0 ? rateGap * occupied : 0;

      return {
        unit_type: u.unit_type,
        size_label: u.size_label,
        sqft,
        total_count: total,
        occupied_count: occupied,
        vacant_count: vacant,
        street_rate: streetRate,
        actual_avg_rate: avgActual,
        physical_occ_pct: physOcc,
        economic_occ_pct: econOcc,
        gap,
        gap_signal: gapSignal,
        gross_potential: parseFloat(String(u.gross_potential || 0)),
        actual_revenue: parseFloat(String(u.actual_revenue || 0)),
        vacancy_cost_monthly: vacant * streetRate,
        rate_gap_monthly: rateGapTotal,
        total_sqft: totalSqft,
        occupied_sqft: occupiedSqft,
        revenue_per_sqft: revenuePerSqft,
        potential_per_sqft: potentialPerSqft,
      };
    });

    const occupancyTrend = revenueHistory.map((r) => {
      const revenue = parseFloat(String(r.revenue || 0));
      const moveIns = parseInt(String(r.move_ins || 0));
      const moveOuts = parseInt(String(r.move_outs || 0));
      return {
        year: r.year,
        month: r.month,
        month_short: (String(r.month || "")).slice(0, 3),
        revenue,
        move_ins: moveIns,
        move_outs: moveOuts,
        net_movement: moveIns - moveOuts,
      };
    });

    const snapshotTrend = snapshots.map((s) => ({
      date: s.snapshot_date,
      total_units: parseInt(String(s.total_units || 0)),
      occupied_units: parseInt(String(s.occupied_units || 0)),
      occupancy_pct: parseFloat(String(s.occupancy_pct || 0)),
      total_sqft: parseInt(String(s.total_sqft || 0)),
      occupied_sqft: parseInt(String(s.occupied_sqft || 0)),
      sqft_occupancy_pct:
        parseInt(String(s.total_sqft || 0)) > 0
          ? Math.round(
              (parseInt(String(s.occupied_sqft || 0)) /
                parseInt(String(s.total_sqft || 0))) *
                1000
            ) / 10
          : 0,
      gross_potential: parseFloat(String(s.gross_potential || 0)),
      actual_revenue: parseFloat(String(s.actual_revenue || 0)),
      economic_occ_pct:
        parseFloat(String(s.gross_potential || 0)) > 0
          ? Math.round(
              (parseFloat(String(s.actual_revenue || 0)) /
                parseFloat(String(s.gross_potential || 0))) *
                1000
            ) / 10
          : 0,
    }));

    const discountedTenants = tenantRates
      .filter((t) => parseFloat(String(t.discount || 0)) > 0)
      .map((t) => ({
        unit: t.unit,
        tenant: t.tenant_name,
        unit_type: t.unit_type,
        standard_rate: parseFloat(String(t.standard_rate || 0)),
        actual_rate: parseFloat(String(t.actual_rate || 0)),
        discount: parseFloat(String(t.discount || 0)),
        discount_desc: t.discount_desc,
        days_as_tenant: parseInt(String(t.days_as_tenant || 0)),
      }));

    const belowStreetBands = {
      slight: tenantRates.filter((t) => {
        const v = parseFloat(String(t.rate_variance || 0));
        return v < 0 && v >= -10;
      }),
      moderate: tenantRates.filter((t) => {
        const v = parseFloat(String(t.rate_variance || 0));
        return v < -10 && v >= -30;
      }),
      severe: tenantRates.filter((t) => {
        const v = parseFloat(String(t.rate_variance || 0));
        return v < -30;
      }),
    };

    const totalSqft = units.reduce(
      (s, u) =>
        s +
        parseFloat(String(u.sqft || 0)) *
          parseInt(String(u.total_count || 0)),
      0
    );
    const occupiedSqft = units.reduce(
      (s, u) =>
        s +
        parseFloat(String(u.sqft || 0)) *
          parseInt(String(u.occupied_count || 0)),
      0
    );
    const sqftOccPct =
      totalSqft > 0
        ? Math.round((occupiedSqft / totalSqft) * 1000) / 10
        : 0;

    const totalSqftRevenue = units.reduce((s, u) => {
      const occ = parseInt(String(u.occupied_count || 0));
      const avg = parseFloat(String(u.actual_avg_rate || 0));
      return s + occ * avg;
    }, 0);
    const totalSqftPotential = units.reduce((s, u) => {
      const tot = parseInt(String(u.total_count || 0));
      const street = parseFloat(String(u.street_rate || 0));
      return s + tot * street;
    }, 0);
    const sqftEconOccPct =
      totalSqftPotential > 0
        ? Math.round((totalSqftRevenue / totalSqftPotential) * 1000) / 10
        : 0;

    const delinquentTenants = rentRoll
      .filter((r) => parseInt(String(r.days_past_due || 0)) > 0)
      .map((r) => ({
        unit: r.unit,
        tenant: r.tenant_name,
        size: r.size_label,
        rent_rate: parseFloat(String(r.rent_rate || 0)),
        total_due: parseFloat(String(r.total_due || 0)),
        days_past_due: parseInt(String(r.days_past_due || 0)),
        paid_thru: r.paid_thru,
        risk_level:
          parseInt(String(r.days_past_due || 0)) > 90
            ? "critical"
            : parseInt(String(r.days_past_due || 0)) > 60
              ? "high"
              : parseInt(String(r.days_past_due || 0)) > 30
                ? "moderate"
                : "low",
      }));

    const insights: Array<{
      type: string;
      title: string;
      detail: string;
    }> = [];

    if (occupancyGap > 5) {
      insights.push({
        type: "warning",
        title: `${occupancyGap}pt gap between physical and economic occupancy`,
        detail: `You're ${physicalOccPct}% physically occupied but only capturing ${economicOccPct}% of potential revenue. ${totalRateGapLoss > 0 ? `Rate gaps are costing $${Math.round(totalRateGapLoss)}/mo.` : ""} ${totalDiscountDrag > 0 ? `Discounts are costing $${Math.round(totalDiscountDrag)}/mo.` : ""}`,
      });
    } else if (occupancyGap <= 2 && physicalOccPct >= 85) {
      insights.push({
        type: "success",
        title: "Physical and economic occupancy are well aligned",
        detail: `Only ${occupancyGap}pt gap means you're capturing nearly all potential revenue from occupied units.`,
      });
    }

    if (physicalOccPct >= 93) {
      insights.push({
        type: "opportunity",
        title: "Near-full occupancy — time to push rates",
        detail: `At ${physicalOccPct}% physical occupancy, you have pricing power. Consider raising street rates 3-5% and implementing ECRI on long-tenure tenants.`,
      });
    } else if (physicalOccPct < 80) {
      insights.push({
        type: "warning",
        title: `Physical occupancy at ${physicalOccPct}% — below healthy threshold`,
        detail: `${totalVacant} vacant units cost ${money(vacancyLoss)}/mo. Prioritize move-in specials and web rate optimization.`,
      });
    }

    if (sqftOccPct > physicalOccPct + 3) {
      insights.push({
        type: "info",
        title: "Larger units are filling faster than small units",
        detail: `Sqft occupancy (${sqftOccPct}%) exceeds unit occupancy (${physicalOccPct}%). Smaller units may need targeted promotions.`,
      });
    } else if (sqftOccPct < physicalOccPct - 3) {
      insights.push({
        type: "info",
        title: "Smaller units are filling faster than large units",
        detail: `Unit occupancy (${physicalOccPct}%) exceeds sqft occupancy (${sqftOccPct}%). Larger units may need rate adjustments or specials.`,
      });
    }

    if (belowStreetBands.severe.length > 0) {
      const severeRevLoss = belowStreetBands.severe.reduce(
        (s, t) => s + Math.abs(parseFloat(String(t.rate_variance || 0))),
        0
      );
      insights.push({
        type: "critical",
        title: `${belowStreetBands.severe.length} tenants paying 30%+ below street rate`,
        detail: `These tenants represent $${Math.round(severeRevLoss)}/mo in uncaptured revenue. Immediate ECRI recommended.`,
      });
    }

    const critDelinquent = delinquentTenants.filter(
      (t) => t.risk_level === "critical"
    );
    if (critDelinquent.length > 0) {
      insights.push({
        type: "critical",
        title: `${critDelinquent.length} tenant${critDelinquent.length > 1 ? "s" : ""} 90+ days delinquent`,
        detail:
          "These units are occupied but generating zero revenue. Begin lien/auction process per state regulations.",
      });
    }

    const sizePerformance = unitOccupancy
      .filter((u) => u.total_count > 0)
      .sort((a, b) => b.gap - a.gap);
    if (sizePerformance.length > 0) {
      const worst = sizePerformance[0];
      const best = sizePerformance[sizePerformance.length - 1];
      if (worst.gap > 5) {
        insights.push({
          type: "warning",
          title: `${worst.unit_type} has the largest occupancy gap (${worst.gap}pts)`,
          detail: `${worst.physical_occ_pct}% physical vs ${worst.economic_occ_pct}% economic. Review tenant rates for this unit type.`,
        });
      }
      if (best.gap <= 1 && best.physical_occ_pct >= 90) {
        insights.push({
          type: "success",
          title: `${best.unit_type} is a top performer`,
          detail: `${best.physical_occ_pct}% physical, ${best.economic_occ_pct}% economic — tight alignment and high demand.`,
        });
      }
    }

    return jsonResponse(
      {
        success: true,
        facility_level: {
          total_units: totalUnits,
          occupied_units: totalOccupied,
          vacant_units: totalVacant,
          physical_occ_pct: physicalOccPct,
          economic_occ_pct: economicOccPct,
          occupancy_gap: occupancyGap,
          gross_potential: totalGrossPotential,
          actual_revenue: totalActualRevenue,
          total_sqft: totalSqft,
          occupied_sqft: occupiedSqft,
          sqft_occ_pct: sqftOccPct,
          sqft_econ_occ_pct: sqftEconOccPct,
        },
        gap_decomposition: {
          vacancy_loss: vacancyLoss,
          vacancy_drag_pct: vacancyDragPct,
          rate_gap_loss: totalRateGapLoss,
          rate_gap_drag_pct: rateGapDragPct,
          discount_drag: totalDiscountDrag,
          discount_drag_pct: discountDragPct,
          delinquency_drag: totalDelinquent,
          delinquency_drag_pct: delinquencyDragPct,
          total_drag:
            vacancyLoss +
            totalRateGapLoss +
            totalDiscountDrag +
            totalDelinquent,
        },
        aging_buckets: agingBuckets,
        unit_occupancy: unitOccupancy,
        occupancy_trend: occupancyTrend,
        snapshot_trend: snapshotTrend,
        discounted_tenants: discountedTenants,
        below_street_bands: {
          slight: {
            count: belowStreetBands.slight.length,
            loss: belowStreetBands.slight.reduce(
              (s, t) =>
                s + Math.abs(parseFloat(String(t.rate_variance || 0))),
              0
            ),
          },
          moderate: {
            count: belowStreetBands.moderate.length,
            loss: belowStreetBands.moderate.reduce(
              (s, t) =>
                s + Math.abs(parseFloat(String(t.rate_variance || 0))),
              0
            ),
          },
          severe: {
            count: belowStreetBands.severe.length,
            loss: belowStreetBands.severe.reduce(
              (s, t) =>
                s + Math.abs(parseFloat(String(t.rate_variance || 0))),
              0
            ),
          },
        },
        delinquent_tenants: delinquentTenants,
        insights,
      },
      200,
      origin
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500, origin);
  }
}
