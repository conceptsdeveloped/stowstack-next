import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { readDoctrine, writeDoctrine } from "@/lib/doctrine-store";

const DOC_NAME_MAP: Record<string, "CREATIVE" | "STRATEGY" | "BRAND_DOCTRINE"> = {
  creative: "CREATIVE",
  strategy: "STRATEGY",
  brand: "BRAND_DOCTRINE",
};

async function readDoc(doc: string): Promise<string> {
  const docName = DOC_NAME_MAP[doc];
  if (!docName) return "";
  return readDoctrine(docName);
}

async function writeDoc(doc: string, content: string, changeSummary?: string): Promise<void> {
  const docName = DOC_NAME_MAP[doc];
  if (!docName) return;
  await writeDoctrine(docName, content, changeSummary);
}

export interface SynthesisInput {
  type:
    | "style_reference"
    | "campaign_result"
    | "market_data"
    | "competitive_intel"
    | "manual";
  data: string;
  targetDoc: "creative" | "strategy" | "both";
}

export interface SynthesisResult {
  doc: string;
  updated: boolean;
  changeSummary: string;
}

/**
 * The synthesis engine. Takes new information, evaluates it against
 * the existing living documents, and rewrites them to incorporate
 * the new learnings.
 *
 * This runs automatically when:
 * - A new style reference is uploaded to the Creative Library
 * - Campaign performance data crosses a threshold
 * - New market/competitive data is ingested
 * - Manually triggered from the admin
 */
export async function synthesize(
  input: SynthesisInput,
): Promise<SynthesisResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const client = new Anthropic({ apiKey });
  const results: SynthesisResult[] = [];

  const targetDocs =
    input.targetDoc === "both"
      ? (["creative", "strategy"] as const)
      : [input.targetDoc];

  for (const doc of targetDocs) {
    const currentContent = await readDoc(doc);
    if (!currentContent) continue;

    const docName = doc === "creative" ? "CREATIVE.md" : "STRATEGY.md";
    const docPurpose =
      doc === "creative"
        ? "the creative and visual doctrine governing all ad creative, image generation, video generation, copy style, and visual identity"
        : "the marketing strategy doctrine governing channel allocation, audience segmentation, pricing psychology, competitive positioning, conversion benchmarks, and campaign intelligence";

    try {
      Sentry.addBreadcrumb({ category: "external_api", message: "Calling Anthropic API", level: "info" });
      const message = await client.messages.create({
        model: "claude-opus-4-20250514",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: `You are the synthesis engine for StorageAds's marketing intelligence system. Your job is to evolve a living document based on new information.

DOCUMENT: ${docName}
PURPOSE: This is ${docPurpose}.

NEW INFORMATION (type: ${input.type}):
${input.data}

CURRENT DOCUMENT:
${currentContent}

INSTRUCTIONS:
1. Analyze the new information for actionable insights relevant to this document.
2. Determine what in the existing document should be:
   - REFINED (made more specific or accurate based on new evidence)
   - ADDED (new principle, benchmark, or insight not currently covered)
   - UNCHANGED (already correct or not relevant to the new information)
3. Rewrite the COMPLETE document incorporating the new learnings. Do not remove existing content unless it's being replaced by something more accurate.
4. Update the "Last synthesized" date to today.
5. If the new information is a style reference analysis, extract the visual principles that should become part of the permanent doctrine — not the specific subject matter, but the techniques, composition rules, color approaches, and emotional qualities.
6. If the new information is campaign performance data, update the benchmarks and add to the "Performance Data" section.
7. Maintain the exact same markdown structure and heading hierarchy. Do not change section numbers or titles.
8. Be conservative — only change things where the new information provides clear, actionable improvement. Don't dilute strong existing principles with weak new data.

COMPLIANCE CHECK:
- Never add content that would encourage platform policy violations
- Never add targeting recommendations that could be discriminatory
- Never add pricing strategies that involve deception
- Ensure all benchmarks are clearly marked as benchmarks, not guarantees

Return ONLY the complete updated document. No explanation, no markdown fences wrapping the whole thing, no preamble. Start directly with the first line of the document (the # heading).`,
          },
        ],
      });

      const updatedContent = (
        message.content[0] as { type: "text"; text: string }
      ).text.trim();

      // Validate the output looks like a proper document
      if (
        !updatedContent.startsWith("#") ||
        updatedContent.length < currentContent.length * 0.5
      ) {
        // Safety check — don't write something that's clearly broken or too short
        results.push({
          doc: docName,
          updated: false,
          changeSummary: "Synthesis output failed validation — document unchanged",
        });
        continue;
      }

      // Generate a change summary
      Sentry.addBreadcrumb({ category: "external_api", message: "Calling Anthropic API", level: "info" });
      const summaryMessage = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Compare these two documents and list what changed in 2-3 bullet points. Be specific about what was added, refined, or removed. Keep it under 100 words.

BEFORE (first 500 chars): ${currentContent.slice(0, 500)}

AFTER (first 500 chars): ${updatedContent.slice(0, 500)}

NEW INPUT TYPE: ${input.type}

Return only the bullet points.`,
          },
        ],
      });

      const changeSummary = (
        summaryMessage.content[0] as { type: "text"; text: string }
      ).text.trim();

      // Write the updated document to DB
      await writeDoc(doc, updatedContent, changeSummary);

      results.push({
        doc: docName,
        updated: true,
        changeSummary,
      });
    } catch (err) {
      results.push({
        doc: docName,
        updated: false,
        changeSummary: `Synthesis failed: ${(err as Error).message}`,
      });
    }
  }

  return results;
}

/**
 * Synthesize style reference analysis into CREATIVE.md.
 * Called automatically when a new reference is uploaded to the Creative Library.
 */
export async function synthesizeStyleReference(
  analysis: Record<string, unknown>,
  title?: string,
): Promise<SynthesisResult[]> {
  const analysisStr = Object.entries(analysis)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return synthesize({
    type: "style_reference",
    data: `New style reference uploaded${title ? ` — "${title}"` : ""}:\n${analysisStr}`,
    targetDoc: "creative",
  });
}

/**
 * Synthesize campaign performance data into STRATEGY.md.
 * Called when campaign metrics are reported or thresholds are crossed.
 */
export async function synthesizeCampaignResult(
  facilityContext: string,
  metrics: Record<string, unknown>,
): Promise<SynthesisResult[]> {
  const metricsStr = Object.entries(metrics)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return synthesize({
    type: "campaign_result",
    data: `Campaign performance data:\n\nFacility context:\n${facilityContext}\n\nMetrics:\n${metricsStr}`,
    targetDoc: "strategy",
  });
}

/**
 * Synthesize new market or competitive data into STRATEGY.md.
 */
export async function synthesizeMarketData(
  data: string,
): Promise<SynthesisResult[]> {
  return synthesize({
    type: "market_data",
    data,
    targetDoc: "strategy",
  });
}

/**
 * Manual synthesis — user provides information and chooses target doc.
 */
export async function synthesizeManual(
  data: string,
  targetDoc: "creative" | "strategy" | "both",
): Promise<SynthesisResult[]> {
  return synthesize({
    type: "manual",
    data,
    targetDoc,
  });
}
