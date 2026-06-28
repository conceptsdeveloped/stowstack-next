import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  toNumber,
  detectReportType,
  parseReport,
  summarizeRentRoll,
  deriveUnitMix,
  detectAnomalies,
  importParsed,
} from "@/lib/pms-import";

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

/* ── pure helpers ── */

describe("toNumber", () => {
  it("strips currency/percent/commas and coerces", () => {
    expect(toNumber("$1,234.50")).toBe(1234.5);
    expect(toNumber("12%")).toBe(12);
    expect(toNumber(" 7 ")).toBe(7);
  });
  it("returns null for blanks and garbage", () => {
    expect(toNumber("")).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber("n/a")).toBeNull();
  });
});

/* ── type detection ── */

describe("detectReportType", () => {
  it("detects a rent roll", () => {
    expect(
      detectReportType(["Unit", "Tenant Name", "Rent Rate", "Paid Thru", "Total Due"]),
    ).toBe("rent_roll");
  });
  it("detects aging by its buckets (not confused with rent roll)", () => {
    expect(
      detectReportType(["Unit", "Tenant Name", "0-30", "31-60", "61-90", "Total"]),
    ).toBe("aging");
  });
  it("detects revenue history", () => {
    expect(detectReportType(["Year", "Month", "Revenue", "Move Ins"])).toBe("revenue");
  });
  it("returns null when nothing maps confidently", () => {
    expect(detectReportType(["foo", "bar", "baz"])).toBeNull();
  });
});

describe("parseReport", () => {
  it("parses + maps a rent roll CSV", () => {
    const csv = "Unit,Tenant Name,Rent Rate,Total Due,Days Past Due\nA1,Jane Doe,100,100,0\nA2,,120,0,0";
    const parsed = parseReport(csv);
    expect(parsed?.type).toBe("rent_roll");
    expect(parsed?.missingRequired).toEqual([]);
    expect(parsed?.mappedRows).toHaveLength(2);
    expect(parsed?.mappedRows[0].unit).toBe("A1");
    expect(parsed?.mappedRows[0].tenant_name).toBe("Jane Doe");
  });
  it("returns null for an undetectable header", () => {
    expect(parseReport("foo,bar\n1,2")).toBeNull();
  });
});

/* ── summary math ── */

describe("summarizeRentRoll", () => {
  it("computes occupancy and delinquency from rows", () => {
    const s = summarizeRentRoll([
      { unit: "A1", tenant_name: "Jane", rent_rate: 100, total_due: 100, days_past_due: 0 },
      { unit: "A2", tenant_name: "", rent_rate: 120, total_due: 0, days_past_due: 0 },
      { unit: "A3", tenant_name: "Bob", rent_rate: 100, total_due: 100, days_past_due: 15 },
    ]);
    expect(s.totalUnits).toBe(3);
    expect(s.occupied).toBe(2);
    expect(s.occupancyPct).toBeCloseTo(66.67, 1);
    expect(s.grossPotential).toBe(320);
    expect(s.delinquentUnits).toBe(1);
    expect(s.delinquencyPct).toBeCloseTo(33.33, 1);
  });
});

describe("deriveUnitMix", () => {
  it("groups by size label with occupancy and avg rate", () => {
    const mix = deriveUnitMix([
      { unit: "A1", size_label: "10x10", tenant_name: "Jane", rent_rate: 100 },
      { unit: "A2", size_label: "10x10", tenant_name: "", rent_rate: 120 },
      { unit: "B1", size_label: "", tenant_name: "Bob", rent_rate: 50 },
    ]);
    const tenByTen = mix.find((m) => m.unit_type === "10x10");
    expect(tenByTen?.total_count).toBe(2);
    expect(tenByTen?.occupied_count).toBe(1);
    expect(tenByTen?.street_rate).toBe(110);
    const standard = mix.find((m) => m.unit_type === "Standard");
    expect(standard?.size_label).toBeNull();
    expect(standard?.total_count).toBe(1);
  });
});

/* ── anomaly gate ── */

describe("detectAnomalies", () => {
  it("flags an empty file", () => {
    expect(detectAnomalies("rent_roll", [])).toContain("no data rows");
  });
  it("flags duplicate unit numbers", () => {
    const issues = detectAnomalies("rent_roll", [
      { unit: "A1", tenant_name: "Jane", rent_rate: 100 },
      { unit: "A1", tenant_name: "Bob", rent_rate: 100 },
    ]);
    expect(issues).toContain("duplicate unit numbers present");
  });
  it("flags 0% occupancy only at scale (>=10 units), not a small all-vacant facility", () => {
    const big = Array.from({ length: 12 }, (_, i) => ({ unit: `A${i}`, tenant_name: "" }));
    expect(detectAnomalies("rent_roll", big).some((p) => p.includes("0% occupancy"))).toBe(true);

    const small = Array.from({ length: 4 }, (_, i) => ({ unit: `A${i}`, tenant_name: "" }));
    expect(detectAnomalies("rent_roll", small)).toEqual([]);
  });
  it("passes a clean rent roll", () => {
    expect(
      detectAnomalies("rent_roll", [
        { unit: "A1", tenant_name: "Jane", rent_rate: 100, days_past_due: 0 },
        { unit: "A2", tenant_name: "Bob", rent_rate: 120, days_past_due: 0 },
      ]),
    ).toEqual([]);
  });
});

/* ── importer (db-mocked) ── */

describe("importParsed", () => {
  it("imports a rent roll: snapshot upsert + unit-mix upsert", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_rent_roll = {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_snapshots = { upsert: vi.fn().mockResolvedValue({}) };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_units = { upsert: vi.fn().mockResolvedValue({}) };

    const res = await importParsed("f1", "rent_roll", new Date("2026-06-01"), [
      { unit: "A1", size_label: "10x10", tenant_name: "Jane", rent_rate: 100, total_due: 100, days_past_due: 0 },
      { unit: "A2", size_label: "10x10", tenant_name: "", rent_rate: 120, total_due: 0, days_past_due: 0 },
    ]);

    expect(res.type).toBe("rent_roll");
    expect(res.imported).toBe(2);
    // @ts-expect-error — inspecting mock
    expect(mockDb.facility_pms_rent_roll.createMany).toHaveBeenCalledOnce();
    // @ts-expect-error — inspecting mock
    expect(mockDb.facility_pms_snapshots.upsert).toHaveBeenCalledOnce();
    // One unit-mix group ("10x10") → one upsert.
    // @ts-expect-error — inspecting mock
    expect(mockDb.facility_pms_units.upsert).toHaveBeenCalledOnce();
  });

  it("imports revenue rows by upsert, skipping rows without year/month", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_revenue_history = { upsert };

    const res = await importParsed("f1", "revenue", new Date(), [
      { year: "2026", month: "January", revenue: "1000" },
      { year: "", month: "", revenue: "999" }, // skipped
    ]);

    expect(res.imported).toBe(1);
    expect(upsert).toHaveBeenCalledOnce();
  });
});
