/**
 * Lease-up / months-to-stabilization for self-storage — pure logic, no React.
 *
 * Given where occupancy is today, a monthly gross move-in pace, and a monthly
 * move-out rate, how long until the facility hits its stabilized target? We
 * simulate month by month because churn compounds against a growing occupied
 * base, so there's no clean closed form.
 *
 * Steady state (equilibrium) occupancy is where move-ins equal move-outs:
 *   moveIns = occ * churn  →  occ* = moveIns / churn
 * If that ceiling is below the target, the facility never stabilizes at this
 * pace — we surface that instead of returning a bogus month count.
 */

import { nonNeg, clampPct } from "./format";
import { usd0, pct } from "./format";
import type { CsvRow } from "./csv";

const MAX_MONTHS = 600; // 50 years — a sane simulation ceiling

export interface LeaseUpState {
  totalUnits: number;
  currentOccupied: number;
  targetOccupancyPct: number;
  moveInsPerMonth: number;
  monthlyChurnPct: number; // % of occupied units that move out each month
  avgRate: number; // optional, monthly
}

export const LEASE_UP_DEFAULTS: LeaseUpState = {
  totalUnits: 0,
  currentOccupied: 0,
  targetOccupancyPct: 90,
  moveInsPerMonth: 0,
  monthlyChurnPct: 3,
  avgRate: 0,
};

export interface LeaseUpResult {
  targetUnits: number;
  unitsToFill: number;
  monthsToStabilize: number | null; // null = unreachable at this pace
  reachable: boolean;
  equilibriumUnits: number; // steady-state occupied ceiling
  netFirstMonth: number; // net absorption in month 1
  currentMonthlyRevenue: number;
  targetMonthlyRevenue: number;
  monthlyRevenueGap: number;
}

export function deriveLeaseUp(s: LeaseUpState): LeaseUpResult {
  const totalUnits = Math.round(nonNeg(s.totalUnits));
  const targetPct = clampPct(s.targetOccupancyPct);
  const moveIns = nonNeg(s.moveInsPerMonth);
  const churn = clampPct(s.monthlyChurnPct) / 100;
  const avgRate = nonNeg(s.avgRate);

  const targetUnits = Math.round((totalUnits * targetPct) / 100);
  const rawOccupied = Math.round(nonNeg(s.currentOccupied));
  // Can't occupy more units than exist — but only clamp once we know the total.
  const startOccupied = totalUnits > 0 ? Math.min(rawOccupied, totalUnits) : rawOccupied;
  const unitsToFill = Math.max(0, targetUnits - startOccupied);

  const equilibriumUnits = churn > 0 ? moveIns / churn : Infinity;
  const netFirstMonth = moveIns - startOccupied * churn;

  let monthsToStabilize: number | null = null;
  if (unitsToFill === 0) {
    monthsToStabilize = 0;
  } else if (moveIns > 0 && (churn === 0 || equilibriumUnits >= targetUnits)) {
    let occ = startOccupied;
    for (let m = 1; m <= MAX_MONTHS; m++) {
      occ = Math.min(totalUnits, occ + moveIns - occ * churn);
      if (occ >= targetUnits) {
        monthsToStabilize = m;
        break;
      }
    }
  }

  const reachable = monthsToStabilize !== null;

  const currentMonthlyRevenue = startOccupied * avgRate;
  const targetMonthlyRevenue = targetUnits * avgRate;
  const monthlyRevenueGap = targetMonthlyRevenue - currentMonthlyRevenue;

  return {
    targetUnits,
    unitsToFill,
    monthsToStabilize,
    reachable,
    equilibriumUnits: Number.isFinite(equilibriumUnits) ? equilibriumUnits : 0,
    netFirstMonth,
    currentMonthlyRevenue,
    targetMonthlyRevenue,
    monthlyRevenueGap,
  };
}

/** Rows for the CSV export. Pure (no DOM) so it can be unit-tested. */
export function buildLeaseUpCsvRows(
  s: LeaseUpState,
  d: LeaseUpResult,
): CsvRow[] {
  return [
    ["Metric", "Value"],
    ["Total units", String(Math.round(nonNeg(s.totalUnits)))],
    ["Currently occupied", String(Math.round(nonNeg(s.currentOccupied)))],
    ["Target occupancy", pct(clampPct(s.targetOccupancyPct))],
    ["Target occupied units", String(d.targetUnits)],
    ["Units to fill", String(d.unitsToFill)],
    ["Gross move-ins / month", String(Math.round(nonNeg(s.moveInsPerMonth)))],
    ["Monthly move-out rate", pct(clampPct(s.monthlyChurnPct))],
    ["Net absorption, month 1", d.netFirstMonth.toFixed(1)],
    [
      "Months to stabilization",
      d.reachable ? String(d.monthsToStabilize) : "unreachable at this pace",
    ],
    [
      "Steady-state occupied ceiling",
      d.equilibriumUnits > 0 ? String(Math.round(d.equilibriumUnits)) : "n/a",
    ],
    [
      "Monthly revenue gap to target",
      s.avgRate > 0 ? usd0(d.monthlyRevenueGap) : "n/a",
    ],
  ];
}
