-- Drop the audit_report_cache table.
--
-- The only writer/reader was the /api/audit-report route, deleted in 49b303c
-- (2026-06-26) as a confirmed-dead audit engine. The model was removed from
-- prisma/schema.prisma in the same change set, leaving this prod table orphaned.
--
-- This script is SCOPED on purpose: it drops ONLY audit_report_cache. It does
-- NOT use `prisma db push`, which would require --accept-data-loss (blocked by
-- scripts/check-no-data-loss.sh) and could sweep in unrelated schema drift.
--
-- Data impact: this table held only regenerable per-facility media-plan report
-- caches (no source-of-truth data). Dropping it loses nothing that can't be
-- recomputed; in practice it is already unwritten.
--
-- Idempotent: safe to run more than once (IF EXISTS).
-- Run against prod ONLY with explicit approval (no staging / no dev DB).

DROP TABLE IF EXISTS "audit_report_cache";
