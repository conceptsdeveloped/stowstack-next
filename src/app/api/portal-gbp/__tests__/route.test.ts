import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest } from "@/test/helpers";

vi.mock("@/lib/portal-auth", () => ({
  authenticatePortalRequest: vi.fn(),
}));

import { authenticatePortalRequest } from "@/lib/portal-auth";
import { GET } from "../route";

const mockDb = vi.mocked(db, true);
const mockAuth = vi.mocked(authenticatePortalRequest);

beforeEach(() => {
  vi.clearAllMocks();
  // @ts-expect-error — db is a vi mock; gbp_connections assigned per test
  mockDb.gbp_connections = {
    findUnique: vi.fn().mockResolvedValue({
      status: "connected",
      location_name: "Pawpaw Storage",
      last_sync_at: new Date("2026-06-01T00:00:00.000Z"),
    }),
  };
});

describe("GET /api/portal-gbp", () => {
  it("reports true totals over the FULL review set, not a 50-row slice", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "client", facilityId: "fac-1", clientId: "c-1" });
    // @ts-expect-error — db is a vi mock
    mockDb.gbp_reviews = {
      // First count() = total (200), second = responded (150) — call order
      // matches the Promise.all array order.
      count: vi.fn().mockResolvedValueOnce(200).mockResolvedValueOnce(150),
      aggregate: vi.fn().mockResolvedValue({ _avg: { rating: 4.6 } }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: "r1",
          author_name: "Dana",
          rating: 5,
          review_text: "Great place",
          review_time: new Date("2026-06-02T00:00:00.000Z"),
          response_status: "responded",
          response_text: "Thank you!",
        },
      ]),
    };

    const res = await GET(
      createMockRequest("/api/portal-gbp?accessCode=ABC123&email=a@b.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.totalReviews).toBe(200); // count(), not the capped findMany
    expect(body.responseRate).toBe(75); // 150 / 200
    expect(body.averageRating).toBe(4.6);
    expect(body.connected).toBe(true);
    expect(body.recentReviews).toHaveLength(1);
    expect(body.recentReviews[0].hasResponse).toBe(true);

    // recent-reviews query is bounded to 5 for display
    // @ts-expect-error — inspecting the mock
    expect(mockDb.gbp_reviews.findMany.mock.calls[0][0].take).toBe(5);
    // responded count filters on the responded/published statuses
    // @ts-expect-error — inspecting the mock
    const respondedWhere = mockDb.gbp_reviews.count.mock.calls[1][0].where;
    expect(respondedWhere.response_status.in).toEqual(["responded", "published"]);
    expect(respondedWhere.facility_id).toBe("fac-1");
  });

  it("returns zeroed aggregates (no divide-by-zero) when there are no reviews", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "client", facilityId: "fac-1", clientId: "c-1" });
    // @ts-expect-error — db is a vi mock
    mockDb.gbp_reviews = {
      count: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0),
      aggregate: vi.fn().mockResolvedValue({ _avg: { rating: null } }),
      findMany: vi.fn().mockResolvedValue([]),
    };

    const res = await GET(
      createMockRequest("/api/portal-gbp?accessCode=ABC123&email=a@b.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.totalReviews).toBe(0);
    expect(body.averageRating).toBe(0); // null _avg coerces to 0
    expect(body.responseRate).toBe(0);
    expect(body.recentReviews).toEqual([]);
  });
});
