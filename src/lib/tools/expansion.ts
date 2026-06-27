/**
 * Expansion / add-units ROI for self-storage — pure logic, no React.
 *
 * You can build N more units. Does the NOI they throw off justify the capex?
 * The development test is yield on cost (stabilized NOI ÷ total cost) versus the
 * cap rate you'd buy at: the spread between them is the value you create per
 * dollar spent. Positive spread = building beats buying.
 */

import { nonNeg, clampPct } from "./format";
import { usd0, pct } from "./format";
import type { CsvRow } from "./csv";

export interface ExpansionState {
  newUnits: number;
  costPerUnit: number; // all-in build cost per unit
  avgRate: number; // expected monthly rate of the new units
  stabilizedOccupancyPct: number;
  opexRatioPct: number; // operating expense as % of gross rent
  capRatePct: number;
}

export const EXPANSION_DEFAULTS: ExpansionState = {
  newUnits: 0,
  costPerUnit: 0,
  avgRate: 0,
  stabilizedOccupancyPct: 90,
  opexRatioPct: 35,
  capRatePct: 6.5,
};

export interface ExpansionResult {
  capex: number;
  occupiedUnits: number;
  grossAnnualRent: number;
  addedNoi: number;
  yieldOnCost: number; // %
  valueCreated: number; // addedNoi / cap
  profitOverCost: number; // valueCreated − capex
  developmentSpread: number; // yieldOnCost − capRate, in points
}

export function deriveExpansion(s: ExpansionState): ExpansionResult {
  const newUnits = nonNeg(s.newUnits);
  const costPerUnit = nonNeg(s.costPerUnit);
  const avgRate = nonNeg(s.avgRate);
  const occ = clampPct(s.stabilizedOccupancyPct) / 100;
  const opexRatio = clampPct(s.opexRatioPct) / 100;
  const cap = clampPct(s.capRatePct);

  const capex = newUnits * costPerUnit;
  const occupiedUnits = newUnits * occ;
  const grossAnnualRent = occupiedUnits * avgRate * 12;
  const addedNoi = grossAnnualRent * (1 - opexRatio);

  const yieldOnCost = capex > 0 ? (addedNoi / capex) * 100 : 0;
  const valueCreated = cap > 0 ? addedNoi / (cap / 100) : 0;
  const profitOverCost = valueCreated - capex;
  const developmentSpread = yieldOnCost - cap;

  return {
    capex,
    occupiedUnits,
    grossAnnualRent,
    addedNoi,
    yieldOnCost,
    valueCreated,
    profitOverCost,
    developmentSpread,
  };
}

/** Rows for the CSV export. Pure (no DOM) so it can be unit-tested. */
export function buildExpansionCsvRows(
  s: ExpansionState,
  d: ExpansionResult,
): CsvRow[] {
  return [
    ["Metric", "Value"],
    ["New units", String(Math.round(nonNeg(s.newUnits)))],
    ["Build cost per unit", usd0(s.costPerUnit)],
    ["Total capex", usd0(d.capex)],
    ["Expected monthly rate", usd0(s.avgRate)],
    ["Stabilized occupancy", pct(clampPct(s.stabilizedOccupancyPct))],
    ["Operating expense ratio", pct(clampPct(s.opexRatioPct))],
    ["Added annual NOI", usd0(d.addedNoi)],
    ["Yield on cost", d.capex > 0 ? pct(d.yieldOnCost) : "n/a"],
    [`Value created @ ${pct(clampPct(s.capRatePct))} cap`, usd0(d.valueCreated)],
    ["Profit over cost", usd0(d.profitOverCost)],
    [
      "Development spread (yield on cost − cap)",
      `${d.developmentSpread.toFixed(2)} pts`,
    ],
  ];
}
