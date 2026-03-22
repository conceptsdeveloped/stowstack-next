import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
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
import { getStyleDirectives } from "@/lib/style-references";

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
      "Styled hero image for Meta/Instagram ads — facility exterior or interior at golden hour",
    aspect: "1:1",
    promptBase:
      "Photograph of a self-storage facility in warm golden hour light. Shallow depth of field. Visible film grain texture. Bold contrast like a high-quality newspaper print — deep blacks, warm highlights, slightly compressed tonal range. The image should feel tactile, like a 1980s Porsche print ad: confident, alive, not sterile. Natural light raking across clean architecture. No people.",
  },
  ad_hero_wide: {
    name: "Ad Hero (Wide)",
    description: "Wide format hero for Facebook feed or Google Display ads",
    aspect: "16:9",
    promptBase:
      "Wide cinematic shot of a self-storage facility exterior. Kubrick-inspired one-point perspective — symmetrical composition, geometric precision. Late afternoon light casting long warm shadows. Subtle film grain. High contrast with warm muted tones, not oversaturated. The feel of a premium print advertisement scanned from a magazine. Generous negative space. No people.",
  },
  lifestyle_moving: {
    name: "Lifestyle — Moving Day",
    description:
      "Candid moving day moment — A24 film sensibility, not stock photography",
    aspect: "1:1",
    promptBase:
      "Candid photograph of a person mid-stride carrying a cardboard box. Shot like an A24 film still — shallow depth of field, warm natural window light, golden hour tones. The person is caught in a real moment, unhurried, not posing. Visible grain. Warm muted color palette. Background soft and out of focus. The feeling of documentary photography, not commercial stock.",
  },
  lifestyle_organized: {
    name: "Lifestyle — Organized Space",
    description:
      "Satisfying organized storage unit — Kubrick symmetry meets warm analog texture",
    aspect: "1:1",
    promptBase:
      "Perfectly organized storage unit interior shot with symmetrical Kubrick-style one-point perspective. Neatly stacked boxes receding to a vanishing point. Warm overhead lighting casting soft shadows. Subtle film grain texture. The satisfaction of geometric order. Muted warm tones — kraft browns, warm whites, soft amber light. Not clinical or sterile. The beauty of an institutional space treated with care.",
  },
  lifestyle_packing: {
    name: "Lifestyle — Packing",
    description: "Close-up tactile packing moment — shallow DOF, natural light",
    aspect: "4:5",
    promptBase:
      "Close-up photograph of hands wrapping an item in kraft paper and placing it into a cardboard box. Extremely shallow depth of field — only the hands and paper are sharp. Warm natural window light, golden hour. Wooden table surface with visible grain. Subtle film grain over the whole image. Tactile, analog warmth. Shot like a still from an independent film. The feeling of care and deliberateness.",
  },
  social_promo: {
    name: "Social Promo Graphic",
    description:
      "Bold promotional image — Porsche-ad confidence with newspaper print texture",
    aspect: "1:1",
    promptBase:
      "A storage unit door as the central subject, shot straight-on with symmetrical framing. High contrast, newspaper-print tonal quality — bold blacks, warm highlights, visible grain texture. Large areas of warm negative space above and below for text overlay. The composition should feel like a 1980s Porsche print advertisement: bold, clean, confident, but with warmth and character. Not glossy or corporate.",
  },
  social_seasonal: {
    name: "Seasonal Graphic",
    description:
      "Seasonal atmosphere with analog warmth — cozy, textured, real",
    aspect: "1:1",
    promptBase:
      "Warm seasonal still-life photograph. Natural materials — cardboard boxes, wooden surfaces, warm fabrics, kraft paper. Golden natural light from a window. Shallow depth of field with one element in sharp focus. Visible film grain. Muted seasonal color palette — warm ambers, soft greens, natural browns. The feeling of a quiet domestic moment. Shot like an indie film prop detail. Not glossy, not stock.",
  },
  before_after: {
    name: "Before/After Split",
    description:
      "Dramatic transformation — disorder to Kubrick-precise order",
    aspect: "1:1",
    promptBase:
      "Split composition photograph. Left half: a cluttered, chaotic garage with boxes stacked haphazardly, warm but messy natural light. Right half: the same items in a perfectly organized storage unit with Kubrick-symmetrical precision, clean warm overhead lighting, geometric order. Both sides share the same warm grain texture and muted color palette. The contrast should feel dramatic but the overall image cohesive. Not sterile on either side — warm and textured throughout.",
  },
  text_ad: {
    name: "Text Ad Creative",
    description:
      "Ad background with generous negative space — newspaper-quality texture",
    aspect: "1:1",
    promptBase:
      "A storage facility photographed with intentional composition leaving large areas of warm negative space for text overlay. Newspaper-print tonal quality — high contrast, subtle grain, warm muted tones. Soft focus on the facility elements, sharp architectural lines. The feel of a premium print advertisement background. Warm neutrals, not clinical whites. Room at top and bottom thirds for Franklin Gothic headlines. No people, no text.",
  },
  story_bg: {
    name: "Story Background",
    description: "Vertical Kubrick-perspective hallway or exterior for stories",
    aspect: "9:16",
    promptBase:
      "Vertical photograph of a storage facility hallway in Kubrick one-point perspective — symmetrical, geometric, receding to a vanishing point. Warm overhead lighting creating rhythmic shadows. Subtle film grain texture. Large areas of soft warm gradient for text readability. Dramatic but quiet. Muted warm color palette. The beauty of repetition and order in an institutional space. No people.",
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

  const creativeContext = getCreativeContext("meta");
  const styleDirectives = await getStyleDirectives(facilityId);
  const client = new Anthropic({ apiKey: anthropicKey });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Enhance this image generation prompt. Make it more visually specific and compelling. Keep under 150 words. No business names, no text on screen.

VISUAL DOCTRINE (follow strictly):
- Analog warmth, not digital sterility. Visible film grain. Warm muted tones.
- Newspaper-print tonal quality: bold blacks, warm highlights, compressed tonal range, ink-on-paper texture.
- Kubrick composition: symmetrical framing, one-point perspective, geometric precision, obsessively placed elements.
- A24 cinematography: shallow depth of field, golden hour natural light, soft shadows, candid unhurried moments.
- 1980s Porsche print ad energy: bold, clean, confident, witty, alive — never sterile or corporate.
- Rimowa philosophy: beauty through texture and use, not pristine polish. Imperfection is intentional.
- Anti-references: NO clip art, NO blue-and-orange storage schemes, NO stock-photo posing, NO HDR, NO sterile tech aesthetic.
${styleDirectives}

${creativeContext.slice(0, 400)}

Base prompt: ${basePrompt}
Facility: ${facility.name} in ${facility.location}
${customNotes ? `Notes: ${customNotes}` : ""}
${copyContext ? `\nAD COPY THIS IMAGE WILL ACCOMPANY (design the image to complement this specific copy — match its emotional angle, reinforce its message visually, and create a cohesive ad unit):\n${copyContext}` : ""}

Return ONLY the enhanced prompt. Nothing else.`,
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

/* ── Generate image — tries Gemini → Replicate/Flux → Pollinations.ai ── */

interface GenerateImageResult {
  imageUrl: string;
  predictionId: string | null;
}

async function generateImage(
  prompt: string,
  aspect: string,
  keys: { gemini?: string; replicate?: string },
): Promise<GenerateImageResult> {
  // Try Gemini first
  if (keys.gemini) {
    try {
      const aspectMap: Record<string, string> = {
        "1:1": "1:1",
        "16:9": "16:9",
        "4:5": "3:4",
        "9:16": "9:16",
      };
      const model = "gemini-2.5-flash-image";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": keys.gemini,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: { aspectRatio: aspectMap[aspect] || "1:1" },
            },
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(
          (p: { inline_data?: { mimeType?: string; data?: string } }) =>
            p.inline_data?.mimeType?.startsWith("image/"),
        );
        if (imagePart) {
          return {
            imageUrl: `data:${imagePart.inline_data.mimeType};base64,${imagePart.inline_data.data}`,
            predictionId: null,
          };
        }
      }
    } catch {
      // Fall through to Replicate
    }
  }

  // Fallback: Replicate/Flux
  if (keys.replicate) {
    try {
      const dims = ASPECT_RATIOS[aspect] || ASPECT_RATIOS["1:1"];
      const startRes = await fetch(
        "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keys.replicate}`,
            "Content-Type": "application/json",
            Prefer: "wait",
          },
          body: JSON.stringify({
            input: {
              prompt,
              width: dims.width,
              height: dims.height,
              num_inference_steps: 25,
              guidance: 3.5,
              output_format: "webp",
              output_quality: 90,
            },
          }),
        },
      );
      if (startRes.ok) {
        const prediction = await startRes.json();
        if (prediction.status === "succeeded" && prediction.output) {
          const output = Array.isArray(prediction.output)
            ? prediction.output[0]
            : prediction.output;
          return { imageUrl: output, predictionId: prediction.id };
        }
        // Poll if not immediately ready
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const pollRes = await fetch(
            `https://api.replicate.com/v1/predictions/${prediction.id}`,
            { headers: { Authorization: `Bearer ${keys.replicate}` } },
          );
          const data = await pollRes.json();
          if (data.status === "succeeded") {
            return {
              imageUrl: Array.isArray(data.output) ? data.output[0] : data.output,
              predictionId: prediction.id,
            };
          }
          if (data.status === "failed") break;
        }
      }
    } catch {
      // Fall through to Hugging Face
    }
  }

  // Fallback: Pollinations.ai (free, no key required — optional POLLINATIONS_API_KEY for no rate limits)
  {
    const dims = ASPECT_RATIOS[aspect] || ASPECT_RATIOS["1:1"];
    const pollinationsKey = process.env.POLLINATIONS_API_KEY;
    const params = new URLSearchParams({
      width: String(dims.width),
      height: String(dims.height),
      model: "flux",
    });
    if (pollinationsKey) {
      params.set("key", pollinationsKey);
      params.set("nologo", "true");
      params.set("enhance", "true");
    }
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params}`;

    const res = await fetch(url);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const base64 = buffer.toString("base64");
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return {
        imageUrl: `data:${contentType};base64,${base64}`,
        predictionId: null,
      };
    }
    const errText = await res.text().catch(() => "");
    throw new Error(`Pollinations error: ${res.status} ${errText.slice(0, 100)}`);
  }
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
      configured: true, // Pollinations.ai fallback requires no API key
    },
    200,
    origin,
  );
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
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

    const keys = {
      gemini: process.env.GEMINI_API_KEY,
      replicate: process.env.REPLICATE_API_TOKEN,
    };

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

    // Generate — tries Gemini first, falls back to Flux
    const result = await generateImage(
      prompt,
      aspect || template.aspect,
      keys,
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
