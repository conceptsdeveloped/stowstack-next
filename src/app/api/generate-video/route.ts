import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { getStyleDirectives } from "@/lib/style-references";

export const maxDuration = 120;

const CORE_STYLE =
  "Kubrick-inspired symmetrical composition with one-point perspective. Warm muted color palette with visible film grain texture. Stop-motion-adjacent pacing — deliberate, slightly staccato movement with physical weight. Golden hour natural light, soft shadows, shallow depth of field. Transitions feel physical like pages turning or layers peeling away. A24 cinematography sensibility — candid, unhurried, analog warmth. Every frame obsessively composed. No digital dissolves or particle effects. Analog warmth meets scientific curiosity, delivered with indie film restraint.";

const STYLE_PRESETS: Record<string, { name: string; suffix: string }> = {
  none: { name: "Default", suffix: "" },
  cinematic: { name: "Cinematic", suffix: "Anamorphic lens quality, shallow depth of field, 35mm film grain, rich shadow detail. Kubrick one-point perspective. Deliberate slow camera push." },
  vintage: { name: "Vintage / Analog", suffix: "Warm analog color shift, soft halation around highlights, Super 8 texture, nostalgic and tactile. Newspaper-print tonal quality — bold blacks, warm highlights. Physical, not filtered." },
  storybook: { name: "Storybook Symmetry", suffix: "Perfectly symmetrical centered Kubrick framing, warm muted tones, flat perspective, meticulously composed. Wes Anderson title sequence pacing — staccato, deliberate, physical transitions." },
  drone: { name: "Aerial / Drone", suffix: "Aerial overhead perspective, smooth sweeping movement, landscape scale, golden hour warmth from above. Film grain texture. Geometric patterns in facility layout." },
  minimal: { name: "Clean / Minimal", suffix: "Maximum negative space, warm earth tones, single subject focus, quiet and sparse. Architectural simplicity with Kubrick precision. Not sterile — warm and textured." },
  bold: { name: "Bold / Graphic", suffix: "High contrast newspaper-print quality. Bold warm accent colors against muted backgrounds. Porsche print ad confidence — alive and striking, not corporate." },
  moody: { name: "Moody / Atmospheric", suffix: "Deep shadows, warm amber tones, atmospheric haze, contemplative. Kubrick hallway tension. Dramatic light shafts through windows. Film grain." },
  handheld: { name: "Handheld / Raw", suffix: "Slight handheld movement, natural available light, candid documentary feel. A24 sensibility — people caught in real moments, unhurried. Shallow depth of field on everyday objects." },
  timelapse: { name: "Timelapse", suffix: "Smooth accelerated motion, golden light shifting, day passing in seconds. Film grain throughout. Warm muted palette. Geometric Kubrick composition held steady as time moves." },
  textile: { name: "Tactile / Textured", suffix: "Rich material textures, close-up surface detail — kraft paper, cardboard, wood grain. Rimowa aesthetic: beauty through use and wear. Shallow DOF, warm window light." },
};

interface FacilityData {
  name: string;
  location: string;
  [key: string]: unknown;
}

const VIDEO_TEMPLATES: Record<
  string,
  {
    name: string;
    description: string;
    mode: string;
    promptTemplate: (f: FacilityData) => string;
  }
> = {
  facility_showcase: {
    name: "Facility Showcase",
    description: "Kubrick one-point perspective hallway — symmetrical, geometric, hypnotic",
    mode: "image_to_video",
    promptTemplate: (f) =>
      `Kubrick one-point perspective shot gliding slowly through ${f.name} storage facility hallway in ${f.location}. Perfectly symmetrical — rows of unit doors recede to a sharp vanishing point. Warm overhead lighting creates rhythmic shadows on concrete floor. Visible film grain. Stop-motion-adjacent pacing — the camera moves with deliberate weight, not fluid smoothness. The beauty of geometric repetition in an institutional space. No people. Quiet.`,
  },
  hero_shot: {
    name: "Hero B-Roll",
    description: "Contemplative exterior — golden hour, Kubrick symmetry, analog grain",
    mode: "text_to_video",
    promptTemplate: (f) =>
      `Wide symmetrical establishing shot of ${f.name} storage facility exterior in ${f.location}. Golden hour light raking across rows of unit doors at a low angle. Long warm shadows creating geometric patterns. Film grain texture throughout. Camera holds steady, then pushes forward with deliberate weight — stop-motion pacing, not smooth glide. Newspaper-print contrast: bold shadows, warm highlights. No people.`,
  },
  seasonal_promo: {
    name: "Seasonal Promo",
    description: "Physical transformation from chaos to Kubrick order — layers peeling away",
    mode: "text_to_video",
    promptTemplate: (f) =>
      `A cluttered garage transitions into a perfectly organized storage unit at ${f.name}. The transformation feels physical — objects move with staccato weight, boxes align with deliberate precision, like stop-motion. Not a smooth dissolve — layers peel away, elements slide into place with resistance. The final state is Kubrick-symmetrical order. Warm muted palette throughout. Film grain. No people.`,
  },
  quick_cta: {
    name: "Quick CTA",
    description: "5-second visual punch — door reveals warm Kubrick interior",
    mode: "image_to_video",
    promptTemplate: (f) =>
      `A storage unit door at ${f.name} rolls up with physical weight — not smooth, slightly staccato, you feel the mechanism. It reveals a perfectly lit interior with Kubrick symmetry. Warm golden light spills out. Camera holds. Film grain visible. The contrast between the dark door exterior and the warm interior is dramatic but muted. No people.`,
  },
  packing_asmr: {
    name: "Packing ASMR",
    description: "Tactile close-up — A24 shallow DOF, golden window light, deliberate hands",
    mode: "text_to_video",
    promptTemplate: () =>
      `Close overhead shot of hands carefully wrapping an object in kraft paper. A24 cinematography — extremely shallow depth of field, only the hands and paper sharp. Warm golden window light from the left. Wooden table surface with visible grain. Movements are deliberate, slightly staccato, stop-motion pacing — each fold of paper feels considered. Tape pulled and torn. Film grain throughout. The tactile feeling of analog warmth.`,
  },
  before_after: {
    name: "Before & After",
    description: "Physical transition from disorder to geometric calm",
    mode: "text_to_video",
    promptTemplate: () =>
      `A room full of stacked boxes and clutter in warm disorganized light. The transition to order feels physical — like a page turning or a layer peeling away, not a digital dissolve. The same view transforms: clutter replaced by clean empty space, warm golden light, geometric order. Stop-motion pacing. Film grain. Newspaper-print contrast. Absence as relief. No people.`,
  },
  custom: {
    name: "Custom Prompt",
    description: "Write your own prompt — full creative control over the generated video",
    mode: "text_to_video",
    promptTemplate: (f) =>
      `A beautifully composed Kubrick-symmetrical scene at ${f.name} in ${f.location}. Warm muted tones, visible film grain. Stop-motion-adjacent pacing — deliberate, weighted movement. Golden hour light. Analog warmth meets geometric precision.`,
  },
};

async function generateVideoPrompt(
  template: (typeof VIDEO_TEMPLATES)[string],
  facility: FacilityData,
  facilityId: string,
  customNotes?: string,
): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return template.promptTemplate(facility);
  }

  const client = new Anthropic({ apiKey: anthropicKey });
  const basePrompt = template.promptTemplate(facility);
  const styleDirectives = await getStyleDirectives(facilityId);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are writing a prompt for an AI video generator (Runway ML). The video is b-roll for a storage facility's marketing.

VISUAL DOCTRINE (follow strictly):
- KUBRICK COMPOSITION: Symmetrical framing, one-point perspective, geometric precision. Every element obsessively placed. Find beauty in institutional spaces — the repetition, the geometry, the order.
- A24 CINEMATOGRAPHY: Warm natural light, golden hour tones, soft shadows, shallow depth of field on everyday objects. Human moments are candid and unhurried — people thinking, doing, living. Not posing.
- STOP-MOTION PACING: Movement is deliberate, slightly staccato — things move with physical weight, not fluid ease. Transitions feel physical: pages turning, layers peeling, elements sliding with resistance. No swooshes, no digital dissolves, no particle effects.
- ANALOG WARMTH: Visible film grain, warm muted tones, newspaper-print contrast. The warmth of ink on paper, not the glow of a screen.
- THE GOVERNING PRINCIPLE: Analog warmth meets scientific curiosity, delivered with indie film restraint. No excess, no spectacle for its own sake. Trust the audience.
${styleDirectives}

HARD RULES:
- No business names, addresses, locations, or brand names
- No text on screen
- No people talking. Hands-only if people needed.
- Under 120 words
- Focus on: camera movement, lighting quality, composition, texture, color, pacing

Template: ${template.name}
Base prompt: ${basePrompt}
${customNotes ? `Notes: ${customNotes}` : ""}

Refine into a visually compelling prompt. Return ONLY the prompt, nothing else.`,
      },
    ],
  });

  return (
    (message.content[0] as { type: "text"; text: string }).text.trim() ||
    basePrompt
  );
}

/* ── FAL.ai Wan2.2 Video Generation ── */

async function callFal(
  prompt: string,
  imageUrl: string | null,
  mode: string,
): Promise<{ videoUrl: string }> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error("NO_FAL_KEY");

  const model =
    mode === "image_to_video"
      ? "fal-ai/wan-i2v"
      : "fal-ai/wan-t2v";

  const input: Record<string, unknown> = {
    prompt: prompt.slice(0, 500),
    num_frames: 81,
    frames_per_second: 16,
    resolution: "480p",
    aspect_ratio: "9:16",
    num_inference_steps: 27,
    guidance_scale: 3.5,
  };

  if (mode === "image_to_video" && imageUrl) {
    input.image_url = imageUrl;
  }

  // Synchronous call — blocks until video is generated (~30-60s with fast model)
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.detail || data.message || JSON.stringify(data) || `FAL error: ${res.status}`,
    );
  }

  const videoUrl = data.video?.url;
  if (!videoUrl) throw new Error("FAL returned no video URL");

  return { videoUrl };
}


/* ── Generate video — FAL.ai exclusively (synchronous) ── */

async function generateVideo(
  prompt: string,
  imageUrl: string | null,
  mode: string,
): Promise<{ videoUrl: string }> {
  return callFal(prompt, imageUrl, mode);
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  const templates = Object.entries(VIDEO_TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    description: t.description,
    mode: t.mode,
  }));
  const styles = Object.entries(STYLE_PRESETS).map(([id, s]) => ({
    id,
    name: s.name,
  }));

  return jsonResponse(
    { templates, styles, configured: !!process.env.FAL_KEY, provider: "fal" },
    200,
    origin,
  );
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const {
      templateId,
      facilityId,
      imageUrl,
      customNotes,
      promptOverride,
      stylePreset,
    } = body;

    if (!templateId || !facilityId) {
      return errorResponse(
        "templateId and facilityId required",
        400,
        origin,
      );
    }

    const template = VIDEO_TEMPLATES[templateId];
    if (!template) return errorResponse("Invalid template", 400, origin);

    const facility = await db.facilities.findUnique({
      where: { id: facilityId },
    });
    if (!facility) return errorResponse("Facility not found", 404, origin);

    const facilityData: FacilityData = {
      name: facility.name,
      location: facility.location,
    };

    let prompt =
      promptOverride?.trim() ||
      (await generateVideoPrompt(template, facilityData, facilityId, customNotes));

    prompt = `${prompt} ${CORE_STYLE}`;
    const style = STYLE_PRESETS[stylePreset];
    if (style?.suffix) {
      prompt = `${prompt} ${style.suffix}`;
    }
    prompt = prompt.slice(0, 1000);

    const sourceImage = imageUrl || null;
    if (template.mode === "image_to_video" && !sourceImage) {
      const asset = await db.assets.findFirst({
        where: { facility_id: facilityId, type: "photo" },
        orderBy: { created_at: "desc" },
        select: { url: true },
      });
      if (!asset) {
        return errorResponse(
          "This template requires an image. Upload or scrape facility images first.",
          400,
          origin,
        );
      }
    }

    const result = await generateVideo(prompt, sourceImage, template.mode);

    return jsonResponse(
      {
        videoUrl: result.videoUrl,
        prompt,
        template: templateId,
        status: "SUCCEEDED",
      },
      200,
      origin,
    );
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Video generation failed",
      500,
      origin,
    );
  }
}
