import { describe, it, expect } from "vitest";
import { computeRentRollSnapshot } from "../route";

const row = (over: Record<string, string> = {}) => ({
  unit: "A1",
  tenant_name: "Jane Doe",
  rent_rate: "100",
  total_due: "100",
  days_past_due: "0",
  ...over,
});

describe("computeRentRollSnapshot", () => {
  it("returns all-zero metrics for an empty roll (no divide-by-zero)", () => {
    // toMatchObject (not toEqual) so the shared importer is free to surface
    // extra fields without breaking this invariant.
    expect(computeRentRollSnapshot([])).toMatchObject({
      totalUnits: 0,
      occupied: 0,
      occupancyPct: 0,
      grossPotential: 0,
      actualRevenue: 0,
      delinquencyPct: 0,
    });
  });

  it("computes occupancy from non-blank tenant names", () => {
    const rows = [
      row({ unit: "A1", tenant_name: "Jane" }),
      row({ unit: "A2", tenant_name: "" }),
      row({ unit: "A3", tenant_name: "   " }), // whitespace-only counts as vacant
      row({ unit: "A4", tenant_name: "Bob" }),
    ];
    const s = computeRentRollSnapshot(rows);
    expect(s.totalUnits).toBe(4);
    expect(s.occupied).toBe(2);
    expect(s.occupancyPct).toBe(50);
  });

  it("computes delinquency as the share of units with days_past_due > 0", () => {
    const rows = [
      row({ days_past_due: "0" }),
      row({ days_past_due: "15" }),
      row({ days_past_due: "60" }),
      row({ days_past_due: "0" }),
    ];
    const s = computeRentRollSnapshot(rows);
    expect(s.delinquencyPct).toBe(50);
  });

  it("sums gross potential (rent_rate) and actual revenue (total_due)", () => {
    const rows = [
      row({ rent_rate: "100", total_due: "100" }),
      row({ rent_rate: "150", total_due: "0" }),
      row({ rent_rate: "200", total_due: "200" }),
    ];
    const s = computeRentRollSnapshot(rows);
    expect(s.grossPotential).toBe(450);
    expect(s.actualRevenue).toBe(300);
  });

  it("coerces blank/non-numeric numeric cells to 0 (no NaN leaks)", () => {
    const rows = [
      row({ rent_rate: "", total_due: "n/a", days_past_due: "" }),
      row({ rent_rate: "abc", total_due: "", days_past_due: "x" }),
    ];
    const s = computeRentRollSnapshot(rows);
    expect(s.grossPotential).toBe(0);
    expect(s.actualRevenue).toBe(0);
    expect(s.delinquencyPct).toBe(0);
    expect(Number.isNaN(s.grossPotential)).toBe(false);
  });

  it("reports 100% occupancy and 100% delinquency at the boundaries", () => {
    const allOccDelinquent = [
      row({ tenant_name: "A", days_past_due: "5" }),
      row({ tenant_name: "B", days_past_due: "5" }),
    ];
    const s = computeRentRollSnapshot(allOccDelinquent);
    expect(s.occupancyPct).toBe(100);
    expect(s.delinquencyPct).toBe(100);
  });
});
