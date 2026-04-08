import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { getCreativeContext } from "@/lib/creative";
import { getBrandContextForVisual } from "@/lib/brand-doctrine";
import { getStyleDirectives } from "@/lib/style-references";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 60;

/* ── Image Templates ── */

const IMAGE_TEMPLATES: Record<
  string,
  {
    name: string;
    description: string;
    aspect: string;
    promptBase: string;
  }
> = {
  ad_hero: {
    name: "Ad Hero Image",
    description:
      "Styled hero image for Meta/Instagram ads — facility exterior or interior",
    aspect: "1:1",
    promptBase:
      "Photograph of a clean, well-maintained self-storage facility — a single-story or multi-story commercial building with rows of orange or blue roll-up metal unit doors, wide driveways, and clear signage. Shallow depth of field. Visible film grain texture. Bold contrast like a newspaper print — deep blacks, crisp highlights, compressed tonal range. The image should feel like a 1980s Porsche print ad: confident, alive, not sterile. Natural daylight on clean architecture. No people.",
  },
  ad_hero_wide: {
    name: "Ad Hero (Wide)",
    description: "Wide format hero for Facebook feed or Google Display ads",
    aspect: "16:9",
    promptBase:
      "Wide cinematic shot of a self-storage facility exterior — a long row of identical roll-up metal unit doors, clean concrete driveways, the repeating geometry of a commercial storage complex. Deliberate, considered composition — every element placed with intention. Clear natural light. Subtle film grain. High contrast, not oversaturated. Neutral color palette. The feel of a premium print advertisement scanned from a magazine. Generous negative space. No people.",
  },
  lifestyle_moving: {
    name: "Lifestyle — Moving Day",
    description:
      "Candid moving day moment — A24 film sensibility, not stock photography",
    aspect: "1:1",
    promptBase:
      "Candid photograph of a person mid-stride carrying a cardboard box through the hallway of a self-storage facility — indoor corridor with rows of metal roll-up doors on both sides, concrete floor, fluorescent overhead lights. Shot like an A24 film still — shallow depth of field, the person is caught in a real moment, unhurried, not posing. Visible grain. Muted naturalistic color palette. Background showing the storage hallway soft and out of focus. Documentary photography, not commercial stock.",
  },
  lifestyle_organized: {
    name: "Lifestyle — Organized Space",
    description:
      "Satisfying organized storage unit — clean and precisely arranged",
    aspect: "1:1",
    promptBase:
      "Interior of a self-storage unit — rectangular room with corrugated metal walls, a rolled-up metal door at the entrance, smooth concrete floor. A realistic mix of stored belongings organized neatly: stacked cardboard boxes and plastic bins, a dresser or bookshelf against one wall, a bicycle, golf clubs, framed art leaning in a row, holiday decoration boxes. Everything arranged with deliberate care — nothing accidental. Clean overhead fluorescent lighting. Subtle film grain texture. Neutral tones — kraft browns, whites, concrete gray, metal silver. Clearly a commercial self-storage unit, not a closet or garage.",
  },
  lifestyle_packing: {
    name: "Lifestyle — Packing",
    description: "Close-up tactile packing moment — shallow DOF, natural light",
    aspect: "4:5",
    promptBase:
      "Close-up photograph of hands carefully wrapping an item in kraft paper and placing it into a cardboard box. Extremely shallow depth of field — only the hands and paper are sharp. Soft natural window light. Wooden table surface with visible grain. Subtle film grain. Shot like a still from an independent film. The feeling of care and deliberateness in an everyday moment.",
  },
  social_promo: {
    name: "Social Promo Graphic",
    description:
      "Bold promotional image — Porsche-ad confidence with newspaper print texture",
    aspect: "1:1",
    promptBase:
      "A single orange or blue self-storage roll-up metal door as the central subject, shot straight-on. The door is set in a concrete or metal building facade, with a unit number visible. High contrast, newspaper-print tonal quality — bold blacks, bright highlights, visible grain texture. Large areas of neutral negative space above and below for text overlay. The composition should feel like a 1980s Porsche print advertisement: bold, clean, confident. Not glossy or corporate.",
  },
  social_seasonal: {
    name: "Seasonal Graphic",
    description:
      "Seasonal atmosphere — textured, real, not stock",
    aspect: "1:1",
    promptBase:
      "Seasonal still-life photograph. Natural materials — cardboard boxes, wooden surfaces, fabrics, kraft paper. Diffused natural light from a nearby window. Shallow depth of field with one element in sharp focus. Visible film grain. Naturalistic color palette appropriate to the season. The feeling of a quiet domestic moment. Shot like an indie film prop detail. Not glossy, not stock.",
  },
  before_after: {
    name: "Before/After Split",
    description:
      "Cluttered home vs. organized self-storage unit — clear transformation",
    aspect: "1:1",
    promptBase:
      "Two photographs side by side as a diptych. LEFT PHOTO: a normal residential living room with carpet and a window. A couch with laundry piled on one end. A few cardboard boxes on the floor. Kids toys scattered around. A guitar leaning against the wall. A pair of skis or a golf bag in the corner. Books and shoes on the coffee table. Not a disaster — just a lived-in home running out of room. RIGHT PHOTO: a bright clean self-storage unit with steel walls, concrete floor, fluorescent lights, and a metal roll-up door. Inside the unit, ONLY A FEW items are placed with PERFECT geometric precision — three uniform boxes stacked in a neat column, one piece of furniture standing upright against the wall, one bicycle hanging from a hook. MOSTLY EMPTY FLOOR SPACE visible. The unit looks SPACIOUS, ORDERLY, and ALMOST EMPTY compared to the cluttered room. The contrast is chaos vs. calm, clutter vs. space. NO PEOPLE. Film grain texture.",
  },
  text_ad: {
    name: "Text Ad Creative",
    description:
      "Ad background with generous negative space — newspaper-quality texture",
    aspect: "1:1",
    promptBase:
      "A self-storage facility exterior — clean commercial building with rows of metal roll-up doors — photographed with intentional composition leaving large areas of neutral negative space (sky, concrete, driveway) for text overlay. Newspaper-print tonal quality — high contrast, subtle grain. Soft focus on the facility elements, sharp architectural lines of the building. The feel of a premium print advertisement background. Room at top and bottom thirds for bold headlines. No people, no text.",
  },
  story_bg: {
    name: "Story Background",
    description: "Vertical hallway or exterior for stories",
    aspect: "9:16",
    promptBase:
      "Vertical photograph of a self-storage facility indoor hallway — long corridor with identical metal roll-up unit doors on both sides, concrete floor, fluorescent ceiling lights. Composed with care — the hallway recedes naturally into depth. Even overhead lighting creating rhythmic shadows on the concrete floor. Subtle film grain texture. Large areas of soft gradient for text readability. Dramatic but quiet. Neutral tones. The beauty of repetition and order. No people.",
  },
};

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "4:5": { width: 896, height: 1088 },
  "9:16": { width: 768, height: 1344 },
};

/* ── Enhance prompt with Claude using CREATIVE.md voice ── */

interface FacilityData {
  name: string;
  location: string;
  context?: string;
}

async function buildFacilityImageContext(facilityId: string): Promise<string> {
  const lines: string[] = [];

  try {
    const [onboardingRows, pmsUnits, pmsSnapshot, pmsSpecials, placesRows] = await Promise.all([
      db.$queryRaw<Array<{ steps: Record<string, unknown> }>>`
        SELECT co.steps FROM client_onboarding co
        JOIN clients c ON c.id = co.client_id
        WHERE c.facility_id = ${facilityId}::uuid
        ORDER BY co.updated_at DESC LIMIT 1
      `.catch(() => []),
      db.facility_pms_units.findMany({
        where: { facility_id: facilityId },
        orderBy: { total_count: "desc" },
        take: 5,
        select: { unit_type: true, total_count: true, occupied_count: true, street_rate: true, features: true },
      }).catch(() => []),
      db.facility_pms_snapshots.findFirst({
        where: { facility_id: facilityId },
        orderBy: { snapshot_date: "desc" },
        select: { occupancy_pct: true },
      }).catch(() => null),
      db.facility_pms_specials.findMany({
        where: { facility_id: facilityId, active: true },
        take: 3,
        select: { name: true, description: true },
      }).catch(() => []),
      db.$queryRaw<Array<Record<string, unknown>>>`
        SELECT rating, review_count FROM places_data
        WHERE facility_id = ${facilityId}::uuid
        ORDER BY fetched_at DESC LIMIT 1
      `.catch(() => []),
    ]);

    const onboarding = onboardingRows?.[0]?.steps as Record<string, Record<string, unknown>> | undefined;
    if (onboarding) {
      const details = onboarding?.facilityDetails?.data as Record<string, unknown> | undefined;
      if (details?.brandDescription) lines.push(`Brand: ${String(details.brandDescription).slice(0, 200)}`);
      if (details?.sellingPoints) lines.push(`Key selling points: ${String(details.sellingPoints)}`);
      const demo = onboarding?.targetDemographics?.data as Record<string, unknown> | undefined;
      if (demo?.primaryAudience) lines.push(`Target audience: ${String(demo.primaryAudience)}`);
    }

    if (pmsSnapshot?.occupancy_pct) {
      const occ = parseFloat(String(pmsSnapshot.occupancy_pct));
      lines.push(`Occupancy: ${occ}%`);
      if (occ < 70) lines.push("Strategy: aggressive — facility needs to fill units");
      else if (occ > 90) lines.push("Strategy: premium — facility is nearly full, emphasize quality and exclusivity");
    }

    if (pmsUnits.length > 0) {
      const unitSummary = pmsUnits.map(u => {
        const features = u.features ? ` (${String(u.features)})` : "";
        return `${u.unit_type}${features}: $${u.street_rate}/mo`;
      }).join(", ");
      lines.push(`Available units: ${unitSummary}`);
    }

    if (pmsSpecials.length > 0) {
      lines.push(`Active specials: ${pmsSpecials.map(s => s.name).join(", ")}`);
    }

    const places = placesRows?.[0];
    if (places?.rating) lines.push(`Google rating: ${places.rating} stars (${places.review_count} reviews)`);
  } catch {
    // Non-fatal — proceed with whatever context we have
  }

  return lines.join("\n");
}

async function enhancePrompt(
  basePrompt: string,
  facility: FacilityData,
  facilityId: string,
  customNotes: string | undefined,
  anthropicKey: string | undefined,
  copyContext?: string,
): Promise<string> {
  if (!anthropicKey) return basePrompt;

  const creativeContext = await getCreativeContext("meta");
  const brandVisual = await getBrandContextForVisual();
  const styleDirectives = await getStyleDirectives(facilityId);
  const facilityContext = await buildFacilityImageContext(facilityId);
  const client = new Anthropic({ apiKey: anthropicKey });

  try {
    Sentry.addBreadcrumb({ category: "external_api", message: "Calling Anthropic API", level: "info" });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are enhancing an image generation prompt for a self-storage facility's advertising. Your job is to make the image SPECIFIC to this facility's situation and the ad copy it will accompany.

FACILITY CONTEXT (use this to tailor the image):
Facility: ${facility.name} in ${facility.location}
${facilityContext}
${customNotes ? `Admin notes: ${customNotes}` : ""}

${copyContext ? `AD COPY THIS IMAGE WILL ACCOMPANY — the image MUST visually reinforce this specific message:\n${copyContext}\n` : "WARNING: No ad copy provided. Generate a versatile image that works for general self-storage advertising.\n"}
ADAPT THE IMAGE based on the facility context:
- If the facility has low occupancy, the image should convey availability and welcome.
- If the facility is nearly full, the image should convey premium quality and exclusivity.
- If there are active specials, the image should feel promotional and energetic.
- If the copy emphasizes security, the image should show clean, well-lit, secure-feeling spaces.
- If the copy emphasizes convenience or moving, show relatable lifestyle moments.
- If the copy uses social proof (ratings, reviews), the image should feel trustworthy and established.

${brandVisual.slice(0, 800)}

VISUAL DOCTRINE:
- Visible film grain texture. Newspaper-print tonal quality.
- Intentional composition — every element placed with purpose. Vary framing: wide shots, close-ups, off-center, rule of thirds. NOT always symmetrical or centered.
- Vary lighting naturally — daylight, overcast, fluorescent, window light. NOT always golden hour.
- No business names or text on screen.
${styleDirectives}

${creativeContext.slice(0, 300)}

IMAGE GENERATION RULES (critical for AI image models):
- Keep object descriptions simple and separated. Do NOT pile many different objects together — the model will merge them into blobs.
- When showing "messy" or "cluttered" scenes: use a few distinct recognizable items (a guitar, some boxes, shoes, books) each in their own spot. NOT a wall of overlapping stuff.
- When showing "organized" or "clean" scenes: use minimal items with lots of visible empty floor space. A few neatly placed things reads as MORE organized than many neatly placed things.
- Storage units should always feel BRIGHT and WELL-LIT — fluorescent white light, clean concrete floor, visible metal walls. Never dark or moody.
- Residential/home scenes should feel warm and lived-in but recognizable — carpet, furniture, windows, curtains.
- NO PEOPLE unless the template specifically calls for them. AI-generated people in ads are a liability.

Base prompt to enhance: ${basePrompt}

Enhance this into a visually specific prompt under 150 words. Return ONLY the enhanced prompt.`,
        },
      ],
    });
    return (
      (message.content[0] as { type: "text"; text: string }).text.trim() ||
      basePrompt
    );
  } catch {
    return basePrompt;
  }
}

/* ── Generate image via FAL.ai (Flux) ── */

interface GenerateImageResult {
  imageUrl: string;
  predictionId: string | null;
}

async function generateImage(
  prompt: string,
  aspect: string,
): Promise<GenerateImageResult> {
  const falKey = process.env.FAL_KEY;
  if (!falKey)
    throw new Error("FAL_KEY not configured. Add it to your environment variables. Get a key at fal.ai");

  const dims = ASPECT_RATIOS[aspect] || ASPECT_RATIOS["1:1"];
  const _aspectRatio = aspect === "16:9" ? "16:9"
    : aspect === "9:16" ? "9:16"
    : aspect === "4:5" ? "4:5"
    : "1:1";

  // Use FAL Flux Realism for photorealistic output (better hands/people)
  const res = await fetch("https://fal.run/fal-ai/flux-realism", {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: {
        width: dims.width,
        height: dims.height,
      },
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`FAL image generation failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("FAL returned no image URL");

  return { imageUrl, predictionId: null };
}

/* ── Route Handlers ── */

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  const templates = Object.entries(IMAGE_TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    description: t.description,
    aspect: t.aspect,
  }));

  return jsonResponse(
    {
      templates,
      configured: !!process.env.FAL_KEY,
    },
    200,
    origin,
  );
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "generate-image");
  if (limited) return limited;

  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { templateId, facilityId, customNotes, promptOverride, aspect, copyContext } =
      body;

    if (!templateId || !facilityId) {
      return errorResponse(
        "templateId and facilityId required",
        400,
        origin,
      );
    }

    const template = IMAGE_TEMPLATES[templateId];
    if (!template) return errorResponse("Invalid template", 400, origin);

    const facility = await db.facilities.findUnique({
      where: { id: facilityId },
    });
    if (!facility) return errorResponse("Facility not found", 404, origin);

    const facilityData: FacilityData = {
      name: facility.name,
      location: facility.location,
    };

    // Build prompt
    let prompt = promptOverride?.trim();
    if (!prompt) {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      prompt = await enhancePrompt(
        template.promptBase,
        facilityData,
        facilityId,
        customNotes,
        anthropicKey,
        copyContext,
      );
    }

    // Generate via FAL.ai
    const result = await generateImage(
      prompt,
      aspect || template.aspect,
    );

    // Upload to Vercel Blob for permanent URL
    let permanentUrl = result.imageUrl;
    try {
      let imageBuffer: Buffer;
      if (result.imageUrl.startsWith("data:")) {
        // Base64 data URL (from Gemini)
        const base64Data = result.imageUrl.split(",")[1];
        imageBuffer = Buffer.from(base64Data, "base64");
      } else {
        // Hosted URL (from Replicate) — download it
        const imgRes = await fetch(result.imageUrl);
        imageBuffer = Buffer.from(await imgRes.arrayBuffer());
      }
      const blob = await put(
        `generated/${facilityId}/${templateId}-${Date.now()}.webp`,
        imageBuffer,
        {
          access: "public",
          contentType: "image/webp",
        },
      );
      permanentUrl = blob.url;
    } catch (err) {
      console.error(
        "Blob upload failed, using original URL:",
        (err as Error).message,
      );
    }

    // Save as asset with permanent URL
    try {
      await db.assets.create({
        data: {
          facility_id: facilityId,
          type: "photo",
          source: "ai_generated",
          url: permanentUrl,
          metadata: {
            template: templateId,
            prompt,
            predictionId: result.predictionId,
          },
        },
      });
    } catch {
      // Non-fatal — image was still generated
    }

    return jsonResponse(
      {
        imageUrl: permanentUrl,
        prompt,
        templateId,
        predictionId: result.predictionId,
      },
      200,
      origin,
    );
  } catch (err) {
    console.error("Image generation failed:", (err as Error).message);
    return errorResponse(
      (err as Error).message || "Image generation failed",
      500,
      origin,
    );
  }
}
