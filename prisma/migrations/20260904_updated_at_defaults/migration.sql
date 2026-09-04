-- Fix: NOT NULL updated_at with no default made every raw INSERT fail (23502).
--
-- Prisma's @updatedAt only applies to ORM writes. Seven tables carried a
-- NOT NULL updated_at with no database default, and four hand-written INSERTs
-- across three of them omitted the column — so those writes had never once
-- succeeded. campaign_spend (0 rows) meant cost per move-in was structurally
-- zero; call_logs (0 rows) failed fire-and-forget behind a console.error, so
-- every tracked call was silently dropped.
--
-- A default is the systemic guard: it makes the column behave the way every
-- author already assumed it did, and stops this class of bug recurring.
-- Non-destructive; existing rows are untouched.
ALTER TABLE "call_logs"             ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "campaign_spend"        ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "churn_predictions"     ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "creative_performance"  ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "facility_learnings"    ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "funnels"               ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "landing_pages"         ALTER COLUMN "updated_at" SET DEFAULT now();
