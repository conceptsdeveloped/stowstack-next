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

import { isStartReply, isStopReply } from "./types";

export type InboundIntent = "stop" | "start" | "help" | "confirm" | "unknown";

const HELP_WORDS = new Set(["help", "info"]);
const YES_WORDS = new Set(["yes", "y", "yep", "yeah", "confirm", "ok", "okay"]);

/**
 * Order matters and is not arbitrary. STOP is checked first and wins outright:
 * a message that somehow reads as both must always be treated as an opt-out,
 * because the cost of missing one is a legal failure and the cost of a false
 * positive is one un-sent marketing text.
 */
export function classifyInbound(body: string | null | undefined): InboundIntent {
  if (isStopReply(body)) return "stop";
  if (isStartReply(body) && !YES_WORDS.has((body ?? "").trim().toLowerCase())) return "start";
  const word = (body ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return "unknown";
  if (HELP_WORDS.has(word)) return "help";
  if (YES_WORDS.has(word)) return "confirm";
  return "unknown";
}

/**
 * Replies.
 *
 * Confirmations after STOP and HELP are the two messages a carrier expects to
 * see and are exempt from opt-out — sending nothing at all after STOP is itself
 * a compliance smell. Everything here is plain ASCII: one curly quote would
 * halve the segment size (see `segmentCount`).
 */
export const REPLIES = {
  stop: "You're unsubscribed and won't get any more texts from us. Reply START to resume.",
  start: "You're resubscribed. Reply STOP at any time to opt out.",
  help: "StorageAds notifies you when a unit opens up. Reply STOP to opt out. Msg & data rates may apply.",
  heldOk: (size: string | null, minutes: number) =>
    `Held${size ? ` a ${size}` : ""} for you for ${minutes} minutes. We'll call to finish the paperwork.`,
  heldGone: "Sorry, that one just went. You're still on the list for the next one.",
  noHold: "Thanks! We don't have anything on hold for you right now, but you're on the list.",
} as const;
