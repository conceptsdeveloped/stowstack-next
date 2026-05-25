# Phase 7b — What Is Not Built (or Built Differently)

This file is the credibility backbone of the paper. Every weakness named here is a weakness the paper preempts rather than concedes under reviewer questioning. The categories follow the Phase 0 taxonomy: stated-but-unverified, partial, orphaned, contradicted, missing-but-expected, aspirational.

## 7b.1 Stated but Unverified

Claims in CLAUDE.md, README, or marketing copy that have not been verified end-to-end in code.

### U1: "Twilio is not set up yet" — but the schema and SDK are present

CLAUDE.md states "Not set up yet" for Twilio. The schema has `call_logs` with `twilio_call_sid` (unique) and `call_tracking_numbers` with `twilio_sid` (unique); the `twilio@^5.13.0` SDK is in `package.json:38`; env vars `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_FROM_NUMBER` are in `.env.example:58-63`; the `/api/call-webhook` route handles Twilio callbacks; the `process-nurture` cron sends SMS via Twilio.

The verification gap: whether Twilio is *operationally configured* with valid credentials and provisioned tracking numbers in production. The code path exists end-to-end; the question is whether anything has actually been billed to Twilio. Status: schema and code are present; production configuration unverified.

### U2: "Phase 1 (current): Manual upload of facility management reports — PDF, CSV, and Excel only. No API integrations yet"

Phase 3's PMS-ingest agent confirmed this. PDF support exists at the upload boundary (accepted MIME type, blob storage) but no extraction code. CSV support exists via the column-mapper helper. The storEDGE-specific import endpoint requires admin pre-parsing of CSVs into JSON before calling. Status: STATED is accurate.

### U3: "FAL.ai / Runway ML — Angelo's work — do not modify"

`/api/generate-image` and `/api/generate-video` import FAL.ai (confirmed by grep). Runway is in `.env.example` (`RUNWAY_API_KEY`) but the `runwayml` SDK is not in `package.json`; the routes use FAL for both video and image generation. So Runway integration may be aspirational or vestigial; FAL.ai is the live implementation.

### U4: Marketing copy: "Full-funnel marketing automation for self-storage facilities. Ads, landing pages, call tracking, and move-in attribution."

The "call tracking" portion is verified (Twilio webhook + call_logs). The "move-in attribution" portion is *partial* — see §7b.2 P1 below.

### U5: "Blog: Not live yet. File-based content in `/content/blog/` parsed by `src/lib/blog.ts`. Articles coming soon."

The `content/blog/` directory and `src/lib/blog.ts` exist; blog routes exist. Status: STATED is accurate that articles haven't been published yet.

## 7b.2 Partial — Built but Incomplete

Some pieces in place, integration incomplete. The team is mid-construction.

### P1: Click-to-move-in attribution chain (the critical partial)

**What is built.** Click capture (`utm_links.click_count`), behavioral lead tracking (`partial_leads` with fbclid/gclid/utm_*), server-side conversion forwarding (`/api/meta-capi`, `/api/google-conversion`), storEDGE move-in webhook reception (`/api/webhooks/storedge`), campaign-level attribution reporting (`/api/attribution`).

**What is missing.** The automated bridge from storEDGE `move_in.completed` event to `partial_leads.lead_status = 'moved_in'`. Without this transition, the `/api/attribution` move-in count stays at zero regardless of how many move-ins actually happened. The transition must currently be performed manually by an admin via `/api/consumer-leads` PATCH or externally via `/api/v1/leads` PATCH.

**Why it matters.** The system's central marketing claim — "move-in attribution" — relies on this chain closing automatically. The architectural commitment is sound; the operational closure is manual.

**What would close it.** A cron job (or webhook-side update) that scans `activity_log` rows of type `attributed_move_in` and matches them to `partial_leads` rows by (`facility_id`, `email`, `utm_campaign`) — then transitions the lead's `lead_status` and sets `monthly_revenue` from the webhook payload's `monthly_rate`. Approximately 50–100 LOC.

**Phase 4 traced this in detail; Phase 12 will name it in the Limitations section.**

### P2: PMS data ingest beyond storEDGE

**What is built.** Generic upload (PDF, CSV, Excel) with blob storage. storEDGE-specific structured import covering 7 report types.

**What is missing.** No SiteLink, no Yardi Self-Storage, no Easy Storage Solutions, no Domico, no Tenant Inc. The schema is built generically (the 9 `facility_pms_*` tables don't presume storEDGE conventions) but only storEDGE has a parser. Operators on other PMS systems can upload files but cannot get structured data into the platform without admin manual conversion.

**What would close it.** Per-PMS parsers similar to the storEDGE one. Each is moderate work (a couple hundred LOC + report-format research). Or an AI-based parser using Anthropic to extract structured data from PDF/CSV uploads — more research-y, less deterministic, but potentially generalizable across all PMS report formats.

### P3: PDF extraction for uploaded reports

**What is built.** PDF MIME type accepted at upload; file stored in Vercel Blob.

**What is missing.** Any extraction logic. No PDF-to-text. No table parsing. No AI extraction. The PDF sits in blob storage until an admin downloads it, parses it locally, and re-uploads as CSV/JSON.

**What would close it.** Anthropic-based PDF extraction (Anthropic supports PDF input). Or `pdf-parse` for layout-preserved text. Or `tabula`-equivalent for table extraction. The Anthropic route is most consistent with the codebase's existing AI-first pattern.

### P4: Per-state lien notice timing

The `delinquency_escalations.stage` and `stage_entered_at` and `next_stage_at` fields encode a state machine, but no code currently advances stages on a schedule. The system *records* stage transitions but does not *trigger* them.

**What would close it.** Per-facility (or per-state) configurable notice intervals stored in a new `lien_workflow_configs` table; a cron job that scans `tenants.days_delinquent` and creates appropriate `delinquency_escalations` rows when stage thresholds are crossed.

### P5: Lead-to-Tenant Identity Linking

Schema does not include a `partial_leads.tenant_id` or `tenants.partial_lead_id` field. When a lead converts to a paying tenant (via storEDGE reservation → move-in), the two rows live in separate tables with no FK linking them.

**What would close it.** Add an optional `tenants.partial_lead_id` FK, and a process that sets it on tenant creation by matching email/phone. This closes the click → tenant chain at the row level rather than at the aggregate level.

### P6: External API write coverage

Of the 12 v1 routes, 5 are read-only (`call-logs`, `facility-availability`, `landing-pages`, `usage`, and the admin-only `api-keys`). The remaining 7 support writes. Coverage for write operations is uneven:
- `landing-pages` — read-only despite the model supporting full CRUD.
- `webhook_deliveries` — not exposed (only `webhooks` subscription management is).
- `tenant_payments` — exposed via the `tenants` route as "last 20 payments" read-only.

**What would close it.** Round out the read-write coverage and expose delivery history for webhook debugging.

### P7: Drip / nurture / retention / moveout sequence consolidation

Four parallel sequence engines (B2B drip, B2C nurture, retention, moveout remarketing) exist as separate routes, models, and crons. They share a state-machine-in-DB-advanced-by-daily-cron pattern but have not been consolidated into a single engine.

**What would close it.** A unified `sequences` table with `audience_type`, `trigger_type`, `steps` (JSON), `exit_conditions`. A unified `sequence_enrollments` table. A single cron that advances all enrollments. This is moderate work (refactor of ~600 LOC across 4 engines into ~400 LOC unified), with the benefit of consistent observability and ops.

### P8: Vercel Blob token rotation

`BLOB_READ_WRITE_TOKEN` is set as an env var. Per Phase 1, blob storage is used for PMS uploads, AI-generated images, video proxies. No token-rotation mechanism is evident in code.

**What would close it.** A scheduled rotation policy + admin notification + transparent re-keying.

### P9: Webhook delivery retries (outbound)

The outbound `webhooks` system records `failure_count` and `last_status`. The dispatch logic (per Phase 3 agent) does not retry failed deliveries. A partner whose endpoint is briefly down would miss events.

**What would close it.** A retry queue with exponential backoff, or a dead-letter table. Approximately 100 LOC.

### P10: Two parallel diagnostic pipelines (light + deep)

Per Phase 5 Subsystem 1, both `/audit-tool → /api/audit-generate` and `/diagnostic → /api/audit-generate-diagnostic` produce audits. They are not consolidated. Maintenance over time will require care.

**What would close it.** A unified `audit-generate` route accepting either input shape (5-field light or 40+ field deep). The current bifurcation may also be intentional — different funnels for different audiences — in which case the "issue" is documentation, not consolidation.

### P11: Two parallel CSP layers

Per Phase 1 §1.4, both `next.config.ts` (enforcing) and `src/middleware.ts` (report-only) define CSP directives, and they disagree. The middleware CSP is report-only and stricter; the next.config CSP is enforcing and more permissive.

**What would close it.** Choose one. The middleware-style report-only CSP could be promoted to enforcing after a soak period.

## 7b.3 Orphaned

Code exists but appears unused. Cites of absence.

### O1: `@supabase/ssr` and `@supabase/supabase-js` in dependencies

In `package.json:24-25` but no `import` from `@supabase/*` anywhere in `src/`. Probably a leftover from a pre-Neon iteration; possibly being held against a planned migration. Currently dead weight.

### O2: `Replicate` API token in env

`REPLICATE_API_TOKEN` in `.env.example:72` and `replicate.delivery` allowed in `next.config.ts:86`. No code calls Replicate API per Phase 3 grep. Probably aspirational or stale.

### O3: `Runway ML` API token in env

`RUNWAY_API_KEY` in `.env.example:69`. No `runwayml` package in `package.json`. The `/api/generate-video` route uses FAL.ai not Runway. Aspirational or stale.

### O4: `notifications` table alongside Redis-backed notifications

Per Phase 3 agent for Group D, in-app notifications are Redis-backed for real-time delivery. The `notifications` table exists in schema (`prisma/schema.prisma:1770-1785`) but its write paths are limited. Possibly underused.

### O5: `drip_sequence_templates` schema

The model exists (`prisma/schema.prisma:477-490`) but the drip templates are hardcoded in `src/lib/drip-email-templates.ts`. The DB-backed templates appear to be aspirational future configurability.

### O6: `style_references` table

The model exists with `analysis` JSON. A route exists (`/api/style-references`). Phase 5 includes it in the creative-generation cluster. Whether the analysis is consumed by the ad-image generation pipeline is unverified beyond the schema.

## 7b.4 Contradicted — Docs vs. Code Disagree

These are logged in `CONTRADICTIONS.md` and re-summarized here.

### C-LIST: Model count, schema length, cron count, route count

| Doc claim | Actual | Source |
|-----------|--------|--------|
| ~75 models | 89 | grep count vs CLAUDE.md |
| 1485 schema lines | 1815 | wc -l vs CLAUDE.md |
| 9 cron jobs | 13 | `vercel.json` vs CLAUDE.md |
| 118+ route directories | 190 | find count vs CLAUDE.md |
| No test framework | vitest + tests in src/test + 8 test files | code observation vs CLAUDE.md |
| Twilio not set up | Twilio SDK + schema + routes + cron usage | code observation vs CLAUDE.md |
| Never use icon libraries | `lucide-react@^0.577.0` in deps | code observation vs CLAUDE.md |

### CC-1: CSP layers contradict each other

Documented above (P11).

### CC-2: CLAUDE.md doesn't mention Supabase or PDF rendering deps

`@supabase/*` and `@react-pdf/renderer` are in deps but not in CLAUDE.md's integrations list.

## 7b.5 Missing but Expected

Capabilities a reader would reasonably expect given the system's apparent purpose but which are absent.

### M1: Automated reconciliation of move-in events into `partial_leads.lead_status`

Why expected: the system's central marketing claim is move-in attribution. Without this reconciliation, the claim is true at the campaign level only (Phase 4).

### M2: Per-state lien sale workflow automation

Why expected: self-storage operators spend significant time on lien-sale prep. A platform that owns the operational intelligence layer would automate at least the notice generation and timing. The schema permits it (`delinquency_escalations`) but the workflow code does not exist.

### M3: Military / SCRA protection handling

Why expected: federal law (Servicemembers Civil Relief Act) prohibits rate increases on active-duty military tenants. The codebase has no field for military status and no exemption logic in ECRI flagging. A platform automating ECRI without this is exposed.

### M4: Multi-facility tenant identity resolution

Why expected: large operators have tenants who rent at multiple facilities. The schema's per-facility `tenants` model would benefit from a cross-facility identity layer.

### M5: Vehicle vs. unit storage distinction in pricing

Why expected: vehicle and boat storage (parking spaces) have different sizing conventions and pricing structures. The codebase's free-form `unit_type` does not distinguish.

### M6: Tenant insurance vs. operator tenant-protection plan distinction

Why expected: these are legally distinct products. The codebase conflates them under "insurance."

### M7: Annual rate review cadence

Why expected: operators conduct annual reviews. The system records rate history but does not have a scheduled review cadence.

### M8: Discount stacking rules in `facility_pms_specials`

Why expected: operators have explicit rules for whether specials stack.

### M9: Production observability dashboards (cost, latency, error rate)

Why expected: a 15-day-old codebase using Anthropic, Resend, Sentry, etc. — operators want a single dashboard. Sentry handles errors; Anthropic has its own console; Resend has its own console. A consolidated "platform health" page does not exist in the codebase. The internal-tooling cluster (`/admin/changelog`, etc.) covers process tracking but not platform health.

### M10: Test coverage beyond 8 files

Why expected: the v1 API has three test files; the rest of the v1 API (9 routes) is untested. The cron jobs are untested. The spine routes (`/api/r`, `/api/partial-lead`, `/api/lead-capture`, `/api/attribution`, `/api/meta-capi`, `/api/google-conversion`, `/api/webhooks/storedge`) are untested. The audit pipeline is untested. The drip / nurture / recovery / retention cron logic is untested. For a system claiming "prove every dollar," the untested-attribution surface is the most consequential test gap.

### M11: Production attribution reconciliation backtests

Why expected: any attribution claim should be backtested against known outcomes. There is no evidence in the codebase of historical reconciliation logic or audit reports comparing the platform's CPL/CPM-I numbers to known ground truth (e.g., manual operator counts of move-ins).

### M12: Twilio webhook signature verification

Why expected: every other webhook in the codebase verifies its signature. Twilio is the exception. A spoofed call-status callback could insert false `call_logs` rows.

### M13: Outbound webhook delivery retry

Documented above (P9).

### M14: Background event log → conversion-forwarding bridge

Why expected: events captured locally (`/api/tracking/event`, `/api/walkin-attribution`) are not forwarded to Meta CAPI or Google Conversion. A walk-in scan is a high-quality conversion signal that ad platforms cannot otherwise know. The codebase captures it locally but does not forward.

## 7b.6 Aspirational

Mentioned in roadmaps, TODO comments, or future-planning docs.

### Asp1: Comprehensive PMS API integrations (SiteLink, Yardi, ESS, Domico, Tenant Inc)

Mentioned in CLAUDE.md as Phase 1 = manual upload only.

### Asp2: Aggressive scraping of Crexi, RentCafe

Mentioned in CLAUDE.md. SpareFoot is the only currently-coded aggregator scraper. Crexi, RentCafe, Yardi scraping are not in code.

### Asp3: The `tasks/` (remediation) directory roadmap

24 numbered task files (`00-INDEX` plus 01–23) under `storageads-remediation-tasks/`. Many have been executed (the commit log shows `fix: 07`, `fix: 10`, `fix: 11`, `fix: 12`, `fix: 13`, `fix: 14`, `fix: 15`, `fix: 16`, `fix: 17`, `fix: 20`, `fix: 21`, `fix: 22`, `fix: 23`). Tasks not yet executed (per missing fix-commits): `01-KILL-ACCEPT-DATA-LOSS`, `02-RATE-LIMIT-ALL-ROUTES`, `03-KILL-LEGACY-SESSION-TOKENS`, `04-CSRF-PROTECTION`, `05-TRANSACTION-SAFETY`, `06-CRON-UNBOUNDED-LOOP`, `08-KILL-QUERY-RAW-UNSAFE`, `09-MISSING-DB-INDEXES`, `18-UPSERT-RACE-CONDITIONS`, `19-PRISMA-CONNECTION-POOL`.

A few of these *appear* completed by inspection of the current state (the schema has indexes; raw-unsafe is ESLint-banned; CSRF is in middleware) — so they may be partially done with the explicit `fix:` commit not yet authored.

### Asp4: Marketing page copy regeneration

CLAUDE.md states: "Marketing site — Copy is draft — will be regenerated from brand identity/tone docs."

### Asp5: Admin layout/menu reorganization

CLAUDE.md states: "Admin layout/menu reorganization — separate ad creator, manager, publisher from facility overview; better tab/menu structure." The mega-component split (`fix: 15`) is a step toward this.

### Asp6: Feature completion across the platform

CLAUDE.md's third build priority.

## 7b.7 Summary of Limitations

**The single most consequential limitation:** the click-to-move-in attribution chain does not automatically close. The system *captures* the move-in event server-side via webhook; it *forwards* conversion events to Meta and Google server-side; it *reports* campaign-level attribution; but it does *not* automatically transition `partial_leads.lead_status` from `'converted'` to `'moved_in'` in response to the storEDGE webhook. The closure is manual. This single fact bounds every claim about move-in attribution: the system has the *architecture* for move-in attribution but the *operational closure* is admin-mediated. (P1, M1)

**The second most consequential:** PMS integration is one-vendor (storEDGE) at the structured-import level. Operators on other PMSs use the platform's intelligence features at greatly reduced fidelity. (P2)

**The third most consequential:** the four parallel sequence engines have not been consolidated, which will create maintenance friction. (P7)

**Compliance-flavored gaps:** military / SCRA handling, lien-sale automation, insurance/tenant-protection distinction. These are operator-knowledge gaps the platform has not yet closed. (M2, M3, M6)

**Security-flavored gaps:** Twilio webhook signature verification, outbound webhook retry. (M12, P9)

**Test-coverage gap:** the spine and the cron jobs are untested. (M10)

**Documentation drift:** CLAUDE.md is significantly stale (model count, schema size, cron count, route count, Twilio status, test framework). (C-LIST)

The honest paper notes all of these. The Limitations section of Phase 12 draws directly from this document. None of these limitations invalidate the architectural commitments the system has made; many of them are typical for a 15-day-old codebase in active development by a two-person team; some of them (the click-to-move-in closure, military protection, PMS expansion) are the visible boundary between "platform built for the thesis" and "platform fully executing the thesis."
