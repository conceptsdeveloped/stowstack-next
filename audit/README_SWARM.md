# Pre-Alpha Audit — Swarm Working Agreement (READ FIRST)

This is a **read-only QA audit**. You document what is unfinished. **You fix nothing.**
All writes are confined to `audit/`. No edits to `src/`, `prisma/`, or any product code. No code commits outside `audit/`.

## CRITICAL: architecture clarification
`PREALPHA_AUDIT.md` (in the swarm knowledge folder) was written for the **v2 rewrite** at `/Users/blake/Documents/storageads-v2`. It assumes Clerk org provisioning, `orgDb`, `scope.ts`, branded `OrgId`, `boundaries.test.ts`, a fused AI `generate()` boundary. **THIS repo (`stowstack-next`) has none of that.** Do not file findings that something "should" use `orgDb`/`scope.ts` — that is the wrong architecture for this codebase.

Use PREALPHA_AUDIT.md only for **methodology**: senior-QA adversarial posture, two-pass discovery (§7), finding categories (§5), severity rubric (§4), the per-finding verification gate (§11), the finding schema (§10), and the coverage proof (§13). The golden-path and tenancy lens below are the **adapted, authoritative** versions for this repo.

## This repo's real architecture (from CLAUDE.md / SITEMAP.md)
Four independent auth systems, each gates itself (Clerk proxy marks everything public):
1. **Admin** — `X-Admin-Key` header vs `ADMIN_SECRET`; helper `requireAdminKey()` (`src/lib/api-helpers.ts`). Used by `/admin` pages + `admin-*` routes.
2. **Client portal** — email + access code (Bearer access code). Canonical helper `authenticatePortalRequest()` (`src/lib/portal-auth.ts`). Access code issued when a lead → `client_signed`.
3. **Partner/org** — email+password+org slug → `ss_` session token in `sessions` table, 30-day. Helper `getSession()` (`src/lib/session-auth.ts`, raw SQL).
4. **V1 external API** — API key auth via `src/lib/v1-auth.ts`.
Cron routes: `verifyCronSecret()` (`src/lib/cron-auth.ts`, fail-closed).
Mutating `/api` POSTs pass through a CSRF gate in `src/proxy.ts` (`requiresCsrf()` / `src/lib/csrf.ts`) — known footgun (see memory: it 403s non-exempt mutating POSTs). DB: Prisma singleton `src/lib/db.ts`, schema `prisma/schema.prisma` (~98 models).

**Status:** pre-launch. Alpha = Blake's own portfolio. Not live with paying customers. "Angelo's domain" (ad platform integrations + video/image gen: Meta/Google/TikTok, `generate-*`, `publish-*`, FAL/Runway) is **context-only** for this audit — note gaps but tag `"owner_domain":"angelo"` and keep severity advisory; Blake does not own that code.

## Adapted Golden Path (the P0 spine — trace, do not grep)
Owned by Builder 1. Every step gets a verdict: `present-and-complete` / `present-but-stubbed` / `partially-wired` / `missing`, with `file:line`.
1. **Top-of-funnel** — `/audit-tool` → `audit-form` → `audit-generate-diagnostic` → shared audit persists, renders at `/audit/[slug]`; "schedule a call" CTA (Cal.com `stowstack/30min`).
2. **Lead capture & pipeline** — `lead-capture`/`partial-lead` persist a lead; admin pipeline shows it; lead status transitions work.
3. **Client conversion** — status → `client_signed` generates an access code; `resend-access-code` emails it; portal login (email+code) authenticates via `authenticatePortalRequest`.
4. **Onboarding** — `/portal/onboarding` wizard → `client-onboarding` persists facility/marketing config scoped to that client.
5. **PMS data** — `/portal/upload` (CSV) → `portal-upload` → `src/lib/pms-import.ts` pipeline → persisted facility data; admin `pms-queue` + `process-pms-uploads` cron.
6. **Campaigns → landing pages** — admin campaign/funnel create → `funnels/generate` + `landing-pages/generate` → `/lp/[slug]` renders publicly from DB section config.
7. **Marketing surfaces fire** — drip/nurture sequences, GBP sync, review requests actually send.
8. **Reports / intelligence** — occupancy-intelligence, revenue analytics, `client-reports` + `send-client-reports` cron + NOI reports produce real (not hardcoded) numbers.
9. **Attribution** — `walkin-attribution`, `tracking/*`, `meta-capi`/`google-conversion`, `attribution` tie outcomes back to campaign/source; metrics are computed, not constants.
10. **Billing (agency revenue)** — `create-checkout-session` → `stripe-webhook` (subscription lifecycle: created/updated/deleted, invoice.payment_failed, checkout.session.completed) → `subscription-usage`; portal `client-billing`/`client-invoices`.

## Adapted Tenancy lens (mandatory P0 lens for every data-touching partition)
Flag as **P0** `category: tenancy-breach`:
- An **admin** route (mutating or data-returning) that does **not** call `requireAdminKey()`.
- A **client/portal** route that does not authenticate via `authenticatePortalRequest()` (or equivalent Bearer access-code lookup) **AND scope every query to that authenticated client's id/facility**. A portal route returning rows not filtered by the caller's client = cross-tenant leak.
- A **partner/org** route that does not call `getSession()` **AND scope to that session's org**. Returning another org's facilities/users/revenue = leak.
- A **v1** route that does not validate the API key via `v1-auth` and scope to that key's tenant.
- A **cron** route missing `verifyCronSecret()`.
- A public **write** route (lead-capture, tracking, audit-form, etc.) with no input validation / rate limiting.
Treat absence of proof of scoping as a breach. Cite the missing call site.

## Finding schema (one JSON object per line in `audit/findings/<partition>.jsonl`)
```json
{"partition":"api-portal-client","category":"stub-return","severity":"P1","file":"src/app/api/client-reports/route.ts","line":42,"evidence":"return NextResponse.json({ reports: [] })","golden_path_step":8,"claim_violated":"client reports surface real data","expected":"...","done_when":"concrete testable criterion","completion_hint":"...","owner_domain":"blake","confidence":"high"}
```
Required: `partition, category, severity, file, line, evidence, expected, done_when, confidence`. `golden_path_step`/`claim_violated` expected on P0/P1. `owner_domain`: "blake" (default) or "angelo".
Categories (§5): `marker, stub-return, missing-impl, contract-break, type-hole, validation, error-handling, integration-gap, schema-drift, test-gap, config-gap, tenancy-breach, scope-gap`.

## Two-pass method (§7) — never file a Pass-1 hit without a Pass-2 read
Pass 1 = mechanical candidates (`rg` for markers/stubs/type-holes/dead-UI/env). Pass 2 = read enough surrounding code to assign `incomplete` (→ file it), `intentional-deferred` (→ drop, note in a `context` line), or `false-positive` (→ drop). Only `incomplete` becomes a finding. Apply the §11 gate: real evidence, a concrete `done_when`, in-scope, verdict=incomplete. If you can't state `done_when`, you don't understand it well enough to file it.

## Workflow per agent
1. Read this file + your task (bs-mail) + PREALPHA_AUDIT.md methodology sections.
2. For each partition you own: run Pass 1, then Pass 2, write findings to `audit/findings/<partition>.jsonl` (append-only; you are the sole owner of that file). Write a one-line `audit/claims/<partition>/done` marker (`mkdir -p audit/claims/<partition>` then write owner+timestamp) when finished.
3. Commit your findings file(s) incrementally (`git add audit/findings/<partition>.jsonl && git commit`), small atomic commits.
4. Send `--type worker_done` to Coordinator 1 with: partitions done, finding counts by severity, golden-path/tenancy notes.
**Reviewers:** verify each finding in your assigned partitions against the §11 gate. Write a verdict object per finding to `audit/review/<partition>.jsonl` (you own that file): `{"file","line","category","verdict":"keep|drop|downgrade|upgrade","new_severity?","reason"}`. Then `--type worker_done` to Coordinator 1.
Coordinator merges → `audit/BACKLOG.json` + `audit/BACKLOG.md` + `audit/COVERAGE.md`.

## Coverage rule
Every `.ts`/`.tsx` under `src/` must fall in exactly one exclusive partition. If you find files in your globs that look unowned, report them to Coordinator 1 — do not silently skip.
