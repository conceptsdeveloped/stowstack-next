import { readFileSync } from "fs";
import path from "path";
import { readDoctrine } from "@/lib/doctrine-store";

let _cached: string | null = null;

/** Load BRAND_DOCTRINE.md — DB first (persisted synthesis), filesystem fallback */
export async function getBrandDoctrine(): Promise<string> {
  if (_cached) return _cached;
  try {
    _cached = await readDoctrine("BRAND_DOCTRINE");
    if (_cached) return _cached;
  } catch {
    // DB not available, fall through
  }
  try {
    _cached = readFileSync(
      path.resolve(process.cwd(), "BRAND_DOCTRINE.md"),
      "utf-8",
    );
    return _cached;
  } catch {
    return "";
  }
}

/**
 * Extract a section from BRAND_DOCTRINE.md by Roman-numeral heading.
 * Sections use "## I. TITLE", "## II. TITLE", etc.
 */
export async function getBrandDoctrineSection(sectionName: string): Promise<string> {
  const full = await getBrandDoctrine();
  const regex = new RegExp(
    `## ${sectionName}[\\s\\S]*?(?=\\n## [IVX]+\\.|$)`,
  );
  const match = full.match(regex);
  return match ? match[0].trim() : "";
}

/**
 * Build condensed brand context for copy generation prompts.
 * Includes creative philosophy (Chiat\Day, Bernays), brand voice, and
 * content generation standards (the 7 gates + copy principles).
 */
export async function getBrandContextForCopy(): Promise<string> {
  const full = await getBrandDoctrine();

  const extract = (heading: string): string => {
    const regex = new RegExp(
      `## ${heading}[\\s\\S]*?(?=\\n---\\n|\\n## [IVX]+\\.|$)`,
    );
    const match = full.match(regex);
    return match ? match[0].trim() : "";
  };

  const philosophy = extract("I\\. CREATIVE PHILOSOPHY");
  const voice = extract("VIII\\. BRAND VOICE");
  const standards = extract("V\\. CONTENT GENERATION STANDARDS");

  const lines = [
    "--- BRAND DOCTRINE (foundation for ALL content — follow these principles) ---",
    philosophy.slice(0, 1200),
    voice.slice(0, 600),
    standards.slice(0, 800),
  ];

  return lines.join("\n\n");
}

/**
 * Build condensed brand context for image generation prompts.
 * Includes aesthetic identity (Porsche, Rimowa, newspaper finish) and
 * visual principles from content generation standards.
 */
export async function getBrandContextForVisual(): Promise<string> {
  const full = await getBrandDoctrine();

  const extract = (heading: string): string => {
    const regex = new RegExp(
      `## ${heading}[\\s\\S]*?(?=\\n---\\n|\\n## [IVX]+\\.|$)`,
    );
    const match = full.match(regex);
    return match ? match[0].trim() : "";
  };

  const aesthetic = extract("II\\. AESTHETIC IDENTITY");
  const standards = extract("V\\. CONTENT GENERATION STANDARDS");

  // Pull just the visual principles subsection from standards
  const visualStart = standards.indexOf("### Visual Principles");
  const visualEnd = standards.indexOf("---", visualStart);
  const visualPrinciples =
    visualStart >= 0
      ? standards.slice(visualStart, visualEnd >= 0 ? visualEnd : undefined)
      : "";

  const lines = [
    "--- BRAND DOCTRINE — VISUAL IDENTITY (follow these aesthetic principles) ---",
    aesthetic.slice(0, 1500),
    visualPrinciples.slice(0, 600),
  ];

  return lines.join("\n\n");
}

/**
 * Build condensed brand context for video generation prompts.
 * Includes Kubrick/A24/stop-motion doctrine and video-specific sections.
 */
export async function getBrandContextForVideo(): Promise<string> {
  const full = await getBrandDoctrine();

  const extract = (heading: string): string => {
    const regex = new RegExp(
      `## ${heading}[\\s\\S]*?(?=\\n---\\n|\\n## [IVX]+\\.|$)`,
    );
    const match = full.match(regex);
    return match ? match[0].trim() : "";
  };

  const aesthetic = extract("II\\. AESTHETIC IDENTITY");

  // Pull Kubrick and video motion sections
  const kubrickStart = aesthetic.indexOf("#### Stanley Kubrick");
  const motionStart = aesthetic.indexOf("### Video Content: Motion");
  const motionEnd = aesthetic.indexOf("---", motionStart);
  const kubrick =
    kubrickStart >= 0 ? aesthetic.slice(kubrickStart, motionStart >= 0 ? motionStart : undefined) : "";
  const motion =
    motionStart >= 0 ? aesthetic.slice(motionStart, motionEnd >= 0 ? motionEnd : undefined) : "";

  const lines = [
    "--- BRAND DOCTRINE — VIDEO & MOTION (follow these cinematography principles) ---",
    kubrick.slice(0, 800),
    motion.slice(0, 800),
  ];

  return lines.join("\n\n");
}
