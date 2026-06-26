import { describe, it, expect } from "vitest";
import {
  deriveValuation,
  VALUATION_DEFAULTS,
  type ValuationState,
} from "../tools/valuation";

function state(overrides: Partial<ValuationState> = {}): ValuationState {
  return { ...VALUATION_DEFAULTS, ...overrides };
}

describe("deriveValuation", () => {
  it("solves for value from NOI and cap rate", () => {
    // browser-verified: 300,000 / 6.5% = 4,615,385
    const d = deriveValuation(state({ solveFor: "value", noi: 300_000, capPct: 6.5 }));
    expect(Math.round(d.value)).toBe(4_615_385);
    expect(d.noi).toBe(300_000);
    expect(d.capPct).toBe(6.5);
  });

  it("solves for NOI from value and cap rate", () => {
    const d = deriveValuation(state({ solveFor: "noi", value: 5_000_000, capPct: 6 }));
    expect(d.noi).toBe(300_000);
    expect(d.noiMonthly).toBe(25_000);
  });

  it("solves for cap rate from NOI and value", () => {
    const d = deriveValuation(
      state({ solveFor: "cap", noi: 300_000, value: 5_000_000 }),
    );
    expect(d.capPct).toBeCloseTo(6, 5);
  });

  it("computes value per unit and per square foot", () => {
    const d = deriveValuation(
      state({ solveFor: "value", noi: 300_000, capPct: 6, units: 400, sqft: 50_000 }),
    );
    expect(d.value).toBe(5_000_000);
    expect(d.valuePerUnit).toBe(12_500);
    expect(d.valuePerSqft).toBe(100);
  });

  it("guards divide-by-zero when solving for value with no cap rate", () => {
    const d = deriveValuation(state({ solveFor: "value", noi: 300_000, capPct: 0 }));
    expect(d.value).toBe(0);
  });

  it("guards divide-by-zero when solving for cap with no value", () => {
    const d = deriveValuation(state({ solveFor: "cap", noi: 300_000, value: 0 }));
    expect(d.capPct).toBe(0);
  });

  it("returns zero per-unit metrics when units/sqft are absent", () => {
    const d = deriveValuation(state({ solveFor: "value", noi: 300_000, capPct: 6 }));
    expect(d.valuePerUnit).toBe(0);
    expect(d.valuePerSqft).toBe(0);
  });

  it("round-trips: value→cap→value is stable", () => {
    const v = deriveValuation(state({ solveFor: "value", noi: 250_000, capPct: 5.5 }));
    const c = deriveValuation(
      state({ solveFor: "cap", noi: 250_000, value: v.value }),
    );
    expect(c.capPct).toBeCloseTo(5.5, 5);
  });
});
