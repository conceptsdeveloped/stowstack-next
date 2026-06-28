// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateOccupancyPdf, type OccupancyPdfProps } from "@/lib/occupancy-pdf";

// Exercises the REAL @react-pdf renderer (the route test mocks it), so a render
// crash on any branch — null occupancy, empty unit mix, null delinquency — is
// caught here instead of 500ing the portal PDF download in prod.

const isPdf = (buf: Buffer) => buf.subarray(0, 5).toString("latin1") === "%PDF-";

const fullProps: OccupancyPdfProps = {
  facilityName: "Acme Storage",
  generatedAt: "2026-06-28T00:00:00.000Z",
  signedAt: "2026-01-15T00:00:00.000Z",
  occupancy: {
    total_units: 100,
    occupied_units: 88,
    occupancy_pct: 88,
    move_ins_mtd: 6,
    move_outs_mtd: 2,
    delinquency_pct: 4.5,
  },
  unitMix: [
    { type: "Climate", size: "10x10", total: 40, occupied: 36, rate: 145 },
    { type: "Drive-up", size: "10x20", total: 60, occupied: 52, rate: 210 },
  ],
};

describe("generateOccupancyPdf", () => {
  it("renders a valid PDF for the full report", async () => {
    const buf = await generateOccupancyPdf(fullProps);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    expect(isPdf(buf)).toBe(true);
  });

  it("renders the degraded path (no PMS data, empty unit mix) without throwing", async () => {
    const buf = await generateOccupancyPdf({
      ...fullProps,
      signedAt: null,
      occupancy: null,
      unitMix: [],
    });
    expect(isPdf(buf)).toBe(true);
  });

  it("renders when delinquency is null (the conditional KPI is skipped)", async () => {
    const buf = await generateOccupancyPdf({
      ...fullProps,
      occupancy: { ...fullProps.occupancy!, delinquency_pct: null },
    });
    expect(isPdf(buf)).toBe(true);
  });

  it("tolerates a zero-total unit-mix row (no divide-by-zero in occ %)", async () => {
    const buf = await generateOccupancyPdf({
      ...fullProps,
      unitMix: [{ type: "New", size: "", total: 0, occupied: 0, rate: 0 }],
    });
    expect(isPdf(buf)).toBe(true);
  });
});
