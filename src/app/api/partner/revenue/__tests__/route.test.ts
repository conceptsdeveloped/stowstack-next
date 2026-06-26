import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminRequest, createMockRequest } from "@/test/helpers";

// Route uses Prisma model methods; supply a focused db mock for the methods it calls.
vi.mock("@/lib/db", () => ({
  db: {
    organizations: { findUnique: vi.fn() },
    facilities: { count: vi.fn() },
    rev_share_referrals: { findMany: vi.fn() },
    rev_share_payouts: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { GET } from "../route";

const m = db as unknown as {
  organizations: { findUnique: ReturnType<typeof vi.fn> };
  facilities: { count: ReturnType<typeof vi.fn> };
  rev_share_referrals: { findMany: ReturnType<typeof vi.fn> };
  rev_share_payouts: { findMany: ReturnType<typeof vi.fn> };
};

const ORG = "00000000-0000-0000-0000-000000000001";
const PATH = `/api/partner/revenue?orgId=${ORG}`;

// Stand-in for Prisma Decimal — only `.toString()` is relied on.
const dec = (s: string) => ({ toString: () => s });

describe("GET /api/partner/revenue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401s without auth", async () => {
    const res = await GET(createMockRequest("/api/partner/revenue"));
    expect(res.status).toBe(401);
  });

  it("404s when the org is missing", async () => {
    m.organizations.findUnique.mockResolvedValueOnce(null);
    const res = await GET(createAdminRequest(PATH));
    expect(res.status).toBe(404);
  });

  it("computes the tier summary and serializes Decimals to numbers", async () => {
    m.organizations.findUnique.mockResolvedValueOnce({
      rev_share_enabled: true,
      rev_share_pct: null,
      rev_share_tier: "auto",
      lifetime_earnings: dec("1980.00"),
    });
    m.facilities.count.mockResolvedValueOnce(11); // → Silver, 25%
    m.rev_share_referrals.findMany.mockResolvedValueOnce([
      {
        id: "r1",
        facility_id: "f1",
        status: "active",
        total_earned: dec("90.00"),
        referred_at: new Date("2026-06-01T00:00:00Z"),
        facilities: { name: "Midtown Storage" },
      },
    ]);
    m.rev_share_payouts.findMany.mockResolvedValueOnce([
      {
        id: "p1",
        month: "2026-05",
        payout_amount: dec("272.25"),
        status: "pending",
        paid_at: null,
      },
    ]);

    const res = await GET(createAdminRequest(PATH));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.facilityCount).toBe(11);
    expect(body.tier.name).toBe("Silver");
    expect(body.pct).toBe(25);
    expect(body.grossMrr).toBe(11 * 99);
    expect(body.monthlyEarnings).toBe(Math.round(11 * 99 * 0.25 * 100) / 100);
    expect(body.lifetimeEarnings).toBe(1980);
    expect(body.referrals[0]).toMatchObject({
      facility_name: "Midtown Storage",
      commission: 90,
    });
    expect(body.payouts[0]).toMatchObject({ period: "2026-05", amount: 272.25 });
  });

  it("honors an explicit rev_share_pct override over the tier rate", async () => {
    m.organizations.findUnique.mockResolvedValueOnce({
      rev_share_enabled: true,
      rev_share_pct: dec("40"),
      rev_share_tier: "custom",
      lifetime_earnings: dec("0"),
    });
    m.facilities.count.mockResolvedValueOnce(5); // Bronze tier (20%) by count
    m.rev_share_referrals.findMany.mockResolvedValueOnce([]);
    m.rev_share_payouts.findMany.mockResolvedValueOnce([]);

    const res = await GET(createAdminRequest(PATH));
    const body = await res.json();
    expect(body.pct).toBe(40); // override wins over tier's 20%
  });
});
