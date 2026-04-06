import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "generate-social-post");
  if (limited) return limited;

  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const {
      facilityId,
      platform,
      postType,
      tone,
      hashtags,
      topic,
    } = body as {
      facilityId?: string;
      platform?: string;
      postType?: string;
      tone?: string;
      hashtags?: string[];
      topic?: string;
    };

    if (!facilityId || !platform) {
      return errorResponse("facilityId and platform required", 400, origin);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return errorResponse("AI service not configured", 500, origin);
    }

    const facility = await db.facilities.findUnique({
      where: { id: facilityId },
      select: {
        name: true,
        location: true,
        website: true,
        google_address: true,
        hours: true,
      },
    });

    if (!facility) {
      return errorResponse("Facility not found", 404, origin);
    }

    const platformLimits: Record<string, number> = {
      facebook: 500,
      instagram: 2200,
      gbp: 1500,
    };
    const charLimit = platformLimits[platform] || 500;

    const toneDesc: Record<string, string> = {
      friendly: "warm, approachable, and conversational",
      professional: "professional, authoritative, and trustworthy",
      casual: "casual, fun, and engaging with a human touch",
      urgency: "action-oriented with a sense of urgency (limited time offers)",
    };

    const postTypes: Record<string, string> = {
      tip: "a helpful storage tip for renters",
      promo: "a promotional post about a current offer or deal",
      seasonal: "a seasonal or holiday-themed post related to storage",
      community: "a community-focused post highlighting local connection",
      faq: "an FAQ-style post answering a common storage question",
      testimonial: "a post styled as or requesting customer testimonials",
    };

    const prompt = `Write a ${platform} post for a self-storage facility.

Facility: ${facility.name}
Location: ${facility.location || facility.google_address || ""}
${facility.website ? `Website: ${facility.website}` : ""}

Post type: ${postTypes[postType || "tip"] || postTypes.tip}
Tone: ${toneDesc[tone || "friendly"] || toneDesc.friendly}
${topic ? `Topic/angle: ${topic}` : ""}
${hashtags?.length ? `Include these hashtags: ${hashtags.join(" ")}` : "Suggest 3-5 relevant hashtags."}

Rules:
- Keep under ${charLimit} characters (not counting hashtags)
- ${platform === "instagram" ? "Format for Instagram: engaging caption, line breaks for readability, hashtags at the end" : ""}
- ${platform === "facebook" ? "Format for Facebook: conversational, include a clear CTA" : ""}
- ${platform === "gbp" ? "Format for Google Business Profile: informative, professional, include a CTA" : ""}
- Do NOT use markdown formatting (no bold, no headers)
- Write the post content only, no meta-commentary

Return JSON with this exact format:
{ "content": "the post text", "hashtags": ["hashtag1", "hashtag2"], "suggestedImage": "brief description of an ideal photo to pair with this post" }`;

    const client = new Anthropic({ apiKey });
    Sentry.addBreadcrumb({ category: "external_api", message: "Calling Anthropic API", level: "info" });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return errorResponse("AI returned no text", 500, origin);
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return jsonResponse(
        {
          content: textBlock.text,
          hashtags: [],
          suggestedImage: null,
        },
        200,
        origin
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return jsonResponse(
      {
        content: parsed.content || textBlock.text,
        hashtags: parsed.hashtags || [],
        suggestedImage: parsed.suggestedImage || null,
      },
      200,
      origin
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}
