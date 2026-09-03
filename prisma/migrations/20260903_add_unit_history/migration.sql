-- MISSION.md s7 follow-on — unit-mix history, to unblock inventory.available.
-- PURELY ADDITIVE. facility_pms_units is read by 25 files and written by 4;
-- none of them change.
CREATE TABLE IF NOT EXISTS "facility_pms_unit_history" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "facility_id"    UUID NOT NULL,
  "captured_at"    TIMESTAMPTZ(6) NOT NULL,
  "unit_type"      TEXT NOT NULL,
  "size_label"     TEXT,
  "total_count"    INTEGER NOT NULL,
  "occupied_count" INTEGER NOT NULL,
  "vacant_count"   INTEGER,
  "street_rate"    DECIMAL(10,2),
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
ALTER TABLE "facility_pms_unit_history" DROP CONSTRAINT IF EXISTS "pms_unit_history_key";
ALTER TABLE "facility_pms_unit_history" ADD  CONSTRAINT "pms_unit_history_key"
  UNIQUE ("facility_id","unit_type","captured_at");
CREATE INDEX IF NOT EXISTS "idx_unit_history_facility"
  ON "facility_pms_unit_history" ("facility_id","captured_at");
