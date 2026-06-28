import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET, POST, DELETE, PATCH } from "../route";

// Every verb here is admin-only (requireAdminKey, exercised for real via the
// x-admin-key header that createAdminRequest carries). These tests lock that
// gate plus per-client scoping on the mutating verbs.
const mockDb = vi.mocked(db, true);
const mockExecRaw = vi.mocked(db.$executeRaw);

const dbRow = {
  month: "2026-06",
  spend: "1000",
  leads: 10,
  cpl: "100",
  move_ins: 2,
  cost_per_move_in: "500",
  roas: "3",
  occupancy_delta: "1.5",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockExecRaw.mockResolvedValue(0 as never);
});

describe("GET /api/client-campaigns", () => {
  it("rejects a non-admin caller before any query", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.client_campaigns = { findMany: vi.fn().mockResolvedValue([]) };
    const res = await GET(createMockRequest("/api/client-campaigns"));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(200);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_campaigns.findMany).not.toHaveBeenCalled();
  });

  it("returns all campaigns (Decimal→Number) for an admin with no code", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.client_campaigns = { findMany: vi.fn().mockResolvedValue([dbRow]) };
    const res = await GET(createAdminRequest("/api/client-campaigns"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.campaigns[0].spend).toBe(1000); // coerced from "1000"
    expect(body.campaigns[0].moveIns).toBe(2);
    expect(body.campaigns[0].roas).toBe(3);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_campaigns.findMany.mock.calls[0][0].where).toBeUndefined();
  });

  it("scopes to the resolved client when a code is given", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue({ id: "cl-1" }) };
    // @ts-expect-error — db is a vi mock
    mockDb.client_campaigns = { findMany: vi.fn().mockResolvedValue([]) };
    const res = await GET(createAdminRequest("/api/client-campaigns?code=AC"));
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_campaigns.findMany.mock.calls[0][0].where.client_id).toBe("cl-1");
  });

  it("404s when the access code resolves to no client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue(null) };
    const res = await GET(createAdminRequest("/api/client-campaigns?code=BAD"));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/client-campaigns", () => {
  it("rejects a non-admin caller before any write", async () => {
    const res = await POST(
      createMockRequest("/api/client-campaigns", {
        method: "POST",
        body: { code: "AC", campaign: { month: "2026-06", spend: 100, leads: 5 } },
      })
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(mockExecRaw).not.toHaveBeenCalled();
  });

  it("400s when required campaign fields are missing", async () => {
    const res = await POST(
      createAdminRequest("/api/client-campaigns", {
        method: "POST",
        body: { code: "AC", campaign: { month: "2026-06" } }, // no spend/leads
      })
    );
    expect(res.status).toBe(400);
  });

  it("404s when the access code resolves to no client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue(null) };
    const res = await POST(
      createAdminRequest("/api/client-campaigns", {
        method: "POST",
        body: { code: "BAD", campaign: { month: "2026-06", spend: 100, leads: 5 } },
      })
    );
    expect(res.status).toBe(404);
  });

  it("computes CPL from spend/leads when not supplied and upserts scoped to the client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue({ id: "cl-1" }) };
    // @ts-expect-error — db is a vi mock
    mockDb.client_campaigns = { findMany: vi.fn().mockResolvedValue([]) };

    const res = await POST(
      createAdminRequest("/api/client-campaigns", {
        method: "POST",
        body: { code: "AC", campaign: { month: "2026-06", spend: 1000, leads: 10 } },
      })
    );
    expect(res.status).toBe(200);

    // INSERT bind order: client_id, month, spend, leads, cpl, ...
    const binds = mockExecRaw.mock.calls[0];
    expect(binds[1]).toBe("cl-1"); // scoped to the resolved client
    expect(binds[3]).toBe(1000); // spend
    expect(binds[4]).toBe(10); // leads
    expect(binds[5]).toBe(100); // cpl = spend / leads, computed
  });

  it("guards divide-by-zero: zero leads yields CPL 0, not NaN/Infinity", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue({ id: "cl-1" }) };
    // @ts-expect-error — db is a vi mock
    mockDb.client_campaigns = { findMany: vi.fn().mockResolvedValue([]) };

    await POST(
      createAdminRequest("/api/client-campaigns", {
        method: "POST",
        body: { code: "AC", campaign: { month: "2026-06", spend: 500, leads: 0 } },
      })
    );
    const binds = mockExecRaw.mock.calls[0];
    expect(binds[5]).toBe(0); // cpl
    expect(Number.isFinite(binds[5])).toBe(true);
  });
});

describe("DELETE /api/client-campaigns", () => {
  it("rejects a non-admin caller before any delete", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.client_campaigns = { deleteMany: vi.fn(), findMany: vi.fn() };
    const res = await DELETE(
      createMockRequest("/api/client-campaigns", {
        method: "DELETE",
        body: { code: "AC", month: "2026-06" },
      })
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_campaigns.deleteMany).not.toHaveBeenCalled();
  });

  it("400s when month is missing", async () => {
    const res = await DELETE(
      createAdminRequest("/api/client-campaigns", {
        method: "DELETE",
        body: { code: "AC" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("deletes only the named month for the resolved client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue({ id: "cl-1" }) };
    // @ts-expect-error — db is a vi mock
    mockDb.client_campaigns = {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    };
    const res = await DELETE(
      createAdminRequest("/api/client-campaigns", {
        method: "DELETE",
        body: { code: "AC", month: "2026-06" },
      })
    );
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    const where = mockDb.client_campaigns.deleteMany.mock.calls[0][0].where;
    expect(where.client_id).toBe("cl-1"); // never deletes another client's rows
    expect(where.month).toBe("2026-06");
  });
});

describe("PATCH /api/client-campaigns", () => {
  it("rejects a non-admin caller before any update", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { update: vi.fn() };
    const res = await PATCH(
      createMockRequest("/api/client-campaigns", {
        method: "PATCH",
        body: { code: "AC", monthlyGoal: 12 },
      })
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.clients.update).not.toHaveBeenCalled();
  });

  it("400s when code is missing", async () => {
    const res = await PATCH(
      createAdminRequest("/api/client-campaigns", {
        method: "PATCH",
        body: { monthlyGoal: 12 },
      })
    );
    expect(res.status).toBe(400);
  });

  it("clamps an out-of-range monthly goal into [0, 999]", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { update: vi.fn().mockResolvedValue({}) };
    const res = await PATCH(
      createAdminRequest("/api/client-campaigns", {
        method: "PATCH",
        body: { code: "AC", monthlyGoal: 5000 },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monthlyGoal).toBe(999);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.clients.update.mock.calls[0][0].data.monthly_goal).toBe(999);
  });

  it("floors a negative monthly goal to 0", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { update: vi.fn().mockResolvedValue({}) };
    const res = await PATCH(
      createAdminRequest("/api/client-campaigns", {
        method: "PATCH",
        body: { code: "AC", monthlyGoal: -10 },
      })
    );
    const body = await res.json();
    expect(body.monthlyGoal).toBe(0);
  });
});
