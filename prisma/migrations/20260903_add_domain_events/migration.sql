-- MISSION.md s7 — domain event log / outbox.
-- PURELY ADDITIVE. One new table plus indexes; touches nothing existing.
CREATE TABLE IF NOT EXISTS "domain_events" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"        VARCHAR(64)  NOT NULL,
  "facility_id" UUID,
  "tenant_key"  VARCHAR(128),
  "payload"     JSONB        NOT NULL DEFAULT '{}',
  "source_key"  VARCHAR(300) NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
-- Emitted once: the identity of the fact, not of the detection run. A CONSTRAINT
-- rather than a bare index so it matches Prisma's @@unique (see the jobs
-- migration for why that distinction bit once already).
ALTER TABLE "domain_events" DROP CONSTRAINT IF EXISTS "domain_events_type_source_key";
ALTER TABLE "domain_events" ADD  CONSTRAINT "domain_events_type_source_key" UNIQUE ("type","source_key");
CREATE INDEX IF NOT EXISTS "idx_events_facility_type" ON "domain_events" ("facility_id","type","occurred_at");
CREATE INDEX IF NOT EXISTS "idx_events_occurred"      ON "domain_events" ("occurred_at");
CREATE INDEX IF NOT EXISTS "idx_events_type_created"  ON "domain_events" ("type","created_at");
