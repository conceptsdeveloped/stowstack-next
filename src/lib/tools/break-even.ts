/**
 * Break-even occupancy — pure logic.
 *
 * Operating break-even: occupied units whose rent covers operating expenses.
 * All-in break-even: same, but covering operating expenses AND debt service.
 *   units = monthly cost / average monthly rate
 */

import { nonNeg, usd0, pct } from "./format";
import type { CsvRow } from "./csv";

export interface BreakEvenState {
  totalUnits: number;
  avgRate: number; // monthly
  monthlyOpex: number;
  monthlyDebt: number;
  currentOccupied: number;
}

export const BREAK_EVEN_DEFAULTS: BreakEvenState = {
  totalUnits: 0,
  avgRate: 0,
  monthlyOpex: 0,
  monthlyDebt: 0,
  currentOccupied: 0,
};

export interface BreakEvenResult {
  opBreakEvenUnits: number;
  allInBreakEvenUnits: number;
  opBreakEvenPct: number;
  allInBreakEvenPct: number;
  currentPct: number;
  cushionUnits: number;
  cushionPct: number;
}

export function deriveBreakEven(s: BreakEvenState): BreakEvenResult {
  const totalUnits = nonNeg(s.totalUnits);
  const avgRate = nonNeg(s.avgRate);
  const monthlyOpex = nonNeg(s.monthlyOpex);
  const monthlyDebt = nonNeg(s.monthlyDebt);
  const currentOccupied = nonNeg(s.currentOccupied);

  const opBreakEvenUnits = avgRate > 0 ? monthlyOpex / avgRate : 0;
  const allInBreakEvenUnits =
    avgRate > 0 ? (monthlyOpex + monthlyDebt) / avgRate : 0;

  const opBreakEvenPct =
    totalUnits > 0 ? (opBreakEvenUnits / totalUnits) * 100 : 0;
  const allInBreakEvenPct =
    totalUnits > 0 ? (allInBreakEvenUnits / totalUnits) * 100 : 0;

  const currentPct = totalUnits > 0 ? (currentOccupied / totalUnits) * 100 : 0;
  const cushionUnits = currentOccupied - allInBreakEvenUnits;
  const cushionPct = currentPct - allInBreakEvenPct;

  return {
    opBreakEvenUnits,
    allInBreakEvenUnits,
    opBreakEvenPct,
    allInBreakEvenPct,
    currentPct,
    cushionUnits,
    cushionPct,
  };
}

/** Rows for the CSV export. Pure (no DOM) so it can be unit-tested. */
export function buildBreakEvenCsvRows(
  s: BreakEvenState,
  d: BreakEvenResult,
): CsvRow[] {
  const units = (n: number) => String(Math.ceil(Math.max(0, n)));
  return [
    ["Metric", "Value"],
    ["Total units", String(Math.round(nonNeg(s.totalUnits)))],
    ["Average monthly rate", usd0(s.avgRate)],
    ["Monthly operating expenses", usd0(s.monthlyOpex)],
    ["Monthly debt service", usd0(s.monthlyDebt)],
    ["Operating break-even units", units(d.opBreakEvenUnits)],
    [
      "Operating break-even occupancy",
      s.totalUnits > 0 ? pct(d.opBreakEvenPct) : "n/a",
    ],
    ["All-in break-even units", units(d.allInBreakEvenUnits)],
    [
      "All-in break-even occupancy",
      s.totalUnits > 0 ? pct(d.allInBreakEvenPct) : "n/a",
    ],
    [
      "Currently occupied units",
      s.currentOccupied > 0 ? String(Math.round(nonNeg(s.currentOccupied))) : "n/a",
    ],
    [
      "Current occupancy",
      s.currentOccupied > 0 && s.totalUnits > 0 ? pct(d.currentPct) : "n/a",
    ],
    [
      "Cushion above all-in break-even (units)",
      s.currentOccupied > 0 && s.totalUnits > 0
        ? String(Math.round(d.cushionUnits))
        : "n/a",
    ],
  ];
}
