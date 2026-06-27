import { describe, it, expect } from "vitest";
import {
  buildShareUrl,
  numParam,
  strParam,
  hasAnyParam,
} from "../tools/share";

const ORIGIN = "https://storageads.com";

describe("buildShareUrl", () => {
  it("appends provided params as a query string", () => {
    const url = buildShareUrl(ORIGIN, "/tools/valuation-calculator", {
      noi: 300000,
      capPct: 6.5,
    });
    expect(url).toBe(
      "https://storageads.com/tools/valuation-calculator?noi=300000&capPct=6.5",
    );
  });

  it("keeps explicit zeros (a deliberately-entered 0 must round-trip)", () => {
    const url = buildShareUrl(ORIGIN, "/x", { a: 0, b: 5 });
    expect(url).toContain("a=0");
    expect(url).toContain("b=5");
  });

  it("drops empty strings and non-finite numbers", () => {
    const url = buildShareUrl(ORIGIN, "/x", {
      name: "",
      bad: Number.NaN,
      good: 3,
    });
    expect(url).toBe("https://storageads.com/x?good=3");
  });

  it("returns a bare URL when there are no usable params", () => {
    expect(buildShareUrl(ORIGIN, "/x", { name: "", bad: undefined })).toBe(
      "https://storageads.com/x",
    );
  });

  it("includes string params verbatim", () => {
    const url = buildShareUrl(ORIGIN, "/x", { name: "Acme Storage" });
    expect(url).toBe("https://storageads.com/x?name=Acme+Storage");
  });
});

describe("numParam", () => {
  it("reads a finite number", () => {
    const p = new URLSearchParams("noi=300000");
    expect(numParam(p, "noi")).toBe(300000);
  });

  it("falls back when absent, empty, or non-numeric", () => {
    const p = new URLSearchParams("a=&b=abc");
    expect(numParam(p, "missing", 6.5)).toBe(6.5);
    expect(numParam(p, "a", 6.5)).toBe(6.5);
    expect(numParam(p, "b", 6.5)).toBe(6.5);
  });
});

describe("strParam", () => {
  it("reads a string or falls back", () => {
    const p = new URLSearchParams("name=Acme");
    expect(strParam(p, "name")).toBe("Acme");
    expect(strParam(p, "missing", "x")).toBe("x");
  });
});

describe("hasAnyParam", () => {
  it("is true when any key is present", () => {
    const p = new URLSearchParams("capPct=6.5");
    expect(hasAnyParam(p, ["noi", "capPct"])).toBe(true);
    expect(hasAnyParam(p, ["noi", "value"])).toBe(false);
  });
});
