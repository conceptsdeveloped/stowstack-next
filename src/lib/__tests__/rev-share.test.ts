import { describe, it, expect } from "vitest";
import {
  REV_SHARE_TIERS,
  REV_SHARE_FACILITY_MRR,
  resolveTier,
  getNextTier,
  resolvePct,
  computeEarnings,
  summarize,
  monthKey,
} from "@/lib/rev-share";

describe("resolveTier", () => {
  it("maps facility counts to the right tier across boundaries", () => {
    expect(resolveTier(1).name).toBe("Bronze");
    expect(resolveTier(10).name).toBe("Bronze");
    expect(resolveTier(11).name).toBe("Silver");
    expect(resolveTier(25).name).toBe("Silver");
    expect(resolveTier(26).name).toBe("Gold");
    expect(resolveTier(50).name).toBe("Gold");
    expect(resolveTier(51).name).toBe("Platinum");
    expect(resolveTier(5000).name).toBe("Platinum");
  });

  it("resolves 0 facilities to the first tier (so the UI has a tier)", () => {
    expect(resolveTier(0).name).toBe("Bronze");
  });
});

describe("getNextTier", () => {
  it("returns the next tier up, or null at the top", () => {
    expect(getNextTier(5)?.name).toBe("Silver");
    expect(getNextTier(20)?.name).toBe("Gold");
    expect(getNextTier(40)?.name).toBe("Platinum");
    expect(getNextTier(60)).toBeNull();
  });
});

describe("resolvePct", () => {
  it("uses the tier rate when no override", () => {
    expect(resolvePct(5)).toBe(20);
    expect(resolvePct(30)).toBe(30);
  });

  it("honors a positive override over the tier rate", () => {
    expect(resolvePct(5, 42)).toBe(42);
  });

  it("ignores null / zero / negative / non-finite overrides", () => {
    expect(resolvePct(5, null)).toBe(20);
    expect(resolvePct(5, 0)).toBe(20);
    expect(resolvePct(5, -10)).toBe(20);
    expect(resolvePct(5, Number.NaN)).toBe(20);
  });
});

describe("computeEarnings", () => {
  it("computes gross MRR and tiered earnings", () => {
    const e = computeEarnings({ facilityCount: 10, pct: 20 });
    expect(e.grossMrr).toBe(10 * REV_SHARE_FACILITY_MRR); // 990
    expect(e.monthlyEarnings).toBe(198); // 990 * 0.20
    expect(e.annualEarnings).toBe(198 * 12);
  });

  it("returns zero earnings for zero facilities", () => {
    const e = computeEarnings({ facilityCount: 0, pct: 35 });
    expect(e.grossMrr).toBe(0);
    expect(e.monthlyEarnings).toBe(0);
    expect(e.annualEarnings).toBe(0);
  });

  it("floors fractional counts and rounds money to cents", () => {
    const e = computeEarnings({ facilityCount: 3.9, pct: 25, facilityMrr: 100 });
    expect(e.grossMrr).toBe(300); // floor(3.9)=3 * 100
    expect(e.monthlyEarnings).toBe(75);
  });

  it("accepts a custom per-facility MRR basis", () => {
    const e = computeEarnings({ facilityCount: 2, pct: 50, facilityMrr: 500 });
    expect(e.grossMrr).toBe(1000);
    expect(e.monthlyEarnings).toBe(500);
  });
});

describe("summarize", () => {
  it("bundles tier, next tier, and earnings", () => {
    const s = summarize(11); // Silver, 25%
    expect(s.tier.name).toBe("Silver");
    expect(s.nextTier?.name).toBe("Gold");
    expect(s.pct).toBe(25);
    expect(s.grossMrr).toBe(11 * REV_SHARE_FACILITY_MRR);
    expect(s.monthlyEarnings).toBe(Math.round(s.grossMrr * 0.25 * 100) / 100);
  });

  it("applies an override pct in the bundled summary", () => {
    const s = summarize(11, 40);
    expect(s.pct).toBe(40);
  });
});

describe("monthKey", () => {
  it("formats a date as YYYY-MM in UTC", () => {
    expect(monthKey(new Date("2026-06-26T12:00:00Z"))).toBe("2026-06");
    expect(monthKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
    expect(monthKey(new Date("2025-12-31T23:59:59Z"))).toBe("2025-12");
  });
});

describe("REV_SHARE_TIERS table", () => {
  it("is contiguous and ascending with an unbounded top tier", () => {
    for (let i = 1; i < REV_SHARE_TIERS.length; i++) {
      const prev = REV_SHARE_TIERS[i - 1];
      const cur = REV_SHARE_TIERS[i];
      expect(prev.max).not.toBeNull();
      expect(cur.min).toBe((prev.max as number) + 1);
      expect(cur.pct).toBeGreaterThan(prev.pct);
    }
    expect(REV_SHARE_TIERS[REV_SHARE_TIERS.length - 1].max).toBeNull();
  });
});
