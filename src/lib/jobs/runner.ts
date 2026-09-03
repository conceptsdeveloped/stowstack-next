/**
 * Durable job queue — the loop (MISSION.md s1).
 *
 * One invocation of the worker claims jobs until its time budget runs out, then
 * returns cleanly. Nothing here assumes it will be allowed to finish: the
 * platform can kill this function at 300s, and every path that matters persists
 * before it would be lost.
 */

import {
  type HandlerResult,
  type JobContext,
  type JobHandler,
  budgetExhausted,
  decide,
} from "./types";
import { claim, complete, reclaimExpired, retryLater, saveProgress, terminate } from "./queue";

export interface RunOptions {
  workerId: string;
  /** Total wall clock this invocation may use. Keep below the route's maxDuration. */
  budgetMs: number;
  /** Reserve for the final write of the last job. Never let a pass end mid-update. */
  headroomMs?: number;
  queues?: string[];
  handlers: Record<string, JobHandler>;
  now?: () => number;
}

export interface RunSummary {
  claimed: number;
  done: number;
  continued: number;
  retried: number;
  failed: number;
  frozen: number;
  reclaimed: number;
  skipped: string[];
  ms: number;
}

export async function runJobs(opts: RunOptions): Promise<RunSummary> {
  const now = opts.now ?? Date.now;
  const startedAt = now();
  const headroom = opts.headroomMs ?? 20_000;
  const sum: RunSummary = {
    claimed: 0, done: 0, continued: 0, retried: 0,
    failed: 0, frozen: 0, reclaimed: 0, skipped: [], ms: 0,
  };

  // Recover anything a dead worker left holding a lease, before claiming new
  // work — otherwise a crashed job waits a full cron interval to be noticed.
  sum.reclaimed = await reclaimExpired();

  while (!budgetExhausted(startedAt, now(), opts.budgetMs, headroom)) {
    const job = await claim(opts.workerId, opts.queues);
    if (!job) break; // nothing runnable
    sum.claimed++;

    const handler = opts.handlers[job.queue];
    if (!handler) {
      // An unknown queue is a deploy problem, not a data problem. Freeze rather
      // than fail so it is visible and resumable once the handler ships, and
      // record it once instead of spinning.
      if (!sum.skipped.includes(job.queue)) sum.skipped.push(job.queue);
      await terminate(job.id, "frozen", job.attempts, `no handler registered for queue "${job.queue}"`);
      sum.frozen++;
      continue;
    }

    const ctx: JobContext = {
      id: job.id,
      payload: job.payload,
      cursor: job.cursor,
      attempt: job.attempts + 1,
      shouldYield: () => budgetExhausted(startedAt, now(), opts.budgetMs, headroom),
    };

    let outcome: ReturnType<typeof decide>;
    try {
      const result: HandlerResult = await handler(ctx);
      outcome = decide(result, job);
      if (outcome.next === "done") {
        await complete(job.id, result.kind === "done" ? result.progressDone : undefined);
        sum.done++;
      } else if (outcome.next === "continue") {
        await saveProgress(job.id, outcome.cursor, result.kind === "more" ? result.progressDone : undefined);
        sum.continued++;
      } else if (outcome.next === "frozen") {
        await terminate(job.id, "frozen", job.attempts, result.kind === "unknown" ? result.reason : "unknown outcome");
        sum.frozen++;
      }
    } catch (error) {
      outcome = decide({ kind: "error", error }, job);
      if (outcome.next === "retry") {
        await retryLater(job.id, job.attempts + 1, error);
        sum.retried++;
      } else if (outcome.next === "frozen") {
        await terminate(job.id, "frozen", job.attempts + 1, error);
        sum.frozen++;
      } else {
        await terminate(job.id, "failed", job.attempts + 1, error);
        sum.failed++;
      }
    }
  }

  sum.ms = now() - startedAt;
  return sum;
}
