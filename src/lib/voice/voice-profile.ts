import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export interface VoiceProfileShape {
  name: string;
  template: string;
  do_use: string[];
  do_not_use: string[];
  tone_descriptors: unknown;
}

// The single universal StorageAds voice. Phase 1 ships exactly one profile
// (vision §5 / PRD §3.1); per-facility overrides are supported by the schema
// for later phases. This constant is the source of truth and the in-memory
// fallback used until the DB row is created.
export const DEFAULT_VOICE_PROFILE: VoiceProfileShape = {
  name: "StorageAds Universal",
  tone_descriptors: { register: "warm-professional", reading_level: 7, emoji: "none" },
  do_use: [
    "Plain, operator-to-customer language",
    "Short, direct sentences",
    "Concrete specifics only when given (sizes, hours, access)",
    "One clear next step — call, visit, or reply",
  ],
  do_not_use: [
    "Corporate buzzwords or marketing fluff",
    "Emojis in customer replies",
    "Italics or typographic emphasis",
    "Groveling or over-apologizing",
    "Any promise about price, availability, or legal matters",
    "Specifics that were not provided",
  ],
  template:
    "You write customer-facing text on behalf of a self-storage facility. Sound like a competent, friendly facility manager — a real person who runs the place, not a faceless brand. Keep it tight and human. Never invent details you weren't given (prices, unit availability, policies, hours); when you don't know, invite the customer to call or stop by. Never use emojis.",
};

const SAFETY_PREAMBLE =
  "SAFETY: Never discuss, confirm, speculate about, or accept fault for any lawsuit, legal threat, injury, death, fire, break-in, theft, weapon, contraband, hazardous material, or safety incident. If the customer raises one, do not address specifics — keep the reply brief, say you take it seriously, and direct them to contact the office directly.";

export function buildVoiceSystemPrompt(
  profile: VoiceProfileShape,
  facilityName: string
): string {
  const parts = [
    `You are writing customer-facing text for "${facilityName}", a self-storage facility.`,
    profile.template,
    profile.do_use.length ? `Always: ${profile.do_use.join("; ")}.` : "",
    profile.do_not_use.length ? `Never: ${profile.do_not_use.join("; ")}.` : "",
    SAFETY_PREAMBLE,
  ];
  return parts.filter(Boolean).join("\n\n");
}

let universalEnsured = false;

/** Lazily create the universal voice profile row if missing. Idempotent and non-fatal. */
export async function ensureUniversalVoiceProfile(): Promise<void> {
  if (universalEnsured) return;
  try {
    const existing = await db.voice_profiles.findFirst({
      where: { facility_id: null },
      select: { id: true },
    });
    if (!existing) {
      await db.voice_profiles.create({
        data: {
          facility_id: null,
          name: DEFAULT_VOICE_PROFILE.name,
          tone_descriptors: DEFAULT_VOICE_PROFILE.tone_descriptors as Prisma.InputJsonValue,
          do_use: DEFAULT_VOICE_PROFILE.do_use,
          do_not_use: DEFAULT_VOICE_PROFILE.do_not_use,
          template: DEFAULT_VOICE_PROFILE.template,
          active: true,
        },
      });
    }
    universalEnsured = true;
  } catch {
    // leave the flag false so a later call retries; DEFAULT_VOICE_PROFILE covers us meanwhile
  }
}

/** Resolve the active voice profile: facility override → universal row → in-memory default. */
export async function getVoiceProfile(
  facilityId: string | null
): Promise<VoiceProfileShape> {
  await ensureUniversalVoiceProfile();
  try {
    if (facilityId) {
      const override = await db.voice_profiles.findFirst({
        where: { facility_id: facilityId, active: true },
      });
      if (override) return override;
    }
    const universal = await db.voice_profiles.findFirst({
      where: { facility_id: null, active: true },
    });
    if (universal) return universal;
  } catch {
    // fall through to default
  }
  return DEFAULT_VOICE_PROFILE;
}
