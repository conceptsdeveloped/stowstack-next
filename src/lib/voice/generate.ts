import { getVoiceProfile, buildVoiceSystemPrompt } from "@/lib/voice/voice-profile";
import { checkBlocklist } from "@/lib/voice/blocklist";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

export interface VoiceGenerationResult {
  text: string;
  usedFallback: boolean;
  blocked: boolean;
  blocklistTerm: string | null;
}

/**
 * Draft customer-facing text through the universal StorageAds voice profile,
 * then screen the output against the hard-topic blocklist. Every GBP AI draft
 * (review replies, Q&A answers) flows through here — raw model output never
 * reaches a customer without the voice template + blocklist screen.
 */
export async function generateWithVoice(opts: {
  facilityId: string | null;
  facilityName: string;
  userPrompt: string;
  maxTokens?: number;
  fallback?: string;
}): Promise<VoiceGenerationResult> {
  const profile = await getVoiceProfile(opts.facilityId);
  const system = buildVoiceSystemPrompt(profile, opts.facilityName);

  let text = "";
  let usedFallback = false;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: opts.maxTokens ?? 300,
          system,
          messages: [{ role: "user", content: opts.userPrompt }],
        }),
      });
      const data = await res.json();
      const out = data?.content?.[0]?.text;
      if (typeof out === "string" && out.trim()) text = out.trim();
    } catch {
      // fall through to fallback
    }
  }

  if (!text) {
    text = opts.fallback ?? "";
    usedFallback = true;
  }

  const bl = checkBlocklist(text);
  return {
    text,
    usedFallback,
    blocked: bl.hit,
    blocklistTerm: bl.term ?? null,
  };
}
