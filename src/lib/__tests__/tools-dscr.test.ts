import { describe, it, expect } from "vitest";
import {
  deriveDscr,
  monthlyPayment,
  loanFromPayment,
  buildDscrCsvRows,
  DSCR_DEFAULTS,
  type DscrState,
} from "../tools/dscr";

function state(overrides: Partial<DscrState> = {}): DscrState {
  return { ...DSCR_DEFAULTS, ...overrides };
}

describe("monthlyPayment", () => {
  it("matches a standard amortization (1M @ 6.5% / 25y ≈ $6,752)", () => {
    // P=1,000,000 r=0.0054166.. n=300 → 6752.0716
    const m = monthlyPayment(1_000_000, 6.5, 25);
    expect(m).toBeCloseTo(6752.07, 1);
  });

  it("is principal / months when the rate is zero", () => {
    expect(monthlyPayment(120_000, 0, 10)).toBeCloseTo(1000, 6); // 120,000 / 120
  });

  it("returns 0 for a zero-length term", () => {
    expect(monthlyPayment(500_000, 6, 0)).toBe(0);
  });
});

describe("loanFromPayment", () => {
  it("is the exact inverse of monthlyPayment", () => {
    const m = monthlyPayment(1_000_000, 6.5, 25);
    expect(loanFromPayment(m, 6.5, 25)).toBeCloseTo(1_000_000, 2);
  });

  it("is payment * months when the rate is zero", () => {
    expect(loanFromPayment(1000, 0, 10)).toBeCloseTo(120_000, 6);
  });
});

describe("deriveDscr — check mode", () => {
  it("computes DSCR from NOI and a given loan", () => {
    const d = deriveDscr(
      state({ mode: "check", noi: 120_000, loanAmount: 1_000_000, interestRatePct: 6.5, amortYears: 25 }),
    );
    // annual debt service = 6752.0716 * 12 = 81,024.86 ; DSCR ≈ 1.481
    expect(d.annualDebtService).toBeCloseTo(81_024.86, 0);
    expect(d.dscr).toBeCloseTo(1.481, 2);
  });

  it("computes debt yield, LTV, and post-debt cash flow", () => {
    const d = deriveDscr(
      state({
        mode: "check",
        noi: 120_000,
        loanAmount: 1_000_000,
        purchasePrice: 1_600_000,
        interestRatePct: 6.5,
        amortYears: 25,
      }),
    );
    expect(d.debtYield).toBeCloseTo(12, 5); // 120k / 1M
    expect(d.ltv).toBeCloseTo(62.5, 5); // 1M / 1.6M
    expect(d.cashFlowAfterDebt).toBeCloseTo(120_000 - d.annualDebtService, 2);
  });

  it("guards DSCR against a zero loan", () => {
    const d = deriveDscr(state({ mode: "check", noi: 120_000, loanAmount: 0 }));
    expect(d.dscr).toBe(0);
    expect(d.annualDebtService).toBe(0);
  });
});

describe("deriveDscr — size mode", () => {
  it("sizes the loan so the payment exactly hits the target DSCR", () => {
    const d = deriveDscr(
      state({ mode: "size", noi: 120_000, targetDscr: 1.25, interestRatePct: 6.5, amortYears: 25 }),
    );
    // allowed annual debt service = 120,000 / 1.25 = 96,000
    expect(d.annualDebtService).toBeCloseTo(96_000, 2);
    expect(d.dscr).toBe(1.25);
    // re-checking the sized loan reproduces the target DSCR
    const recheck = deriveDscr(
      state({ mode: "check", noi: 120_000, loanAmount: d.loanAmount, interestRatePct: 6.5, amortYears: 25 }),
    );
    expect(recheck.dscr).toBeCloseTo(1.25, 4);
  });

  it("derives LTV against a purchase price", () => {
    const d = deriveDscr(
      state({
        mode: "size",
        noi: 120_000,
        targetDscr: 1.25,
        purchasePrice: 2_000_000,
        interestRatePct: 6.5,
        amortYears: 25,
      }),
    );
    expect(d.ltv).toBeCloseTo((d.loanAmount / 2_000_000) * 100, 5);
  });

  it("guards against a zero target DSCR", () => {
    const d = deriveDscr(state({ mode: "size", noi: 120_000, targetDscr: 0 }));
    expect(d.annualDebtService).toBe(0);
    expect(d.loanAmount).toBe(0);
  });
});

describe("buildDscrCsvRows", () => {
  it("returns a header row plus the key metrics", () => {
    const s = state({ mode: "size", noi: 120_000, targetDscr: 1.25 });
    const rows = buildDscrCsvRows(s, deriveDscr(s));
    expect(rows[0]).toEqual(["Metric", "Value"]);
    const labels = rows.map((r) => r[0]);
    expect(labels).toContain("DSCR");
    expect(labels).toContain("Debt yield");
    expect(labels).toContain("Cash flow after debt service");
  });

  it("marks target DSCR n/a in check mode and LTV n/a without a price", () => {
    const s = state({ mode: "check", noi: 120_000, loanAmount: 1_000_000, purchasePrice: 0 });
    const rows = buildDscrCsvRows(s, deriveDscr(s));
    expect(rows.find((r) => r[0] === "Target DSCR")?.[1]).toBe("n/a");
    expect(rows.find((r) => r[0] === "Loan-to-value")?.[1]).toBe("n/a");
  });
});
