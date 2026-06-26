import { describe, it, expect } from "vitest";
import {
  suggestRate,
  riskFromBucket,
  riskFromTenure,
  resolveRisk,
  normalizeStatus,
  tenureMonthsFrom,
  buildRateIncreaseLetter,
  SENSITIVITY_CAPS,
  DEFAULT_CAP,
} from "@/lib/ecri";

describe("suggestRate", () => {
  it("is ineligible when the tenant is at or above market", () => {
    expect(suggestRate(150, 150, "low").eligible).toBe(false);
    expect(suggestRate(160, 150, "low").eligible).toBe(false);
  });

  it("is ineligible when current or market is non-positive", () => {
    expect(suggestRate(0, 150, "low").eligible).toBe(false);
    expect(suggestRate(150, 0, "low").eligible).toBe(false);
  });

  it("raises toward market but never above it", () => {
    // current 100, market 105, low cap 10% -> capped allows 110, but market 105 wins.
    const r = suggestRate(100, 105, "low");
    expect(r.suggested).toBe(105);
    expect(r.monthlyLift).toBe(5);
    expect(r.eligible).toBe(true);
  });

  it("never raises more than the sensitivity-bucket cap", () => {
    // market far above current; cap binds.
    const high = suggestRate(100, 500, "high"); // 5% cap
    expect(high.suggested).toBe(105);
    expect(high.monthlyLift).toBe(5);

    const veryLow = suggestRate(100, 500, "very_low"); // 12% cap
    expect(veryLow.suggested).toBe(112);
    expect(veryLow.monthlyLift).toBe(12);
  });

  it("low-sensitivity tenants get a larger raise than high-sensitivity ones", () => {
    const sticky = suggestRate(100, 500, "very_low").monthlyLift;
    const flight = suggestRate(100, 500, "high").monthlyLift;
    expect(sticky).toBeGreaterThan(flight);
  });

  it("uses the default cap when the bucket is unknown", () => {
    const r = suggestRate(100, 500, null);
    expect(r.capPct).toBe(DEFAULT_CAP);
    expect(r.suggested).toBe(Math.round(100 * (1 + DEFAULT_CAP)));
  });

  it("is ineligible when the capped raise rounds below $1", () => {
    // market only $0.40 above current -> rounds to no lift.
    expect(suggestRate(100, 100.4, "low").eligible).toBe(false);
  });

  it("exposes a cap for every defined bucket", () => {
    expect(SENSITIVITY_CAPS.very_low).toBeGreaterThan(SENSITIVITY_CAPS.high);
  });
});

describe("risk mapping", () => {
  it("maps sensitivity buckets to 3-level risk", () => {
    expect(riskFromBucket("very_low")).toBe("low");
    expect(riskFromBucket("low")).toBe("low");
    expect(riskFromBucket("medium")).toBe("medium");
    expect(riskFromBucket("high")).toBe("higher");
    expect(riskFromBucket(null)).toBeNull();
    expect(riskFromBucket("garbage")).toBeNull();
  });

  it("falls back to tenure when no bucket is present", () => {
    expect(riskFromTenure(2)).toBe("higher");
    expect(riskFromTenure(6)).toBe("medium");
    expect(riskFromTenure(24)).toBe("low");
    expect(resolveRisk(null, 30)).toBe("low");
    expect(resolveRisk("high", 30)).toBe("higher"); // bucket wins over tenure
  });
});

describe("normalizeStatus", () => {
  it("passes through valid lifecycle states", () => {
    expect(normalizeStatus("scheduled")).toBe("scheduled");
    expect(normalizeStatus("SENT")).toBe("sent");
    expect(normalizeStatus("done")).toBe("done");
  });
  it("maps unknown/empty to pending", () => {
    expect(normalizeStatus(null)).toBe("pending");
    expect(normalizeStatus("identified")).toBe("pending");
    expect(normalizeStatus("")).toBe("pending");
  });
});

describe("tenureMonthsFrom", () => {
  it("prefers days_as_tenant", () => {
    expect(tenureMonthsFrom(900, null)).toBe(30);
  });
  it("falls back to move-in date", () => {
    const fixedNow = new Date("2026-01-01T00:00:00Z").getTime();
    const movedIn = "2023-01-01"; // ~3 years
    expect(tenureMonthsFrom(null, movedIn, fixedNow)).toBeGreaterThanOrEqual(34);
  });
  it("returns 0 when neither is usable", () => {
    expect(tenureMonthsFrom(0, null)).toBe(0);
    expect(tenureMonthsFrom(null, "not-a-date")).toBe(0);
  });
});

describe("buildRateIncreaseLetter", () => {
  const base = {
    tenantName: "Jane Doe",
    unit: "B12",
    currentRate: 120,
    newRate: 135,
    effectiveDate: "August 1, 2026",
    noticeDays: 45,
    facilityName: "Paw Paw Storage",
    facilityLocation: "Paw Paw, MI",
    facilityPhone: "(269) 555-0100",
    letterDate: "June 15, 2026",
  };

  it("produces a subject scoped to the unit", () => {
    expect(buildRateIncreaseLetter(base).subject).toBe(
      "Notice of Rate Adjustment — Unit B12",
    );
  });

  it("includes the tenant, both rates, effective date, and notice period", () => {
    const { body } = buildRateIncreaseLetter(base);
    expect(body).toContain("Jane Doe");
    expect(body).toContain("$120");
    expect(body).toContain("$135");
    expect(body).toContain("August 1, 2026");
    expect(body).toContain("45-day notice");
    expect(body).toContain("Paw Paw Storage");
    expect(body).toContain("(269) 555-0100");
  });

  it("degrades gracefully without an explicit name or phone", () => {
    const { body } = buildRateIncreaseLetter({
      ...base,
      tenantName: "",
      facilityPhone: null,
    });
    expect(body).toContain("Dear Valued Customer");
    expect(body).toContain("contact the office");
  });
});
