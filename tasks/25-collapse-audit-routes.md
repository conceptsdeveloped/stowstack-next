# Task 25: Collapse audit-* API routes

## Status: DEFERRED — high risk, requires UI verification

10 API routes handle audit functionality. On closer reading, they're not simple CRUD slices:

- `api/audit-form` — form intake validation
- `api/audit-save` — partial save with localStorage sync
- `api/audit-load` — load drafts by anon visitor token
- `api/audit-generate` — generate basic audit
- `api/audit-generate-diagnostic` — 1,157-line AI-driven diagnostic (Claude + Google Places + scrape)
- `api/audit-approve` — admin approval triggers drip enrollment (see Task 24)
- `api/audit-report` — render shareable report
- `api/diagnostic-analyze` — analyzer step
- `api/diagnostic-intake` — intake step
- `api/synthesize` — synthesis step

## Why the collapse is risky

1. The audit funnel is your top-of-funnel — breaking it breaks lead capture
2. Each route has unique AI prompts and post-processing logic
3. They're chained: form → save → generate-diagnostic → approve → report
4. Consumers across the app: `audit-tool/audit-client.tsx`, `diagnostic/diagnostic-form.tsx`, `audit/[slug]/page.tsx`, `admin/audits/page.tsx`
5. No tests — verification requires manual end-to-end run of the audit funnel

## Recommendation

Don't do this in one PR. Instead:

- **Phase A**: Collapse `diagnostic-*` and `synthesize` into `audit-generate-diagnostic` (it's already 1,157 lines, has the canonical flow)
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
