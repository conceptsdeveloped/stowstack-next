import { describe, it, expect } from "vitest";
import { usd0, usd2, pct, num0, round2, clampPct, nonNeg } from "../tools/format";

describe("tools/format", () => {
  describe("usd0", () => {
    it("formats whole dollars with no decimals", () => {
      expect(usd0(1128000)).toBe("$1,128,000");
    });
    it("rounds to the nearest dollar", () => {
      expect(usd0(94.6)).toBe("$95");
    });
    it("handles negatives", () => {
      expect(usd0(-120000)).toBe("-$120,000");
    });
    it("coerces non-finite to $0", () => {
      expect(usd0(NaN)).toBe("$0");
      expect(usd0(Infinity)).toBe("$0");
    });
  });

  describe("usd2", () => {
    it("keeps two decimals", () => {
      expect(usd2(18.8)).toBe("$18.80");
      expect(usd2(129.6)).toBe("$129.60");
    });
  });

  describe("pct", () => {
    it("formats one decimal with a percent sign", () => {
      expect(pct(7.4074)).toBe("7.4%");
      expect(pct(100)).toBe("100.0%");
    });
    it("coerces non-finite to 0.0%", () => {
      expect(pct(NaN)).toBe("0.0%");
    });
  });

  describe("num0", () => {
    it("rounds and groups thousands", () => {
      expect(num0(288.4)).toBe("288");
      expect(num0(1500)).toBe("1,500");
    });
  });

  describe("round2", () => {
    it("rounds to two decimals", () => {
      expect(round2(1.005)).toBeCloseTo(1.0, 5); // float artifact tolerated
      expect(round2(129.599)).toBe(129.6);
    });
  });

  describe("clampPct", () => {
    it("clamps to [0, 100]", () => {
      expect(clampPct(-5)).toBe(0);
      expect(clampPct(150)).toBe(100);
      expect(clampPct(42)).toBe(42);
    });
    it("maps non-finite to 0", () => {
      expect(clampPct(NaN)).toBe(0);
      expect(clampPct(Infinity)).toBe(0); // non-finite guard fires first
    });
  });

  describe("nonNeg", () => {
    it("passes positive finite numbers through", () => {
      expect(nonNeg(120)).toBe(120);
    });
    it("zeroes out negatives, zero, and non-finite", () => {
      expect(nonNeg(-1)).toBe(0);
      expect(nonNeg(0)).toBe(0);
      expect(nonNeg(NaN)).toBe(0);
      expect(nonNeg(Infinity)).toBe(0);
    });
  });
});
