/**
 * Storage valuation by cap rate — pure logic.   value = NOI / cap rate
 * Solve for whichever of {value, cap, noi} is unknown from the other two.
 */

import { clampPct, nonNeg, usd0, usd2, pct } from "./format";
import type { CsvRow } from "./csv";

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

/** Rows for the CSV export. Pure (no DOM) so it can be unit-tested. */
export function buildValuationCsvRows(
  s: ValuationState,
  d: ValuationResult,
): CsvRow[] {
  const solveLabel =
    s.solveFor === "value"
      ? "Facility value"
      : s.solveFor === "cap"
        ? "Cap rate"
        : "Annual NOI";
  return [
    ["Metric", "Value"],
    ["Solving for", solveLabel],
    ["Annual NOI", d.noi > 0 ? usd0(d.noi) : "n/a"],
    ["Cap rate", d.capPct > 0 ? pct(d.capPct) : "n/a"],
    ["Facility value", d.value > 0 ? usd0(d.value) : "n/a"],
    ["Value per unit", s.units > 0 && d.value > 0 ? usd0(d.valuePerUnit) : "n/a"],
    [
      "Value per rentable sq ft",
      s.sqft > 0 && d.value > 0 ? usd2(d.valuePerSqft) : "n/a",
    ],
  ];
}
