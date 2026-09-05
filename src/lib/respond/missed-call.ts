/**
 * Missed-call text-back (MISSION.md RESPOND r3).
 *
 * A storage enquiry that rings out is a rental that goes to whoever answers
 * next. Texting back within seconds is the single highest-value thing this
 * module does, and it only works if it is genuinely immediate — a minute-later
 * reply arrives after the caller has already dialled a competitor.
 *
 * So the send happens inline on the status webhook rather than on the queue.
 * The queue is the fallback for when that inline send fails, not the path.
 */

import { db } from "@/lib/db";
import { sendMessage } from "@/lib/messaging/send";
import { normalisePhone } from "@/lib/messaging/types";

/**
 * A call so short nobody could have been helped. Twilio reports `completed` for
 * a call that connected and was hung up on immediately, and for one that hit
 * voicemail and was abandoned — both are missed enquiries as far as the caller
 * is concerned.
 */
export const SHORT_CALL_SECONDS = 15;

const MISSED_STATUSES = new Set(["no-answer", "busy", "failed", "canceled"]);

export function isMissedCall(input: { status: string | null; duration: number | null }): boolean {
  const status = (input.status ?? "").toLowerCase();
  if (MISSED_STATUSES.has(status)) return true;
  if (status === "completed") return (input.duration ?? 0) < SHORT_CALL_SECONDS;
  return false;
}

/**
 * One text per caller per facility per cooldown, however many times they redial.
 *
 * Somebody trying three times in five minutes is more anxious, not more in need
 * of three identical texts — and three texts is how a helpful reply becomes a
 * complaint.
 */
export const COOLDOWN_MINUTES = 60;

export function missedCallText(facilityName: string): string {
  // Plain ASCII: one em-dash or curly quote halves the segment size.
  return `Sorry we missed your call at ${facilityName}. Reply here and we'll help you find a unit, ` +
    `or call us back any time. Reply STOP to opt out.`;
}

export interface TextBackResult {
  sent: boolean;
  reason?: string;
}

/**
 * Text somebody back about a call they just made.
 *
 * Safe to call twice for the same call: the dedupe key is the call SID, so a
 * replayed webhook — which Twilio does on any non-2xx — cannot produce a second
 * text.
 */
export async function textBackMissedCall(callSid: string): Promise<TextBackResult> {
  const rows = await db.$queryRaw<{
    caller_number: string | null;
    facility_id: string | null;
    facility_name: string | null;
    from_number: string | null;
  }[]>`
    SELECT c.caller_number, c.facility_id, f.name AS facility_name, t.phone_number AS from_number
    FROM call_logs c
    LEFT JOIN facilities f ON f.id = c.facility_id
    LEFT JOIN call_tracking_numbers t ON t.id = c.tracking_number_id
    WHERE c.twilio_call_sid = ${callSid}
    LIMIT 1
  `;
  const call = rows[0];
  if (!call) return { sent: false, reason: "no-call-record" };

  const to = normalisePhone(call.caller_number);
  if (!to) return { sent: false, reason: "no-caller-number" };

  // Cooldown, checked against what we actually sent rather than against the
  // call log — the question is "have we texted this person recently", and the
  // message log is the only honest answer to it.
  const recent = await db.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM message_log
    WHERE to_number = ${to}
      AND direction = 'outbound'
      AND status = 'sent'
      AND dedupe_key LIKE 'missed:%'
      AND created_at > now() - (${COOLDOWN_MINUTES}::int * interval '1 minute')
  `;
  if (recent[0].n > 0) return { sent: false, reason: "cooldown" };

  const outcome = await sendMessage({
    to,
    from: call.from_number ?? undefined,
    facilityId: call.facility_id ?? undefined,
    body: missedCallText(call.facility_name ?? "our facility"),
    dedupeKey: `missed:${callSid}`,
  });

  if (outcome.sent) {
    await db.$executeRaw`
      UPDATE call_logs SET call_outcome = 'texted_back', updated_at = now()
      WHERE twilio_call_sid = ${callSid}
    `;
    return { sent: true };
  }
  return { sent: false, reason: outcome.reason };
}
