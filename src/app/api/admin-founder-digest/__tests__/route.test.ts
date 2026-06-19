import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminRequest, createMockRequest } from "@/test/helpers";

// This route uses Prisma model methods, not the raw-query mock from
// src/test/setup.ts, so this file supplies its own db mock covering only the
// methods the route calls.
vi.mock("@/lib/db", () => ({
  db: {
    partial_leads: { count: vi.fn(), groupBy: vi.fn() },
    clients: { count: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { GET } from "../route";

const m = db as unknown as {
  partial_leads: {
    count: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  clients: { count: ReturnType<typeof vi.fn> };
};

const PATH = "/api/admin-founder-digest";

describe("GET /api/admin-founder-digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without an admin key", async () => {
    const res = await GET(createMockRequest(PATH));
    expect(res.status).toBe(401);
  });

  it("returns aggregate funnel counts for an authorized request", async () => {
    // Promise.all call order: partial_leads.count x3, clients.count x2, groupBy.
    m.partial_leads.count
      .mockResolvedValueOnce(10) // audit leads, 24h
      .mockResolvedValueOnce(40) // audit leads, 7d
      .mockResolvedValueOnce(3); // converted, 7d
    m.clients.count
      .mockResolvedValueOnce(2) // signed clients, 24h
      .mockResolvedValueOnce(8); // signed clients, 7d
    m.partial_leads.groupBy.mockResolvedValueOnce([
      { lead_status: "partial", _count: { _all: 30 } },
      { lead_status: "client_signed", _count: { _all: 8 } },
    ]);

    const res = await GET(createAdminRequest(PATH));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.auditFunnel).toEqual({
      newLeads24h: 10,
      newLeads7d: 40,
      converted7d: 3,
    });
    expect(body.signedClients).toEqual({ new24h: 2, new7d: 8 });
    expect(body.leadStatus7d).toEqual({ partial: 30, client_signed: 8 });
    expect(typeof body.generatedAt).toBe("string");
    expect(body.windows).toHaveProperty("day");
    expect(body.windows).toHaveProperty("week");
  });

  it("maps a null lead_status group to 'unknown'", async () => {
    m.partial_leads.count.mockResolvedValue(0);
    m.clients.count.mockResolvedValue(0);
    m.partial_leads.groupBy.mockResolvedValueOnce([
      { lead_status: null, _count: { _all: 5 } },
    ]);

    const res = await GET(createAdminRequest(PATH));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leadStatus7d).toEqual({ unknown: 5 });
  });
});
