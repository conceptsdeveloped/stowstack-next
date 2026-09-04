/**
 * Messaging seam — the contract and the rules (MISSION.md s5).
 *
 * One interface for SMS and voice so nothing outside `src/lib/messaging/`
 * imports a vendor. Same discipline the mail system uses for its printer: when
 * the provider changes, or a second one is added per white-label partner, the
 * change stays in one directory.
 *
 * Everything in this file is pure. The rules that decide whether we are allowed
 * to text somebody are the part that must not be wrong, and they are law rather
 * than preference.
 */

export type Channel = "sms" | "voice";

export interface SendRequest {
  channel: Channel;
  to: string;
  from?: string;
  body: string;
  facilityId?: string;
  /** Identity of the message. A replay must be a no-op, not a second text. */
  dedupeKey: string;
}

export interface SendResult {
  providerId: string;
  status: "sent";
}

/**
 * Raised when the outcome is genuinely UNKNOWN — a timeout after the request
 * may already have reached the carrier.
 *
 * Never retried. The mail system learned this expensively: retrying a
 * maybe-delivered send produces a second real message to a real person, and
 * with SMS that is also a second billable segment and a second chance to annoy
 * somebody into opting out.
 */
export class SendOutcomeUnknown extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SendOutcomeUnknown";
  }
}

/** A definitive rejection — bad number, unreachable carrier. Safe to record and stop. */
export class SendRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SendRejected";
  }
}

export interface MessageProvider {
  id: string;
  /**
   * False until real messages can be sent. The sender refuses a provider that
   * is not live, so a misconfigured deploy cannot quietly text real customers —
   * or worse, text them from a half-configured account.
   */
  live: boolean;
  send(req: SendRequest): Promise<SendResult>;
}

/* ── the rules ───────────────────────────────────────────────────────────── */

/** E.164, loosely: a leading + and 8–15 digits. Anything else never reaches a provider. */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return null;
  // A bare 10-digit number is North American in this product's only market.
  // Guessing a country code for anything else would be worse than refusing.
  if (!trimmed.startsWith("+") && digits.length === 10) return `+1${digits}`;
  if (!trimmed.startsWith("+") && digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (!trimmed.startsWith("+")) return null;
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/**
 * Words that mean stop. Carriers already honour these at the network level for
 * standard keywords, but we must honour them in our own registry too — the
 * obligation is ours, not the carrier's, and a reply that reaches our webhook
 * has to end the conversation everywhere.
 */
const STOP_WORDS = new Set([
  "stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke", "optout", "opt-out",
]);

export function isStopReply(body: string | null | undefined): boolean {
  if (!body) return false;
  const first = body.trim().toLowerCase().replace(/[^a-z-]/g, "");
  return STOP_WORDS.has(first);
}

const START_WORDS = new Set(["start", "unstop", "yes", "resume"]);
export function isStartReply(body: string | null | undefined): boolean {
  if (!body) return false;
  return START_WORDS.has(body.trim().toLowerCase().replace(/[^a-z]/g, ""));
}

/**
 * Quiet hours. The TCPA restricts marketing calls and texts to 8am–9pm in the
 * RECIPIENT's local time, and a waitlist notice at 3am is both illegal and a
 * good way to lose the rental.
 *
 * Hour is the recipient's local hour. A caller that cannot determine the
 * recipient's timezone must say so rather than assume UTC — see `withinQuietHours`
 * usage at the call site.
 */
export const SEND_WINDOW = { openHour: 8, closeHour: 21 } as const;

export function withinSendWindow(localHour: number): boolean {
  return localHour >= SEND_WINDOW.openHour && localHour < SEND_WINDOW.closeHour;
}

/** Next permitted local hour, for scheduling a held message rather than dropping it. */
export function msUntilSendWindow(localHour: number, localMinute = 0): number {
  if (withinSendWindow(localHour)) return 0;
  const hoursUntilOpen =
    localHour < SEND_WINDOW.openHour
      ? SEND_WINDOW.openHour - localHour
      : 24 - localHour + SEND_WINDOW.openHour;
  return (hoursUntilOpen * 60 - localMinute) * 60_000;
}

/**
 * SMS segments. Over 160 GSM characters a message splits and bills per segment;
 * any non-GSM character (an emoji, a curly quote) drops the whole message to
 * 70-character UCS-2 segments. Worth knowing before writing copy, and worth
 * refusing to send something absurd.
 */
export function segmentCount(body: string): number {
  // GSM-03.38 is approximately printable ASCII plus a handful of extras. Rather
  // than encode the whole table, treat anything outside printable ASCII as
  // forcing UCS-2 — which is the conservative direction: it can only ever
  // over-count segments, never under-count and under-bill.
  let gsmOnly = true;
  for (let i = 0; i < body.length; i++) {
    const c = body.charCodeAt(i);
    if (c < 0x20 || c > 0x7e) {
      if (c !== 0x0a && c !== 0x0d) { gsmOnly = false; break; }
    }
  }
  const single = gsmOnly ? 160 : 70;
  const multi = gsmOnly ? 153 : 67;
  if (body.length <= single) return 1;
  return Math.ceil(body.length / multi);
}

export const MAX_SEGMENTS = 4;

export type Refusal =
  | { ok: true }
  | { ok: false; reason: "no-number" | "opted-out" | "too-long" | "empty" | "quiet-hours" };

/**
 * The single gate every outbound message passes. Ordered by how bad it is to
 * get wrong: an opt-out violation is a legal failure, the rest are quality.
 */
export function checkSendable(input: {
  to: string | null;
  body: string;
  optedOut: boolean;
  localHour?: number;
}): Refusal {
  if (!input.to) return { ok: false, reason: "no-number" };
  if (input.optedOut) return { ok: false, reason: "opted-out" };
  if (!input.body.trim()) return { ok: false, reason: "empty" };
  if (segmentCount(input.body) > MAX_SEGMENTS) return { ok: false, reason: "too-long" };
  if (input.localHour != null && !withinSendWindow(input.localHour)) {
    return { ok: false, reason: "quiet-hours" };
  }
  return { ok: true };
}
