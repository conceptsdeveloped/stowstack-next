import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminRequest, createMockRequest } from "@/test/helpers";

vi.mock("@/lib/db", () => ({
  db: {
    facilities: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { GET } from "../portfolio/route";

const m = db as unknown as {
  facilities: { findMany: ReturnType<typeof vi.fn> };
  $queryRaw: ReturnType<typeof vi.fn>;
};

const PATH = "/api/ecri/portfolio";

function tenantRow(overrides: Record<string, unknown> = {}) {
  return {
    tenant_id: "t1",
    tenant_name: "Jane",
    email: null,
    unit: "A1",
    size_label: "10x10",
    unit_type: null,
    current_rate: 100,
    move_in_date: "2024-01-01",
    market_rate: 150,
    bucket: "very_low",
    sensitivity_score: 0.2,
    tenure_months: 30,
    months_since_last_increase: 12,
    ecri_status: null,
    ecri_sent_at: null,
    ...overrides,
  };
}

describe("GET /api/ecri/portfolio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without an admin key", async () => {
    const res = await GET(createMockRequest(PATH));
    expect(res.status).toBe(401);
  });

  it("aggregates per-facility totals and sorts by annual lift desc", async () => {
    m.facilities.findMany.mockResolvedValue([
      { id: "fac-small", name: "Small Co", location: "A, MI" },
      { id: "fac-big", name: "Big Co", location: "B, MI" },
    ]);
    // First facility (small): one tenant, lift 12. Second (big): two tenants, lift 12 each = 24.
    m.$queryRaw
      .mockResolvedValueOnce([tenantRow({ tenant_id: "s1" })])
      .mockResolvedValueOnce([
        tenantRow({ tenant_id: "b1", unit: "B1" }),
        tenantRow({ tenant_id: "b2", unit: "B2" }),
      ]);

    const res = await GET(createAdminRequest(PATH));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.totalCandidates).toBe(3);
    expect(body.totalMonthlyLift).toBe(36);
    expect(body.totalAnnualLift).toBe(432);

    // Big Co (24/mo) sorts ahead of Small Co (12/mo)
    expect(body.facilities.map((f: { facilityName: string }) => f.facilityName)).toEqual([
      "Big Co",
      "Small Co",
    ]);
    expect(body.facilities[0].count).toBe(2);
    expect(body.facilities[0].totalMonthlyLift).toBe(24);
  });

  it("includes facilities with zero opportunity (count 0) in the list", async () => {
    m.facilities.findMany.mockResolvedValue([
      { id: "fac-empty", name: "Empty Co", location: null },
    ]);
    m.$queryRaw.mockResolvedValueOnce([]); // no under-market tenants

    const res = await GET(createAdminRequest(PATH));
    const body = await res.json();
    expect(body.totalCandidates).toBe(0);
    expect(body.facilities).toHaveLength(1);
    expect(body.facilities[0].count).toBe(0);
  });

  it("returns 500 when aggregation throws", async () => {
    m.facilities.findMany.mockRejectedValue(new Error("db down"));
    const res = await GET(createAdminRequest(PATH));
    expect(res.status).toBe(500);
  });
});
