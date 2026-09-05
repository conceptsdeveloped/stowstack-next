-- MISSION.md s10 — unit reservation lock. PURELY ADDITIVE.
CREATE TABLE IF NOT EXISTS "unit_hold" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "facility_id" UUID NOT NULL,
  "size_label" TEXT,
  "unit_type" TEXT,
  "held_for_phone" VARCHAR(20),
  "held_for_name" TEXT,
  "waitlist_id" UUID,
  "source" VARCHAR(16) NOT NULL DEFAULT 'web',
  "status" VARCHAR(16) NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_hold_availability" ON "unit_hold" ("facility_id","size_label","status","expires_at");
CREATE INDEX IF NOT EXISTS "idx_hold_phone" ON "unit_hold" ("held_for_phone");
