/**
 * Durable job queue — types and the pure decisions (MISSION.md s1).
 *
 * Everything in this file is deliberately free of I/O so it can be tested
 * without a database. The rules that decide whether a job retries, resumes or
 * freezes are the part that must not be wrong, and they are the part a DB test
 * would obscure rather than prove.
 */

export type JobStatus = "pending" | "running" | "done" | "failed" | "frozen";

export interface JobRow {
  id: string;
  queue: string;
  payload: unknown;
  status: JobStatus;
  tenant_key: string | null;
  dedupe_key: string | null;
  cursor: unknown;
  progress_done: number;
  progress_total: number | null;
  attempts: number;
  max_attempts: number;
  run_after: Date;
  locked_by: string | null;
  lease_expires_at: Date | null;
  last_error: string | null;
}

/**
 * What a handler tells the runner when it stops.
 *
 * `more` is the whole reason this queue exists: a handler that cannot finish
 * inside the function's time budget returns `more` with the cursor it reached,
 * and the next invocation picks up from exactly there. That is progress, not
 * failure, so it must never burn an attempt.
 */
export type HandlerResult =
  | { kind: "done"; progressDone?: number }
  | { kind: "more"; cursor: unknown; progressDone?: number }
  | { kind: "unknown"; reason: string };

export interface JobContext {
  id: string;
  payload: unknown;
  cursor: unknown;
  attempt: number;
  /** True once the runner is near its time budget — handlers should wrap up and return `more`. */
  shouldYield: () => boolean;
}

export type JobHandler = (ctx: JobContext) => Promise<HandlerResult>;

/**
 * Raised by a handler whose outcome is genuinely UNKNOWN — a vendor timeout
 * after the request may already have landed.
 *
 * This is not a failure and must not be retried. PostcardRobot learned this the
 * expensive way: a retried maybe-sent batch mails a second real postcard and
 * charges for both, with the customer debited once. Unknown freezes for a human.
 */
export class OutcomeUnknown extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutcomeUnknown";
  }
}

export type Outcome =
  | { next: "done" }
  | { next: "continue"; cursor: unknown }
  | { next: "retry"; delayMs: number }
  | { next: "failed" }
  | { next: "frozen" };

/**
 * Exponential backoff with full jitter, capped.
 *
 * Jitter matters more than the curve here: without it, a burst of jobs that
 * fail together retry together, and a vendor that rate-limited us once gets hit
 * by the identical thundering herd one delay later.
 */
export function backoffMs(attempt: number, rand: () => number = Math.random): number {
  const base = 2_000;
  const cap = 15 * 60_000; // 15 minutes
  const exp = Math.min(cap, base * 2 ** Math.max(0, attempt - 1));
  return Math.floor(exp / 2 + rand() * (exp / 2));
}

/** Decide what happens to a job after one pass. The single source of that truth. */
export function decide(
  result: HandlerResult | { kind: "error"; error: unknown },
  job: Pick<JobRow, "attempts" | "max_attempts">,
  rand: () => number = Math.random
): Outcome {
  if (result.kind === "done") return { next: "done" };
  if (result.kind === "more") return { next: "continue", cursor: result.cursor };
  if (result.kind === "unknown") return { next: "frozen" };

  // An error. Outcome-unknown is never a retry, however many attempts remain.
  if (result.error instanceof OutcomeUnknown) return { next: "frozen" };
  const attempted = job.attempts + 1;
  if (attempted >= job.max_attempts) return { next: "failed" };
  return { next: "retry", delayMs: backoffMs(attempted, rand) };
}

/**
 * Time budget. The runner stops claiming new work once the remaining time is
 * less than one job's worth of headroom, so it exits cleanly instead of being
 * killed mid-write by the platform.
 */
export function budgetExhausted(
  startedAtMs: number,
  nowMs: number,
  totalBudgetMs: number,
  headroomMs: number
): boolean {
  return nowMs - startedAtMs >= totalBudgetMs - headroomMs;
}

/** A lease long enough to outlive one pass, short enough that a crash recovers quickly. */
export function leaseUntil(nowMs: number, leaseMs: number): Date {
  return new Date(nowMs + leaseMs);
}

/** Clamp an error down to something safe to persist in `last_error`. */
export function errorText(e: unknown, max = 2000): string {
  const raw = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return raw.replace(/\s+/g, " ").slice(0, max);
}
