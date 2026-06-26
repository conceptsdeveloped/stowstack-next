import { describe, it, expect } from "vitest";
import {
  deriveNoi,
  NOI_DEFAULTS,
  EXPENSE_FIELDS,
  OTHER_INCOME_FIELDS,
  buildNoiCsvRows,
  rowsToCsv,
  noiCsvFileName,
  type NoiState,
} from "../tools/noi";

function state(overrides: Partial<NoiState> = {}): NoiState {
  return { ...NOI_DEFAULTS, ...overrides };
}

describe("deriveNoi", () => {
  it("returns all-zero metrics for empty input", () => {
    const d = deriveNoi(state({ vacancyPct: 0 }));
    expect(d.egi).toBe(0);
    expect(d.noi).toBe(0);
    expect(d.noiMargin).toBe(0);
    expect(d.expenseRatio).toBe(0);
    expect(d.impliedValue).toBe(0);
  });

  it("computes EGI from GPR less vacancy plus other income", () => {
    // GPR 1,200,000, 10% vacancy = 120,000 loss, + 48,000 insurance
    const d = deriveNoi(
      state({ gpr: 1_200_000, vacancyPct: 10, tenantInsurance: 48_000 }),
    );
    expect(d.vacancyLoss).toBe(120_000);
    expect(d.rentalIncomeNet).toBe(1_080_000);
    expect(d.otherIncomeTotal).toBe(48_000);
    expect(d.egi).toBe(1_128_000);
  });

  it("matches the browser-verified scenario end to end", () => {
    // 200 units, 60,000 sqft, GPR 1.2M @ 10% vacancy, 48k insurance, no opex
    const d = deriveNoi(
      state({
        totalUnits: 200,
        rentableSqft: 60_000,
        gpr: 1_200_000,
        vacancyPct: 10,
        tenantInsurance: 48_000,
        capRatePct: 6.5,
      }),
    );
    expect(d.egi).toBe(1_128_000);
    expect(d.opexTotal).toBe(0);
    expect(d.noi).toBe(1_128_000);
    expect(d.noiMonthly).toBe(94_000);
    expect(d.noiMargin).toBe(100);
    expect(d.expenseRatio).toBe(0);
    expect(d.noiPerUnit).toBe(5_640);
    expect(d.noiPerSqft).toBeCloseTo(18.8, 5);
    expect(Math.round(d.impliedValue)).toBe(17_353_846);
  });

  it("treats the management fee as a percent of EGI", () => {
    const d = deriveNoi(state({ gpr: 100_000, vacancyPct: 0, managementPct: 6 }));
    expect(d.egi).toBe(100_000);
    expect(d.managementFee).toBe(6_000);
    expect(d.opexTotal).toBe(6_000);
    expect(d.noi).toBe(94_000);
  });

  it("sums every operating expense line item", () => {
    // 1 dollar in each expense field → opex equals the field count
    const expenses = Object.fromEntries(
      EXPENSE_FIELDS.map((f) => [f.key, 1]),
    ) as Partial<NoiState>;
    const d = deriveNoi(state({ gpr: 100_000, vacancyPct: 0, ...expenses }));
    expect(d.opexTotal).toBe(EXPENSE_FIELDS.length);
    expect(d.noi).toBe(100_000 - EXPENSE_FIELDS.length);
  });

  it("sums every other-income line item into EGI", () => {
    const income = Object.fromEntries(
      OTHER_INCOME_FIELDS.map((f) => [f.key, 10]),
    ) as Partial<NoiState>;
    const d = deriveNoi(state({ gpr: 0, vacancyPct: 0, ...income }));
    expect(d.otherIncomeTotal).toBe(OTHER_INCOME_FIELDS.length * 10);
    expect(d.egi).toBe(OTHER_INCOME_FIELDS.length * 10);
  });

  it("only lists non-zero expense lines, management fee first", () => {
    const d = deriveNoi(
      state({ gpr: 100_000, vacancyPct: 0, managementPct: 5, propertyTax: 12_000 }),
    );
    expect(d.expenseLines).toEqual([
      { label: "Property management fee", amount: 5_000 },
      { label: "Property taxes", amount: 12_000 },
    ]);
  });

  it("produces a negative NOI when expenses exceed EGI", () => {
    const d = deriveNoi(state({ gpr: 50_000, vacancyPct: 0, payroll: 80_000 }));
    expect(d.noi).toBe(-30_000);
    expect(d.noiMargin).toBeLessThan(0);
  });

  it("guards divide-by-zero on cap rate, units, and sqft", () => {
    const d = deriveNoi(
      state({ gpr: 100_000, vacancyPct: 0, capRatePct: 0, totalUnits: 0, rentableSqft: 0 }),
    );
    expect(d.impliedValue).toBe(0);
    expect(d.noiPerUnit).toBe(0);
    expect(d.noiPerSqft).toBe(0);
  });

  it("clamps an out-of-range vacancy percentage", () => {
    const d = deriveNoi(state({ gpr: 100_000, vacancyPct: 150 }));
    expect(d.vacancyLoss).toBe(100_000); // clamped to 100%
    expect(d.rentalIncomeNet).toBe(0);
  });

  it("ignores NaN inputs rather than propagating them", () => {
    const d = deriveNoi(state({ gpr: NaN as unknown as number, vacancyPct: 0, payroll: 5_000 }));
    expect(d.gpr).toBe(0);
    expect(d.noi).toBe(-5_000);
    expect(Number.isFinite(d.noi)).toBe(true);
  });
});

describe("buildNoiCsvRows", () => {
  it("starts with a header row and ends with the implied value", () => {
    const s = state({ gpr: 1_200_000, vacancyPct: 10, tenantInsurance: 48_000 });
    const rows = buildNoiCsvRows(s, deriveNoi(s));
    expect(rows[0]).toEqual(["Line item", "Annual", "Monthly"]);
    expect(rows[rows.length - 1][0]).toBe("Implied value @ 6.5% cap");
    // every row has exactly three cells
    expect(rows.every((r) => r.length === 3)).toBe(true);
  });

  it("formats annual and monthly columns and signs expenses negative", () => {
    const s = state({ gpr: 1_200_000, vacancyPct: 0, payroll: 120_000 });
    const rows = buildNoiCsvRows(s, deriveNoi(s));
    const gpr = rows.find((r) => r[0] === "Gross potential rent");
    expect(gpr).toEqual(["Gross potential rent", "$1,200,000", "$100,000"]);
    const payroll = rows.find((r) => r[0].trim() === "On-site payroll & wages");
    expect(payroll?.[1]).toBe("-$120,000");
  });

  it("emits n/a for per-unit and per-sqft when units/sqft are absent", () => {
    const s = state({ gpr: 100_000, vacancyPct: 0 });
    const rows = buildNoiCsvRows(s, deriveNoi(s));
    expect(rows.find((r) => r[0] === "NOI per unit")?.[1]).toBe("n/a");
    expect(rows.find((r) => r[0] === "NOI per rentable sq ft")?.[1]).toBe("n/a");
  });

  it("only lists non-zero expense lines", () => {
    const s = state({ gpr: 100_000, vacancyPct: 0, propertyTax: 12_000 });
    const rows = buildNoiCsvRows(s, deriveNoi(s));
    const labels = rows.map((r) => r[0].trim());
    expect(labels).toContain("Property taxes");
    expect(labels).not.toContain("Utilities");
  });
});

describe("rowsToCsv", () => {
  it("quotes every cell and joins with newlines", () => {
    const csv = rowsToCsv([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
    expect(csv).toBe('"a","b","c"\n"1","2","3"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    const csv = rowsToCsv([['say "hi"', "x", "y"]]);
    expect(csv).toBe('"say ""hi""","x","y"');
  });
});

describe("noiCsvFileName", () => {
  it("slugifies the facility name", () => {
    expect(noiCsvFileName("Pawpaw Storage #2")).toBe("noi-pawpaw-storage-2.csv");
  });
  it("falls back to a default when blank", () => {
    expect(noiCsvFileName("")).toBe("noi-storage.csv");
    expect(noiCsvFileName("   ")).toBe("noi-storage.csv");
  });
});
