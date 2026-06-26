# Task 25: Collapse audit-* API routes

## Status: PARTIAL — dead routes removed 2026-06-26; remaining merges still DEFERRED (high risk, requires UI verification)

### Done (2026-06-26): removed three confirmed-dead engines (zero runtime callers, no tests, no imports)

- `api/diagnostic-analyze` — **DELETED.** Orphaned 9-category analyzer. Was a *publicly reachable, unauthenticated, unrate-limited* Anthropic endpoint — a live token cost/abuse hole, not just dead code. Its richer extras (5-stage conversion-funnel leak analysis + operator self-diagnosis "alignment" grade) were NOT salvaged into the live engine; that's a deliberate behavior change to top-of-funnel lead capture and needs Blake's sign-off before folding into `audit-generate-diagnostic`.
- `api/audit-generate` — **DELETED.** Orphaned competitor-aware sales audit (admin-gated). Superseded by `audit-generate-diagnostic`.
- `api/audit-report` — **DELETED.** Orphaned deterministic media-plan report (admin-gated). Note `audit_report_cache` table still exists in schema but is now unwritten — drop in a future schema task if confirmed unused.

### Correction to the original plan

`api/synthesize` is NOT a diagnostic-chain step. It's the admin-gated, rate-limited **creative/style synthesis** route (style_reference / campaign_result / manual → CREATIVE.md) and the only HTTP path to `synthesizeManual`. It's Angelo's creative domain — leave it out of any audit-route collapse.

### Remaining (still deferred)

10 API routes handled audit functionality. On closer reading, they're not simple CRUD slices:

- `api/audit-form` — form intake validation
- `api/audit-save` — partial save with localStorage sync
- `api/audit-load` — load drafts by anon visitor token
- ~~`api/audit-generate`~~ — DELETED (dead)
- `api/audit-generate-diagnostic` — 1,157-line AI-driven diagnostic (Claude + Google Places + scrape) — **the canonical live flow**
- `api/audit-approve` — admin approval triggers drip enrollment (see Task 24)
- ~~`api/audit-report`~~ — DELETED (dead)
- ~~`api/diagnostic-analyze`~~ — DELETED (dead)
- `api/diagnostic-intake` — intake step
- ~~`api/synthesize`~~ — NOT an audit route (creative synthesis, Angelo's domain)

## Why the collapse is risky

1. The audit funnel is your top-of-funnel — breaking it breaks lead capture
2. Each route has unique AI prompts and post-processing logic
3. They're chained: form → save → generate-diagnostic → approve → report
4. Consumers across the app: `audit-tool/audit-client.tsx`, `diagnostic/diagnostic-form.tsx`, `audit/[slug]/page.tsx`, `admin/audits/page.tsx`
5. No tests — verification requires manual end-to-end run of the audit funnel

## Recommendation

Don't do this in one PR. Instead:

- **Phase A**: ~~Collapse `diagnostic-*` and `synthesize` into `audit-generate-diagnostic`~~ — partly obsolete. `diagnostic-analyze` is deleted; `synthesize` is out of scope (creative, Angelo's). What remains of Phase A is the optional salvage of `diagnostic-analyze`'s funnel-leak + operator-alignment logic into `audit-generate-diagnostic`, which is a deliberate live-funnel behavior change and needs Blake's sign-off first.
- **Phase B**: Merge `audit-form` + `audit-save` + `audit-load` into a single `audits` CRUD route
- **Phase C**: Move `audit-approve` and `audit-report` under `audits/[id]/approve` and `audits/[id]/share` once stable

Each phase = its own PR with its own verification.

## Estimated work: 1-2 days across 3 PRs with manual audit funnel verification each

## Commit message (per-phase)

```
refactor(audit): phase A — collapse diagnostic-* into audit-generate-diagnostic
refactor(audit): phase B — merge audit-form/save/load into /api/audits CRUD
refactor(audit): phase C — move approve/report under /api/audits/[id]/*
```
