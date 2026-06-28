import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest } from "@/test/helpers";
import { GET } from "../route";

const mockDb = vi.mocked(db, true);

// Campaign-cohort rows (by lead created_at, fused with campaign_spend). This is
// Angelo's join surface and stays the source of `totals.move_ins`.
const campaignRows = [
  {
    campaign: "spring",
    spend: 100,
    impressions: 1000,
    clicks: 50,
    leads: 10,
    move_ins: 3,
    revenue: 200,
    cpl: 10,
    cost_per_move_in: 33,
    roas: 24,
  },
];
const trendRows = [
  { month: "2026-06", spend: 100, leads: 10, move_ins: 3, revenue: 200, cpl: 10, roas: 24 },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/attribution", () => {
  it("returns 401 when unauthenticated (no accessCode, not admin)", async () => {
    const res = await GET(createMockRequest("/api/attribution"));
    expect(res.status).toBe(401);
  });

  it("returns move_ins_actual by event date, independent of the cohort move_ins", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findUnique: vi.fn().mockResolvedValue({ facility_id: "fac-1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.$queryRaw = vi
      .fn()
      .mockResolvedValueOnce(campaignRows)
      .mockResolvedValueOnce(trendRows);
    // Authoritative event-date count differs from the cohort count (3) on
    // purpose: a tenant who moved in this window but has since churned is
    // counted here and missed by the cohort.
    // @ts-expect-error — db is a vi mock
    mockDb.lead_status_events = { count: vi.fn().mockResolvedValue(7) };

    const res = await GET(
      createMockRequest(
        "/api/attribution?accessCode=ABC123&startDate=2026-04-01&endDate=2026-06-30"
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    // Cohort move_ins (Angelo's join) is untouched; the new field is the
    // authoritative event-date total. They are deliberately distinct.
    expect(body.totals.move_ins).toBe(3);
    expect(body.totals.move_ins_actual).toBe(7);

    // The event-date count is scoped to the resolved facility, filters on the
    // moved_in transition, and bounds by changed_at (end made inclusive).
    // @ts-expect-error — inspecting the mock
    const where = mockDb.lead_status_events.count.mock.calls[0][0].where;
    expect(where.to_status).toBe("moved_in");
    expect(where.partial_leads.is.facility_id).toBe("fac-1");
    expect(where.changed_at.gte).toEqual(new Date("2026-04-01T00:00:00.000Z"));
    expect(where.changed_at.lt).toEqual(new Date("2026-07-01T00:00:00.000Z"));
  });
});
