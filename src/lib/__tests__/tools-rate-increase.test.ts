import { describe, it, expect } from "vitest";
import {
  deriveRateIncrease,
  RATE_INCREASE_DEFAULTS,
  type RateIncreaseState,
} from "../tools/rate-increase";

function state(overrides: Partial<RateIncreaseState> = {}): RateIncreaseState {
  return { ...RATE_INCREASE_DEFAULTS, ...overrides };
}

describe("deriveRateIncrease", () => {
  it("matches the browser-verified scenario", () => {
    // 300 occupied @ $120, +8%, 4% move-outs, 6.5% cap
    const r = deriveRateIncrease(
      state({ occupied: 300, currentRate: 120, increasePct: 8, churnPct: 4 }),
    );
    expect(r.newRate).toBeCloseTo(129.6, 5);
    expect(r.perUnitIncrease).toBeCloseTo(9.6, 5);
    expect(r.staying).toBeCloseTo(288, 5);
    expect(r.oldMonthlyRev).toBe(36_000);
    expect(r.newMonthlyRev).toBeCloseTo(37_324.8, 4);
    expect(r.netMonthlyLift).toBeCloseTo(1_324.8, 4);
    expect(r.netAnnualLift).toBeCloseTo(15_897.6, 3);
    expect(r.grossAnnualLift).toBeCloseTo(34_560, 5);
    expect(Math.round(r.valueLift)).toBe(244_578);
  });

  it("computes break-even churn as i/(1+i)", () => {
    expect(deriveRateIncrease(state({ increasePct: 8 })).breakEvenChurnPct).toBeCloseTo(
      7.4074,
      3,
    );
    expect(deriveRateIncrease(state({ increasePct: 10 })).breakEvenChurnPct).toBeCloseTo(
      9.0909,
      3,
    );
    expect(deriveRateIncrease(state({ increasePct: 100 })).breakEvenChurnPct).toBe(50);
  });

  it("nets out to zero lift exactly at break-even churn", () => {
    // At i=10%, break-even churn = 9.0909...%
    const churn = (10 / 110) * 100;
    const r = deriveRateIncrease(
      state({ occupied: 100, currentRate: 100, increasePct: 10, churnPct: churn }),
    );
    expect(r.netMonthlyLift).toBeCloseTo(0, 6);
  });

  it("goes negative when churn exceeds break-even", () => {
    const r = deriveRateIncrease(
      state({ occupied: 100, currentRate: 100, increasePct: 5, churnPct: 20 }),
    );
    expect(r.netMonthlyLift).toBeLessThan(0);
  });

  it("reports a zero break-even when there is no increase", () => {
    const r = deriveRateIncrease(
      state({ occupied: 100, currentRate: 100, increasePct: 0, churnPct: 0 }),
    );
    expect(r.breakEvenChurnPct).toBe(0);
    expect(r.netAnnualLift).toBe(0);
  });

  it("loses revenue when tenants churn with no offsetting increase", () => {
    const r = deriveRateIncrease(
      state({ occupied: 100, currentRate: 100, increasePct: 0, churnPct: 4 }),
    );
    expect(r.netAnnualLift).toBe(-4_800); // 4 units lost × $100 × 12
  });

  it("guards value lift when cap rate is zero", () => {
    const r = deriveRateIncrease(
      state({ occupied: 100, currentRate: 100, increasePct: 8, churnPct: 0, capRatePct: 0 }),
    );
    expect(r.valueLift).toBe(0);
  });

  it("treats negative inputs as zero", () => {
    const r = deriveRateIncrease(
      state({ occupied: -50, currentRate: -10, increasePct: 8, churnPct: 4 }),
    );
    expect(r.oldMonthlyRev).toBe(0);
    expect(r.netAnnualLift).toBe(0);
  });
});
