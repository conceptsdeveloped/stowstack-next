/**
 * Sold-out waitlist notification (MISSION.md RESPOND r9 / CONVERT c6).
 *
 * The first capability in this platform that runs end to end without a human:
 * a PMS upload changes the unit mix → `inventory.available` fires → this texts
 * the people waiting for that size. "The unit sells itself before it's vacant a
 * day" only works if the whole chain is automatic, which it now is.
 */

import { db } from "@/lib/db";
import { sendMessage } from "@/lib/messaging/send";
import { normalisePhone } from "@/lib/messaging/types";

export interface WaitlistEntry {
  id: string;
  facility_id: string;
  size_label: string | null;
  contact_name: string | null;
  contact_phone: string;
  notify_count: number;
}

/**
 * Who is waiting for this size.
 *
 * A null `size_label` on an entry means "any size here", so those always match.
 * Ordered oldest first — the person who has waited longest gets the unit, which
 * is both fairer and the answer an operator would defend on the phone.
 */
export async function matchWaitlist(
  facilityId: string,
  sizeLabel: string | null,
  limit: number
): Promise<WaitlistEntry[]> {
  return db.$queryRaw<WaitlistEntry[]>`
    SELECT id, facility_id, size_label, contact_name, contact_phone, notify_count
    FROM unit_waitlist
    WHERE facility_id = ${facilityId}::uuid
      AND status = 'waiting'
      AND (size_label IS NULL OR size_label = ${sizeLabel})
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
}

/**
 * The notice.
 *
 * Deliberately short and specific: one segment, the size, the facility, and a
 * single next step. Every extra clause is another segment billed and another
 * reason to ignore it. STOP is appended because it must be — an opt-out path is
 * a legal requirement on marketing SMS, not a courtesy.
 */
export function waitlistMessage(input: {
  name: string | null;
  sizeLabel: string | null;
  facilityName: string;
  streetRate: number | null;
}): string {
  const who = input.name ? `${input.name.split(" ")[0]}, ` : "";
  const size = input.sizeLabel ? `a ${input.sizeLabel}` : "a unit";
  const rate = input.streetRate ? ` at $${Math.round(input.streetRate)}/mo` : "";
  // Plain ASCII only, deliberately: one em-dash or curly quote drops the whole
  // message to 70-character UCS-2 segments and doubles the bill for every send.
  return `${who}${size} just opened up at ${input.facilityName}${rate}. ` +
    `You're on the waitlist. Reply YES to hold it, STOP to opt out.`;
}

/**
 * How many people to text for one freed unit.
 *
 * Texting everybody for a single unit means one rental and a queue of people
 * told about something already gone. Notifying slightly more than the available
 * count covers the ones who do not reply, without turning the list into a
 * lottery nobody trusts.
 */
export function notifyCount(available: number): number {
  return Math.min(10, Math.max(1, available) * 2);
}

export interface NotifyResult {
  matched: number;
  sent: number;
  skipped: number;
}

/** Notify the waitlist for one `inventory.available` event. */
export async function notifyWaitlist(input: {
  eventId: string;
  facilityId: string;
  sizeLabel: string | null;
  available: number;
  streetRate: number | null;
}): Promise<NotifyResult> {
  const facility = await db.$queryRaw<{ name: string }[]>`
    SELECT name FROM facilities WHERE id = ${input.facilityId}::uuid
  `;
  const facilityName = facility[0]?.name ?? "your storage facility";

  const entries = await matchWaitlist(input.facilityId, input.sizeLabel, notifyCount(input.available));
  const res: NotifyResult = { matched: entries.length, sent: 0, skipped: 0 };

  for (const entry of entries) {
    const phone = normalisePhone(entry.contact_phone);
    if (!phone) { res.skipped++; continue; }

    const outcome = await sendMessage({
      to: phone,
      facilityId: input.facilityId,
      body: waitlistMessage({
        name: entry.contact_name,
        sizeLabel: input.sizeLabel,
        facilityName,
        streetRate: input.streetRate,
      }),
      // Keyed on (event, entry): the same person is told about the same opening
      // exactly once, however many times the job is replayed.
      dedupeKey: `wl:${input.eventId}:${entry.id}`,
    });

    if (outcome.sent) {
      res.sent++;
      await db.$executeRaw`
        UPDATE unit_waitlist
        SET status='notified', notified_at=now(), notify_count=notify_count+1, updated_at=now()
        WHERE id=${entry.id}::uuid
      `;
    } else {
      res.skipped++;
    }
  }

  return res;
}
