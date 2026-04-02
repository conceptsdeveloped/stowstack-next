import { NextRequest } from "next/server";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const SYSTEM_PROMPT = `You are an expert Meta (Facebook/Instagram) ad copywriter specializing in self-storage facilities. You write high-converting ad copy for independent storage operators targeting local customers.

You produce exactly 4 ad variations, each with a distinct angle. Return ONLY valid JSON — no markdown, no text outside the JSON.

ANGLES TO USE (one per variation):
1. social_proof — lead with real rating/reviews to build trust
2. convenience — emphasize location, ease of access, no hassle
3. urgency — limited units, act now, don't lose your spot
4. lifestyle — emotional hook, peace of mind, reclaim your space

META AD FORMAT RULES:
- primaryText: 80-125 characters ideal. This is the main body shown above the image. Conversational, direct, no fluff.
- headline: MAX 40 characters. Bold claim or offer. No punctuation at end.
- description: MAX 30 characters. Supporting line under headline.
- cta: one of — "Learn More", "Get Quote", "Book Now", "Contact Us", "Sign Up"
- Do NOT use all-caps words except CTA-style words like "FREE"
- Use local city/neighborhood when available to increase relevance
- If rating is provided, use the actual number (e.g. "4.8-star")

OUTPUT STRUCTURE:
{
  "variations": [
    {
      "angle": "social_proof",
      "angleLabel": "Social Proof",
      "primaryText": "",
      "headline": "",
      "description": "",
      "cta": "",
      "targetingNote": ""
    }
  ]
}`;

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "generate-copy");
  if (limited) return limited;

  const authError = requireAdminKey(req);
  if (authError) return authError;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse("Server configuration error: missing API key", 500, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { facilityName, location, occupancyRange, biggestIssue, facilityData } =
    body as {
      facilityName?: string;
      location?: string;
      occupancyRange?: string;
      biggestIssue?: string;
      facilityData?: {
        rating?: number;
        reviewCount?: number;
        address?: string;
        reviews?: Array<{ text: string }>;
        photos?: unknown[];
      };
    };

  if (!facilityName?.trim() || !location?.trim()) {
    return errorResponse("facilityName and location are required", 400, origin);
  }

  const lines = [
    `Facility: ${facilityName.trim()}`,
    `Location: ${location.trim()}`,
  ];

  if (facilityData) {
    if (facilityData.rating) {
      lines.push(
        `Google Rating: ${facilityData.rating} stars (${facilityData.reviewCount} reviews)`
      );
    }
    if (facilityData.address) {
      lines.push(`Full Address: ${facilityData.address}`);
    }
    if (facilityData.reviews?.length) {
      const snippets = facilityData.reviews
        .slice(0, 3)
        .map((r) => `"${r.text.slice(0, 120)}"`)
        .join("\n");
      lines.push(`Top Customer Reviews:\n${snippets}`);
    }
    if (facilityData.photos?.length) {
      lines.push(`Photos available: ${facilityData.photos.length}`);
    }
  }

  if (occupancyRange) lines.push(`Current occupancy: ${occupancyRange}`);
  if (biggestIssue)
    lines.push(`Operator's biggest challenge: ${biggestIssue}`);

  const userMessage = `Generate 4 Meta ad variations for this self-storage facility. Use the real data provided — especially the rating and review snippets — to make the copy specific and credible.

${lines.join("\n")}

Return the JSON object with the "variations" array. Nothing else.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return errorResponse(`Anthropic API error: ${text}`, 502, origin);
    }

    const message = await response.json();
    const raw = (message.content[0].text as string).trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return errorResponse("Could not parse ad copy response", 500, origin);
      }
      parsed = JSON.parse(match[0]);
    }

    return jsonResponse(parsed, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(`Copy generation failed: ${message}`, 500, origin);
  }
}
