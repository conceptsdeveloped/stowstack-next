import { describe, it, expect } from "vitest";
import { rowsToCsv, csvFileName } from "../tools/csv";

describe("rowsToCsv", () => {
  it("quotes every cell and joins rows with newlines", () => {
    const csv = rowsToCsv([
      ["Metric", "Value"],
      ["NOI", "$300,000"],
    ]);
    expect(csv).toBe('"Metric","Value"\n"NOI","$300,000"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    const csv = rowsToCsv([['He said "hi"', "ok"]]);
    expect(csv).toBe('"He said ""hi""","ok"');
  });

  it("handles an empty row set", () => {
    expect(rowsToCsv([])).toBe("");
  });
});

describe("csvFileName", () => {
  it("slugifies the facility name", () => {
    expect(csvFileName("noi", "Pawpaw Storage #2")).toBe("noi-pawpaw-storage-2.csv");
  });

  it("falls back to 'storage' when the name is empty or absent", () => {
    expect(csvFileName("valuation", "")).toBe("valuation-storage.csv");
    expect(csvFileName("break-even")).toBe("break-even-storage.csv");
  });

  it("trims leading and trailing separators", () => {
    expect(csvFileName("noi", "  --Acme--  ")).toBe("noi-acme.csv");
  });
});
