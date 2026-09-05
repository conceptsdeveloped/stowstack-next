-- MISSION.md RESPOND r10 — Spanish flows. PURELY ADDITIVE.
CREATE TABLE IF NOT EXISTS "contact_language" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "phone" VARCHAR(20) NOT NULL,
  "language" VARCHAR(5) NOT NULL DEFAULT 'en',
  "source" VARCHAR(16),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
ALTER TABLE "contact_language" DROP CONSTRAINT IF EXISTS "contact_language_phone_key";
ALTER TABLE "contact_language" ADD  CONSTRAINT "contact_language_phone_key" UNIQUE ("phone");

ALTER TABLE "unit_waitlist" ADD COLUMN IF NOT EXISTS "language" VARCHAR(5) NOT NULL DEFAULT 'en';
