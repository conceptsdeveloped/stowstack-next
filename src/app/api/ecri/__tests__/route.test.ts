import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminRequest, createMockRequest } from "@/test/helpers";

// computeEcriForFacility issues one db.$queryRaw tagged-template call returning
// tenant-centric rows (tenants LEFT JOIN sensitivity LEFT JOIN ecri upsell).
// The global setup (src/test/setup.ts) mocks @/lib/db with a $queryRaw vi.fn.
import { db } from "@/lib/db";
import { GET } from "../route";

const m = db as unknown as { $queryRaw: ReturnType<typeof vi.fn> };

const FACILITY_ID = "11111111-1111-1111-1111-111111111111";
const PATH = `/api/ecri?facilityId=${FACILITY_ID}`;

/** A single joined tenant row as the SQL would return it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    tenant_id: "aaaaaaaa-0000-0000-0000-000000000001",
    tenant_name: "Jane Doe",
    email: "jane@example.com",
    unit: "A1",
    size_label: "10x10",
    unit_type: "Climate",
    current_rate: 100,
    move_in_date: "2024-01-01",
    market_rate: 150,
    street_rate: null,
    bucket: "very_low", // 12% cap
    sensitivity_score: 0.2,
    tenure_months: 30,
    months_since_last_increase: 18,
    ecri_status: null,
    ecri_sent_at: null,
    ...overrides,
  };
}

describe("GET /api/ecri", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.$queryRaw.mockResolvedValue([]);
  });

  it("returns 401 without an admin key", async () => {
    const res = await GET(createMockRequest(PATH));
    expect(res.status).toBe(401);
  });

  it("returns 400 when facilityId is missing", async () => {
    const res = await GET(createAdminRequest("/api/ecri"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/facilityId/i);
  });

  it("returns an empty result set when no active tenants are under market", async () => {
    m.$queryRaw.mockResolvedValue([]);
    const res = await GET(createAdminRequest(PATH));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
    expect(body.tenants).toEqual([]);
    expect(body.totalMonthlyLift).toBe(0);
    expect(body.totalAnnualLift).toBe(0);
    expect(body.worked).toBe(0);
  });

  it("excludes tenants already at or above market", async () => {
    m.$queryRaw.mockResolvedValue([
      row({ unit: "under", current_rate: 100, market_rate: 150 }),
      row({ unit: "at", tenant_id: "t-at", current_rate: 150, market_rate: 150 }),
      row({ unit: "above", tenant_id: "t-above", current_rate: 160, market_rate: 150 }),
    ]);
    const res = await GET(createAdminRequest(PATH));
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.tenants[0].unit).toBe("under");
  });

  it("applies the sensitivity cap and computes lift, sorted desc", async () => {
    m.$queryRaw.mockResolvedValue([
      // very_low: 12% cap on 100, market 150 -> suggested 112, lift 12
      row({ tenant_id: "sticky", unit: "sticky", current_rate: 100, market_rate: 150, bucket: "very_low" }),
      // high: 5% cap on 200, market 999 -> suggested 210, lift 10
      row({ tenant_id: "flight", unit: "flight", current_rate: 200, market_rate: 999, bucket: "high" }),
    ]);
    const res = await GET(createAdminRequest(PATH));
    const body = await res.json();

    expect(body.count).toBe(2);
    // sticky lift 12 sorts before flight lift 10
    expect(body.tenants.map((t: { unit: string }) => t.unit)).toEqual(["sticky", "flight"]);

    const sticky = body.tenants[0];
    expect(sticky.suggestedRate).toBe(112);
    expect(sticky.monthlyLift).toBe(12);
    expect(sticky.liftPct).toBe(12);
    expect(sticky.risk).toBe("low"); // very_low bucket
    expect(sticky.marketRate).toBe(150);

    const flight = body.tenants[1];
    expect(flight.suggestedRate).toBe(210);
    expect(flight.monthlyLift).toBe(10);
    expect(flight.risk).toBe("higher"); // high bucket

    expect(body.totalMonthlyLift).toBe(22);
    expect(body.totalAnnualLift).toBe(264);
  });

  it("falls back to street_rate as the market reference when sensitivity is missing", async () => {
    m.$queryRaw.mockResolvedValue([
      // No sensitivity market_rate/bucket, but a posted street rate exists.
      row({
        unit: "no-sens",
        market_rate: null,
        bucket: null,
        street_rate: 150,
        tenure_months: null,
        current_rate: 100,
      }),
      // Neither market source -> excluded entirely.
      row({
        tenant_id: "t-blind",
        unit: "blind",
        market_rate: null,
        bucket: null,
        street_rate: null,
        current_rate: 100,
      }),
    ]);
    const res = await GET(createAdminRequest(PATH));
    const body = await res.json();

    expect(body.count).toBe(1);
    const t = body.tenants[0];
    expect(t.unit).toBe("no-sens");
    expect(t.marketRate).toBe(150);
    expect(t.marketSource).toBe("street_rate");
    // default 8% cap (no bucket) on 100 -> 108
    expect(t.suggestedRate).toBe(108);
  });

  it("prefers the sensitivity market rate over street_rate when both exist", async () => {
    m.$queryRaw.mockResolvedValue([
      row({ market_rate: 150, street_rate: 999, current_rate: 100 }),
    ]);
    const res = await GET(createAdminRequest(PATH));
    const body = await res.json();
    expect(body.tenants[0].marketSource).toBe("sensitivity");
    expect(body.tenants[0].marketRate).toBe(150);
  });

  it("falls back to tenure-based risk when no sensitivity bucket exists", async () => {
    m.$queryRaw.mockResolvedValue([
      // No bucket -> default 8% cap; risk from tenure_months
      row({ unit: "newish", bucket: null, tenure_months: 3, current_rate: 100, market_rate: 150 }),
      row({ tenant_id: "t2", unit: "old", bucket: null, tenure_months: 40, current_rate: 100, market_rate: 150 }),
    ]);
    const res = await GET(createAdminRequest(PATH));
    const body = await res.json();
    const byUnit = Object.fromEntries(
      body.tenants.map((t: { unit: string; risk: string }) => [t.unit, t.risk]),
    );
    expect(byUnit.newish).toBe("higher");
    expect(byUnit.old).toBe("low");
  });

  it("normalizes tracking status and counts worked tenants", async () => {
    m.$queryRaw.mockResolvedValue([
      row({ tenant_id: "a", unit: "a", ecri_status: "sent" }),
      row({ tenant_id: "b", unit: "b", ecri_status: "scheduled" }),
      row({ tenant_id: "c", unit: "c", ecri_status: "identified" }), // -> pending
      row({ tenant_id: "d", unit: "d", ecri_status: "done" }),
    ]);
    const res = await GET(createAdminRequest(PATH));
    const body = await res.json();
    const byUnit = Object.fromEntries(
      body.tenants.map((t: { unit: string; status: string }) => [t.unit, t.status]),
    );
    expect(byUnit.a).toBe("sent");
    expect(byUnit.b).toBe("scheduled");
    expect(byUnit.c).toBe("pending");
    expect(byUnit.d).toBe("done");
    expect(body.worked).toBe(2); // sent + done
  });

  it("returns 500 without leaking details when the query throws", async () => {
    m.$queryRaw.mockRejectedValue(new Error("db exploded"));
    const res = await GET(createAdminRequest(PATH));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to load ECRI data");
    expect(JSON.stringify(body)).not.toMatch(/exploded/);
  });
});
