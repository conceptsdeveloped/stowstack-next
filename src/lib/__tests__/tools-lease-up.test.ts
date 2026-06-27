import { describe, it, expect } from "vitest";
import {
  deriveLeaseUp,
  buildLeaseUpCsvRows,
  LEASE_UP_DEFAULTS,
  type LeaseUpState,
} from "../tools/lease-up";

function state(overrides: Partial<LeaseUpState> = {}): LeaseUpState {
  return { ...LEASE_UP_DEFAULTS, ...overrides };
}

describe("deriveLeaseUp", () => {
  it("computes target units and units to fill", () => {
    const d = deriveLeaseUp(
      state({ totalUnits: 500, currentOccupied: 300, targetOccupancyPct: 90 }),
    );
    expect(d.targetUnits).toBe(450);
    expect(d.unitsToFill).toBe(150);
  });

  it("returns 0 months when already at or above target", () => {
    const d = deriveLeaseUp(
      state({ totalUnits: 500, currentOccupied: 460, targetOccupancyPct: 90 }),
    );
    expect(d.unitsToFill).toBe(0);
    expect(d.monthsToStabilize).toBe(0);
    expect(d.reachable).toBe(true);
  });

  it("with no churn, months = ceil(unitsToFill / moveIns)", () => {
    const d = deriveLeaseUp(
      state({
        totalUnits: 500,
        currentOccupied: 300,
        targetOccupancyPct: 90, // 450 target, 150 to fill
        moveInsPerMonth: 15,
        monthlyChurnPct: 0,
      }),
    );
    expect(d.monthsToStabilize).toBe(10);
  });

  it("takes longer with churn than without", () => {
    const noChurn = deriveLeaseUp(
      state({ totalUnits: 500, currentOccupied: 300, moveInsPerMonth: 20, monthlyChurnPct: 0 }),
    );
    const withChurn = deriveLeaseUp(
      state({ totalUnits: 500, currentOccupied: 300, moveInsPerMonth: 20, monthlyChurnPct: 3 }),
    );
    expect(withChurn.monthsToStabilize).not.toBeNull();
    expect(noChurn.monthsToStabilize).not.toBeNull();
    expect(withChurn.monthsToStabilize!).toBeGreaterThan(noChurn.monthsToStabilize!);
  });

  it("flags unreachable when churn ceiling sits below the target", () => {
    // equilibrium = moveIns/churn = 5 / 0.05 = 100 units; target 450 → never
    const d = deriveLeaseUp(
      state({
        totalUnits: 500,
        currentOccupied: 300,
        targetOccupancyPct: 90,
        moveInsPerMonth: 5,
        monthlyChurnPct: 5,
      }),
    );
    expect(d.reachable).toBe(false);
    expect(d.monthsToStabilize).toBeNull();
    expect(Math.round(d.equilibriumUnits)).toBe(100);
  });

  it("is unreachable with zero move-ins but a fill gap", () => {
    const d = deriveLeaseUp(
      state({ totalUnits: 500, currentOccupied: 300, moveInsPerMonth: 0, monthlyChurnPct: 3 }),
    );
    expect(d.reachable).toBe(false);
  });

  it("computes net first-month absorption (move-ins minus churn on the base)", () => {
    const d = deriveLeaseUp(
      state({ currentOccupied: 300, moveInsPerMonth: 20, monthlyChurnPct: 3 }),
    );
    // 20 - 300*0.03 = 20 - 9 = 11
    expect(d.netFirstMonth).toBeCloseTo(11, 5);
  });

  it("computes the monthly revenue gap to target when a rate is given", () => {
    const d = deriveLeaseUp(
      state({
        totalUnits: 500,
        currentOccupied: 300,
        targetOccupancyPct: 90, // 450 target → 150 unit gap
        avgRate: 100,
      }),
    );
    expect(d.monthlyRevenueGap).toBe(15_000);
  });
});

describe("buildLeaseUpCsvRows", () => {
  it("returns a header row plus key metrics, with unreachable labeled", () => {
    const s = state({
      totalUnits: 500,
      currentOccupied: 300,
      moveInsPerMonth: 5,
      monthlyChurnPct: 5,
    });
    const rows = buildLeaseUpCsvRows(s, deriveLeaseUp(s));
    expect(rows[0]).toEqual(["Metric", "Value"]);
    const months = rows.find((r) => r[0] === "Months to stabilization");
    expect(months?.[1]).toBe("unreachable at this pace");
  });
});
