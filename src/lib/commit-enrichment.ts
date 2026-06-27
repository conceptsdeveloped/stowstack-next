import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";

/**
 * Shared commit-enrichment helpers for the rich changelog (developer commit log).
 *
 * Used by:
 *   - src/app/api/commit-notes/route.ts       (manual create/update + regenerate)
 *   - src/app/api/commit-notes/sync/route.ts  (GitHub sync)
 *
 * Restored from 2a5eb19~1; the AI call now goes through the Anthropic SDK to
 * match the convention in src/lib/compliance.ts. Both functions degrade
 * gracefully when ANTHROPIC_API_KEY is unset or the API call fails.
 */

export type CommitType = "feature" | "fix" | "improvement";

const SUMMARY_MODEL = "claude-haiku-4-5-20251001";

/** Strip a conventional-commit prefix (feat(scope): ...) from a subject line. */
function stripConventionalPrefix(subject: string): string {
  return (subject || "")
    .replace(/^(feat|fix|chore|refactor|docs|style|perf|test|ci|build)(\(.+?\))?:\s*/i, "")
    .trim();
}

/**
 * Classify a commit subject into feature / fix / improvement based on
 * conventional-commit patterns and common keywords used in this codebase.
 */
export function classifyCommit(subject: string): CommitType {
  const lower = (subject || "").toLowerCase().trim();

  // Fixes: fix(...), hotfix, bugfix, patch, resolve, crash, repair, revert, broken
  if (
    /^fix[\s(:]/.test(lower) ||
    /bug\s*fix/i.test(lower) ||
    /^hotfix/i.test(lower) ||
    /^patch/i.test(lower) ||
    /^resolve/i.test(lower) ||
    /crash/i.test(lower) ||
    /^revert/i.test(lower) ||
    /repair/i.test(lower) ||
    /broken/i.test(lower)
  ) {
    return "fix";
  }

  // Features: feat(...), add, new, implement, introduce, launch, create, build, enable
  if (
    /^feat[\s(:]/.test(lower) ||
    /^add\s/.test(lower) ||
    /^new\s/.test(lower) ||
    /^implement/i.test(lower) ||
    /^introduce/i.test(lower) ||
    /^launch/i.test(lower) ||
    /^create/i.test(lower) ||
    /^build\s/.test(lower) ||
    /^enable/i.test(lower)
  ) {
    return "feature";
  }

  // Everything else: refactors, docs, chore, perf, style, ci, test, etc.
  return "improvement";
}

/** Deterministic fallback summaries used when the AI call is unavailable. */
function fallbackSummaries(
  subject: string,
  body: string,
  devNote: string,
): { laymans: string; technical: string } {
  const cleaned = stripConventionalPrefix(subject);
  const laymans =
    devNote ||
    (cleaned ? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.` : subject || "Code update.");
  return {
    laymans,
    technical: body || subject || "No details available.",
  };
}

/**
 * Generate human-readable and technical summaries for a commit using Claude Haiku.
 * Falls back to a cleaned-up commit subject if the API key is missing or the call fails.
 */
export async function generateSummaries(
  subject: string,
  body: string,
  devNote = "",
): Promise<{ laymans: string; technical: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return fallbackSummaries(subject, body, devNote);
  }

  try {
    const contextParts = [
      `Commit subject: ${subject}`,
      body ? `Commit body: ${body}` : "",
      devNote ? `Developer note: ${devNote}` : "",
    ].filter(Boolean);

    const client = new Anthropic({ apiKey });

    Sentry.addBreadcrumb({
      category: "external_api",
      message: "Calling Anthropic API (commit summary)",
      level: "info",
    });

    const message = await client.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are summarizing a code commit for a self-storage marketing SaaS called StorageAds. Two audiences read this:

1. LAYMAN'S SUMMARY: For non-technical stakeholders (facility owners, managers). One sentence, plain English, absolutely no jargon. Focus on what changed for users or the business. Start with an action verb.
2. TECHNICAL SUMMARY: For developers. 1-2 sentences, concise, mention specific systems/components/files affected.

${contextParts.join("\n")}

Respond in exactly this JSON format (no markdown, no code fences):
{"laymans": "...", "technical": "..."}`,
        },
      ],
    });

    const block = message.content?.[0];
    const text = block && block.type === "text" ? block.text.trim() : "";
    const jsonStr = text.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonStr) as { laymans?: string; technical?: string };
    if (parsed.laymans && parsed.technical) {
      return { laymans: parsed.laymans, technical: parsed.technical };
    }
  } catch (err) {
    Sentry.captureException(err);
    // Fall through to deterministic fallback below.
  }

  return fallbackSummaries(subject, body, devNote);
}
