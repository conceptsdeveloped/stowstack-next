-- MISSION.md RESPOND r5 — speed-to-lead. PURELY ADDITIVE.
ALTER TABLE "partial_leads" ADD COLUMN IF NOT EXISTS "first_response_at" TIMESTAMPTZ(6);

-- Answering a new lead means finding it by (status, submitted-at) constantly.
CREATE INDEX IF NOT EXISTS "idx_partial_leads_speed"
  ON "partial_leads" ("lead_status", "converted_at" DESC)
  WHERE "deleted_at" IS NULL;
