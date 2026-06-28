# Bloat Reduction Tasks

Surgical cleanup tasks generated after the QA pass on 2026-05-24.

Each task is self-contained per the execution rules below. Run one at a time. Do not combine. Tasks 01–23 are archived/closed (the original QA + bloat-reduction batch); the live set is below.

## Tasks

| # | Task | Status | Risk |
|---|---|---|---|
| 24 | Consolidate parallel drip + nurture sequence systems | **DEFERRED** — bigger than estimated, requires manual flow verification | Medium |
| 25 | Collapse audit-* API routes (10 → 3) | **DEFERRED** — high risk, split into 3 phases | High |
| 26 | Decide: keep or kill partner/referral program | **CLOSED — KEEP** (CLAUDE.md lists management cos as buyers) | — |
| 27 | Decide: keep or kill premature tenant lifecycle features | **CLOSED — KEEP** (tied to PMS moat) | — |
| 28 | CLAUDE.md full audit & refresh | Audit doc; refresh applied 2026-06-06 | — |
| 29 | Migrate client-onboarding + portal-upload onto shared portal auth helper | **DONE** (`faaaec8`) — both migrated +11 tests; manual portal walk still recommended | Medium-High |

## Execution Rules

1. **One file per session.** When told "run task 24", work ONLY on `tasks/24-*.md`. Nothing else exists.
2. **Read the entire file first.** Understand all steps, dependencies, and verification before writing code.
3. **Follow steps in order.** Do not skip, combine, or reorder steps.
4. **Search before assuming.** When a task says to find files matching a pattern, run the grep/find. Do not rely on memory — the repo is large (~200 API route dirs).
5. **Do not improvise.** No unrelated refactors, no "while I'm here" fixes, no added features.
6. **Verification is not optional.** Run every verification command listed. Show output. Fix failures before declaring done.
7. **Commit exactly as specified.** Use the commit message format at the bottom of each task file. Do not combine commits across tasks.
8. **Stop and report when done.** State: which task, how many files modified, any verification outputs needing attention. Do NOT start the next task.
9. **If ambiguous, ask.** If a path doesn't exist or a pattern returns nothing, stop and ask rather than improvising.

### How to start a task

When told "run task 24" or "do 24":

1. Read `tasks/24-*.md` completely
2. Confirm: "Read task 24. [X] steps identified. Starting Step 1."
3. Execute each step sequentially
4. Run all verification commands and show output
5. Commit with the specified message
6. Stop and report

### Build verification (after every task)

```bash
npx prisma validate
npx tsc --noEmit
npm run build
```

Fix build breaks within the current task scope before committing.

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
