import { describe, it, expect } from "vitest";
import {
  deriveExpansion,
  buildExpansionCsvRows,
  EXPANSION_DEFAULTS,
  type ExpansionState,
} from "../tools/expansion";

function state(overrides: Partial<ExpansionState> = {}): ExpansionState {
  return { ...EXPANSION_DEFAULTS, ...overrides };
}

describe("deriveExpansion", () => {
  it("computes capex, added NOI, and yield on cost", () => {
    const d = deriveExpansion(
      state({
        newUnits: 100,
        costPerUnit: 5_000, // capex 500,000
        avgRate: 100,
        stabilizedOccupancyPct: 90, // 90 occupied
        opexRatioPct: 35,
        capRatePct: 6.5,
      }),
    );
    expect(d.capex).toBe(500_000);
    expect(d.occupiedUnits).toBe(90);
    expect(d.grossAnnualRent).toBe(108_000); // 90 * 100 * 12
    expect(d.addedNoi).toBeCloseTo(70_200, 5); // 108,000 * 0.65
    expect(d.yieldOnCost).toBeCloseTo(14.04, 2); // 70,200 / 500,000
  });

  it("computes value created and profit over cost at the cap rate", () => {
    const d = deriveExpansion(
      state({
        newUnits: 100,
        costPerUnit: 5_000,
        avgRate: 100,
        stabilizedOccupancyPct: 90,
        opexRatioPct: 35,
        capRatePct: 6.5,
      }),
    );
    // value = 70,200 / 0.065 = 1,080,000
    expect(Math.round(d.valueCreated)).toBe(1_080_000);
    expect(Math.round(d.profitOverCost)).toBe(580_000);
  });

  it("computes the development spread as yield-on-cost minus cap", () => {
    const d = deriveExpansion(
      state({ newUnits: 100, costPerUnit: 5_000, avgRate: 100, capRatePct: 6.5 }),
    );
    expect(d.developmentSpread).toBeCloseTo(d.yieldOnCost - 6.5, 6);
  });

  it("guards divide-by-zero on capex and cap rate", () => {
    const d = deriveExpansion(
      state({ newUnits: 0, costPerUnit: 0, avgRate: 100, capRatePct: 0 }),
    );
    expect(d.yieldOnCost).toBe(0);
    expect(d.valueCreated).toBe(0);
  });
});

describe("buildExpansionCsvRows", () => {
  it("returns a header row plus key metrics", () => {
    const s = state({ newUnits: 100, costPerUnit: 5_000, avgRate: 100 });
    const rows = buildExpansionCsvRows(s, deriveExpansion(s));
    expect(rows[0]).toEqual(["Metric", "Value"]);
    const labels = rows.map((r) => r[0]);
    expect(labels).toContain("Yield on cost");
    expect(labels).toContain("Profit over cost");
  });
});
