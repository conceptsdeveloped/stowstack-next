/**
 * Break-even occupancy — pure logic.
 *
 * Operating break-even: occupied units whose rent covers operating expenses.
 * All-in break-even: same, but covering operating expenses AND debt service.
 *   units = monthly cost / average monthly rate
 */

import { nonNeg } from "./format";

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
