import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
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
    let sql = `SELECT * FROM social_posts WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (status) {
      sql += ` AND status = $${idx++}`;
      params.push(status);
    }
    if (platform) {
      sql += ` AND platform = $${idx++}`;
      params.push(platform);
    }
    if (month) {
      sql += ` AND (
        (scheduled_at >= $${idx}::date AND scheduled_at < ($${idx}::date + interval '1 month'))
        OR (published_at >= $${idx}::date AND published_at < ($${idx}::date + interval '1 month'))
        OR (created_at >= $${idx}::date AND created_at < ($${idx}::date + interval '1 month'))
      )`;
      params.push(`${month}-01`);
      idx++;
    }

    sql += ` ORDER BY COALESCE(scheduled_at, created_at) ASC`;

    const posts = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      sql,
      ...params
    );
    return jsonResponse({ posts }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}

export async function POST(req: NextRequest) {
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
        ${facilityId}, ${platform}, ${postType || "tip"}, ${content},
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

  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (content !== undefined) {
    sets.push(`content = $${idx++}`);
    params.push(content);
  }
  if (hashtags !== undefined) {
    sets.push(`hashtags = $${idx++}`);
    params.push(hashtags);
  }
  if (mediaUrls !== undefined) {
    sets.push(`media_urls = $${idx++}`);
    params.push(mediaUrls);
  }
  if (ctaUrl !== undefined) {
    sets.push(`cta_url = $${idx++}`);
    params.push(ctaUrl);
  }
  if (status !== undefined) {
    sets.push(`status = $${idx++}`);
    params.push(status);
  }
  if (scheduledAt !== undefined) {
    sets.push(`scheduled_at = $${idx++}`);
    params.push(scheduledAt);
  }
  if (postType !== undefined) {
    sets.push(`post_type = $${idx++}`);
    params.push(postType);
  }

  sets.push("updated_at = NOW()");

  if (sets.length <= 1) {
    return errorResponse("Nothing to update", 400, origin);
  }

  params.push(id);

  try {
    const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `UPDATE social_posts SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      ...params
    );

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
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return errorResponse("id required", 400, origin);
  }

  try {
    await db.$executeRaw`DELETE FROM social_posts WHERE id = ${id}`;
    return jsonResponse({ deleted: true }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}
