import { describe, it, expect } from "vitest";
import {
  deriveBreakEven,
  BREAK_EVEN_DEFAULTS,
  type BreakEvenState,
} from "../tools/break-even";

function state(overrides: Partial<BreakEvenState> = {}): BreakEvenState {
  return { ...BREAK_EVEN_DEFAULTS, ...overrides };
}

describe("deriveBreakEven", () => {
  it("computes operating and all-in break-even units", () => {
    // opex 30,000/mo at $150/unit → 200 units operating
    // + 15,000 debt → 45,000/150 = 300 units all-in
    const d = deriveBreakEven(
      state({ totalUnits: 500, avgRate: 150, monthlyOpex: 30_000, monthlyDebt: 15_000 }),
    );
    expect(d.opBreakEvenUnits).toBe(200);
    expect(d.allInBreakEvenUnits).toBe(300);
    expect(d.opBreakEvenPct).toBe(40);
    expect(d.allInBreakEvenPct).toBe(60);
  });

  it("falls back to operating break-even when there is no debt", () => {
    const d = deriveBreakEven(
      state({ totalUnits: 400, avgRate: 100, monthlyOpex: 20_000, monthlyDebt: 0 }),
    );
    expect(d.opBreakEvenUnits).toBe(200);
    expect(d.allInBreakEvenUnits).toBe(200);
  });

  it("computes a positive cushion above break-even", () => {
    const d = deriveBreakEven(
      state({
        totalUnits: 500,
        avgRate: 150,
        monthlyOpex: 30_000,
        monthlyDebt: 15_000,
        currentOccupied: 420,
      }),
    );
    expect(d.currentPct).toBe(84);
    expect(d.cushionUnits).toBe(120); // 420 - 300
    expect(d.cushionPct).toBe(24); // 84 - 60
  });

  it("computes a negative cushion when below all-in break-even", () => {
    const d = deriveBreakEven(
      state({
        totalUnits: 500,
        avgRate: 150,
        monthlyOpex: 30_000,
        monthlyDebt: 15_000,
        currentOccupied: 250,
      }),
    );
    expect(d.cushionUnits).toBe(-50); // 250 - 300
    expect(d.cushionPct).toBe(-10);
  });

  it("guards divide-by-zero on rate and total units", () => {
    const d = deriveBreakEven(state({ totalUnits: 0, avgRate: 0, monthlyOpex: 10_000 }));
    expect(d.opBreakEvenUnits).toBe(0);
    expect(d.allInBreakEvenUnits).toBe(0);
    expect(d.opBreakEvenPct).toBe(0);
    expect(d.allInBreakEvenPct).toBe(0);
    expect(d.currentPct).toBe(0);
  });

  it("treats negative inputs as zero", () => {
    const d = deriveBreakEven(
      state({ totalUnits: -100, avgRate: -50, monthlyOpex: -1_000, monthlyDebt: -1_000 }),
    );
    expect(d.opBreakEvenUnits).toBe(0);
    expect(d.allInBreakEvenUnits).toBe(0);
  });
});
