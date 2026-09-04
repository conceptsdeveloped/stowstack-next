-- MISSION.md s5 + r9 — messaging seam, waitlist, opt-out registry.
-- PURELY ADDITIVE. Three new tables; nothing existing is touched.
CREATE TABLE IF NOT EXISTS "unit_waitlist" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "facility_id" UUID NOT NULL,
  "size_label" TEXT,
  "contact_name" TEXT,
  "contact_phone" VARCHAR(20) NOT NULL,
  "contact_email" TEXT,
  "status" VARCHAR(16) NOT NULL DEFAULT 'waiting',
  "notified_at" TIMESTAMPTZ(6),
  "notify_count" INTEGER NOT NULL DEFAULT 0,
  "source" VARCHAR(32),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_waitlist_match" ON "unit_waitlist" ("facility_id","size_label","status");
CREATE INDEX IF NOT EXISTS "idx_waitlist_phone" ON "unit_waitlist" ("contact_phone");

CREATE TABLE IF NOT EXISTS "message_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "facility_id" UUID,
  "channel" VARCHAR(8) NOT NULL,
  "direction" VARCHAR(8) NOT NULL DEFAULT 'outbound',
  "to_number" VARCHAR(20) NOT NULL,
  "from_number" VARCHAR(20),
  "body" TEXT NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'queued',
  "provider" VARCHAR(16),
  "provider_id" TEXT,
  "dedupe_key" VARCHAR(200) NOT NULL,
  "error" TEXT,
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
-- The idempotency guard. A replayed job must be a no-op, not a second text.
ALTER TABLE "message_log" DROP CONSTRAINT IF EXISTS "message_log_dedupe_key";
ALTER TABLE "message_log" ADD  CONSTRAINT "message_log_dedupe_key" UNIQUE ("dedupe_key");
CREATE INDEX IF NOT EXISTS "idx_message_facility" ON "message_log" ("facility_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_message_status"   ON "message_log" ("status");
CREATE INDEX IF NOT EXISTS "idx_message_to"       ON "message_log" ("to_number");

CREATE TABLE IF NOT EXISTS "message_optout" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "phone" VARCHAR(20) NOT NULL,
  "reason" VARCHAR(32),
  "source" VARCHAR(32),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
ALTER TABLE "message_optout" DROP CONSTRAINT IF EXISTS "message_optout_phone_key";
ALTER TABLE "message_optout" ADD  CONSTRAINT "message_optout_phone_key" UNIQUE ("phone");
