import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";

export const maxDuration = 120;

interface GbpConnection {
  id: string;
  facility_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: Date | null;
  location_id: string;
  sync_config: Record<string, boolean> | null;
}

async function getValidToken(connection: {
  id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: Date | null;
}): Promise<string | null> {
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
      ).toISOString();
      await db.$executeRaw`
        UPDATE gbp_connections SET access_token = ${data.access_token},
        token_expires_at = ${expiresAt}::timestamptz, status = 'connected', updated_at = NOW()
        WHERE id = ${connection.id}::uuid
      `;
      return data.access_token;
    }
  } catch {
    // Token refresh failed
  }
  await db.$executeRaw`
    UPDATE gbp_connections SET status = 'expired', updated_at = NOW() WHERE id = ${connection.id}::uuid
  `;
  return null;
}

async function publishPost(
  post: Record<string, unknown>,
  connection: {
    id: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: Date | null;
    location_id: string;
  }
): Promise<string> {
  const token = await getValidToken(connection);
  if (!token) throw new Error("Auth failed");

  const gbpPost: Record<string, unknown> = {
    languageCode: "en",
    summary: post.body,
    topicType:
      post.post_type === "offer"
        ? "OFFER"
        : post.post_type === "event"
          ? "EVENT"
          : "STANDARD",
  };

  if (post.cta_type && post.cta_url) {
    gbpPost.callToAction = {
      actionType: post.cta_type,
      url: post.cta_url,
    };
  }
  if (post.image_url) {
    gbpPost.media = [
      { mediaFormat: "PHOTO", sourceUrl: post.image_url },
    ];
  }

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${connection.location_id}/localPosts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gbpPost),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || `GBP API error ${res.status}`
    );
  }

  const result = await res.json();
  return result.name;
}

interface NewReview {
  facilityId: string;
  authorName: string;
  rating: number;
  reviewText: string;
}

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderStars(rating: number): string {
  return "&#9733;".repeat(rating) + "&#9734;".repeat(5 - rating);
}

function buildNewReviewEmailHtml(
  facilityName: string,
  authorName: string,
  rating: number,
  reviewText: string
): string {
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://storageads.com";
  const adminReviewsUrl = `${baseUrl}/admin?tab=gbp-reviews`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#faf9f5;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:20px;font-weight:600;letter-spacing:-0.5px;">
      <span style="color:#141413;">storage</span><span style="color:#B58B3F;">ads</span>
    </span>
  </div>
  <div style="background:#ffffff;border:1px solid #e8e6dc;border-radius:8px;padding:28px 24px;">
    <h1 style="margin:0 0 4px;font-size:18px;font-weight:600;color:#141413;">New ${rating}-Star Review</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#6a6560;">${esc(facilityName)}</p>

    <div style="background:#faf9f5;border:1px solid #e8e6dc;border-radius:6px;padding:16px;margin-bottom:20px;">
      <div style="margin-bottom:8px;">
        <span style="font-weight:600;color:#141413;font-size:14px;">${esc(authorName)}</span>
      </div>
      <div style="font-size:18px;color:#B58B3F;margin-bottom:8px;">${renderStars(rating)}</div>
      ${reviewText ? `<p style="margin:0;font-size:14px;color:#141413;line-height:1.5;">${esc(reviewText)}</p>` : '<p style="margin:0;font-size:14px;color:#6a6560;font-style:italic;">No review text provided</p>'}
    </div>

    <div style="text-align:center;">
      <a href="${adminReviewsUrl}" style="display:inline-block;background:#B58B3F;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:500;">View in Admin</a>
    </div>
  </div>
  <p style="text-align:center;margin-top:16px;font-size:12px;color:#b0aea5;">StorageAds Review Notification</p>
</div>
</body></html>`;
}

async function sendNewReviewNotification(
  facilityName: string,
  contactEmail: string | null,
  review: NewReview
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const recipients = ["blake@storageads.com"];
  if (contactEmail && contactEmail !== "blake@storageads.com") {
    recipients.push(contactEmail);
  }

  const html = buildNewReviewEmailHtml(
    facilityName,
    review.authorName,
    review.rating,
    review.reviewText
  );

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "StorageAds <notifications@storageads.com>",
        to: recipients,
        subject: `New ${review.rating}-star review for ${facilityName}`,
        html,
      }),
    });
  } catch {
    // Email send failed — non-blocking, continue sync
  }
}

async function syncReviewsForConnection(
  connection: GbpConnection
): Promise<{ synced: number; newReviews: NewReview[] }> {
  const token = await getValidToken(connection);
  if (!token) return { synced: 0, newReviews: [] };

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${connection.location_id}/reviews?pageSize=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return { synced: 0, newReviews: [] };

  const data = await res.json();
  const reviews = data.reviews || [];
  let synced = 0;
  const newReviews: NewReview[] = [];

  const ratingMap: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };

  for (const review of reviews) {
    const externalId = review.name || review.reviewId;
    const existing = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM gbp_reviews WHERE external_review_id = ${externalId}
    `;
    if (existing.length === 0) {
      const authorName = review.reviewer?.displayName || "Anonymous";
      const rating = review.starRating ? ratingMap[review.starRating] || 5 : 5;
      const reviewText = review.comment || "";

      await db.$executeRaw`
        INSERT INTO gbp_reviews (facility_id, gbp_connection_id, external_review_id, author_name, rating, review_text, review_time, response_text, response_status, synced_at)
        VALUES (${connection.facility_id}::uuid, ${connection.id}::uuid, ${externalId},
                ${authorName},
                ${rating},
                ${reviewText}, ${review.createTime || new Date().toISOString()}::timestamptz,
                ${review.reviewReply?.comment || null},
                ${review.reviewReply ? "published" : "pending"}, NOW())
      `;
      synced++;
      newReviews.push({
        facilityId: connection.facility_id,
        authorName,
        rating,
        reviewText,
      });
    }
  }

  await db.$executeRaw`
    UPDATE gbp_connections SET last_sync_at = NOW(), updated_at = NOW() WHERE id = ${connection.id}::uuid
  `;
  return { synced, newReviews };
}

function generateTemplateResponse(
  review: { rating: number; author_name: string },
  facilityName: string
): string {
  if (review.rating >= 4) {
    return `Thank you so much for your wonderful ${review.rating}-star review, ${review.author_name || "valued customer"}! We're thrilled to hear about your positive experience at ${facilityName}. We look forward to continuing to serve you!`;
  } else if (review.rating === 3) {
    return `Thank you for sharing your feedback, ${review.author_name || "valued customer"}. At ${facilityName}, we're always striving to improve. Please reach out to us directly so we can address any concerns.`;
  } else {
    return `We sincerely apologize for your experience, ${review.author_name || "valued customer"}. At ${facilityName}, we take all feedback seriously. Please reach out to us directly so we can work toward a resolution.`;
  }
}

async function publishReply(
  review: { external_review_id: string },
  responseText: string,
  connection: GbpConnection
): Promise<boolean> {
  const token = await getValidToken(connection);
  if (!token) return false;

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${review.external_review_id}/reply`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: responseText }),
    }
  );
  return res.ok;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    posts_published: 0,
    posts_failed: 0,
    reviews_synced: 0,
    responses_generated: 0,
    responses_published: 0,
  };

  try {
    // 1. Publish scheduled posts
    const duePosts = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT p.*, c.access_token, c.refresh_token, c.token_expires_at, c.location_id, c.id as conn_id
      FROM gbp_posts p
      JOIN gbp_connections c ON p.gbp_connection_id = c.id
      WHERE p.status = 'scheduled' AND p.scheduled_at <= NOW() AND c.status = 'connected'
    `;

    for (const post of duePosts) {
      try {
        const externalId = await publishPost(post, {
          id: post.conn_id as string,
          access_token: post.access_token as string,
          refresh_token: post.refresh_token as string | null,
          token_expires_at: post.token_expires_at as Date | null,
          location_id: post.location_id as string,
        });
        await db.$executeRaw`
          UPDATE gbp_posts SET status = 'published', published_at = NOW(), external_post_id = ${externalId} WHERE id = ${post.id}::uuid
        `;
        results.posts_published++;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        await db.$executeRaw`
          UPDATE gbp_posts SET status = 'failed', error_message = ${message} WHERE id = ${post.id}::uuid
        `;
        results.posts_failed++;
      }
    }

    // 2. Sync reviews for all connected facilities
    const connections = await db.$queryRaw<GbpConnection[]>`
      SELECT * FROM gbp_connections WHERE status = 'connected'
    `;

    for (const conn of connections) {
      const { synced, newReviews } = await syncReviewsForConnection(conn);
      results.reviews_synced += synced;

      // Send email notifications for new reviews
      if (newReviews.length > 0) {
        const facilityRows = await db.$queryRaw<
          { name: string; contact_email: string | null }[]
        >`SELECT name, contact_email FROM facilities WHERE id = ${conn.facility_id}::uuid`;
        const facility = facilityRows[0];
        if (facility) {
          for (const nr of newReviews) {
            await sendNewReviewNotification(
              facility.name,
              facility.contact_email,
              nr
            );
          }
        }
      }

      const config = conn.sync_config || {};

      // 3. Auto-generate and optionally auto-publish responses
      if (config.auto_respond) {
        const pendingReviews = await db.$queryRaw<
          {
            id: string;
            rating: number;
            author_name: string;
            external_review_id: string;
            facility_name: string;
          }[]
        >`
          SELECT r.*, f.name as facility_name FROM gbp_reviews r
          JOIN facilities f ON r.facility_id = f.id
          WHERE r.gbp_connection_id = ${conn.id}::uuid AND r.response_status = 'pending'
        `;

        for (const review of pendingReviews) {
          const draft = generateTemplateResponse(
            review,
            review.facility_name
          );
          await db.$executeRaw`
            UPDATE gbp_reviews SET ai_draft = ${draft}, response_status = 'ai_drafted' WHERE id = ${review.id}::uuid
          `;
          results.responses_generated++;

          const published = await publishReply(review, draft, conn);
          if (published) {
            await db.$executeRaw`
              UPDATE gbp_reviews SET response_text = ${draft}, response_status = 'published', responded_at = NOW() WHERE id = ${review.id}::uuid
            `;
            results.responses_published++;
          }
        }
      }

      // 4. Auto-sync hours if enabled
      if (config.sync_hours) {
        try {
          const token = await getValidToken(conn);
          if (token) {
            const rows = await db.$queryRaw<{ hours: unknown }[]>`
              SELECT hours FROM facilities WHERE id = ${conn.facility_id}::uuid
            `;
            if (rows[0]?.hours) {
              await fetch(
                `https://mybusinessbusinessinformation.googleapis.com/v1/${conn.location_id}?updateMask=regularHours`,
                {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    regularHours: rows[0].hours,
                  }),
                }
              );
            }
          }
        } catch {
          // Hours sync failed — continue
        }
      }
    }

    // 5. Refresh tokens expiring within 30 minutes
    const expiring = await db.$queryRaw<GbpConnection[]>`
      SELECT * FROM gbp_connections WHERE status = 'connected' AND token_expires_at <= NOW() + INTERVAL '30 minutes'
    `;
    for (const conn of expiring) {
      await getValidToken(conn);
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message, results },
      { status: 500 }
    );
  }
}
