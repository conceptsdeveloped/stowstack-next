/**
 * The guarded send path (MISSION.md s5).
 *
 * Every outbound message goes through here. The ordering is the whole point and
 * is ported from the mail system rather than re-derived:
 *
 *   1. normalise and gate  — opt-outs and quiet hours are law, not preference
 *   2. write the intent row FIRST — before the vendor is called
 *   3. call the vendor
 *   4. record the outcome
 *
 * If the process dies between 2 and 4 the row exists as `queued`, which is
 * visible and recoverable. If we called first and wrote second, a crash would
 * leave a delivered message with no record — and the retry would text a real
 * person twice.
 */

import { db } from "@/lib/db";
import { activeMessageProvider } from "./index";
import {
  SendOutcomeUnknown,
  SendRejected,
  checkSendable,
  normalisePhone,
  type Channel,
} from "./types";

export interface OutboundMessage {
  channel?: Channel;
  to: string | null | undefined;
  body: string;
  facilityId?: string;
  from?: string;
  /** Identity of this message. Same key twice = one message. */
  dedupeKey: string;
  /** Recipient's local hour, when known. Omitted skips the quiet-hours gate. */
  localHour?: number;
}

export type SendOutcome =
  | { sent: true; id: string; providerId: string }
  | { sent: false; id?: string; reason: string; frozen?: boolean };

/** Global opt-out check. One registry, forever, everywhere. */
export async function isOptedOut(phone: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM message_optout WHERE phone = ${phone}
  `;
  return rows[0].n > 0;
}

export async function optOut(phone: string, reason = "stop_reply", source?: string): Promise<void> {
  await db.$executeRaw`
    INSERT INTO message_optout (phone, reason, source) VALUES (${phone}, ${reason}, ${source ?? null})
    ON CONFLICT (phone) DO NOTHING
  `;
}

export async function optIn(phone: string): Promise<void> {
  await db.$executeRaw`DELETE FROM message_optout WHERE phone = ${phone}`;
}

export async function sendMessage(msg: OutboundMessage): Promise<SendOutcome> {
  const channel: Channel = msg.channel ?? "sms";
  const to = normalisePhone(msg.to);

  const gate = checkSendable({
    to,
    body: msg.body,
    optedOut: to ? await isOptedOut(to) : false,
    localHour: msg.localHour,
  });

  if (!gate.ok) {
    // Recorded rather than silently dropped: "why didn't they get the text" is
    // a question an operator will ask, and `suppressed` answers it.
    if (to) {
      await db.$executeRaw`
        INSERT INTO message_log (facility_id, channel, to_number, from_number, body, status, error, dedupe_key)
        VALUES (${msg.facilityId ?? null}::uuid, ${channel}, ${to}, ${msg.from ?? null}, ${msg.body},
                'suppressed', ${gate.reason}, ${msg.dedupeKey})
        ON CONFLICT ON CONSTRAINT message_log_dedupe_key DO NOTHING
      `;
    }
    return { sent: false, reason: gate.reason };
  }

  // 2 — the intent row. ON CONFLICT DO NOTHING is the idempotency guard: if this
  // key already exists the message was already handled, and we must not send again.
  const claimed = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO message_log (facility_id, channel, to_number, from_number, body, status, dedupe_key)
    VALUES (${msg.facilityId ?? null}::uuid, ${channel}, ${to!}, ${msg.from ?? null}, ${msg.body},
            'queued', ${msg.dedupeKey})
    ON CONFLICT ON CONSTRAINT message_log_dedupe_key DO NOTHING
    RETURNING id
  `;
  if (claimed.length === 0) {
    return { sent: false, reason: "already-handled" };
  }
  const id = claimed[0].id;

  const provider = activeMessageProvider();
  if (!provider.live) {
    await db.$executeRaw`
      UPDATE message_log SET status='suppressed', provider=${provider.id},
        error='provider not live', updated_at=now() WHERE id=${id}::uuid
    `;
    return { sent: false, id, reason: "provider-not-live" };
  }

  try {
    const res = await provider.send({ channel, to: to!, from: msg.from, body: msg.body, dedupeKey: msg.dedupeKey });
    await db.$executeRaw`
      UPDATE message_log SET status='sent', provider=${provider.id}, provider_id=${res.providerId},
        sent_at=now(), updated_at=now() WHERE id=${id}::uuid
    `;
    return { sent: true, id, providerId: res.providerId };
  } catch (e) {
    // Unknown never retries. A frozen row waits for a human who can check the
    // provider's own log and decide whether it actually went out.
    const unknown = e instanceof SendOutcomeUnknown;
    const status = unknown ? "frozen" : "failed";
    const detail = e instanceof Error ? e.message : String(e);
    await db.$executeRaw`
      UPDATE message_log SET status=${status}, provider=${provider.id},
        error=${detail.slice(0, 2000)}, updated_at=now() WHERE id=${id}::uuid
    `;
    if (unknown) return { sent: false, id, reason: "outcome-unknown", frozen: true };
    if (e instanceof SendRejected) return { sent: false, id, reason: "rejected" };
    return { sent: false, id, reason: "failed" };
  }
}
