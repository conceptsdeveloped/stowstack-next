# Task 25: Collapse audit-* API routes

## Problem

10 API routes handle audit functionality with overlapping responsibilities:

- `api/audit-form` — form intake
- `api/audit-save` — save draft
- `api/audit-load` — load saved
- `api/audit-generate` — generate audit
- `api/audit-generate-diagnostic` — generate diagnostic (1,157 lines)
- `api/audit-approve` — approve audit
- `api/audit-report` — report
- `api/diagnostic-analyze` — diagnostic analyzer
- `api/diagnostic-intake` — diagnostic intake
- `api/synthesize` — synthesis

## Goal

3 routes:

- `api/audits` — full CRUD on audit records (POST = create/save, GET = list, PATCH = update)
- `api/audits/[id]/generate` — kick off AI generation (handles diagnostic + report synthesis)
- `api/audits/[id]/share` — create shareable link, return public URL

## Steps

1. Read `audit-generate-diagnostic/route.ts` to understand the canonical AI prompt flow.
2. Read each of the 10 routes to map current handlers to the new 3-route API.
3. Build the 3 new routes under `src/app/api/audits/` with the same auth + rate-limit patterns from `api-helpers.ts`.
4. Update consumers (search for `/api/audit-*`, `/api/diagnostic-*`, `/api/synthesize` in client code) to call the new routes.
5. Delete the 10 old routes.
6. Verify build + manually test the audit funnel from `/audit-tool` end to end (use the verify skill).

## Files affected

- 10 deletions under `src/app/api/`
- 3 new files under `src/app/api/audits/`
- Client updates: `src/app/audit-tool/audit-client.tsx`, `src/app/diagnostic/diagnostic-form.tsx`, `src/app/audit/[slug]/page.tsx`, possibly `src/app/admin/audits/page.tsx`

## Verification

```bash
npx tsc --noEmit
npm run build
```

Then run the verify skill on the audit funnel: form submit → diagnostic generation → shareable report.

## Commit message

```
refactor: collapse 10 audit routes into 3 (audits, audits/[id]/generate, audits/[id]/share)
```
