import { describe, it, expect } from "vitest";
import {
  deriveConcession,
  buildConcessionCsvRows,
  CONCESSION_DEFAULTS,
  type ConcessionState,
} from "../tools/concession";

function state(overrides: Partial<ConcessionState> = {}): ConcessionState {
  return { ...CONCESSION_DEFAULTS, ...overrides };
}

describe("deriveConcession", () => {
  it("values one free month as one month's rate", () => {
    const d = deriveConcession(
      state({ avgRate: 120, freeMonths: 1, discountPct: 0, avgStayMonths: 12 }),
    );
    expect(d.concessionPerMoveIn).toBe(120);
  });

  it("adds a temporary percentage discount on top of free months", () => {
    const d = deriveConcession(
      state({ avgRate: 100, freeMonths: 1, discountPct: 50, discountMonths: 2 }),
    );
    // 1*100 + 0.5*100*2 = 100 + 100 = 200
    expect(d.concessionPerMoveIn).toBe(200);
  });

  it("expresses the concession as a small slice of lifetime revenue", () => {
    const d = deriveConcession(
      state({ avgRate: 100, freeMonths: 1, avgStayMonths: 12 }),
    );
    expect(d.lifetimeRevenuePerTenant).toBe(1_200);
    expect(d.concessionPctOfLifetime).toBeCloseTo(8.333, 2); // 100/1200
  });

  it("computes the effective monthly rate net of the concession over the stay", () => {
    const d = deriveConcession(
      state({ avgRate: 100, freeMonths: 1, avgStayMonths: 10 }),
    );
    // lifetime 1000, concession 100, effective = 900/10 = 90
    expect(d.effectiveMonthlyRate).toBe(90);
  });

  it("scales cohort and annual cost by move-in volume", () => {
    const d = deriveConcession(
      state({ moveInsPerMonth: 10, avgRate: 100, freeMonths: 1 }),
    );
    expect(d.monthlyConcessionCost).toBe(1_000); // 10 * 100
    expect(d.annualConcessionCost).toBe(12_000);
  });

  it("guards against a zero length of stay", () => {
    const d = deriveConcession(
      state({ avgRate: 100, freeMonths: 1, avgStayMonths: 0 }),
    );
    expect(d.concessionPctOfLifetime).toBe(0);
    expect(d.effectiveMonthlyRate).toBe(0);
  });
});

describe("buildConcessionCsvRows", () => {
  it("returns a header row plus key metrics", () => {
    const s = state({ moveInsPerMonth: 10, avgRate: 100, freeMonths: 1 });
    const rows = buildConcessionCsvRows(s, deriveConcession(s));
    expect(rows[0]).toEqual(["Metric", "Value"]);
    const labels = rows.map((r) => r[0]);
    expect(labels).toContain("Concession value per move-in");
    expect(labels).toContain("Concession as % of lifetime revenue");
  });
});
