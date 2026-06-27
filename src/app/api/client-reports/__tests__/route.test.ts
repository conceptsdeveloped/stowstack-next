import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET } from "../route";

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/client-reports", () => {
  it("401s without portal auth", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(createMockRequest("/api/client-reports"));
    expect(res.status).toBe(401);
  });

  it("400s an admin that does not name a target client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn() };
    const res = await GET(createAdminRequest("/api/client-reports"));
    expect(res.status).toBe(400);
  });

  it("computes real MTD move-ins/outs from lead events and delinquency from the snapshot", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
      findUnique: vi
        .fn()
        .mockResolvedValue({ facility_id: "f1", signed_at: null }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_snapshots = {
      findMany: vi.fn().mockResolvedValue([
        {
          snapshot_date: new Date("2026-06-01T00:00:00Z"),
          occupancy_pct: 90,
          total_units: 100,
          occupied_units: 90,
          delinquency_pct: 4.5,
        },
      ]),
    };
    // First count() is move_ins, second is move_outs (Promise.all order).
    // @ts-expect-error — db is a vi mock
    mockDb.lead_status_events = {
      count: vi.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_units = { findMany: vi.fn().mockResolvedValue([]) };

    const res = await GET(
      createMockRequest("/api/client-reports?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.occupancy.move_ins_mtd).toBe(3);
    expect(body.occupancy.move_outs_mtd).toBe(1);
    expect(body.occupancy.delinquency_pct).toBe(4.5);

    // Move-ins counted by move-in EVENT, scoped to the resolved facility, MTD.
    // @ts-expect-error — inspecting the mock
    const inWhere = mockDb.lead_status_events.count.mock.calls[0][0].where;
    expect(inWhere.to_status).toBe("moved_in");
    expect(inWhere.partial_leads.is.facility_id).toBe("f1");
    expect(inWhere.changed_at.gte).toBeInstanceOf(Date);
    expect(inWhere.changed_at.lt).toBeInstanceOf(Date);
    // @ts-expect-error — inspecting the mock
    const outWhere = mockDb.lead_status_events.count.mock.calls[1][0].where;
    expect(outWhere.to_status).toBe("moved_out");
    expect(outWhere.partial_leads.is.facility_id).toBe("f1");
  });

  it("leaves occupancy null when the facility has no PMS snapshots", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
      findUnique: vi
        .fn()
        .mockResolvedValue({ facility_id: "f1", signed_at: null }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_snapshots = { findMany: vi.fn().mockResolvedValue([]) };
    // @ts-expect-error — db is a vi mock
    mockDb.lead_status_events = { count: vi.fn() };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_units = { findMany: vi.fn().mockResolvedValue([]) };

    const res = await GET(
      createMockRequest("/api/client-reports?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.occupancy).toBeNull();
    // No snapshot → no MTD computation attempted.
    // @ts-expect-error — inspecting the mock
    expect(mockDb.lead_status_events.count).not.toHaveBeenCalled();
  });
});
