import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";

vi.mock("@/lib/report-notify", () => ({ notifyClientsReportReady: vi.fn() }));
import { notifyClientsReportReady } from "@/lib/report-notify";
import { POST } from "../route";

const mockNotify = vi.mocked(notifyClientsReportReady);

// Focus: the M7 `process_report` founder-approval action — its authz/tenant
// isolation (an admin importing a report into a facility is an IDOR surface)
// and the staged-data happy path. The shared importer itself is unit-tested in
// src/lib/__tests__/pms-import.test.ts.
const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

function adminPost(body: unknown) {
  return createAdminRequest("/api/pms-data", { method: "POST", body });
}

describe("POST /api/pms-data — process_report (approval gate)", () => {
  it("401s a request with no admin/owner auth", async () => {
    const res = await POST(
      createMockRequest("/api/pms-data", {
        method: "POST",
        body: { action: "process_report", facility_id: "f1", report_id: "r1" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("400s when facility_id is missing", async () => {
    const res = await POST(adminPost({ action: "process_report", report_id: "r1" }));
    expect(res.status).toBe(400);
  });

  it("400s when report_id is missing", async () => {
    const res = await POST(adminPost({ action: "process_report", facility_id: "f1" }));
    expect(res.status).toBe(400);
  });

  it("404s and imports NOTHING when the report belongs to another facility (IDOR guard)", async () => {
    // Report exists but is owned by facility f2; the admin names f1.
    // @ts-expect-error — db is a vi mock
    mockDb.pms_reports = {
      findUnique: vi.fn().mockResolvedValue({ id: "r1", facility_id: "f2" }),
      update: vi.fn(),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_rent_roll = { deleteMany: vi.fn(), createMany: vi.fn() };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_snapshots = { upsert: vi.fn() };

    const res = await POST(
      adminPost({ action: "process_report", facility_id: "f1", report_id: "r1" })
    );

    expect(res.status).toBe(404);
    // No write to the (wrong) facility's data, and no status mutation.
    // @ts-expect-error — inspecting the mock
    expect(mockDb.facility_pms_rent_roll.createMany).not.toHaveBeenCalled();
    // @ts-expect-error — inspecting the mock
    expect(mockDb.facility_pms_snapshots.upsert).not.toHaveBeenCalled();
    // @ts-expect-error — inspecting the mock
    expect(mockDb.pms_reports.update).not.toHaveBeenCalled();
  });

  it("422s when the report has no staged data and no CSV file to fall back to", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.pms_reports = {
      findUnique: vi.fn().mockResolvedValue({
        id: "r1",
        facility_id: "f1",
        report_data: null,
        file_url: null,
        mime_type: "application/pdf",
      }),
      update: vi.fn(),
    };

    const res = await POST(
      adminPost({ action: "process_report", facility_id: "f1", report_id: "r1" })
    );
    expect(res.status).toBe(422);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.pms_reports.update).not.toHaveBeenCalled();
  });

  it("imports staged rent-roll rows and flips the report to processed", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.pms_reports = {
      findUnique: vi.fn().mockResolvedValue({
        id: "r1",
        facility_id: "f1",
        report_data: {
          type: "rent_roll",
          snapshotDate: "2026-06-01T00:00:00.000Z",
          mappedRows: [
            { unit: "A1", size_label: "10x10", tenant_name: "Jane", rent_rate: "100", total_due: "100", days_past_due: "0" },
            { unit: "A2", size_label: "10x10", tenant_name: "", rent_rate: "120", total_due: "0", days_past_due: "0" },
          ],
        },
        file_url: "https://blob/x.csv",
        mime_type: "text/csv",
      }),
      update: vi.fn().mockResolvedValue({}),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_rent_roll = {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_snapshots = { upsert: vi.fn().mockResolvedValue({}) };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_units = { upsert: vi.fn().mockResolvedValue({}) };

    const res = await POST(
      adminPost({ action: "process_report", facility_id: "f1", report_id: "r1" })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(2);
    expect(body.type).toBe("rent_roll");

    // Snapshot written for the imported facility + unit mix derived.
    // @ts-expect-error — inspecting the mock
    expect(mockDb.facility_pms_snapshots.upsert).toHaveBeenCalledOnce();
    // @ts-expect-error — inspecting the mock
    expect(mockDb.facility_pms_units.upsert).toHaveBeenCalledOnce();
    // Report flipped to processed by an admin approval.
    // @ts-expect-error — inspecting the mock
    const update = mockDb.pms_reports.update.mock.calls[0][0];
    expect(update.where.id).toBe("r1");
    expect(update.data.status).toBe("processed");
    expect(update.data.processed_by).toBe("admin");
    // Client(s) notified that fresh portal data is live.
    expect(mockNotify).toHaveBeenCalledWith("f1");
  });

  it("does NOT notify clients when the report belongs to another facility (IDOR)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.pms_reports = {
      findUnique: vi.fn().mockResolvedValue({ id: "r1", facility_id: "f2" }),
      update: vi.fn(),
    };
    const res = await POST(
      adminPost({ action: "process_report", facility_id: "f1", report_id: "r1" })
    );
    expect(res.status).toBe(404);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("rejects an unknown action", async () => {
    const res = await POST(adminPost({ action: "frobnicate", facility_id: "f1" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/pms-data — import_rent_roll (report-ready notification)", () => {
  const rows = [
    { unit: "A1", size_label: "10x10", tenant_name: "Jane", rent_rate: "100", total_due: "100", days_past_due: "0" },
    { unit: "A2", size_label: "10x10", tenant_name: "", rent_rate: "120", total_due: "0", days_past_due: "0" },
  ];

  function mockRentRollTables() {
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_rent_roll = {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_snapshots = { upsert: vi.fn().mockResolvedValue({}) };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_units = { upsert: vi.fn().mockResolvedValue({}) };
  }

  it("401s without admin/owner auth (no import, no notify)", async () => {
    mockRentRollTables();
    const res = await POST(
      createMockRequest("/api/pms-data", {
        method: "POST",
        body: { action: "import_rent_roll", facility_id: "f1", snapshot_date: "2026-06-01", rows },
      })
    );
    expect(res.status).toBe(401);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.facility_pms_rent_roll.createMany).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("400s when rows are missing", async () => {
    const res = await POST(
      adminPost({ action: "import_rent_roll", facility_id: "f1", snapshot_date: "2026-06-01" })
    );
    expect(res.status).toBe(400);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("imports the roll and notifies the facility's client(s)", async () => {
    mockRentRollTables();
    const res = await POST(
      adminPost({ action: "import_rent_roll", facility_id: "f1", snapshot_date: "2026-06-01", rows })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(2);
    // Fresh occupancy/unit-mix is live → the client is told.
    expect(mockNotify).toHaveBeenCalledWith("f1");
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it("import_aging does NOT notify (single notice on the primary roll import)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_aging = {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    };
    const agingRows = [
      { unit: "A1", bucket_0_30: "100", bucket_31_60: "0", bucket_61_90: "0", bucket_over_90: "0" },
    ];
    const res = await POST(
      adminPost({ action: "import_aging", facility_id: "f1", snapshot_date: "2026-06-01", rows: agingRows })
    );
    expect(res.status).toBe(200);
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
