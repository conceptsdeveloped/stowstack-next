/**
 * Concession / "first month free" true-cost for self-storage — pure logic.
 *
 * A move-in concession (free months and/or a temporary discount) is a real
 * giveaway, but its weight depends on how long the tenant stays. Spread the
 * concession over the average length of stay and it's usually a small slice of
 * lifetime revenue — which is the honest way to decide whether to offer it.
 */

import { nonNeg, clampPct } from "./format";
import { usd0, usd2, pct } from "./format";
import type { CsvRow } from "./csv";

export interface ConcessionState {
  moveInsPerMonth: number;
  avgRate: number; // monthly street rate
  freeMonths: number;
  discountPct: number; // additional % off for discountMonths
  discountMonths: number;
  avgStayMonths: number;
}

export const CONCESSION_DEFAULTS: ConcessionState = {
  moveInsPerMonth: 0,
  avgRate: 0,
  freeMonths: 1,
  discountPct: 0,
  discountMonths: 0,
  avgStayMonths: 12,
};

export interface ConcessionResult {
  concessionPerMoveIn: number;
  monthlyConcessionCost: number; // for one month's cohort of move-ins
  annualConcessionCost: number;
  lifetimeRevenuePerTenant: number;
  concessionPctOfLifetime: number;
  effectiveMonthlyRate: number; // rate net of concession spread over the stay
  effectiveDiscountPct: number; // concession as % of full-rate lifetime revenue
}

export function deriveConcession(s: ConcessionState): ConcessionResult {
  const moveIns = nonNeg(s.moveInsPerMonth);
  const avgRate = nonNeg(s.avgRate);
  const freeMonths = nonNeg(s.freeMonths);
  const discountPct = clampPct(s.discountPct) / 100;
  const discountMonths = nonNeg(s.discountMonths);
  const stay = nonNeg(s.avgStayMonths);

  const concessionPerMoveIn =
    freeMonths * avgRate + discountPct * avgRate * discountMonths;

  const monthlyConcessionCost = moveIns * concessionPerMoveIn;
  const annualConcessionCost = monthlyConcessionCost * 12;

  const lifetimeRevenuePerTenant = avgRate * stay;
  const concessionPctOfLifetime =
    lifetimeRevenuePerTenant > 0
      ? (concessionPerMoveIn / lifetimeRevenuePerTenant) * 100
      : 0;

  const effectiveMonthlyRate =
    stay > 0 ? (lifetimeRevenuePerTenant - concessionPerMoveIn) / stay : 0;
  const effectiveDiscountPct = concessionPctOfLifetime;

  return {
    concessionPerMoveIn,
    monthlyConcessionCost,
    annualConcessionCost,
    lifetimeRevenuePerTenant,
    concessionPctOfLifetime,
    effectiveMonthlyRate,
    effectiveDiscountPct,
  };
}

/** Rows for the CSV export. Pure (no DOM) so it can be unit-tested. */
export function buildConcessionCsvRows(
  s: ConcessionState,
  d: ConcessionResult,
): CsvRow[] {
  return [
    ["Metric", "Value"],
    ["Move-ins / month getting the concession", String(Math.round(nonNeg(s.moveInsPerMonth)))],
    ["Average monthly rate", usd0(s.avgRate)],
    ["Free months", String(nonNeg(s.freeMonths))],
    ["Additional discount", pct(clampPct(s.discountPct))],
    ["Discount months", String(nonNeg(s.discountMonths))],
    ["Average length of stay (months)", String(nonNeg(s.avgStayMonths))],
    ["Concession value per move-in", usd2(d.concessionPerMoveIn)],
    ["Concession cost / month (cohort)", usd0(d.monthlyConcessionCost)],
    ["Concession cost / year", usd0(d.annualConcessionCost)],
    ["Lifetime revenue per tenant", usd0(d.lifetimeRevenuePerTenant)],
    ["Concession as % of lifetime revenue", pct(d.concessionPctOfLifetime)],
    ["Effective monthly rate over the stay", usd2(d.effectiveMonthlyRate)],
  ];
}
