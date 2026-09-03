/**
 * The event bus (MISSION.md s7).
 *
 * Emit writes the fact, then fans out one queue job per subscriber. Delivery
 * deliberately rides on the job queue (s1) rather than having its own machinery:
 * retries, backoff, freeze-on-unknown, crash recovery and per-tenant fair-share
 * already exist there and would otherwise be reinvented, differently, here.
 *
 * Emitted once. Delivered at least once, per subscriber, independently — a
 * subscriber that fails does not hold up the others, and a subscriber added
 * next month does not replay last month's events unless someone asks it to.
 */

import { db } from "@/lib/db";
import { enqueue } from "@/lib/jobs/queue";
import type { DetectedEvent, EventType } from "./types";
import { SUBSCRIBERS } from "./subscribers";

export interface EmitResult {
  emitted: number;
  duplicates: number;
  fannedOut: number;
}

/**
 * Persist events and fan them out.
 *
 * Order matters: the event row is written first and the jobs after. If the
 * process dies between the two, the event exists with no delivery — visible,
 * queryable, and re-deliverable — which is strictly better than a job that
 * fires for an event nobody recorded.
 */
export async function emit(events: DetectedEvent[], tenantKey?: string): Promise<EmitResult> {
  const res: EmitResult = { emitted: 0, duplicates: 0, fannedOut: 0 };

  for (const ev of events) {
    const rows = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO domain_events (type, facility_id, tenant_key, payload, source_key, occurred_at)
      VALUES (
        ${ev.type},
        ${(ev.payload as { facilityId?: string }).facilityId ?? null}::uuid,
        ${tenantKey ?? null},
        ${JSON.stringify(ev.payload)}::jsonb,
        ${ev.sourceKey},
        ${new Date(ev.occurredAt)}
      )
      ON CONFLICT (type, source_key) DO NOTHING
      RETURNING id
    `;

    // Already recorded. Detection is re-runnable by design, so this is the
    // normal path on a re-upload, not an error.
    if (rows.length === 0) { res.duplicates++; continue; }
    res.emitted++;

    const eventId = rows[0].id;
    for (const queue of SUBSCRIBERS[ev.type] ?? []) {
      const id = await enqueue({
        queue,
        // dedupe per (event, subscriber): re-running fan-out is safe, and two
        // subscribers of the same event never collide.
        dedupeKey: `${eventId}:${queue}`,
        tenantKey,
        payload: { eventId, type: ev.type, ...ev.payload },
      });
      if (id) res.fannedOut++;
    }
  }

  return res;
}

/**
 * Re-deliver an event to its subscribers. For the case above — an event written
 * whose fan-out did not land — and for a subscriber that shipped after the fact.
 */
export async function redeliver(eventId: string): Promise<number> {
  const rows = await db.$queryRaw<
    { id: string; type: EventType; tenant_key: string | null; payload: Record<string, unknown> }[]
  >`SELECT id, type, tenant_key, payload FROM domain_events WHERE id = ${eventId}::uuid`;
  const ev = rows[0];
  if (!ev) return 0;

  let n = 0;
  for (const queue of SUBSCRIBERS[ev.type] ?? []) {
    const id = await enqueue({
      queue,
      dedupeKey: `${ev.id}:${queue}`,
      tenantKey: ev.tenant_key ?? undefined,
      payload: { eventId: ev.id, type: ev.type, ...ev.payload },
    });
    if (id) n++;
  }
  return n;
}

/** Operator view: what has been happening, by type. */
export async function recentEvents(limit = 50) {
  return db.$queryRaw<
    { id: string; type: string; facility_id: string | null; occurred_at: Date; payload: unknown }[]
  >`SELECT id, type, facility_id, occurred_at, payload
    FROM domain_events ORDER BY occurred_at DESC, created_at DESC LIMIT ${limit}`;
}
