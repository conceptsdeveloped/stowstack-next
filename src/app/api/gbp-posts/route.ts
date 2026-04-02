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

import { getValidGoogleToken } from "@/lib/platform-auth";

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
  return getValidGoogleToken(connection, {
    clientId: process.env.GOOGLE_GBP_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_GBP_CLIENT_SECRET || "",
    table: "gbp_connections",
  });
}

interface GbpPost {
  id: string;
  body: string;
  post_type: string;
  cta_type: string | null;
  cta_url: string | null;
  image_url: string | null;
  offer_code: string | null;
  title: string | null;
  start_date: Date | null;
  end_date: Date | null;
}

async function publishToGBP(
  post: GbpPost,
  connection: GbpConnection
): Promise<string> {
  const token = await getValidToken(connection);
  if (!token)
    throw new Error("Unable to authenticate with Google Business Profile");

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
    gbpPost.callToAction = { actionType: post.cta_type, url: post.cta_url };
  }

  if (post.image_url) {
    gbpPost.media = [{ mediaFormat: "PHOTO", sourceUrl: post.image_url }];
  }

  if (post.post_type === "offer") {
    const offer: Record<string, unknown> = {};
    if (post.offer_code) offer.couponCode = post.offer_code;
    if (post.start_date) offer.startDate = post.start_date;
    if (post.end_date) offer.endDate = post.end_date;
    gbpPost.offer = offer;
  }

  if (post.post_type === "event") {
    const event: Record<string, unknown> = {
      title: post.title || "Event",
    };
    const schedule: Record<string, unknown> = {};
    if (post.start_date) schedule.startDate = post.start_date;
    if (post.end_date) schedule.endDate = post.end_date;
    if (Object.keys(schedule).length) event.schedule = schedule;
    gbpPost.event = event;
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

async function generateAIPostContent(
  facilityName: string,
  postType: string,
  promptContext: string
): Promise<{ title: string; body: string }> {
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
          max_tokens: 400,
          messages: [
            {
              role: "user",
              content: `Write a Google Business Profile post for a self-storage facility called "${facilityName}".

Post type: ${postType}
Context: ${promptContext || "General update about the facility"}

Guidelines:
- Keep it under 300 characters (GBP character limit for posts)
- Use OPERATOR language, not agency language. Write like a facility manager speaking to a neighbor, not a marketer.
- Be specific: reference real unit types, real prices, real availability if provided in the context
- Include a clear call-to-action (call, reserve online, visit)
- NEVER use generic phrases like "Self Storage Near You" or "all your storage needs" — reference the specific facility and what's actually available
- NEVER mention unit types that are listed as FULL in the context
- For offers: reference the specific promotion from PMS data if available. Do NOT make up discounts.
- For availability: cite specific unit sizes and pricing from the data
- For events: include relevant dates/times
- Don't use hashtags or emojis excessively
- The post should be verifiable against the facility's own PMS data

Return ONLY a JSON object with two fields:
{"title": "Short title (under 60 chars)", "body": "Post body text"}`,
            },
          ],
        }),
      });
      const data = await res.json();
      const content = data.content?.[0]?.text;
      if (content) {
        try {
          const parsed = JSON.parse(
            content
              .replace(/```json\n?/g, "")
              .replace(/```\n?/g, "")
              .trim()
          );
          return parsed;
        } catch {
          return { title: "", body: content };
        }
      }
    } catch {
      // AI generation failed, fall through to templates
    }
  }

  const templates: Record<string, { title: string; body: string }> = {
    update: {
      title: `News from ${facilityName}`,
      body:
        promptContext ||
        `Visit ${facilityName} for all your storage needs! We offer clean, secure units in a variety of sizes. Stop by today or call us to learn more.`,
    },
    offer: {
      title: `Special Offer at ${facilityName}`,
      body:
        promptContext ||
        `Don't miss our current special at ${facilityName}! Limited time offer on select units. Call or visit us to claim your deal before it's gone.`,
    },
    event: {
      title: `Event at ${facilityName}`,
      body:
        promptContext ||
        `Join us at ${facilityName}! Check our profile for details and updated hours. We look forward to seeing you.`,
    },
    availability: {
      title: `Units Available at ${facilityName}`,
      body:
        promptContext ||
        `Great news — we have units available at ${facilityName}! Climate-controlled and standard options in multiple sizes. Reserve yours today.`,
    },
  };
  return templates[postType] || templates.update;
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
    const where: Record<string, unknown> = { facility_id: facilityId };
    if (filterStatus) where.status = filterStatus;

    const posts = await db.gbp_posts.findMany({
      where,
      orderBy: { created_at: "desc" },
    });
    return jsonResponse({ posts }, 200, origin);
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

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "gbp-posts");
  if (limited) return limited;

  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const action = req.nextUrl.searchParams.get("action");

    if (action === "generate-content") {
      const { facilityId, postType: pType, promptContext } = body;
      if (!facilityId)
        return errorResponse("facilityId required", 400, origin);

      const [facility, pmsUnits, pmsSpecials, pmsSnap] = await Promise.all([
        db.facilities.findUnique({
          where: { id: facilityId },
          select: { name: true, location: true },
        }),
        db.facility_pms_units
          .findMany({
            where: { facility_id: facilityId },
            orderBy: { total_count: "desc" },
          })
          .catch(() => []),
        db.facility_pms_specials
          .findMany({
            where: { facility_id: facilityId, active: true },
          })
          .catch(() => []),
        db.facility_pms_snapshots
          .findMany({
            where: { facility_id: facilityId },
            orderBy: { snapshot_date: "desc" },
            take: 1,
          })
          .catch(() => []),
      ]);

      const facilityName = facility?.name || "our facility";
      const facilityLocation = facility?.location || "";

      let pmsContext = "";
      if (pmsUnits.length) {
        const availableUnits = pmsUnits.filter(
          (u) => (u.vacant_count ?? 0) > 0
        );
        const totalVacant = availableUnits.reduce(
          (s, u) => s + (u.vacant_count ?? 0),
          0
        );
        const occPct = pmsSnap[0]?.occupancy_pct || null;
        const lowestPrice = availableUnits.length
          ? Math.min(
              ...availableUnits.map(
                (u) =>
                  Number(u.web_rate) || Number(u.street_rate) || 999
              )
            )
          : null;
        const monthlyGap = availableUnits.reduce(
          (s, u) =>
            s + (u.vacant_count ?? 0) * (Number(u.street_rate) || 0),
          0
        );

        pmsContext += `\n\nstorEDGE PMS DATA (canonical source — use these real numbers):`;
        pmsContext += `\nFacility: ${facilityName}${facilityLocation ? ` in ${facilityLocation}` : ""}`;
        if (occPct) pmsContext += `\nOccupancy: ${occPct}%`;
        pmsContext += `\nVacant units: ${totalVacant} | Monthly revenue gap: $${monthlyGap.toLocaleString()}`;
        if (lowestPrice) pmsContext += `\nPricing starts at: $${lowestPrice}/mo`;
        if (availableUnits.length) {
          pmsContext += `\nAvailable unit types: ${availableUnits
            .slice(0, 5)
            .map(
              (u) =>
                `${u.size_label || u.unit_type} ($${Number(u.web_rate) || Number(u.street_rate)}/mo, ${u.vacant_count} available)`
            )
            .join("; ")}`;
        }
        const fullTypes = pmsUnits.filter((u) => (u.vacant_count ?? 0) <= 0);
        if (fullTypes.length) {
          pmsContext += `\nFULL (do NOT mention): ${fullTypes.map((u) => u.unit_type).join(", ")}`;
        }
      }
      if (pmsSpecials.length) {
        const sp = pmsSpecials[0];
        const discount =
          sp.discount_type === "percent"
            ? `${sp.discount_value}% off`
            : sp.discount_type === "months_free"
              ? `${sp.discount_value} month(s) free`
              : `$${sp.discount_value} off`;
        const appliesTo = sp.applies_to?.length
          ? ` on ${sp.applies_to.join(", ")}`
          : "";
        pmsContext += `\nActive promotion: ${sp.name} — ${discount}${appliesTo}. ${sp.description || ""}`;
      }
      if (pmsContext) {
        pmsContext +=
          "\n\nRULES: Use operator language, not agency-speak. Reference specific unit types, real prices, real availability.";
        pmsContext +=
          ' NEVER say "Self Storage Near You" — be specific to this facility.';
        pmsContext +=
          " NEVER reference unit types that are at 100% occupancy.";
        pmsContext +=
          " Every claim must be grounded in the PMS data above.";
      }

      const generated = await generateAIPostContent(
        facilityName,
        pType || "update",
        (promptContext || "") + pmsContext
      );
      return jsonResponse({ generated }, 200, origin);
    }

    const {
      facilityId,
      postType,
      title,
      body: postBody,
      ctaType,
      ctaUrl,
      imageUrl,
      offerCode,
      startDate,
      endDate,
      scheduledAt,
      publish,
    } = body;
    if (!facilityId || !postBody)
      return errorResponse("facilityId and body required", 400, origin);

    const connection = await db.gbp_connections.findFirst({
      where: { facility_id: facilityId, status: "connected" },
    });

    let status = "draft";
    if (scheduledAt) status = "scheduled";

    const post = await db.gbp_posts.create({
      data: {
        facility_id: facilityId,
        gbp_connection_id: connection?.id || null,
        post_type: postType || "update",
        title: title || null,
        body: postBody,
        cta_type: ctaType || null,
        cta_url: ctaUrl || null,
        image_url: imageUrl || null,
        offer_code: offerCode || null,
        start_date: startDate ? new Date(startDate) : null,
        end_date: endDate ? new Date(endDate) : null,
        status,
        scheduled_at: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    const result = { ...post } as Record<string, unknown>;

    if (publish && connection) {
      try {
        const externalId = await publishToGBP(post, connection);
        await db.gbp_posts.update({
          where: { id: post.id },
          data: {
            status: "published",
            published_at: new Date(),
            external_post_id: externalId,
          },
        });
        result.status = "published";
        result.external_post_id = externalId;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Publish failed";
        await db.gbp_posts.update({
          where: { id: post.id },
          data: { status: "failed", error_message: message },
        });
        result.status = "failed";
        result.error_message = message;
      }
    }

    return jsonResponse({ post: result }, 201, origin);
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
    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) return errorResponse("id required", 400, origin);

    const data: Record<string, unknown> = {};
    if (fields.title !== undefined) data.title = fields.title;
    if (fields.body !== undefined) data.body = fields.body;
    if (fields.ctaType !== undefined) data.cta_type = fields.ctaType;
    if (fields.ctaUrl !== undefined) data.cta_url = fields.ctaUrl;
    if (fields.imageUrl !== undefined) data.image_url = fields.imageUrl;
    if (fields.offerCode !== undefined) data.offer_code = fields.offerCode;
    if (fields.startDate !== undefined)
      data.start_date = fields.startDate ? new Date(fields.startDate) : null;
    if (fields.endDate !== undefined)
      data.end_date = fields.endDate ? new Date(fields.endDate) : null;
    if (fields.status !== undefined) data.status = fields.status;
    if (fields.scheduledAt !== undefined)
      data.scheduled_at = fields.scheduledAt
        ? new Date(fields.scheduledAt)
        : null;

    if (Object.keys(data).length === 0)
      return errorResponse("No fields to update", 400, origin);

    const existing = await db.gbp_posts.findUnique({ where: { id } });
    if (!existing) return errorResponse("Post not found", 404, origin);

    const updated = await db.gbp_posts.update({ where: { id }, data });
    return jsonResponse({ post: updated }, 200, origin);
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("id required", 400, origin);

  try {
    const post = await db.gbp_posts.findUnique({
      where: { id },
      include: { gbp_connections: true },
    });

    if (post?.external_post_id && post.gbp_connections?.access_token) {
      try {
        const conn = post.gbp_connections;
        const token = await getValidToken(conn);
        if (token) {
          await fetch(
            `https://mybusiness.googleapis.com/v4/${post.external_post_id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        }
      } catch {
        // Failed to delete from GBP, continue with local delete
      }
    }

    await db.gbp_posts.deleteMany({ where: { id } });
    return jsonResponse({ ok: true }, 200, origin);
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}
