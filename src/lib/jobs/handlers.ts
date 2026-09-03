/**
 * Handler registry (MISSION.md s1).
 *
 * A queue name maps to exactly one handler. Anything claimed for a queue with
 * no handler is frozen rather than failed — an unregistered queue is a deploy
 * problem, and freezing keeps the work resumable once the handler ships.
 *
 * To add a queue: write the handler, register it here, and enqueue with that
 * name. A handler MUST:
 *   - be safe to run twice (the worker can die after the work and before the
 *     write, and the job will come back);
 *   - check `ctx.shouldYield()` between units and return `{ kind: "more" }`
 *     with a cursor rather than pushing through — that is the whole point;
 *   - throw `OutcomeUnknown` when it cannot tell whether an external side
 *     effect happened. Never guess, and never retry an unknown.
 */

import type { JobHandler } from "./types";
import { detectForFacility, facilitiesWithHistory } from "@/lib/events/detect";

/**
 * Resumability proof. Counts to `payload.to` in chunks, yielding whenever the
 * runner says time is short, and resumes from `cursor.at`.
 *
 * This exists so the resume path is exercised by something with no external
 * dependencies — the mechanism can be trusted before a real queue rides on it.
 * It does no I/O and is safe to leave registered.
 */
const chunkedCounter: JobHandler = async (ctx) => {
  const to = Number((ctx.payload as { to?: number } | null)?.to ?? 0);
  const chunk = Number((ctx.payload as { chunk?: number } | null)?.chunk ?? 100);
  let at = Number((ctx.cursor as { at?: number } | null)?.at ?? 0);

  while (at < to) {
    at = Math.min(to, at + chunk);
    if (at < to && ctx.shouldYield()) {
      return { kind: "more", cursor: { at }, progressDone: at };
    }
  }
  return { kind: "done", progressDone: at };
};

/**
 * Turn PMS snapshots into domain events, facility by facility (MISSION.md s7).
 *
 * Resumable on purpose, and this is the first real use of it: a portfolio
 * account is twenty facilities of up to 12,000 units each, and diffing them all
 * in one 300s invocation is exactly the shape of work that used to die halfway
 * with nothing to show. The cursor is the last facility id processed, so a
 * timeout costs one facility's work rather than all of it.
 */
const detectPmsEvents: JobHandler = async (ctx) => {
  let after = (ctx.cursor as { after?: string } | null)?.after;
  let emitted = Number((ctx.cursor as { emitted?: number } | null)?.emitted ?? 0);

  for (;;) {
    const batch = await facilitiesWithHistory(after, 25);
    if (batch.length === 0) return { kind: "done", progressDone: emitted };

    for (const facilityId of batch) {
      const res = await detectForFacility(facilityId);
      emitted += res.emitted;
      after = facilityId;
      if (ctx.shouldYield()) {
        return { kind: "more", cursor: { after, emitted }, progressDone: emitted };
      }
    }
  }
};

export const HANDLERS: Record<string, JobHandler> = {
  "demo.chunked": chunkedCounter,
  "pms.detect-events": detectPmsEvents,
};
