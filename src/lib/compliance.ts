import { readFileSync } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";

let _cachedCompliance: string | null = null;

function getComplianceDoc(): string {
  if (_cachedCompliance) return _cachedCompliance;
  try {
    _cachedCompliance = readFileSync(
      path.resolve(process.cwd(), "COMPLIANCE.md"),
      "utf-8",
    );
    return _cachedCompliance;
  } catch {
    return "";
  }
}

function getComplianceSection(platform: string): string {
  const full = getComplianceDoc();
  let section = "";

  if (platform === "meta_feed" || platform === "meta" || platform === "instagram") {
    const match = full.match(/## Meta \(Facebook\/Instagram\)[\s\S]*?(?=\n## Google|$)/);
    section = match ? match[0] : "";
  } else if (platform === "google_search" || platform === "google") {
    const match = full.match(/## Google Ads[\s\S]*?(?=\n## SMS|$)/);
    section = match ? match[0] : "";
  } else if (platform === "sms") {
    const match = full.match(/## SMS[\s\S]*?(?=\n## General|$)/);
    section = match ? match[0] : "";
  }

  // Always include general rules
  const generalMatch = full.match(/## General Compliance[\s\S]*?(?=\n## How|$)/);
  const general = generalMatch ? generalMatch[0] : "";

  return `${section}\n\n${general}`.trim();
}

export interface ComplianceResult {
  status: "passed" | "flagged" | "failed";
  flags: ComplianceFlag[];
}

export interface ComplianceFlag {
  severity: "warning" | "violation";
  rule: string;
  detail: string;
  field: string;
}

/**
 * Validate generated ad copy against platform compliance rules.
 * Runs as a separate pass AFTER generation — does not affect creative output.
 */
export async function validateCompliance(
  content: Record<string, unknown>,
  platform: string,
  facilityData?: { pricing?: string; rating?: string; reviewCount?: string },
): Promise<ComplianceResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { status: "passed", flags: [] };
  }

  const rules = getComplianceSection(platform);
  if (!rules) {
    return { status: "passed", flags: [] };
  }

  const client = new Anthropic({ apiKey });

  const contentStr = JSON.stringify(content, null, 2);

  try {
    Sentry.addBreadcrumb({ category: "external_api", message: "Calling Anthropic API", level: "info" });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are a platform advertising compliance reviewer. Review this ad content against the platform rules below. Be strict but fair — only flag real violations or genuine risks, not theoretical edge cases.

PLATFORM: ${platform}

AD CONTENT:
${contentStr}

${facilityData ? `FACILITY DATA FOR VERIFICATION:\nPricing: ${facilityData.pricing || "unknown"}\nRating: ${facilityData.rating || "unknown"}\nReview count: ${facilityData.reviewCount || "unknown"}` : ""}

COMPLIANCE RULES:
${rules.slice(0, 2000)}

Return a JSON object:
{
  "status": "passed" | "flagged" | "failed",
  "flags": [
    {
      "severity": "warning" | "violation",
      "rule": "short rule name",
      "detail": "what specifically is wrong and how to fix it",
      "field": "which field (primaryText, headline, description, cta, targetingNote)"
    }
  ]
}

Rules:
- "passed" = no issues found
- "flagged" = potential issues that need human review (warnings)
- "failed" = clear policy violations that must be fixed (violations)
- If no issues, return {"status": "passed", "flags": []}
- Be specific about which field has the issue
- Only flag things that would actually get an ad rejected or account restricted

Return ONLY valid JSON. No markdown fences.`,
        },
      ],
    });

    const rawText = (
      message.content[0] as { type: "text"; text: string }
    ).text.trim();

    let result: ComplianceResult;
    try {
      result = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) return { status: "passed", flags: [] };
      result = JSON.parse(match[0]);
    }

    // Validate the result structure
    if (!result.status || !Array.isArray(result.flags)) {
      return { status: "passed", flags: [] };
    }

    return result;
  } catch {
    // Non-fatal — if compliance check fails, don't block generation
    return { status: "passed", flags: [] };
  }
}
