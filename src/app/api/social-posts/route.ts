import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "social-posts");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");
  const status = url.searchParams.get("status");
  const platform = url.searchParams.get("platform");
  const month = url.searchParams.get("month");

  if (!facilityId) {
    return errorResponse("facilityId required", 400, origin);
  }

  try {
    const conditions: Prisma.Sql[] = [Prisma.sql`facility_id = ${facilityId}::uuid`];

    if (status) {
      conditions.push(Prisma.sql`status = ${status}`);
    }
    if (platform) {
      conditions.push(Prisma.sql`platform = ${platform}`);
    }
    if (month) {
      const monthDate = `${month}-01`;
      conditions.push(Prisma.sql`(
        (scheduled_at >= ${monthDate}::date AND scheduled_at < (${monthDate}::date + interval '1 month'))
        OR (published_at >= ${monthDate}::date AND published_at < (${monthDate}::date + interval '1 month'))
        OR (created_at >= ${monthDate}::date AND created_at < (${monthDate}::date + interval '1 month'))
      )`);
    }

    const whereClause = Prisma.join(conditions, " AND ");

    const posts = await db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM social_posts WHERE ${whereClause}
      ORDER BY COALESCE(scheduled_at, created_at) ASC
    `;
    return jsonResponse({ posts }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "social-posts");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const {
    facilityId,
    platform,
    postType,
    content,
    hashtags,
    mediaUrls,
    ctaUrl,
    scheduledAt,
    aiGenerated,
    batchId,
    suggestedImage,
  } = body as {
    facilityId?: string;
    platform?: string;
    postType?: string;
    content?: string;
    hashtags?: string[];
    mediaUrls?: string[];
    ctaUrl?: string;
    scheduledAt?: string;
    aiGenerated?: boolean;
    batchId?: string;
    suggestedImage?: string;
  };

  if (!facilityId || !platform || !content) {
    return errorResponse(
      "facilityId, platform, and content required",
      400,
      origin
    );
  }

  const postStatus = scheduledAt ? "scheduled" : "draft";

  try {
    const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO social_posts (
        facility_id, platform, post_type, content, hashtags, media_urls,
        cta_url, status, scheduled_at, ai_generated, batch_id, suggested_image
      ) VALUES (
        ${facilityId}::uuid, ${platform}, ${postType || "tip"}, ${content},
        ${hashtags || []}, ${mediaUrls || []},
        ${ctaUrl || null}, ${postStatus}, ${scheduledAt ? new Date(scheduledAt) : null}::timestamptz,
        ${aiGenerated || false}, ${batchId || null}, ${suggestedImage || null}
      )
      RETURNING *
    `;
    return jsonResponse({ post: rows[0] }, 201, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "social-posts");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { id, content, hashtags, mediaUrls, ctaUrl, status, scheduledAt, postType } =
    body as {
      id?: string;
      content?: string;
      hashtags?: string[];
      mediaUrls?: string[];
      ctaUrl?: string;
      status?: string;
      scheduledAt?: string;
      postType?: string;
    };

  if (!id) {
    return errorResponse("id required", 400, origin);
  }

  const sets: Prisma.Sql[] = [];

  if (content !== undefined) {
    sets.push(Prisma.sql`content = ${content}`);
  }
  if (hashtags !== undefined) {
    sets.push(Prisma.sql`hashtags = ${hashtags}`);
  }
  if (mediaUrls !== undefined) {
    sets.push(Prisma.sql`media_urls = ${mediaUrls}`);
  }
  if (ctaUrl !== undefined) {
    sets.push(Prisma.sql`cta_url = ${ctaUrl}`);
  }
  if (status !== undefined) {
    sets.push(Prisma.sql`status = ${status}`);
  }
  if (scheduledAt !== undefined) {
    sets.push(Prisma.sql`scheduled_at = ${scheduledAt}`);
  }
  if (postType !== undefined) {
    sets.push(Prisma.sql`post_type = ${postType}`);
  }

  if (sets.length === 0) {
    return errorResponse("Nothing to update", 400, origin);
  }

  sets.push(Prisma.sql`updated_at = NOW()`);

  const setClause = Prisma.join(sets, ", ");

  try {
    const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
      UPDATE social_posts SET ${setClause} WHERE id = ${id}::uuid RETURNING *
    `;

    if (rows.length === 0) {
      return errorResponse("Post not found", 404, origin);
    }
    return jsonResponse({ post: rows[0] }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "social-posts");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return errorResponse("id required", 400, origin);
  }

  try {
    await db.$executeRaw`DELETE FROM social_posts WHERE id = ${id}::uuid`;
    return jsonResponse({ deleted: true }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}
