import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { authenticatePortalRequest } from "@/lib/portal-auth";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "portal-gbp");
  if (limited) return limited;

  const origin = getOrigin(req);

  try {
    const url = new URL(req.url);

    /* ─── resolve client → facility (fail-closed) ─── */

    const scope = await authenticatePortalRequest(req);
    if (scope instanceof NextResponse) return scope;

    let facilityId: string;
    if (scope.kind === "admin") {
      const facilityIdParam = url.searchParams.get("facilityId");
      if (!facilityIdParam) {
        return errorResponse("facilityId required", 400, origin);
      }
      facilityId = facilityIdParam;
    } else {
      facilityId = scope.facilityId;
    }

    /* ─── GBP connection ─── */

    const connection = await db.gbp_connections.findUnique({
      where: { facility_id: facilityId },
      select: {
        status: true,
        location_name: true,
        last_sync_at: true,
      },
    });

    const connected = connection?.status === "connected";

    const RESPONDED_STATUSES = ["responded", "published"];

    /* ─── aggregates over the FULL review set + the latest 5 for display ───
       Computed in the DB, not over a capped slice, so a facility with hundreds
       of reviews reports its true total / average / response rate rather than
       stats for only the most recent page. */

    const [totalReviews, ratingAgg, respondedCount, recentReviewRows] =
      await Promise.all([
        db.gbp_reviews.count({ where: { facility_id: facilityId } }),
        db.gbp_reviews.aggregate({
          where: { facility_id: facilityId },
          _avg: { rating: true },
        }),
        db.gbp_reviews.count({
          where: {
            facility_id: facilityId,
            response_status: { in: RESPONDED_STATUSES },
          },
        }),
        db.gbp_reviews.findMany({
          where: { facility_id: facilityId },
          orderBy: { review_time: "desc" },
          take: 5,
          select: {
            id: true,
            author_name: true,
            rating: true,
            review_text: true,
            review_time: true,
            response_status: true,
            response_text: true,
          },
        }),
      ]);

    const averageRating = ratingAgg._avg.rating ?? 0;
    const responseRate =
      totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0;

    const recentReviews = recentReviewRows.map((r) => ({
      id: r.id,
      authorName: r.author_name || "Anonymous",
      rating: r.rating,
      text: r.review_text || "",
      reviewTime: r.review_time?.toISOString() || null,
      responseStatus: r.response_status || "pending",
      hasResponse: !!r.response_text,
    }));

    return jsonResponse(
      {
        connected,
        locationName: connection?.location_name || null,
        lastSyncAt: connection?.last_sync_at?.toISOString() || null,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        responseRate,
        recentReviews,
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
