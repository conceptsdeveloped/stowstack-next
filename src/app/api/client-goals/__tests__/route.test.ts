import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET, PATCH } from "../route";

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/client-goals", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await GET(createMockRequest("/api/client-goals"));
    expect(res.status).toBe(401);
  });

  it("computes current-month actual move-ins by event date and returns goal shape", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "client-1", facility_id: "fac-1" }),
      findUnique: vi.fn().mockResolvedValue({ monthly_goal: 10 }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.lead_status_events = { count: vi.fn().mockResolvedValue(4) };
    // @ts-expect-error — db is a vi mock
    mockDb.client_goals = {
      upsert: vi.fn().mockResolvedValue({ period_month: new Date(Date.UTC(2026, 5, 1)), target: 10, actual: 4 }),
      findMany: vi.fn().mockResolvedValue([
        { period_month: new Date(Date.UTC(2026, 5, 1)), target: 10, actual: 4 },
      ]),
    };

    const res = await GET(
      createMockRequest("/api/client-goals?accessCode=ABC123&email=owner@example.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current.target).toBe(10);
    expect(body.current.actual).toBe(4);
    expect(body.current.pct).toBe(40);
    expect(body.goals).toHaveLength(1);

    // Move-ins counted by move-in EVENT date, scoped to the resolved facility.
    // @ts-expect-error — inspecting the mock
    const where = mockDb.lead_status_events.count.mock.calls[0][0].where;
    expect(where.to_status).toBe("moved_in");
    expect(where.partial_leads.is.facility_id).toBe("fac-1");
    expect(where.changed_at.gte).toBeInstanceOf(Date);
    expect(where.changed_at.lt).toBeInstanceOf(Date);
  });

  it("returns pct null when no target is set (no divide-by-zero)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "client-1", facility_id: "fac-1" }),
      findUnique: vi.fn().mockResolvedValue({ monthly_goal: 0 }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.lead_status_events = { count: vi.fn().mockResolvedValue(2) };
    // @ts-expect-error — db is a vi mock
    mockDb.client_goals = {
      upsert: vi.fn().mockResolvedValue({ period_month: new Date(Date.UTC(2026, 5, 1)), target: 0, actual: 2 }),
      findMany: vi.fn().mockResolvedValue([]),
    };

    const res = await GET(
      createMockRequest("/api/client-goals?accessCode=ABC123&email=owner@example.com")
    );
    const body = await res.json();
    expect(body.current.pct).toBeNull();
    expect(body.current.actual).toBe(2);
  });
});

describe("PATCH /api/client-goals", () => {
  it("rejects non-admin callers", async () => {
    const res = await PATCH(
      createMockRequest("/api/client-goals", {
        method: "PATCH",
        body: { clientId: "client-1", month: "2026-06", target: 12 },
      })
    );
    expect(res.status).toBe(401);
  });

  it("rejects a malformed month", async () => {
    const res = await PATCH(
      createAdminRequest("/api/client-goals", {
        method: "PATCH",
        body: { clientId: "client-1", month: "June", target: 12 },
      })
    );
    expect(res.status).toBe(400);
  });

  it("upserts the target for an admin with a valid payload", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue({ id: "client-1" }) };
    // @ts-expect-error — db is a vi mock
    mockDb.client_goals = { upsert: vi.fn().mockResolvedValue({}) };

    const res = await PATCH(
      createAdminRequest("/api/client-goals", {
        method: "PATCH",
        body: { clientId: "client-1", month: "2026-06", target: 12 },
      })
    );
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    const arg = mockDb.client_goals.upsert.mock.calls[0][0];
    expect(arg.update.target).toBe(12);
    expect(arg.where.client_id_period_month.period_month).toBeInstanceOf(Date);
  });
});
