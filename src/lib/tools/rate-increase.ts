/**
 * Existing-customer rate increase (ECRI) impact — pure logic.
 *
 * Conservative model: units vacated because of the increase are assumed to sit
 * empty (no backfill credit), so the net lift is a floor.
 *
 * Break-even churn closed form: staying × newRate = occupied × oldRate
 *   (1 − c)(1 + i) = 1  →  c = i / (1 + i)
 */

import { clampPct, nonNeg } from "./format";

export interface RateIncreaseState {
  occupied: number;
  currentRate: number; // monthly
  increasePct: number;
  churnPct: number;
  capRatePct: number;
}

export const RATE_INCREASE_DEFAULTS: RateIncreaseState = {
  occupied: 0,
  currentRate: 0,
  increasePct: 8,
  churnPct: 4,
  capRatePct: 6.5,
};

export interface RateIncreaseResult {
  newRate: number;
  perUnitIncrease: number;
  staying: number;
  oldMonthlyRev: number;
  newMonthlyRev: number;
  netMonthlyLift: number;
  netAnnualLift: number;
  grossMonthlyLift: number;
  grossAnnualLift: number;
  breakEvenChurnPct: number;
  valueLift: number;
}

export function deriveRateIncrease(s: RateIncreaseState): RateIncreaseResult {
  const occupied = nonNeg(s.occupied);
  const currentRate = nonNeg(s.currentRate);
  const inc = clampPct(s.increasePct);
  const churn = clampPct(s.churnPct);
  const cap = clampPct(s.capRatePct);

  const newRate = currentRate * (1 + inc / 100);
  const perUnitIncrease = newRate - currentRate;
  const staying = occupied * (1 - churn / 100);

  const oldMonthlyRev = occupied * currentRate;
  const newMonthlyRev = staying * newRate; // churned units assumed empty
  const netMonthlyLift = newMonthlyRev - oldMonthlyRev;
  const netAnnualLift = netMonthlyLift * 12;

  const grossMonthlyLift = oldMonthlyRev * (inc / 100); // if nobody left
  const grossAnnualLift = grossMonthlyLift * 12;

  const breakEvenChurnPct = inc > 0 ? (inc / (100 + inc)) * 100 : 0;
  const valueLift = cap > 0 ? netAnnualLift / (cap / 100) : 0;

  return {
    newRate,
    perUnitIncrease,
    staying,
    oldMonthlyRev,
    newMonthlyRev,
    netMonthlyLift,
    netAnnualLift,
    grossMonthlyLift,
    grossAnnualLift,
    breakEvenChurnPct,
    valueLift,
  };
}
