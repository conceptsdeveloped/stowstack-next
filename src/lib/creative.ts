import { readFileSync } from "fs";
import path from "path";

let _cached: string | null = null;

/** Load CREATIVE.md and cache it for the lifetime of the serverless function */
export function getCreativeDirective(): string {
  if (_cached) return _cached;
  try {
    _cached = readFileSync(
      path.resolve(process.cwd(), "CREATIVE.md"),
      "utf-8",
    );
    return _cached;
  } catch {
    return "";
  }
}

/**
 * Extract a specific section from CREATIVE.md by heading.
 * Returns the content between the given ## heading and the next ## heading.
 */
export function getCreativeSection(sectionName: string): string {
  const full = getCreativeDirective();
  const regex = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = full.match(regex);
  return match ? match[1].trim() : "";
}

/**
 * Build a condensed creative context string for injection into prompts.
 * Keeps it under ~800 tokens to avoid bloating the prompt.
 */
export function getCreativeContext(platform: string): string {
  const voice = getCreativeSection("Voice & Identity");
  const standards = getCreativeSection("Creative Standards");
  const theory = getCreativeSection("Ad Theory & Conversion Principles");

  let platformSection = "";
  if (
    platform === "meta" ||
    platform === "meta_feed" ||
    platform === "meta_story"
  ) {
    platformSection = getCreativeSection("Platform-Specific Guidelines").split(
      "### Google Search",
    )[0];
  } else if (platform === "google_search" || platform === "google_display") {
    const full = getCreativeSection("Platform-Specific Guidelines");
    const googleStart = full.indexOf("### Google Search");
    const googleEnd = full.indexOf("### TikTok");
    platformSection =
      googleStart >= 0
        ? full.slice(googleStart, googleEnd >= 0 ? googleEnd : undefined)
        : "";
  } else if (platform === "tiktok") {
    const full = getCreativeSection("Platform-Specific Guidelines");
    const start = full.indexOf("### TikTok");
    const end = full.indexOf("### Google Business");
    platformSection =
      start >= 0 ? full.slice(start, end >= 0 ? end : undefined) : "";
  } else if (platform === "video") {
    platformSection = getCreativeSection("Video Content Direction");
  }

  const visualDoctrine = getCreativeSection("Visual Doctrine");

  const lines = [
    "--- CREATIVE DIRECTIVE (follow these standards) ---",
    voice.slice(0, 600),
    visualDoctrine.slice(0, 600),
    standards.slice(0, 400),
    theory.slice(0, 400),
  ];
  if (platformSection) lines.push(platformSection.slice(0, 400));

  return lines.join("\n\n");
}
