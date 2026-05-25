# Bloat Reduction Tasks

Surgical cleanup tasks generated after the QA pass on 2026-05-24.

Each task is self-contained per the execution rules in `CLAUDE.md`. Run one at a time. Do not combine.

## Tasks

| # | Task | Risk | Reversible |
|---|---|---|---|
| 24 | Consolidate parallel drip + nurture sequence systems | Medium | Yes (git) until DB push |
| 25 | Collapse audit-* API routes (10 → 3) | Medium | Yes (git) |
| 26 | Decide: keep or kill partner/referral program | High | Yes (git) until DB push |
| 27 | Decide: keep or kill premature tenant lifecycle features | High | Yes (git) until DB push |

## What was already done in the QA pass (no task file needed)

- Deleted 29 unreferenced files (29 components/lib files)
- Auto-fixed 12 lint warnings
- Removed dead `signTempToken()` and `enrollLead()` functions
- Wave 1 deletes: `commit_*`, `dev_handoffs`, `deployment_tags`, `betapad_notes`, `ab_tests`, `ab_test_events` models + their API routes + cron policy

## Notes for execution

- Schema model removals stage in `prisma/schema.prisma` only. **Never run `prisma db push` without explicit user approval** — that drops production tables irreversibly.
- After each schema change: `npx prisma validate && npx prisma generate && npx tsc --noEmit && npm run build`
- Don't touch Angelo's domain: ad platform integrations (Meta/Google/TikTok), video/image generation, audience-sync, facility-creatives, google-ads-lab.
