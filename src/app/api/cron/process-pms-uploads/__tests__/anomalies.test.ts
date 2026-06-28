import { describe, it, expect } from "vitest";
import { detectPmsAnomalies } from "../route";

const rentRow = (over: Record<string, string> = {}) => ({
  unit: "A1",
  tenant_name: "Jane Doe",
  rent_rate: "100",
  days_past_due: "0",
  total_due: "100",
  ...over,
});

describe("detectPmsAnomalies", () => {
  it("flags empty input", () => {
    expect(detectPmsAnomalies("rent_roll", [])).toContain("no data rows");
  });

  it("passes a clean rent roll", () => {
    const rows = Array.from({ length: 20 }, (_, i) => rentRow({ unit: `A${i}` }));
    expect(detectPmsAnomalies("rent_roll", rows)).toEqual([]);
  });

  it("holds a rent roll where every unit reads vacant (likely a column mismatch)", () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      rentRow({ unit: `A${i}`, tenant_name: "" })
    );
    const problems = detectPmsAnomalies("rent_roll", rows);
    expect(problems.some((p) => p.includes("0% occupancy"))).toBe(true);
  });

  it("does NOT flag a genuinely small all-vacant facility (< 10 units)", () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      rentRow({ unit: `A${i}`, tenant_name: "" })
    );
    expect(detectPmsAnomalies("rent_roll", rows)).toEqual([]);
  });

  it("flags negative rent and negative days-past-due", () => {
    const problems = detectPmsAnomalies("rent_roll", [
      rentRow({ rent_rate: "-5" }),
      rentRow({ days_past_due: "-3" }),
    ]);
    expect(problems.some((p) => p.includes("negative rent"))).toBe(true);
    expect(problems.some((p) => p.includes("negative days-past-due"))).toBe(true);
  });

  it("ignores blank/non-numeric cells (no false positives)", () => {
    const rows = [rentRow({ rent_rate: "", days_past_due: "n/a" })];
    expect(detectPmsAnomalies("rent_roll", rows)).toEqual([]);
  });

  it("flags negative aging buckets", () => {
    const problems = detectPmsAnomalies("aging", [
      { unit: "A1", bucket_0_30: "10", bucket_31_60: "-4", total: "6" },
    ]);
    expect(problems.some((p) => p.includes("negative aging"))).toBe(true);
  });

  it("passes a clean aging report", () => {
    expect(
      detectPmsAnomalies("aging", [
        { unit: "A1", bucket_0_30: "10", bucket_31_60: "0", total: "10" },
      ])
    ).toEqual([]);
  });
});
