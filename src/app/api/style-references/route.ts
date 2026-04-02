import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { synthesizeStyleReference } from "@/lib/synthesis";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 120;

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/* ── GET: List style references ── */

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const url = new URL(req.url);
    const tagsParam = url.searchParams.get("tags");
    const activeOnly = url.searchParams.get("active") !== "false";

    const where: Record<string, unknown> = {};
    if (activeOnly) where.active = true;
    if (tagsParam) {
      where.tags = { hasSome: tagsParam.split(",").map((t) => t.trim()) };
    }

    const refs = await db.style_references.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    return jsonResponse({ references: refs }, 200, origin);
  } catch (err) {
    return errorResponse(
      (err as Error).message || "Failed to load references",
      500,
      origin,
    );
  }
}

/* ── POST: Upload image + analyze with Claude Vision ── */

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "style-references");
  if (limited) return limited;

  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return errorResponse("Missing ANTHROPIC_API_KEY", 500, origin);

  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const urlInput = (formData.get("url") as string) || null;

    if (!imageFile && !urlInput)
      return errorResponse("Provide a file or a URL", 400, origin);

    const title = (formData.get("title") as string) || null;
    const tagsRaw = (formData.get("tags") as string) || "";
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const isVideoFlag = formData.get("isVideo") === "true";

    // Check if this is a video file
    const isVideo = imageFile?.type?.startsWith("video/") || isVideoFlag;
    if (isVideo) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey)
        return errorResponse("GEMINI_API_KEY required for video analysis", 500, origin);

      let videoBuffer: Buffer;
      let videoContentType: string;
      let blobUrl: string;

      if (imageFile) {
        // Direct file upload
        videoBuffer = Buffer.from(await imageFile.arrayBuffer());
        videoContentType = imageFile.type || "video/mp4";
        const blobName = `${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const blob = await put(
          `style-references/${blobName}`,
          videoBuffer,
          { access: "public", contentType: videoContentType },
        );
        blobUrl = blob.url;
      } else {
        // Already uploaded to blob via client upload — fetch for Gemini
        blobUrl = urlInput!;
        const fetchRes = await fetch(blobUrl);
        if (!fetchRes.ok) throw new Error(`Failed to fetch video from blob: ${fetchRes.status}`);
        videoBuffer = Buffer.from(await fetchRes.arrayBuffer());
        videoContentType = fetchRes.headers.get("content-type") || "video/mp4";
      }

      // Ensure content type is correct for Gemini
      if (!videoContentType.startsWith("video/")) {
        videoContentType = "video/mp4";
      }

      // Upload to Gemini File API
      const uploadRes = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": videoContentType,
            "X-Goog-Upload-Protocol": "raw",
            "X-Goog-Upload-Command": "upload, finalize",
          },
          body: new Uint8Array(videoBuffer),
        },
      );

      const uploadText = await uploadRes.text();
      if (!uploadRes.ok) {
        throw new Error(`Gemini file upload failed: ${uploadRes.status} ${uploadText.slice(0, 200)}`);
      }

      let uploadData: Record<string, unknown>;
      try {
        uploadData = JSON.parse(uploadText);
      } catch {
        throw new Error(`Gemini upload returned invalid JSON: ${uploadText.slice(0, 200)}`);
      }

      const fileObj = uploadData.file as Record<string, unknown> | undefined;
      const fileUri = fileObj?.uri as string | undefined;
      if (!fileUri) throw new Error(`Gemini file upload did not return a file URI. Response: ${uploadText.slice(0, 200)}`);

      // Poll until file is ACTIVE
      const fileName = fileObj?.name as string;
      for (let i = 0; i < 30; i++) {
        const statusRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`,
        );
        const statusText = await statusRes.text();
        let statusData: Record<string, unknown>;
        try {
          statusData = JSON.parse(statusText);
        } catch {
          throw new Error(`Gemini poll failed: ${statusText.slice(0, 200)}`);
        }
        if (statusData.state === "ACTIVE") break;
        if (statusData.state === "FAILED") throw new Error("Gemini file processing failed");
        await new Promise((r) => setTimeout(r, 2000));
      }

      // Analyze full video with Gemini
      const analyzeRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { fileData: { mimeType: videoContentType, fileUri } },
                  {
                    text: `Analyze this entire video clip for visual and motion style extraction. Watch the FULL clip — every second matters. This video is being studied for its STYLE PRINCIPLES — not to be copied, but to inform original creative work.

Return a JSON object with these keys:
- composition: framing, perspective, spatial arrangement, symmetry across the clip
- color_palette: dominant colors, temperature, saturation, tonal range, color grading
- lighting: direction, quality, how light changes through the clip, shadow character
- typography: if text/titles appear, describe the type treatment, animation, hierarchy
- mood: emotional tone, energy level, what it makes the viewer feel
- pacing: shot duration, rhythm, editing tempo, transitions (cuts, dissolves, physical)
- camera_movement: tracking, panning, static, handheld, dolly, crane — speed and intention
- motion_language: how elements move within frames — fluid, staccato, stop-motion-like, weighted
- transitions: how shots connect — hard cuts, physical peels, dissolves, match cuts
- effectiveness: what makes this visually compelling as a piece of video communication
- style_directive: ONE sentence (under 40 words) that could be injected into a VIDEO generation prompt to capture the motion and visual essence of this style. Include pacing, camera movement, lighting, and color — not subject matter.

Context: These directives will guide AI video generation for storage facility marketing. Our video doctrine values: Kubrick symmetry and one-point perspective, A24 cinematography (warm natural light, shallow DOF, candid moments), stop-motion-adjacent pacing (deliberate, staccato, physical weight), analog warmth (film grain, warm muted tones), physical transitions (pages turning, layers peeling — no digital dissolves).

Return ONLY valid JSON. No markdown fences, no explanation.`,
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!analyzeRes.ok) {
        const errText = await analyzeRes.text().catch(() => "");
        throw new Error(`Gemini analysis failed: ${analyzeRes.status} ${errText.slice(0, 200)}`);
      }

      const analyzeData = await analyzeRes.json();
      const rawText = analyzeData.candidates?.[0]?.content?.parts
        ?.filter((p: { text?: string }) => p.text)
        .map((p: { text: string }) => p.text)
        .join("") || "";

      let analysis: Record<string, unknown>;
      try {
        analysis = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Could not parse Gemini video analysis as JSON");
        analysis = JSON.parse(match[0]);
      }

      const finalTags = tags.length > 0 ? tags : [...autoTags(analysis), "video"];

      // Clean up Gemini file (non-fatal)
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`,
        { method: "DELETE" },
      ).catch((err) => console.error("[gemini_cleanup] Fire-and-forget failed:", err));

      const ref = await db.style_references.create({
        data: {
          image_url: blobUrl,
          title: title || (imageFile ? imageFile.name.replace(/\.[^.]+$/, "") : "Video Reference"),
          tags: finalTags,
          analysis: analysis as unknown as Prisma.InputJsonValue,
          active: true,
        },
      });

      // Auto-synthesize into CREATIVE.md (non-blocking)
      synthesizeStyleReference(ref.analysis as Record<string, unknown>, ref.title || undefined).catch((err) => console.error("[style_synthesize] Fire-and-forget failed:", err));

      return jsonResponse({ reference: ref }, 200, origin);
    }

    let imageBuffer: Buffer;
    let contentType: string;
    let blobName: string;
    let sourceUrl: string | null = null;

    if (imageFile) {
      // Image file upload
      imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      contentType = imageFile.type || "image/jpeg";
      blobName = `${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    } else {
      // URL fetch
      sourceUrl = urlInput!;
      const fetchRes = await fetch(sourceUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; StorageAds/1.0)" },
      });
      if (!fetchRes.ok)
        return errorResponse(`Failed to fetch URL: ${fetchRes.status}`, 400, origin);

      imageBuffer = Buffer.from(await fetchRes.arrayBuffer());
      contentType = fetchRes.headers.get("content-type") || "image/jpeg";

      // If it's HTML, we can't send it as an image — take a different approach
      if (contentType.includes("text/html")) {
        // For web pages: send the URL directly to Claude for analysis (no image)
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 800,
          messages: [
            {
              role: "user",
              content: `Analyze the visual design and style of this web page for style extraction. I'm providing the URL — describe what you know about its visual identity based on the brand.

URL: ${sourceUrl}

This is being studied for STYLE PRINCIPLES — not to be copied, but to inform original creative work.

Return a JSON object with these keys:
- composition: layout approach, spatial arrangement, use of negative space
- color_palette: likely dominant colors, temperature, saturation
- lighting: photographic style if imagery is used
- typography: type treatment, weight, hierarchy if known
- mood: emotional tone, energy level
- effectiveness: what makes this brand's visual identity compelling
- style_directive: ONE sentence (under 30 words) that could be injected into an image generation prompt to capture the essence of this style. Focus on lighting, composition, color, and texture — not subject matter.

Context: These directives will guide AI image/video generation for storage facility marketing. Our visual doctrine values: analog warmth, Kubrick symmetry, 1980s Porsche print ad confidence, A24 cinematography, newspaper-print tonal quality, Rimowa texture philosophy.

Return ONLY valid JSON. No markdown fences, no explanation.`,
            },
          ],
        });

        const rawText = (message.content[0] as { type: "text"; text: string }).text.trim();
        let analysis: Record<string, unknown>;
        try {
          analysis = JSON.parse(rawText);
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("Could not parse vision analysis as JSON");
          analysis = JSON.parse(match[0]);
        }

        const finalTags = tags.length > 0 ? tags : autoTags(analysis);

        const ref = await db.style_references.create({
          data: {
            image_url: sourceUrl,
            title: title || new URL(sourceUrl).hostname,
            tags: finalTags,
            analysis: analysis as unknown as Prisma.InputJsonValue,
            active: true,
          },
        });

        // Auto-synthesize into CREATIVE.md (non-blocking)
      synthesizeStyleReference(ref.analysis as Record<string, unknown>, ref.title || undefined).catch((err) => console.error("[style_synthesize] Fire-and-forget failed:", err));

      return jsonResponse({ reference: ref }, 200, origin);
      }

      // Ensure it's a valid image type for Vision API
      if (!contentType.startsWith("image/") && !contentType.includes("pdf")) {
        return errorResponse(
          `Unsupported content type: ${contentType}. Provide an image, PDF, or web page URL.`,
          400,
          origin,
        );
      }

      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      blobName = `${Date.now()}-url-ref.${ext}`;
    }

    // Upload to Vercel Blob
    const blob = await put(
      `style-references/${blobName}`,
      imageBuffer,
      { access: "public", contentType },
    );

    // Analyze with Claude Vision
    const base64Data = imageBuffer.toString("base64");
    const mediaType = (contentType || "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            {
              type: "text",
              text: `Analyze this reference image for visual style extraction. This image is being studied for its STYLE PRINCIPLES — not to be copied, but to inform original creative work.

Return a JSON object with these keys:
- composition: framing, perspective, spatial arrangement, symmetry, use of negative space
- color_palette: dominant colors, temperature, saturation, tonal range
- lighting: direction, quality, mood created by light, shadow character
- typography: if text/type is present, describe the type treatment, weight, tracking, hierarchy
- mood: emotional tone, energy level, what it makes the viewer feel
- effectiveness: what makes this visually compelling as a piece of communication
- style_directive: ONE sentence (under 30 words) that could be injected into an image generation prompt to capture the essence of this style. Focus on lighting, composition, color, and texture — not subject matter.

Context: These directives will guide AI image/video generation for storage facility marketing. Our visual doctrine values: analog warmth, Kubrick symmetry, 1980s Porsche print ad confidence, A24 cinematography, newspaper-print tonal quality, Rimowa texture philosophy.

Return ONLY valid JSON. No markdown fences, no explanation.`,
            },
          ],
        },
      ],
    });

    const rawText = (
      message.content[0] as { type: "text"; text: string }
    ).text.trim();

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse vision analysis as JSON");
      analysis = JSON.parse(match[0]);
    }

    // Auto-generate tags from analysis if none provided
    const finalTags =
      tags.length > 0
        ? tags
        : autoTags(analysis);

    const ref = await db.style_references.create({
      data: {
        image_url: blob.url,
        title,
        tags: finalTags,
        analysis: analysis as unknown as Prisma.InputJsonValue,
        active: true,
      },
    });

    return jsonResponse({ reference: ref }, 200, origin);
  } catch (err) {
    console.error("Style reference upload failed:", (err as Error).message);
    return errorResponse(
      (err as Error).message || "Upload failed",
      500,
      origin,
    );
  }
}

/* ── DELETE: Remove a style reference ── */

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const id = body?.id;
    if (!id) return errorResponse("id required", 400, origin);

    await db.style_references.delete({ where: { id } });
    return jsonResponse({ deleted: true }, 200, origin);
  } catch (err) {
    return errorResponse(
      (err as Error).message || "Delete failed",
      500,
      origin,
    );
  }
}

/* ── PATCH: Toggle active status ── */

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { id, active, tags: newTags, title: newTitle } = body;
    if (!id) return errorResponse("id required", 400, origin);

    const data: Record<string, unknown> = {};
    if (typeof active === "boolean") data.active = active;
    if (newTags) data.tags = newTags;
    if (typeof newTitle === "string") data.title = newTitle;

    const ref = await db.style_references.update({ where: { id }, data });
    return jsonResponse({ reference: ref }, 200, origin);
  } catch (err) {
    return errorResponse(
      (err as Error).message || "Update failed",
      500,
      origin,
    );
  }
}

/* ── Auto-tag helper ── */

function autoTags(analysis: Record<string, unknown>): string[] {
  const tags: string[] = [];
  const text = JSON.stringify(analysis).toLowerCase();

  const tagMap: Record<string, string[]> = {
    symmetry: ["symmetry", "symmetrical", "centered"],
    "warm-light": ["golden hour", "warm light", "warm tone", "golden"],
    "high-contrast": ["high contrast", "bold contrast", "deep shadows"],
    grain: ["grain", "film grain", "texture"],
    minimal: ["minimal", "negative space", "sparse"],
    typography: ["typography", "type treatment", "headline", "sans-serif", "serif"],
    moody: ["moody", "atmospheric", "dramatic"],
    editorial: ["editorial", "magazine", "print"],
    cinematic: ["cinematic", "shallow depth", "bokeh"],
    outdoor: ["outdoor", "exterior", "landscape"],
  };

  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some((k) => text.includes(k))) tags.push(tag);
  }

  return tags.slice(0, 5);
}
