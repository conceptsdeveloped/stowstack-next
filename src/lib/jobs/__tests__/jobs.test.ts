import { describe, expect, it, vi } from "vitest";
import {
  OutcomeUnknown,
  backoffMs,
  budgetExhausted,
  decide,
  errorText,
  leaseUntil,
} from "@/lib/jobs/types";
import { HANDLERS } from "@/lib/jobs/handlers";

const job = (over: Partial<{ attempts: number; max_attempts: number }> = {}) => ({
  attempts: 0,
  max_attempts: 5,
  ...over,
});

describe("backoff", () => {
  it("grows with the attempt", () => {
    const half = () => 0.5;
    expect(backoffMs(1, half)).toBeLessThan(backoffMs(3, half));
    expect(backoffMs(3, half)).toBeLessThan(backoffMs(6, half));
  });

  it("caps so a job never parks for hours", () => {
    expect(backoffMs(50, () => 1)).toBeLessThanOrEqual(15 * 60_000);
  });

  it("jitters — two failures at the same attempt do not retry in lockstep", () => {
    expect(backoffMs(6, () => 0)).not.toBe(backoffMs(6, () => 1));
  });
});

describe("decide", () => {
  it("done finishes", () => {
    expect(decide({ kind: "done" }, job())).toEqual({ next: "done" });
  });

  it("more resumes and carries the cursor", () => {
    expect(decide({ kind: "more", cursor: { at: 40 } }, job())).toEqual({
      next: "continue",
      cursor: { at: 40 },
    });
  });

  it("resuming is progress, not an attempt — it can repeat past max_attempts", () => {
    const nearlyExhausted = job({ attempts: 4, max_attempts: 5 });
    expect(decide({ kind: "more", cursor: { at: 1 } }, nearlyExhausted).next).toBe("continue");
  });

  it("an ordinary error retries while attempts remain", () => {
    const out = decide({ kind: "error", error: new Error("boom") }, job({ attempts: 1 }));
    expect(out.next).toBe("retry");
  });

  it("stops retrying at max_attempts", () => {
    const out = decide({ kind: "error", error: new Error("boom") }, job({ attempts: 4, max_attempts: 5 }));
    expect(out).toEqual({ next: "failed" });
  });

  // The expensive lesson, encoded: a retried maybe-sent side effect mails a
  // second real postcard and charges twice. Unknown must never retry.
  it("OutcomeUnknown freezes and never retries, however many attempts remain", () => {
    const out = decide({ kind: "error", error: new OutcomeUnknown("vendor timed out") }, job({ attempts: 0 }));
    expect(out).toEqual({ next: "frozen" });
  });

  it("an explicit unknown result freezes too", () => {
    expect(decide({ kind: "unknown", reason: "timeout" }, job())).toEqual({ next: "frozen" });
  });
});

describe("time budget", () => {
  it("is not exhausted early", () => {
    expect(budgetExhausted(0, 10_000, 300_000, 30_000)).toBe(false);
  });
  it("is exhausted once inside the headroom", () => {
    expect(budgetExhausted(0, 275_000, 300_000, 30_000)).toBe(true);
  });
  it("leaves the whole headroom to finish the job in hand", () => {
    expect(budgetExhausted(0, 269_999, 300_000, 30_000)).toBe(false);
    expect(budgetExhausted(0, 270_000, 300_000, 30_000)).toBe(true);
  });
});

describe("misc", () => {
  it("leaseUntil is in the future", () => {
    expect(leaseUntil(1_000, 5_000).getTime()).toBe(6_000);
  });
  it("errorText flattens and clamps", () => {
    expect(errorText(new Error("a\n  b"))).toBe("Error: a b");
    expect(errorText(new Error("x".repeat(5000))).length).toBeLessThanOrEqual(2000);
  });
});

describe("chunked handler — the resumability proof", () => {
  const h = HANDLERS["demo.chunked"];
  const ctx = (over: Partial<{ payload: unknown; cursor: unknown; yield: boolean }> = {}) => ({
    id: "j1",
    payload: over.payload ?? { to: 1000, chunk: 100 },
    cursor: over.cursor ?? null,
    attempt: 1,
    shouldYield: () => over.yield ?? false,
  });

  it("finishes in one pass when there is time", async () => {
    await expect(h(ctx())).resolves.toEqual({ kind: "done", progressDone: 1000 });
  });

  it("yields a cursor when time runs short", async () => {
    await expect(h(ctx({ yield: true }))).resolves.toEqual({
      kind: "more",
      cursor: { at: 100 },
      progressDone: 100,
    });
  });

  it("resumes from the cursor rather than restarting", async () => {
    const r = await h(ctx({ cursor: { at: 900 }, yield: true }));
    expect(r).toEqual({ kind: "done", progressDone: 1000 });
  });

  it("a full run split across many yields still lands on exactly the total, once", async () => {
    let cursor: unknown = null;
    let passes = 0;
    for (;;) {
      const r = await h(ctx({ cursor, yield: true }));
      passes++;
      if (r.kind === "done") {
        expect(r.progressDone).toBe(1000);
        break;
      }
      cursor = (r as { cursor: unknown }).cursor;
      expect(passes).toBeLessThan(50); // guard against a non-advancing cursor
    }
    expect(passes).toBe(10);
  });
});

describe("runner", () => {
  // The runner talks to Postgres through ./queue, so the DB module is replaced
  // wholesale. What is under test is the loop's decisions, not the SQL.
  it("stops claiming once the budget is spent, and never leaves a job mid-flight", async () => {
    vi.resetModules();
    let claims = 0;
    const completed: string[] = [];
    vi.doMock("@/lib/jobs/queue", () => ({
      claim: async () => {
        claims++;
        return {
          id: `job${claims}`, queue: "demo.chunked", payload: { to: 10, chunk: 10 },
          status: "running", tenant_key: null, dedupe_key: null, cursor: null,
          progress_done: 0, progress_total: null, attempts: 0, max_attempts: 5,
          run_after: new Date(), locked_by: "w", lease_expires_at: new Date(), last_error: null,
        };
      },
      complete: async (id: string) => { completed.push(id); },
      saveProgress: async () => {}, retryLater: async () => {},
      terminate: async () => {}, reclaimExpired: async () => 0,
    }));
    const { runJobs: run } = await import("@/lib/jobs/runner");
    const { HANDLERS: H } = await import("@/lib/jobs/handlers");

    let t = 0;
    const summary = await run({
      workerId: "w1",
      budgetMs: 1000,
      headroomMs: 200,
      handlers: H,
      now: () => (t += 100), // each check advances 100ms
    });

    expect(summary.claimed).toBeGreaterThan(0);
    expect(summary.done).toBe(summary.claimed);
    expect(completed.length).toBe(summary.done);
    expect(summary.claimed).toBeLessThan(10); // budget stopped it
    vi.doUnmock("@/lib/jobs/queue");
  });

  it("freezes a job whose queue has no handler instead of failing it", async () => {
    vi.resetModules();
    let served = false;
    const frozen: { id: string; status: string }[] = [];
    vi.doMock("@/lib/jobs/queue", () => ({
      claim: async () => {
        if (served) return null;
        served = true;
        return {
          id: "orphan", queue: "queue.that.shipped.without.a.handler", payload: {},
          status: "running", tenant_key: null, dedupe_key: null, cursor: null,
          progress_done: 0, progress_total: null, attempts: 0, max_attempts: 5,
          run_after: new Date(), locked_by: "w", lease_expires_at: new Date(), last_error: null,
        };
      },
      complete: async () => {}, saveProgress: async () => {}, retryLater: async () => {},
      terminate: async (id: string, status: string) => { frozen.push({ id, status }); },
      reclaimExpired: async () => 0,
    }));
    const { runJobs: run } = await import("@/lib/jobs/runner");
    const summary = await run({ workerId: "w1", budgetMs: 60_000, headroomMs: 1000, handlers: {} });
    expect(summary.frozen).toBe(1);
    expect(summary.failed).toBe(0);
    expect(frozen).toEqual([{ id: "orphan", status: "frozen" }]);
    expect(summary.skipped).toEqual(["queue.that.shipped.without.a.handler"]);
    vi.doUnmock("@/lib/jobs/queue");
  });
});
