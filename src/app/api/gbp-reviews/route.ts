import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

interface GbpConnection {
  id: string;
  location_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: Date | null;
}

async function getValidToken(
  connection: GbpConnection
): Promise<string | null> {
  if (
    connection.access_token &&
    connection.token_expires_at &&
    new Date(connection.token_expires_at) > new Date()
  ) {
    return connection.access_token;
  }
  if (!connection.refresh_token) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET || "",
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      const expiresAt = new Date(
        Date.now() + (data.expires_in || 3600) * 1000
      );
      await db.gbp_connections.update({
        where: { id: connection.id },
        data: {
          access_token: data.access_token,
          token_expires_at: expiresAt,
          status: "connected",
          updated_at: new Date(),
        },
      });
      return data.access_token;
    }
  } catch {
    // Token refresh failed
  }
  await db.gbp_connections.update({
    where: { id: connection.id },
    data: { status: "expired", updated_at: new Date() },
  });
  return null;
}

const RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

async function syncReviewsFromGBP(
  facilityId: string,
  connection: GbpConnection
) {
  const token = await getValidToken(connection);
  if (!token)
    throw new Error("Unable to authenticate with Google Business Profile");

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${connection.location_id}/reviews?pageSize=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || `GBP API error ${res.status}`
    );
  }

  const data = await res.json();
  const reviews = data.reviews || [];
  let synced = 0;

  for (const review of reviews) {
    const externalId = review.name || review.reviewId;
    const existing = await db.gbp_reviews.findUnique({
      where: { external_review_id: externalId },
    });

    if (!existing) {
      await db.gbp_reviews.create({
        data: {
          facility_id: facilityId,
          gbp_connection_id: connection.id,
          external_review_id: externalId,
          author_name: review.reviewer?.displayName || "Anonymous",
          rating: review.starRating
            ? RATING_MAP[review.starRating] || 5
            : 5,
          review_text: review.comment || "",
          review_time: review.createTime
            ? new Date(review.createTime)
            : new Date(),
          response_text: review.reviewReply?.comment || null,
          response_status: review.reviewReply ? "published" : "pending",
          synced_at: new Date(),
        },
      });
      synced++;
    } else if (review.reviewReply?.comment) {
      if (existing.response_status === "pending") {
        await db.gbp_reviews.update({
          where: { external_review_id: externalId },
          data: {
            response_text: review.reviewReply.comment,
            response_status: "published",
            synced_at: new Date(),
          },
        });
      }
    }
  }

  await db.gbp_connections.update({
    where: { id: connection.id },
    data: { last_sync_at: new Date(), updated_at: new Date() },
  });
  return { synced, total: reviews.length };
}

async function generateAIResponse(
  review: { rating: number; author_name: string | null; review_text: string | null },
  facilityName: string,
  responseTone: string = "professional"
): Promise<string> {
  const toneDescriptions: Record<string, string> = {
    friendly: "warm, friendly, and conversational — like a neighbor who genuinely cares",
    professional: "professional yet personable — courteous and competent",
    casual: "casual and down-to-earth — relaxed but respectful",
  };
  const toneGuide = toneDescriptions[responseTone] || toneDescriptions.professional;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `Write a Google Business Profile review response for a self-storage facility called "${facilityName}".

Tone: ${toneGuide}

The review is ${review.rating}/5 stars from "${review.author_name || "a customer"}".
Review text: "${review.review_text || "(no text)"}"

Guidelines:
- Keep it under 150 words
- Match the tone described above consistently
- For negative reviews: apologize, offer to resolve, invite direct contact
- For positive reviews: express gratitude, mention specific points they raised
- Don't be overly corporate or use buzzwords
- Sign off with "The ${facilityName} Team"

Write only the response text, no quotes or labels.`,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.content?.[0]?.text) return data.content[0].text;
    } catch {
      // AI generation failed, fall through to templates
    }
  }

  if (review.rating >= 4) {
    return `Thank you so much for your wonderful ${review.rating}-star review, ${review.author_name || "valued customer"}! We're thrilled to hear about your positive experience at ${facilityName}. Your kind words mean a lot to our team. We look forward to continuing to serve you!`;
  } else if (review.rating === 3) {
    return `Thank you for taking the time to share your feedback, ${review.author_name || "valued customer"}. At ${facilityName}, we're always striving to improve. We'd love to hear more about how we can enhance your experience. Please don't hesitate to reach out to us directly so we can address any concerns.`;
  }
  return `We sincerely apologize for your experience, ${review.author_name || "valued customer"}. At ${facilityName}, we take all feedback seriously and want to make this right. Please reach out to us directly so we can address your concerns and work toward a resolution. Your satisfaction is our top priority.`;
}

async function publishReplyToGBP(
  externalReviewId: string,
  responseText: string,
  connection: GbpConnection
) {
  const token = await getValidToken(connection);
  if (!token)
    throw new Error("Unable to authenticate with Google Business Profile");

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${externalReviewId}/reply`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: responseText }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || `GBP API error ${res.status}`
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const facilityId = req.nextUrl.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const filterStatus = req.nextUrl.searchParams.get("status");
    const filterRating = req.nextUrl.searchParams.get("rating");

    const where: Record<string, unknown> = { facility_id: facilityId };
    if (filterStatus) where.response_status = filterStatus;
    if (filterRating) where.rating = parseInt(filterRating);

    const reviews = await db.gbp_reviews.findMany({
      where,
      orderBy: { review_time: "desc" },
    });

    const allReviews = await db.gbp_reviews.aggregate({
      where: { facility_id: facilityId },
      _count: true,
      _avg: { rating: true },
    });

    const respondedCount = await db.gbp_reviews.count({
      where: { facility_id: facilityId, response_status: "published" },
    });

    const distribution = await db.gbp_reviews.groupBy({
      by: ["rating"],
      where: { facility_id: facilityId },
      _count: true,
      orderBy: { rating: "desc" },
    });

    const ratingDist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const row of distribution) {
      ratingDist[row.rating] = row._count;
    }

    const total = allReviews._count;
    const avgRating = parseFloat(
      Number(allReviews._avg.rating || 0).toFixed(1)
    );

    return jsonResponse(
      {
        reviews,
        stats: {
          total,
          avg_rating: avgRating,
          responded: respondedCount,
          response_rate:
            total > 0 ? Math.round((respondedCount / total) * 100) : 0,
          distribution: ratingDist,
        },
      },
      200,
      origin
    );
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "gbp-reviews");
  if (limited) return limited;

  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const action = req.nextUrl.searchParams.get("action");

    if (action === "sync") {
      const { facilityId } = body;
      if (!facilityId)
        return errorResponse("facilityId required", 400, origin);

      const connection = await db.gbp_connections.findFirst({
        where: { facility_id: facilityId, status: "connected" },
      });
      if (!connection)
        return errorResponse(
          "No GBP connection for this facility",
          400,
          origin
        );

      try {
        const result = await syncReviewsFromGBP(facilityId, connection);
        return jsonResponse({ ok: true, ...result }, 200, origin);
      } catch (err: unknown) {
        return errorResponse(
          err instanceof Error ? err.message : "Sync failed",
          500,
          origin
        );
      }
    }

    if (action === "generate-response") {
      const { reviewId } = body;
      if (!reviewId) return errorResponse("reviewId required", 400, origin);

      const review = await db.gbp_reviews.findUnique({
        where: { id: reviewId },
        include: { facilities: { select: { name: true } } },
      });
      if (!review) return errorResponse("Review not found", 404, origin);

      // Response tone — gbp_review_settings table not yet created;
      // default to "professional" until settings UI is built
      const responseTone = "professional";

      const aiDraft = await generateAIResponse(
        review,
        review.facilities.name,
        responseTone
      );
      await db.gbp_reviews.update({
        where: { id: reviewId },
        data: { ai_draft: aiDraft, response_status: "ai_drafted" },
      });
      return jsonResponse({ aiDraft }, 200, origin);
    }

    if (action === "approve-response") {
      const { reviewId, responseText } = body;
      if (!reviewId || !responseText)
        return errorResponse(
          "reviewId and responseText required",
          400,
          origin
        );

      const review = await db.gbp_reviews.findUnique({
        where: { id: reviewId },
        include: { gbp_connections: true },
      });
      if (!review) return errorResponse("Review not found", 404, origin);

      if (
        review.gbp_connections?.access_token &&
        review.external_review_id
      ) {
        try {
          await publishReplyToGBP(
            review.external_review_id,
            responseText,
            review.gbp_connections
          );
        } catch {
          // Still save locally even if GBP publish fails
        }
      }

      await db.gbp_reviews.update({
        where: { id: reviewId },
        data: {
          response_text: responseText,
          response_status: "published",
          responded_at: new Date(),
        },
      });
      return jsonResponse({ ok: true }, 200, origin);
    }

    if (action === "bulk-generate") {
      const { facilityId } = body;
      if (!facilityId)
        return errorResponse("facilityId required", 400, origin);

      const pending = await db.gbp_reviews.findMany({
        where: { facility_id: facilityId, response_status: "pending" },
        include: { facilities: { select: { name: true } } },
      });

      // Response tone — gbp_review_settings table not yet created;
      // default to "professional" until settings UI is built
      const bulkTone = "professional";

      let generated = 0;
      for (const review of pending) {
        const aiDraft = await generateAIResponse(
          review,
          review.facilities.name,
          bulkTone
        );
        await db.gbp_reviews.update({
          where: { id: review.id },
          data: { ai_draft: aiDraft, response_status: "ai_drafted" },
        });
        generated++;
      }
      return jsonResponse({ ok: true, generated }, 200, origin);
    }

    return errorResponse("Invalid action", 400, origin);
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const { id, aiDraft, responseStatus } = await req.json();
    if (!id) return errorResponse("id required", 400, origin);

    const data: Record<string, unknown> = {};
    if (aiDraft !== undefined) data.ai_draft = aiDraft;
    if (responseStatus !== undefined) data.response_status = responseStatus;

    if (Object.keys(data).length === 0)
      return errorResponse("No fields to update", 400, origin);

    const existing = await db.gbp_reviews.findUnique({ where: { id } });
    if (!existing) return errorResponse("Review not found", 404, origin);

    const updated = await db.gbp_reviews.update({ where: { id }, data });
    return jsonResponse({ review: updated }, 200, origin);
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}
