import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const url = new URL(req.url);
    const accessCode = url.searchParams.get("accessCode");
    const email = url.searchParams.get("email");

    if (!accessCode || !email) {
      return errorResponse("Missing accessCode or email", 400, origin);
    }

    /* ─── resolve client → facility ─── */

    const client = await db.clients.findFirst({
      where: {
        access_code: accessCode,
        email: { equals: email.trim(), mode: "insensitive" },
      },
      select: { id: true, facility_id: true },
    });

    if (!client || !client.facility_id) {
      return errorResponse("Client not found", 404, origin);
    }

    const facilityId = client.facility_id;

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

    /* ─── GBP reviews ─── */

    const reviews = await db.gbp_reviews.findMany({
      where: { facility_id: facilityId },
      orderBy: { review_time: "desc" },
      take: 50,
      select: {
        id: true,
        author_name: true,
        rating: true,
        review_text: true,
        review_time: true,
        response_status: true,
        response_text: true,
      },
    });

    /* ─── compute aggregates ─── */

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const respondedCount = reviews.filter(
      (r) => r.response_status === "responded" || r.response_status === "published"
    ).length;
    const responseRate =
      totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0;

    /* ─── recent reviews (last 5) ─── */

    const recentReviews = reviews.slice(0, 5).map((r) => ({
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
