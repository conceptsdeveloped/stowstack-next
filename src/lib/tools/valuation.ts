/**
 * Storage valuation by cap rate — pure logic.   value = NOI / cap rate
 * Solve for whichever of {value, cap, noi} is unknown from the other two.
 */

import { clampPct, nonNeg } from "./format";

export type SolveFor = "value" | "cap" | "noi";

export interface ValuationState {
  solveFor: SolveFor;
  noi: number; // annual
  value: number;
  capPct: number;
  units: number;
  sqft: number;
}

export const VALUATION_DEFAULTS: ValuationState = {
  solveFor: "value",
  noi: 0,
  value: 0,
  capPct: 6.5,
  units: 0,
  sqft: 0,
};

export interface ValuationResult {
  noi: number;
  value: number;
  capPct: number;
  valuePerUnit: number;
  valuePerSqft: number;
  noiMonthly: number;
}

export function deriveValuation(s: ValuationState): ValuationResult {
  const inNoi = nonNeg(s.noi);
  const inValue = nonNeg(s.value);
  const inCap = clampPct(s.capPct);

  let noi = inNoi;
  let value = inValue;
  let capPct = inCap;

  if (s.solveFor === "value") {
    value = inCap > 0 ? inNoi / (inCap / 100) : 0;
  } else if (s.solveFor === "noi") {
    noi = inValue * (inCap / 100);
  } else {
    capPct = inValue > 0 ? (inNoi / inValue) * 100 : 0;
  }

  const units = nonNeg(s.units);
  const sqft = nonNeg(s.sqft);

  return {
    noi,
    value,
    capPct,
    valuePerUnit: units > 0 ? value / units : 0,
    valuePerSqft: sqft > 0 ? value / sqft : 0,
    noiMonthly: noi / 12,
  };
}
