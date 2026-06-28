import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { POST } from "../route";

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
  });

  it("rejects an unknown action", async () => {
    const res = await POST(adminPost({ action: "frobnicate", facility_id: "f1" }));
    expect(res.status).toBe(400);
  });
});
