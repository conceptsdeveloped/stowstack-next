/**
 * Inbound SMS handling (MISSION.md s5).
 *
 * Our own copy tells people "Reply YES to hold it, STOP to opt out". Until this
 * existed that sentence was not true — the opt-out registry had no writer, so a
 * STOP reply went nowhere. Honouring it is a legal obligation, not a feature.
 *
 * The decision of what an inbound message means is pure and lives here; the
 * route does signature verification and I/O.
 */

import { COPY, t, type Language, type Templates } from "./copy";
import { foldKeyword, isStartReply, isStopReply } from "./types";

export type InboundIntent = "stop" | "start" | "help" | "confirm" | "unknown";

const HELP_WORDS = new Set(["help", "info", "ayuda", "informacion", "info"]);

/**
 * Words that mean "hold it for me". `si` is here rather than in START_WORDS
 * because our Spanish waitlist copy says "Responde SI para apartarla" — it is a
 * confirmation, and routing it to the resubscribe path would leave the unit
 * unheld while telling them they were resubscribed.
 */
const YES_WORDS = new Set([
  "yes", "y", "yep", "yeah", "confirm", "ok", "okay",
  "si", "sii", "claro", "dale", "bueno", "esta-bien", "confirmo", "apartala", "apartar",
]);

/**
 * Order matters and is not arbitrary. STOP is checked first and wins outright:
 * a message that somehow reads as both must always be treated as an opt-out,
 * because the cost of missing one is a legal failure and the cost of a false
 * positive is one un-sent marketing text.
 */
export function classifyInbound(body: string | null | undefined): InboundIntent {
  if (isStopReply(body)) return "stop";
  const word = foldKeyword(body);
  if (isStartReply(body) && !YES_WORDS.has(word)) return "start";
  if (!word) return "unknown";
  if (HELP_WORDS.has(word)) return "help";
  if (YES_WORDS.has(word)) return "confirm";
  return "unknown";
}

/**
 * Replies, per language.
 *
 * Confirmations after STOP and HELP are the two messages a carrier expects to
 * see and are exempt from opt-out — sending nothing at all after STOP is itself
 * a compliance smell. The text lives in `./copy`; this is the door to it.
 */
export function replies(language: Language | string | null | undefined): Templates {
  return t(language);
}

/** English replies. Kept for callers that have no contact to look a language up on. */
export const REPLIES = COPY.en;
