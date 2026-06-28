import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest } from "@/test/helpers";

// Cron auth always passes here — we're testing the processing/notify behavior,
// not the secret gate (covered by cron-auth's own tests).
vi.mock("@/lib/cron-auth", () => ({ verifyCronSecret: () => true }));
vi.mock("@/lib/cron-runner", () => ({ notifyCronFailure: vi.fn() }));
// Keep the real parser/anomaly/summary logic; stub only the DB-writing import so
// the test needn't mock every facility_pms_* table.
vi.mock("@/lib/pms-import", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pms-import")>();
  return { ...actual, importParsed: vi.fn().mockResolvedValue({ type: "rent_roll", imported: 2 }) };
});
vi.mock("@/lib/report-notify", () => ({ notifyClientsReportReady: vi.fn() }));

import { notifyClientsReportReady } from "@/lib/report-notify";
import { GET } from "../route";

const mockDb = vi.mocked(db, true);
const mockNotify = vi.mocked(notifyClientsReportReady);

// A clean rent-roll CSV: classifies as rent_roll, has the required `unit`
// column, no anomalies → processes successfully.
const CLEAN_RENT_ROLL = "unit,tenant,rent\nA1,Jane,100\nA2,Bob,120\n";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => CLEAN_RENT_ROLL }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/cron/process-pms-uploads — report-ready notification", () => {
  it("notifies the facility's client(s) when a report processes successfully", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.pms_reports = {
      findMany: vi.fn().mockResolvedValue([
        { id: "r1", facility_id: "f1", file_url: "https://blob/x.csv", report_type: "rent_roll", mime_type: "text/csv" },
      ]),
      update: vi.fn().mockResolvedValue({}),
    };

    const res = await GET(createMockRequest("/api/cron/process-pms-uploads"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(1);
    // The report flipped to processed → the client is told fresh data is live.
    expect(mockNotify).toHaveBeenCalledWith("f1");
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it("does NOT notify when a report is held for review (non-CSV)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.pms_reports = {
      findMany: vi.fn().mockResolvedValue([
        { id: "r2", facility_id: "f1", file_url: "https://blob/x.pdf", report_type: "rent_roll", mime_type: "application/pdf" },
      ]),
      update: vi.fn().mockResolvedValue({}),
    };

    const res = await GET(createMockRequest("/api/cron/process-pms-uploads"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.needsReview).toBe(1);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("notifies once per processed report (idempotency dedupes same-facility emails)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.pms_reports = {
      findMany: vi.fn().mockResolvedValue([
        { id: "r1", facility_id: "f1", file_url: "https://blob/a.csv", report_type: "rent_roll", mime_type: "text/csv" },
        { id: "r2", facility_id: "f2", file_url: "https://blob/b.csv", report_type: "rent_roll", mime_type: "text/csv" },
      ]),
      update: vi.fn().mockResolvedValue({}),
    };

    const res = await GET(createMockRequest("/api/cron/process-pms-uploads"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(2);
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledWith("f1");
    expect(mockNotify).toHaveBeenCalledWith("f2");
  });
});
