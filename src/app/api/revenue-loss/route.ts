import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const OCCUPANCY_MID: Record<string, number> = {
  "below-60": 50,
  "60-75": 67.5,
  "75-85": 80,
  "85-95": 90,
  "above-95": 97,
};
const UNIT_COUNTS: Record<string, number> = {
  "under-100": 75,
  "100-300": 200,
  "300-500": 400,
  "500+": 650,
};
const AVG_UNIT_RATE = 125;

function severity(annualLoss: number): string {
  if (annualLoss >= 24000) return "critical";
  if (annualLoss >= 12000) return "high";
  if (annualLoss >= 4000) return "warning";
  return "low";
}

function overallSeverity(total: number): string {
  if (total >= 60000) return "critical";
  if (total >= 30000) return "high";
  if (total >= 12000) return "warning";
  return "moderate";
}

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "revenue-loss");
  if (limited) return limited;
  const origin = getOrigin(request);
  const denied = requireAdminKey(request);
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const [facilityRows, snapshotRows, unitRows, intelRows, tenantRateRows, _revenueHistoryRows, agingRows, specialRows] =
      await Promise.all([
        db.$queryRaw<Record<string, unknown>[]>`SELECT * FROM facilities WHERE id = ${facilityId}`,
        db.$queryRaw<Record<string, unknown>[]>`SELECT * FROM facility_pms_snapshots WHERE facility_id = ${facilityId} ORDER BY snapshot_date DESC LIMIT 3`,
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT *, (total_count - occupied_count) as vacant_count,
            (total_count * COALESCE(street_rate, 0)) as gross_potential,
            ((total_count - occupied_count) * COALESCE(street_rate, 0)) as vacant_lost_monthly
          FROM facility_pms_units WHERE facility_id = ${facilityId} ORDER BY sqft ASC NULLS LAST`,
        db.$queryRaw<Record<string, unknown>[]>`SELECT * FROM facility_market_intel WHERE facility_id = ${facilityId}`,
        db.$queryRaw<Record<string, unknown>[]>`SELECT * FROM facility_pms_tenant_rates WHERE facility_id = ${facilityId} ORDER BY rate_variance ASC`,
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM facility_pms_revenue_history WHERE facility_id = ${facilityId}
           ORDER BY year DESC, CASE month
             WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
             WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
             WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
             WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
           END DESC LIMIT 12`,
        db.$queryRaw<Record<string, unknown>[]>`SELECT * FROM facility_pms_aging WHERE facility_id = ${facilityId} ORDER BY total DESC`,
        db.$queryRaw<Record<string, unknown>[]>`SELECT * FROM facility_pms_specials WHERE facility_id = ${facilityId} AND active = true`,
      ]);

    const facilityRow = facilityRows[0];
    if (!facilityRow) return errorResponse("Facility not found", 404, origin);

    const hasPMS = unitRows.length > 0 && snapshotRows.length > 0;
    const snapshot = snapshotRows[0] || null;
    const intelRow = intelRows[0] || null;
    const competitors = (intelRow?.competitors as unknown[]) || [];
    const demographics = (intelRow?.demographics as Record<string, unknown>) || {};

    let totalUnits: number,
      occupiedUnits: number,
      vacantUnits: number,
      occupancyPct: number,
      avgRate: number,
      grossPotential: number,
      actualRevenue: number;

    if (hasPMS) {
      totalUnits = parseInt(String(snapshot!.total_units || 0));
      occupiedUnits = parseInt(String(snapshot!.occupied_units || 0));
      vacantUnits = totalUnits - occupiedUnits;
      occupancyPct =
        totalUnits > 0
          ? Math.round((occupiedUnits / totalUnits) * 1000) / 10
          : 0;
      const totalOccupied = unitRows.reduce(
        (s, u) => s + parseInt(String(u.occupied_count || 0)),
        0
      );
      avgRate =
        totalOccupied > 0
          ? unitRows.reduce(
              (s, u) =>
                s +
                parseFloat(
                  String(u.actual_avg_rate || u.street_rate || 0)
                ) *
                  parseInt(String(u.occupied_count || 0)),
              0
            ) / totalOccupied
          : AVG_UNIT_RATE;
      grossPotential = unitRows.reduce(
        (s, u) => s + parseFloat(String(u.gross_potential || 0)),
        0
      );
      actualRevenue =
        parseFloat(String(snapshot!.actual_revenue || 0)) ||
        unitRows.reduce(
          (s, u) =>
            s +
            parseFloat(String(u.occupied_count || 0)) *
              parseFloat(
                String(u.actual_avg_rate || u.street_rate || 0)
              ),
          0
        );
    } else {
      const occRange = String(facilityRow.occupancy_range || "75-85");
      occupancyPct = OCCUPANCY_MID[occRange] || 80;
      totalUnits =
        UNIT_COUNTS[String(facilityRow.total_units)] || 200;
      occupiedUnits = Math.round(totalUnits * (occupancyPct / 100));
      vacantUnits = totalUnits - occupiedUnits;
      avgRate = AVG_UNIT_RATE;
      grossPotential = totalUnits * avgRate;
      actualRevenue = occupiedUnits * avgRate;
    }

    // CATEGORY 1: VACANCY DRAG
    let vacancyDetail: Record<string, unknown>;
    if (hasPMS) {
      const unitBreakdown = unitRows
        .filter((u) => parseInt(String(u.vacant_count || 0)) > 0)
        .map((u) => ({
          unitType: u.unit_type,
          sizeLabel: u.size_label,
          vacantCount: parseInt(String(u.vacant_count || 0)),
          streetRate: parseFloat(String(u.street_rate || 0)),
          monthlyLoss:
            parseInt(String(u.vacant_count || 0)) *
            parseFloat(String(u.street_rate || 0)),
        }))
        .sort((a, b) => b.monthlyLoss - a.monthlyLoss);

      const vacancyMonthly = unitBreakdown.reduce(
        (s, u) => s + u.monthlyLoss,
        0
      );
      vacancyDetail = {
        label: "Empty Units Sitting Idle",
        monthlyLoss: Math.round(vacancyMonthly),
        annualLoss: Math.round(vacancyMonthly * 12),
        vacantUnits,
        totalUnits,
        avgRate: Math.round(avgRate),
        unitBreakdown,
        detail:
          vacantUnits === 0
            ? "You're at full occupancy — no vacancy drag. Nice."
            : `You have ${vacantUnits} vacant units across ${unitBreakdown.length} unit types. That's $${Math.round(vacancyMonthly).toLocaleString()}/mo in potential revenue sitting empty.`,
        severity: severity(vacancyMonthly * 12),
      };
    } else {
      const vacancyMonthly = vacantUnits * avgRate;
      vacancyDetail = {
        label: "Empty Units Sitting Idle",
        monthlyLoss: Math.round(vacancyMonthly),
        annualLoss: Math.round(vacancyMonthly * 12),
        vacantUnits,
        totalUnits,
        avgRate: Math.round(avgRate),
        unitBreakdown: [],
        detail: `Estimated ${vacantUnits} vacant units at ~$${avgRate}/mo average rate. That's $${Math.round(vacancyMonthly).toLocaleString()}/mo in lost revenue.`,
        severity: severity(vacancyMonthly * 12),
      };
    }

    // CATEGORY 2: RATE GAP
    let rateGapMonthly = 0;
    let rateGapBreakdown: Record<string, unknown>[] = [];
    const yourAvgRate = Math.round(avgRate);
    let marketAvgRate = yourAvgRate;

    if (hasPMS && tenantRateRows.length > 0) {
      const belowStreet = tenantRateRows.filter(
        (t) => parseFloat(String(t.rate_variance || 0)) < 0
      );
      rateGapMonthly = belowStreet.reduce(
        (s, t) =>
          s + Math.abs(parseFloat(String(t.rate_variance || 0))),
        0
      );
      rateGapBreakdown = unitRows
        .map((u) => {
          const streetRate = parseFloat(String(u.street_rate || 0));
          const actualRate = parseFloat(
            String(u.actual_avg_rate || 0)
          );
          const gap = streetRate - actualRate;
          return {
            unitType: u.unit_type,
            yourRate: Math.round(actualRate),
            streetRate: Math.round(streetRate),
            gap: Math.round(gap),
            occupiedCount: parseInt(String(u.occupied_count || 0)),
            monthlyGap:
              gap > 0
                ? Math.round(
                    gap * parseInt(String(u.occupied_count || 0))
                  )
                : 0,
          };
        })
        .filter((u) => (u.monthlyGap as number) > 0)
        .sort(
          (a, b) => (b.monthlyGap as number) - (a.monthlyGap as number)
        );
    } else if (competitors.length > 0) {
      rateGapMonthly = occupiedUnits * avgRate * 0.08;
      marketAvgRate = Math.round(avgRate * 1.08);
    } else {
      rateGapMonthly = occupiedUnits * avgRate * 0.05;
      marketAvgRate = Math.round(avgRate * 1.05);
    }

    const rateGapDetail = {
      label: "Underpriced vs. Street Rate",
      monthlyLoss: Math.round(rateGapMonthly),
      annualLoss: Math.round(rateGapMonthly * 12),
      yourAvgRate,
      marketAvgRate,
      affectedUnits:
        rateGapBreakdown.length > 0
          ? rateGapBreakdown.reduce(
              (s, u) => s + (u.occupiedCount as number),
              0
            )
          : occupiedUnits,
      unitBreakdown: rateGapBreakdown,
      belowStreetCount: tenantRateRows.filter(
        (t) => parseFloat(String(t.rate_variance || 0)) < 0
      ).length,
      totalTenantsRated: tenantRateRows.length,
      detail:
        rateGapMonthly <= 0
          ? "Your rates are at or above street rate. No rate gap detected."
          : hasPMS
            ? `${rateGapBreakdown.length} unit types have tenants paying below street rate. Total gap: $${Math.round(rateGapMonthly).toLocaleString()}/mo across ${rateGapBreakdown.reduce((s, u) => s + (u.occupiedCount as number), 0)} units.`
            : `Estimated ~${Math.round(((marketAvgRate - yourAvgRate) / yourAvgRate) * 100)}% below market rate. Across ${occupiedUnits} occupied units, that's $${Math.round(rateGapMonthly).toLocaleString()}/mo left on the table.`,
      severity: severity(rateGapMonthly * 12),
    };

    // CATEGORY 3: MARKETING VOID
    const population = parseInt(String(demographics.population || 0));
    const renterPct = parseFloat(String(demographics.renter_pct || 35)) / 100;
    const estimatedSearchVolume =
      population > 0
        ? Math.round(population * 0.015 * (0.5 + renterPct * 0.5))
        : 2000;
    const benchmarkCTR = 0.035;
    const benchmarkLeadRate = 0.08;
    const benchmarkCloseRate = 0.22;
    const benchmarkCPL = 35;

    const missedClicks = Math.round(estimatedSearchVolume * benchmarkCTR);
    const missedLeads = Math.round(missedClicks * benchmarkLeadRate);
    const missedMoveIns = Math.round(missedLeads * benchmarkCloseRate);
    const missedMonthlyRevenue = missedMoveIns * avgRate;
    const suggestedSpend = Math.round(
      (missedLeads / benchmarkLeadRate) * benchmarkCPL * benchmarkLeadRate
    );

    const marketingVoidDetail = {
      label: "Leads You're Not Getting",
      monthlyLoss: Math.round(missedMonthlyRevenue),
      annualLoss: Math.round(missedMonthlyRevenue * 12),
      estimatedSearchVolume,
      missedClicks,
      missedLeads,
      missedMoveIns,
      suggestedMonthlySpend: Math.min(suggestedSpend, 3000),
      benchmarkCPL,
      population,
      renterPct: Math.round(renterPct * 100),
      detail: `An estimated ${estimatedSearchVolume.toLocaleString()} people search for storage in your area monthly. Without ads, you're invisible to them. At industry benchmarks, that's ~${missedMoveIns} move-ins/mo you're missing — $${Math.round(missedMonthlyRevenue).toLocaleString()}/mo in revenue.`,
      severity: severity(missedMonthlyRevenue * 12),
    };

    // CATEGORY 4: COMPETITOR CAPTURE
    const totalCompetitors = competitors.length;
    const activeCompetitors = (competitors as Record<string, unknown>[]).filter(
      (c) =>
        c.website &&
        (Number(c.rating || 0) >= 4.0 || Number(c.reviewCount || 0) >= 50)
    );
    const competitorsTotalReviews = (
      competitors as Record<string, unknown>[]
    ).reduce((s, c) => s + Number(c.reviewCount || 0), 0);
    const facilityReviews = parseInt(String(facilityRow.review_count || 0));
    const facilityRating = parseFloat(String(facilityRow.google_rating || 0));
    const avgCompetitorRating =
      competitors.length > 0
        ? (competitors as Record<string, unknown>[]).reduce(
            (s, c) => s + Number(c.rating || 0),
            0
          ) / competitors.length
        : 0;

    const captureRate =
      activeCompetitors.length > 0
        ? Math.min(activeCompetitors.length * 1.5, vacantUnits * 0.3)
        : 0;
    const competitorMonthly = Math.round(captureRate * avgRate);

    const topCompetitors = [...(competitors as Record<string, unknown>[])]
      .sort((a, b) => Number(b.reviewCount || 0) - Number(a.reviewCount || 0))
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        rating: c.rating,
        reviews: c.reviewCount,
        distance: c.distance_miles
          ? `${Math.round(Number(c.distance_miles) * 10) / 10} mi`
          : null,
        website: !!c.website,
      }));

    const competitorCaptureDetail = {
      label: "Demand Your Competitors Are Taking",
      monthlyLoss: competitorMonthly,
      annualLoss: competitorMonthly * 12,
      totalCompetitors,
      activeCompetitors: activeCompetitors.length,
      competitorsTotalReviews,
      yourReviews: facilityReviews,
      yourRating: facilityRating,
      avgCompetitorRating: Math.round(avgCompetitorRating * 10) / 10,
      reviewGap: competitorsTotalReviews - facilityReviews,
      topCompetitors,
      detail:
        totalCompetitors === 0
          ? "No competitor data available. Run a market scan to see who's capturing demand in your area."
          : `${activeCompetitors.length} of ${totalCompetitors} competitors within range are actively marketing. They have ${competitorsTotalReviews.toLocaleString()} combined reviews vs. your ${facilityReviews}. They're capturing demand you're not competing for.`,
      severity: severity(competitorMonthly * 12),
    };

    // CATEGORY 5: CHURN BLEED
    const moveIns = parseInt(String(snapshot?.move_ins_mtd || 0));
    const moveOuts = parseInt(String(snapshot?.move_outs_mtd || 0));
    const netMovement = moveIns - moveOuts;

    let trendMonths = 0;
    let trendNetTotal = 0;
    if (snapshotRows.length >= 2) {
      snapshotRows.forEach((s) => {
        const mi = parseInt(String(s.move_ins_mtd || 0));
        const mo = parseInt(String(s.move_outs_mtd || 0));
        trendNetTotal += mi - mo;
        trendMonths++;
      });
    }
    const avgMonthlyNet =
      trendMonths > 0 ? trendNetTotal / trendMonths : netMovement;

    let churnMonthly = 0;
    let projectedLoss6mo = 0;
    if (avgMonthlyNet < 0) {
      projectedLoss6mo = Math.round(Math.abs(avgMonthlyNet) * 6);
      churnMonthly = Math.round(Math.abs(avgMonthlyNet) * avgRate);
    }

    const delinquencyTotal = agingRows.reduce(
      (s, a) => s + parseFloat(String(a.total || 0)),
      0
    );
    const delinquencyMonthly = Math.round(delinquencyTotal * 0.4);
    const totalChurnMonthly = churnMonthly + delinquencyMonthly;

    const churnBleedDetail = {
      label: "Churn & Delinquency Bleed",
      monthlyLoss: totalChurnMonthly,
      annualLoss: totalChurnMonthly * 12,
      moveInsThisMonth: moveIns,
      moveOutsThisMonth: moveOuts,
      netMovement,
      avgMonthlyNet: Math.round(avgMonthlyNet * 10) / 10,
      projectedLossUnits6mo: projectedLoss6mo,
      delinquencyTotal: Math.round(delinquencyTotal),
      delinquentTenants: agingRows.length,
      trendMonths,
      detail:
        totalChurnMonthly <= 0
          ? "Positive move-in trend and minimal delinquency. Your retention is solid."
          : netMovement < 0
            ? `${moveOuts} move-outs vs ${moveIns} move-ins this month (net ${netMovement}). At this pace, you'll lose ${projectedLoss6mo} more units in 6 months. ${delinquencyTotal > 0 ? `Plus $${Math.round(delinquencyTotal).toLocaleString()} in outstanding delinquent rent.` : ""}`
            : `Move-in trend is flat/positive, but $${Math.round(delinquencyTotal).toLocaleString()} in delinquent rent across ${agingRows.length} tenants is dragging revenue.`,
      severity: severity(totalChurnMonthly * 12),
    };

    // CATEGORY 6: DISCOUNT DRAG
    const discountedTenants = tenantRateRows.filter(
      (t) => parseFloat(String(t.discount || 0)) > 0
    );
    const totalDiscountImpact = discountedTenants.reduce(
      (s, t) => s + Math.abs(parseFloat(String(t.discount || 0))),
      0
    );
    const activeSpecials = specialRows.length;

    const discountDragDetail = {
      label: "Discount & Promotion Drag",
      monthlyLoss: Math.round(totalDiscountImpact),
      annualLoss: Math.round(totalDiscountImpact * 12),
      discountedTenantCount: discountedTenants.length,
      activeSpecials,
      avgDiscount:
        discountedTenants.length > 0
          ? Math.round(totalDiscountImpact / discountedTenants.length)
          : 0,
      detail:
        totalDiscountImpact <= 0
          ? "No significant discount drag. All tenants are at or near street rate."
          : `${discountedTenants.length} tenants are on discounted rates, costing $${Math.round(totalDiscountImpact).toLocaleString()}/mo. ${activeSpecials} active specials running. Consider sunsetting old promotions for established tenants.`,
      severity: severity(totalDiscountImpact * 12),
    };

    // TOTALS & RECOVERY
    const categories = {
      vacancyDrag: vacancyDetail,
      rateGap: rateGapDetail,
      marketingVoid: marketingVoidDetail,
      competitorCapture: competitorCaptureDetail,
      churnBleed: churnBleedDetail,
      discountDrag: discountDragDetail,
    };

    const totalMonthlyLoss = Object.values(categories).reduce(
      (s, c) => s + Number(c.monthlyLoss || 0),
      0
    );
    const totalAnnualLoss = totalMonthlyLoss * 12;

    const storageadsMonthlyFee = 999;
    const projectedCPL = benchmarkCPL;
    const recommendedSpend = Math.max(
      1000,
      Math.min(3000, Math.round(totalMonthlyLoss * 0.15))
    );
    const projectedLeads = Math.round(recommendedSpend / projectedCPL);
    const projectedMoveIns = Math.round(projectedLeads * benchmarkCloseRate);
    const projectedMonthlyRecovery = projectedMoveIns * avgRate;
    const projectedAnnualRecovery = projectedMonthlyRecovery * 12;
    const projectedROAS =
      storageadsMonthlyFee + recommendedSpend > 0
        ? Math.round(
            (projectedMonthlyRecovery /
              (storageadsMonthlyFee + recommendedSpend)) *
              10
          ) / 10
        : 0;
    const breakevenUnits =
      avgRate > 0
        ? Math.round((storageadsMonthlyFee / avgRate) * 10) / 10
        : 0;

    const recoveryTiers = [1, 3, 5, 10, 15, 20]
      .filter((n) => n <= vacantUnits)
      .map((n) => ({
        unitsFilled: n,
        monthlyRecovery: n * avgRate,
        annualRecovery: n * avgRate * 12,
      }));

    const inactionTimeline: Record<string, unknown>[] = [];
    let runningVacant = vacantUnits;
    let runningLoss = totalMonthlyLoss;
    for (let m = 1; m <= 12; m++) {
      const additionalLoss =
        avgMonthlyNet < 0 ? Math.abs(avgMonthlyNet) : 0.5;
      runningVacant = Math.min(
        totalUnits,
        Math.round(runningVacant + additionalLoss)
      );
      runningLoss =
        runningVacant * avgRate +
        rateGapMonthly +
        competitorMonthly +
        delinquencyMonthly;
      inactionTimeline.push({
        month: m,
        vacantUnits: runningVacant,
        monthlyLoss: Math.round(runningLoss),
        cumulativeLoss: Math.round(runningLoss * m),
      });
    }

    const actionTimeline: Record<string, unknown>[] = [];
    let recoveredUnits = 0;
    for (let m = 1; m <= 12; m++) {
      const fillsThisMonth =
        m <= 1
          ? 0
          : m <= 2
            ? Math.round(projectedMoveIns * 0.5)
            : projectedMoveIns;
      recoveredUnits = Math.min(vacantUnits, recoveredUnits + fillsThisMonth);
      const currentVacant = Math.max(0, vacantUnits - recoveredUnits);
      const storageadsCost = storageadsMonthlyFee + recommendedSpend;
      const netGain = recoveredUnits * avgRate - storageadsCost;
      actionTimeline.push({
        month: m,
        unitsFilled: recoveredUnits,
        vacantRemaining: currentVacant,
        monthlyRevenue: Math.round(recoveredUnits * avgRate),
        storageadsCost,
        netGain: Math.round(netGain),
        cumulativeNetGain: Math.round(
          netGain * m -
            storageadsCost *
              Math.max(0, recoveredUnits > 0 ? 0 : m)
        ),
      });
    }

    return jsonResponse(
      {
        facilityId,
        facilityName: facilityRow.name,
        facilityLocation: facilityRow.location,
        calculatedAt: new Date().toISOString(),
        dataSource: hasPMS ? "pms" : "audit_estimate",
        totalMonthlyLoss: Math.round(totalMonthlyLoss),
        totalAnnualLoss: Math.round(totalAnnualLoss),
        overallSeverity: overallSeverity(totalAnnualLoss),
        snapshot: {
          totalUnits,
          occupiedUnits,
          vacantUnits,
          occupancyPct,
          avgRate: Math.round(avgRate),
          grossPotential: Math.round(grossPotential),
          actualRevenue: Math.round(actualRevenue),
        },
        categories,
        recovery: {
          storageadsPlan: "Growth",
          storageadsMonthlyFee,
          recommendedAdSpend: recommendedSpend,
          totalMonthlyCost: storageadsMonthlyFee + recommendedSpend,
          projectedLeadsPerMonth: projectedLeads,
          projectedMoveInsPerMonth: projectedMoveIns,
          projectedMonthlyRecovery: Math.round(projectedMonthlyRecovery),
          projectedAnnualRecovery: Math.round(projectedAnnualRecovery),
          projectedROAS,
          breakevenUnits,
          breakevenMessage: `You need ${breakevenUnits} move-ins per month to cover StorageAds. We project ${projectedMoveIns}.`,
          timeToFirstLeads: "7 days",
          timeToFirstMoveIn: "14-21 days",
        },
        recoveryTiers,
        inactionTimeline,
        actionTimeline,
        market: {
          population: parseInt(String(demographics.population || 0)),
          medianIncome: parseInt(String(demographics.median_income || 0)),
          renterPct: Math.round(
            parseFloat(String(demographics.renter_pct || 0))
          ),
          competitorCount: totalCompetitors,
          avgCompetitorRating:
            Math.round(avgCompetitorRating * 10) / 10,
          estimatedSearchVolume,
        },
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
