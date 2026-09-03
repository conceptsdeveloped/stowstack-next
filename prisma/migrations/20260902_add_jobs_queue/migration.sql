-- MISSION.md s1 — durable job queue.
-- PURELY ADDITIVE. Creates one new table and its indexes; touches nothing that
-- already exists. Written by hand rather than generated because this database
-- has no _prisma_migrations history (the team has been using `db push`), so a
-- generated diff would compare against a baseline that was never applied.
CREATE TABLE IF NOT EXISTS "jobs" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "queue"            VARCHAR(64)  NOT NULL,
  "payload"          JSONB        NOT NULL DEFAULT '{}',
  "status"           VARCHAR(16)  NOT NULL DEFAULT 'pending',
  "tenant_key"       VARCHAR(128),
  "dedupe_key"       VARCHAR(200),
  "cursor"           JSONB,
  "progress_done"    INTEGER      NOT NULL DEFAULT 0,
  "progress_total"   INTEGER,
  "attempts"         INTEGER      NOT NULL DEFAULT 0,
  "max_attempts"     INTEGER      NOT NULL DEFAULT 5,
  "run_after"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "locked_by"        VARCHAR(64),
  "lease_expires_at" TIMESTAMPTZ(6),
  "last_error"       TEXT,
  "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "finished_at"      TIMESTAMPTZ(6)
);
-- Idempotency: a set dedupe_key is unique per queue. Postgres allows repeated
-- NULLs, so jobs that do not need deduping are unaffected.
--
-- A CONSTRAINT rather than a bare unique index, deliberately: Prisma's @@unique
-- maps to a constraint, and a mismatch here shows up as phantom drift the next
-- time anyone runs `db push`.
ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_queue_dedupe_key";
ALTER TABLE "jobs" ADD  CONSTRAINT "jobs_queue_dedupe_key" UNIQUE ("queue","dedupe_key");
CREATE INDEX IF NOT EXISTS "idx_jobs_claim"        ON "jobs" ("status","run_after");
CREATE INDEX IF NOT EXISTS "idx_jobs_queue_status" ON "jobs" ("queue","status");
CREATE INDEX IF NOT EXISTS "idx_jobs_tenant"       ON "jobs" ("tenant_key","status");
CREATE INDEX IF NOT EXISTS "idx_jobs_lease"        ON "jobs" ("lease_expires_at");
