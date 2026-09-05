-- MISSION.md RESPOND r6/r7 — tour booking, reminders, no-show recovery.
-- PURELY ADDITIVE.
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(64);

CREATE TABLE IF NOT EXISTS "facility_tours" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "facility_id"   UUID NOT NULL,
  "lead_id"       UUID,
  "contact_name"  VARCHAR(120),
  "contact_phone" VARCHAR(20) NOT NULL,
  "size_label"    VARCHAR(32),
  "scheduled_at"  TIMESTAMPTZ(6) NOT NULL,
  "status"        VARCHAR(16) NOT NULL DEFAULT 'booked',
  "source"        VARCHAR(16),
  "cancelled_at"  TIMESTAMPTZ(6),
  "completed_at"  TIMESTAMPTZ(6),
  "no_show_at"    TIMESTAMPTZ(6),
  "notes"         TEXT,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "facility_tours" ADD CONSTRAINT "facility_tours_facility_id_fkey"
    FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "facility_tours" ADD CONSTRAINT "facility_tours_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "partial_leads"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_tours_due"      ON "facility_tours" ("status", "scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_tours_facility" ON "facility_tours" ("facility_id", "scheduled_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_tours_phone"    ON "facility_tours" ("contact_phone");
CREATE INDEX IF NOT EXISTS "idx_tours_lead"     ON "facility_tours" ("lead_id");

-- One live tour per person per facility. A second booking is a reschedule, not a
-- second tour, and without this a double-submitted form produces two of them
-- and two sets of reminders.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tours_one_live"
  ON "facility_tours" ("facility_id", "contact_phone")
  WHERE "status" IN ('booked', 'confirmed');
