# Bloat Reduction Tasks

Surgical cleanup tasks generated after the QA pass on 2026-05-24.

Each task is self-contained per the execution rules in `CLAUDE.md`. Run one at a time. Do not combine.

## Tasks

| # | Task | Status | Risk |
|---|---|---|---|
| 24 | Consolidate parallel drip + nurture sequence systems | **DEFERRED** — bigger than estimated, requires manual flow verification | Medium |
| 25 | Collapse audit-* API routes (10 → 3) | **DEFERRED** — high risk, split into 3 phases | High |
| 26 | Decide: keep or kill partner/referral program | **CLOSED — KEEP** (CLAUDE.md lists management cos as buyers) | — |
| 27 | Decide: keep or kill premature tenant lifecycle features | **CLOSED — KEEP** (tied to PMS moat) | — |
| 28 | CLAUDE.md full audit & refresh | **CLOSED** — executed in-place 2026-06-19 (see header of `28-claude-md-audit.md`) | Low |

## What was already done in the QA pass + bloat reduction

- 29 unreferenced files deleted (components + lib)
- 9 Prisma models removed (commit_*, dev_handoffs, deployment_tags, betapad_notes, ab_tests, ab_test_events)
- 8 dead API route directories removed
- 4 unused npm dependencies uninstalled (@clerk/themes, @stripe/stripe-js, @supabase/*)
- 12 lint warnings auto-fixed
- betapad_notes removed from data-retention cron policies
- ab_tests back-relation removed from facilities model

Committed as `2a5eb19`.

## Notes for executing the deferred tasks

- Schema model removals stage in `prisma/schema.prisma` only. **Never run `prisma db push` without explicit user approval** — that drops production tables irreversibly.
- After each schema change: `npx prisma validate && npx prisma generate && npx tsc --noEmit && npm run build`
- For Task 24, manually verify post-audit follow-up email is still sent after audit approval
- For Task 25, manually run the audit funnel end-to-end after each phase
- Don't touch Angelo's domain: ad platform integrations (Meta/Google/TikTok), video/image generation, audience-sync, facility-creatives ad sections, google-ads-lab
