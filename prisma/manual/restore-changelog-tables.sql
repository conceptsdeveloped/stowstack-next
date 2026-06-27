-- Restore the rich-changelog (developer commit log) tables.
--
-- These 5 models were deleted from the schema in 2a5eb19 (2026-05-24). A read-only
-- `prisma migrate diff` on 2026-06-26 showed the underlying prod tables no longer
-- exist, so they must be (re)created for the feature to function.
--
-- This script is SCOPED on purpose: it creates ONLY these 5 tables + indexes.
-- It deliberately does NOT use `prisma db push`, which would also sweep in an
-- unrelated pre-existing drift on gbp_connections.sync_config (Angelo's GBP domain).
--
-- Idempotent: safe to run more than once (IF NOT EXISTS everywhere).
-- Run against prod ONLY with explicit approval (no staging / no dev DB).

CREATE TABLE IF NOT EXISTS "commit_enrichments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commit_hash" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "dev_note" TEXT,
    "dev_name" TEXT,
    "commit_type" TEXT DEFAULT 'improvement',
    "laymans_summary" TEXT,
    "technical_summary" TEXT,
    "committed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commit_enrichments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "commit_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commit_hash" TEXT NOT NULL,
    "flag_type" TEXT NOT NULL,
    "reason" TEXT DEFAULT '',
    "flagged_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commit_flags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "commit_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commit_hash" TEXT NOT NULL,
    "reviewed_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reviewed',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commit_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "deployment_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commit_hash" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "deployed_by" TEXT NOT NULL,
    "version" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deployment_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dev_handoffs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_dev" TEXT NOT NULL,
    "to_dev" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "commit_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dev_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "commit_enrichments_commit_hash_key" ON "commit_enrichments"("commit_hash");
CREATE INDEX IF NOT EXISTS "idx_commit_enrichments_hash" ON "commit_enrichments"("commit_hash");
CREATE INDEX IF NOT EXISTS "idx_commit_flags_hash" ON "commit_flags"("commit_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_commit_reviews_unique" ON "commit_reviews"("commit_hash", "reviewed_by");
CREATE INDEX IF NOT EXISTS "idx_deployment_tags_env" ON "deployment_tags"("environment");
CREATE INDEX IF NOT EXISTS "idx_deployment_tags_hash" ON "deployment_tags"("commit_hash");
CREATE INDEX IF NOT EXISTS "idx_dev_handoffs_status" ON "dev_handoffs"("status");
