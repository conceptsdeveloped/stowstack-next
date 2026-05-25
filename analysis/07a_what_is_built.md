# Phase 7a — What Is Built (OBSERVED)

This document catalogs every capability that has been verified end-to-end in working code through Phases 1–6. Each capability lists the code paths traced, what was confirmed, production-readiness indicators, and known caveats. Only OBSERVED claims appear here; STATED, INFERRED, and UNKNOWN claims are in Phase 7b.

## 7a.1 Demand-Generation Capabilities

### B1: Two-tier AI-generated facility audit pipeline

**Capability.** Generate a self-storage facility audit using Anthropic Claude, grounded in either a 5-field intake (light path) or a 40+ field operator survey (deep path). Produce a shareable URL (`/audit/[slug]`), expire it after 90 days, and email the operator and the admin.

**Code paths.**
- Light path: `src/app/audit-tool/page.tsx` (form), `src/app/api/audit-form/route.ts:12-108` (intake), `src/app/api/audit-generate/route.ts:292-477` (Anthropic Sonnet 4 + Google Places).
- Deep path: `src/app/diagnostic/page.tsx` (form), `src/app/api/diagnostic-intake/route.ts` (intake), `src/app/api/audit-generate-diagnostic/route.ts:866-1157` (Anthropic Sonnet 4 with 100+ field prompt), `src/app/api/audit-generate-diagnostic/route.ts:982-995` (write to `shared_audits`).
- Real-time streaming variant: `src/app/api/diagnostic-analyze/route.ts` (Haiku 4.5 streaming).
- Shared view: `src/app/audit/[slug]/page.tsx` (public read), `src/app/api/audit-load/route.ts` (increment views + hot-lead alert at 3).
- Admin approval: `src/app/api/audit-approve/route.ts` (drip enrollment + welcome email).

**Confirmed by tracing.** Both paths fully implemented. The `shared_audits` row is created (`slug` is unique and used in URL). The view counter increments correctly. The hot-lead-at-3-views alert fires once (gated by `currentViews + 1 >= 3 && currentViews < 3`). Anthropic API calls succeed when the API key is set. Resend emails fire fire-and-forget. Cal.com booking webhook is wired up and updates `pipeline_status` correctly.

**Production-readiness.** Production. Per Phase 1, the audit funnel is the demand source. Per Phase 5 Subsystem 1, both paths terminate in a sales-call-ready output.

**Known caveats.**
- The two parallel pipelines are not consolidated. Maintenance burden over time.
- The light path uses crude bucket midpoints; the deep path uses finer-grained ones. Reports from the two paths are not directly comparable.

### B2: UTM short-link redirect with click-count tracking

**Capability.** Generate trackable short URLs of the form `https://storageads.com/r?c=<short_code>`, persist click counts and last-clicked timestamp, and 302-redirect to the destination landing page with UTM params appended.

**Code paths.**
- Generation: `src/app/api/utm-links/route.ts` POST. Random 8-char hex code; unique constraint enforced.
- Redirect: `src/app/api/r/route.ts:6-57`. SQL UPDATE with RETURNING; lookup of `landing_pages.slug` if landing page is linked.

**Confirmed by tracing.** The route writes idempotently to `utm_links.click_count` and `last_clicked_at`. 302 redirect carries UTMs. Failed lookups silently redirect to `storageads.com`.

**Caveats.** Click IDs (`fbclid`, `gclid`) are not preserved at the `/api/r` redirect step — they only survive if the ad platform appends them directly to the inbound URL. The redirect generates a new URL with only the UTMs from the DB; any `fbclid`/`gclid` query params on the inbound URL are dropped unless the browser re-appends. In practice Meta and Google preserve these via their own redirect chains.

### B3: Behavioral lead capture with heuristic scoring

**Capability.** Track form-state evolution and behavioral signals across multiple POST events per session. Compute a lead score (0–100) from fields completed, time on page, scroll depth, contact info presence, and exit intent. Persist as `partial_leads` row keyed by `session_id`.

**Code paths.**
- Score formula: `src/app/api/partial-lead/route.ts:17-55`.
- Upsert: `src/app/api/partial-lead/route.ts:152-256`, raw SQL `INSERT ... ON CONFLICT (session_id) DO UPDATE` with COALESCE / GREATEST / OR logic to merge incremental updates correctly.
- IP hashing: `src/app/api/partial-lead/route.ts:8-15`, SHA-256 with `IP_SALT`, truncated to 16 chars.
- Recovery state: `recovery_status` field, `next_recovery_at` timestamp.

**Confirmed by tracing.** Multiple POSTs to the same `session_id` correctly merge. Field values use COALESCE (never overwrite with NULL). Behavioral metrics use GREATEST (monotonic). Score uses GREATEST (never decrement). `recovery_status` transitions correctly from `'no_email'` to `'pending'` when email first arrives.

**Production-readiness.** Production. The route is rate-limited; CSRF is handled by middleware.

**Caveats.** No cron currently transitions `recovery_status` from `'in_recovery'` to `'exhausted'` after N recovery sends. Phase 7b logs this.

### B4: Landing pages from DB-stored section configs

**Capability.** Serve landing pages at `/lp/[slug]` from data in `landing_pages` + `landing_page_sections` tables. Sections are typed (`section_type`) and have JSON `config`. The page renders each section in sort order.

**Code paths.**
- Page: `src/app/lp/[slug]/page.tsx`.
- Schema: `prisma/schema.prisma:1012-1048` (`landing_pages` and `landing_page_sections`).

**Confirmed by structure.** Schema and route structure verified. Section editor is at `src/components/admin/facility-tabs/lp-section-editor/`.

**Caveats.** Section-type rendering quality not exhaustively verified.

### B5: Walk-in attribution capture via QR code

**Capability.** A walk-in tenant scans a QR code at the office; the form (`/walkin/[code]`) collects source, online-ad-saw flag, tenant name, unit rented, logged-by. Persisted to `activity_log`.

**Code paths.**
- Page: `src/app/walkin/[code]/page.tsx`.
- API: `src/app/api/walkin-attribution/route.ts:10-63`.

**Confirmed by tracing.** Access-code-based facility lookup. Activity log entry with `type: 'walkin_attribution'`. Rate-limited per IP.

**Caveats.** No tenant record is created from the walk-in attribution row; this is a counter, not a join key. No automated forwarding to Meta CAPI or Google Conversion (would be desirable to fire a CAPI `Lead` event for these walk-ins).

### B6: Inbound call tracking via Twilio

**Capability.** Twilio tracking numbers route calls to the facility's actual line while logging call duration, caller location, outcome, and `campaign_source` to `call_logs`.

**Code paths.**
- Schema: `call_tracking_numbers`, `call_logs` models.
- Webhook: `src/app/api/call-webhook/route.ts`.
- Read: `src/app/api/call-logs/route.ts`, `src/app/api/call-tracking/route.ts`.

**Confirmed by Phase 3 agent.** `ON CONFLICT (twilio_call_sid) DO NOTHING` idempotency. Call count and total duration aggregates on the tracking-number row.

**Caveats.** Twilio webhook signature is *not verified* in the handler. Only rate limiting protects the endpoint.

## 7a.2 Attribution and Server-Side Conversion Capabilities

### C1: Meta Conversions API forwarding

**Capability.** Forward conversion events server-side to Meta's Graph API at `https://graph.facebook.com/v21.0/${pixelId}/events`. Hash PII (email, phone, names, location) with SHA-256. Map internal event names to Meta's standard events (`reservation_started → InitiateCheckout`, `move_in_completed → Purchase`, etc.). Pass through `fbc`/`fbp` cookies unhashed.

**Code paths.** `src/app/api/meta-capi/route.ts:12-279`.

**Confirmed by tracing.** Hashing function correct (lowercase + trim + SHA-256). Event-name mapping table covers the 6 event types. POST to Meta with `{ data: [event], access_token }`. Validates required fields (event_name + user_data with at least one identifier).

**Production-readiness.** Production.

**Caveats.** Local DB has no record of forwarded events. If Meta's response is not parsed correctly, the forwarding is "blind" to the local system. The `event_id` is accepted from caller for Meta-side deduplication.

### C2: Google Ads Enhanced Conversions forwarding

**Capability.** Forward conversion events to Google Adservices Conversion API. Hash PII with SHA-256 (per Enhanced Conversions). Map event names. Use the `gclid` as the click match.

**Code paths.** `src/app/api/google-conversion/route.ts:12-229`.

**Confirmed by tracing.** Hashing per Google's Enhanced Conversions spec (single-element string arrays). Event mapping correct. GET to `googleadservices.com/pagead/conversion/...` with label, value, currency, gclid.

**Caveats.** No explicit `event_id` mechanism — Google deduplicates on `gclid` + timing. No local DB record. The choice to use the older URL-param-based conversion API rather than the newer JSON Enhanced Conversions API is a simplification that limits some matching modes.

### C3: Campaign-level attribution reporting

**Capability.** Compute cost per lead, cost per move-in, ROAS, and impressions/clicks/leads/move-ins per campaign and per month over a date range. Surface via `/api/attribution` GET. Used in admin dashboards and client reports.

**Code paths.** `src/app/api/attribution/route.ts:18-186`. Uses parameterized SQL (`Prisma.sql` tagged template) with a `FULL OUTER JOIN` of `campaign_spend` and `partial_leads` on `utm_campaign`.

**Confirmed by tracing.** SQL produces correct aggregates. Filter on `partial_leads.lead_status NOT IN ('partial', 'lost')` for the lead count, and `lead_status = 'moved_in'` for the move-in count. ROAS is annualized at ×12.

**Caveats.** The join is by `utm_campaign` string — not by per-lead per-click identifiers. The move-in count depends on someone (admin or external API) having transitioned `partial_leads.lead_status` to `'moved_in'`. Without that transition, the move-in count is 0 regardless of how many storEDGE `move_in.completed` webhooks fired.

### C4: storEDGE webhook reception with HMAC verification and idempotency

**Capability.** Receive `reservation.created`, `reservation.cancelled`, `move_in.completed`, `move_in.cancelled` events from storEDGE. Verify HMAC-SHA256 signature. Idempotency via `webhook_id` lookup in `activity_log` meta. Log to `activity_log` with type `storedge_webhook`. For `move_in.completed` with tracking_params, log a second row of type `attributed_move_in`.

**Code paths.** `src/app/api/webhooks/storedge/route.ts:14-145`.

**Confirmed by tracing.** Signature verification with `timingSafeEqual`. Idempotency check via Postgres JSONB path query on `activity_log.meta.webhook_id`. Activity_log rows created with full payload data.

**Caveats.** The handler does *not* update `partial_leads`. The chain from move-in event to lead-status transition is manual (Phase 4 critical observation). The idempotency check is a read-then-write, not constraint-enforced — concurrent retries from two replicas could both pass.

### C5: PII hashing for server-side ad platforms

**Capability.** SHA-256 hashing of PII fields (email lowercase+trimmed, phone digits-only, names, location) before forwarding to Meta or Google. Pass through technical identifiers (`fbc`, `fbp`, `gclid`, IP, UA) unhashed.

**Code paths.** Identical hashing logic in `meta-capi/route.ts:12-54` and `google-conversion/route.ts:12-83`.

**Confirmed by tracing.** Hashing meets platform requirements. PII never leaves the system in plaintext to either Meta or Google.

## 7a.3 Operational Intelligence Capabilities

### O1: Occupancy intelligence and forecasting

**Capability.** Aggregate occupancy data from uploaded PMS reports; produce seasonal forecasts; surface dashboards.

**Code paths.** `src/app/api/occupancy-forecast/route.ts`, `src/app/api/occupancy-intelligence/route.ts`. Reads `facility_pms_snapshots`, `facility_pms_units`.

**Confirmed by Phase 3 agent.** Routes implement read-side aggregation. Recommendations based on occupancy thresholds (e.g., "pricing power... implement ECRI on long-tenure tenants" at certain occupancy ranges).

**Caveats.** Depends on uploaded PMS data. No PMS data = no forecast.

### O2: Churn risk prediction

**Capability.** Score per-tenant churn risk using factors: tenure (shorter = higher risk), days_delinquent, late-payment history count, lease-end proximity, autopay status. Persist to `churn_predictions` with `risk_score` (Int), `risk_level` (String), `predicted_vacate` (Date), `factors` (JSON), `recommended_actions` (JSON).

**Code paths.** `src/app/api/churn-predictions/route.ts:40-130`.

**Confirmed by tracing.** Scoring formula encoded in code. Persistence via Prisma upsert on `tenant_id`.

**Caveats.** No backtesting evident in code — the scoring weights are heuristic, not learned. A learned model (logistic regression on historical move-out data) would likely outperform.

### O3: ECRI candidate identification and revenue lift projection

**Capability.** Flag tenants paying below 80% of street rate for 180+ days as ECRI candidates. Compute suggested rate at 80% of variance recovery and projected revenue lift. Persist to `facility_pms_tenant_rates.ecri_flag`, `ecri_suggested`, `ecri_revenue_lift`.

**Code paths.** `src/app/api/storedge-import/route.ts:96-142`.

**Confirmed by tracing.** Eligibility logic encoded. UI surfaces in `src/components/admin/facility-tabs/revenue-analytics/revenue-loss-analysis.tsx`.

### O4: Move-out remarketing with win-back attribution

**Capability.** Enroll moved-out tenants in 5-step remarketing sequence. Track opens, clicks, conversions. If a remarketed ex-tenant signs a new lease, link the new tenant ID to the moveout campaign for win-back attribution.

**Code paths.** `src/app/api/moveout-remarketing/route.ts`, cron `process-nurture`, schema `moveout_remarketing.new_tenant_id`.

**Confirmed by tracing.** Schema-encoded win-back link is unusual — generic remarketing systems do not track win-backs.

### O5: Market intelligence scraping (SpareFoot + SelfStorage.com)

**Capability.** Scrape competitor facility names, addresses, unit sizes, prices from SpareFoot's city listing pages. Cache results in `facility_market_intel`.

**Code paths.** `src/lib/aggregator-scrape.ts:32-...`, `src/app/api/market-intel/route.ts`.

**Confirmed by tracing.** Cheerio-based HTML parsing. User-Agent header set. AbortSignal.timeout(10000) for graceful timeouts. Returns empty array on failure rather than throwing.

**Caveats.** Scraping is by structural heuristics (class names containing "facility", "listing", "price", etc.) — vulnerable to HTML structure changes on SpareFoot's side.

### O6: Google Business Profile sync, AI-drafted responses, publish

**Capability.** OAuth to facility's GBP. Sync reviews, Q&A, insights. Use Anthropic Sonnet 4 to draft contextual responses by tone (friendly/professional/casual). Operator approves; system publishes back to Google.

**Code paths.** 6 routes in `src/app/api/gbp-*`, cron `process-gbp`, 6 schema models in `gbp_*`.

**Confirmed by Phase 3 agent.** Token refresh handled within 30 minutes of expiry. AI draft generation uses facility context. Auto-respond off by default; auto-post off by default.

### O7: PMS report upload (manual queue) with storEDGE-specific structured import

**Capability.** Accept PDF, CSV, Excel file uploads to Vercel Blob. Queue for admin processing. For storEDGE specifically, parse 7 report types (consolidated_occupancy, rent_roll, rent_rates_by_tenant, aging, annual_revenue, length_of_stay, move_in_kpi) into 9 `facility_pms_*` tables via transactional writes.

**Code paths.** `src/app/api/portal-upload/route.ts`, `src/app/api/pms-upload/route.ts`, `src/app/api/admin-pms-queue/route.ts`, `src/app/api/storedge-import/route.ts`, `src/lib/pms-column-mapper.ts`.

**Caveats.** Phase 1 — manual. No automated PDF extraction. No SiteLink / Yardi / ESS / Domico / Tenant Inc import.

## 7a.4 Sequence Engine Capabilities

### S1: B2B post-audit drip sequence

**Capability.** Enroll a facility in a `post_audit` drip sequence after audit approval. Send emails at day 2, day 5, day 9. Persist state in `drip_sequences` (one row per facility). Daily cron advances next step.

**Code paths.** `/api/audit-approve/route.ts` (enrollment), `/api/cron/process-drips/route.ts` (advancement), `src/lib/drip-email-templates.ts` (templates).

**Confirmed by Phase 3 agent.** Cron uses cursor pagination. Templates hardcoded in lib.

### S2: B2C consumer nurture sequence

**Capability.** Enroll a `partial_lead` or `tenant` in a nurture sequence triggered by status. Multi-step (channel: email/SMS) with per-step delays. Daily cron advances.

**Code paths.** `/api/nurture-sequences/route.ts`, `/api/cron/process-nurture/route.ts`, models `nurture_sequences`, `nurture_enrollments`, `nurture_messages`.

**Confirmed by Phase 3 agent.** SMS via Twilio (per cron's mention of `/api/sms-send`). Send-window check for SMS.

### S3: Partial-lead recovery sequence

**Capability.** Daily cron finds `partial_leads` with `recovery_status='pending'` and `next_recovery_at < NOW()`. Send recovery email via Resend. Advance `recovery_sent_count` and `next_recovery_at`. Hot-lead alert to admin.

**Code paths.** `/api/cron/process-recovery/route.ts`.

**Confirmed by Phase 3 agent.** 50 leads per batch, fire-and-forget hot-lead alerts.

### S4: Tenant retention campaign

**Capability.** Enroll tenants flagged by `churn_predictions.risk_level = 'high'` (or above threshold) in retention sequences. Track outreach via `tenant_communications`. Update `retention_campaigns.retained_count` on save.

**Code paths.** `retention_campaigns` model, `churn_predictions.retention_campaign_id` link, cron `process-nurture` (covers both consumer and tenant nurture).

**Confirmed by schema and routes.** End-to-end enrollment-to-outcome tracking exists in the schema.

## 7a.5 Multi-Tenant Platform Capabilities

### P1: Organization-scoped tenancy with white-label support

**Capability.** Multiple organizations share the platform. Each organization owns multiple facilities. Organizations have configurable `logo_url`, `primary_color`, `accent_color`, `custom_domain`, and `white_label` boolean.

**Code paths.** `organizations` model, `org_users`, `sessions`, `/api/organizations/route.ts`, partner shell rendering.

**Confirmed by tracing.** Partner dashboard renders with org-specific branding pulled from session.organization.

### P2: Stripe-based subscription billing with plan-based limits

**Capability.** Three subscription tiers (Launch/Growth/Portfolio via env-configured Stripe price IDs). Facility limit per tier (10/50/999). 14-day trial. Stripe webhook handles checkout completion (atomically creates org + admin user + activity log), subscription updates, cancellations, payment failures, payment succeeded events.

**Code paths.** `src/app/api/stripe-webhook/route.ts:1-200` with test file `__tests__/route.test.ts`. `src/app/api/create-checkout-session/route.ts`, `/api/create-billing-portal`.

**Confirmed by Phase 3 agent.** Transactional org provisioning on checkout. Idempotency on customer ID check.

### P3: External v1 API with scoped API keys, rate limits, usage logging

**Capability.** Partner organizations can integrate the platform's data via 12 v1 REST endpoints. SHA-256-hashed `sk_live_*` API keys with 9 scope classes. 60 req/min rate limit per key. Usage logged to `api_usage_log`. Outbound webhook subscriptions emit 6 event types signed with HMAC-SHA256.

**Code paths.** `src/lib/v1-auth.ts:38-128`, 12 routes under `src/app/api/v1/`, models `api_keys`, `api_usage_log`, `webhooks`, `webhook_deliveries`.

**Confirmed by Phase 3 agent.** Production-ready except `/api/v1/landing-pages` which is read-only.

### P4: Four-system authentication

**Capability.** The platform authenticates four distinct user classes:
- Anonymous public for the audit funnel, lead capture, walk-in attribution.
- Admins via `X-Admin-Key` header (two flavors: shared `ADMIN_SECRET` and per-admin `sa_adm_*` keys).
- Paying clients via email + 16-char access code (with optional 8-char one-time code for email-based magic-code flow).
- Partner organization users via email + password + org slug + `ss_*` session token (30-day expiry, scrypt-hashed passwords, optional TOTP 2FA with 10 backup codes).

**Code paths.** `src/lib/api-helpers.ts`, `src/lib/session-auth.ts`, `src/lib/v1-auth.ts`, `src/lib/admin-keys.ts`, `src/middleware.ts`.

**Confirmed by tracing.** Each auth system has its own helper function and verification path. Sessions hashed in database; tokens never stored plaintext.

### P5: Revenue-share for partner organizations

**Capability.** Partners refer facilities; the platform pays them a configurable percentage of the facility's MRR. Lineage tracked in `rev_share_referrals`. Monthly payouts logged in `rev_share_payouts` with unique constraint on `(organization_id, month)`.

**Code paths.** Schema models in Cluster R; admin UI at `/partner/revenue`.

**Confirmed by schema.** Operationalization (actual payout execution) is admin-driven; no cron job pays out.

## 7a.6 Engineering and Operations Capabilities

### G1: 13-cron operational hygiene + sequence advancement

**Capability.** 13 scheduled jobs covering session cleanup, organization grace-period deletion, data retention, page-stats aggregation, audience sync, weekly digest, monthly reports, review solicitation, GBP sync, drip / nurture / recovery advancement, and campaign alerts. All use `verifyCronSecret` and admin failure alerts via Resend.

**Code paths.** 13 routes under `src/app/api/cron/`, `src/lib/cron-auth.ts`, `src/lib/cron-runner.ts`.

**Confirmed by Phase 3 agent.** Three batching patterns recur (cursor, time-budget, chunked delete). Three jobs use explicit transactions for state safety.

### G2: Sentry observability with auth-header scrubbing

**Capability.** Every request is tagged with route and method. Errors are captured. Before-send hook strips `authorization`, `cookie`, `x-admin-key`, `x-org-token` from outgoing events. Replay on error enabled on client. 10% traces sample rate.

**Code paths.** `sentry.server.config.ts:11-19`, `sentry.client.config.ts`, `sentry.edge.config.ts`, instrumented in middleware (`src/middleware.ts:90-91`).

**Confirmed by tracing.** Configuration files are correctly structured.

### G3: Rate limiting with tiered quotas

**Capability.** Multi-tier rate limits applied per route. Tiers: `PUBLIC_READ`, `PUBLIC_WRITE`, `AUTHENTICATED`, `EXPENSIVE_API`, `EXPENSIVE_API_HOURLY`, `WEBHOOK`. Stored in Upstash Redis. Fail-open on Redis unavailability.

**Code paths.** `src/lib/rate-limit.ts`, `src/lib/rate-limit-tiers.ts`, `src/lib/with-rate-limit.ts`.

**Confirmed by tracing.** Applied across most routes.

### G4: CSRF protection on state-changing API requests

**Capability.** Double-submit token: cookie `__csrf_token` + header `x-csrf-token`. 32-byte hex. Constant-time comparison. Exempt: webhook routes, cron, v1 API, requests with `x-admin-key`, `Authorization: Bearer`, or `x-org-token`.

**Code paths.** `src/lib/csrf.ts`, `src/middleware.ts:94-107`.

**Confirmed by tracing.** Web Crypto API used (edge-runtime compatible per recent commit).

### G5: Soft-delete with cron-driven hard-delete

**Capability.** Five models (`facilities`, `clients`, `organizations`, `tenants`, `partial_leads`) have `deleted_at`. Organizations soft-deleted via PATCH transition to `pending_deletion` status; the `cleanup-organizations` cron hard-deletes them past a grace period (cancelling Stripe subscriptions first).

**Code paths.** Soft-delete fields in schema; `src/lib/soft-delete.ts`; cron `cleanup-organizations`.

**Confirmed by schema and routes.** The grace-period mechanism is correctly implemented.

### G6: Per-admin API keys (migrating away from shared secret)

**Capability.** Per-admin keys prefixed `sa_adm_*`, hashed in `admin_keys` table, scope-controlled, last-used tracked, revocable, expirable. Coexists with legacy shared `ADMIN_SECRET`.

**Code paths.** `src/app/api/admin-keys/route.ts`, `src/lib/admin-keys.ts`, `src/lib/api-helpers.ts:86-106`.

**Confirmed by tracing.** Migration commit `5cb290e` touched 70 files implementing the transition.

### G7: Structured error logging via Sentry

**Capability.** Per commit `1fd0a8e` (`fix: 11 add structured error logging with Sentry integration`) and `81ec3d3` (`fix: 12 enrich Sentry with route context, header scrubbing, and noise filtering`), the codebase has been hardened to emit structured errors to Sentry consistently.

**Code paths.** `src/lib/logger.ts`, middleware Sentry tagging.

**Confirmed by tracing.** Logger module exists and is imported in cron jobs and key routes.

### G8: Env-var validation at startup

**Capability.** `validateEnv()` in `src/lib/env-check.ts` runs in `instrumentation.ts:5`. Warns about missing feature-level env vars at startup. Per commit `0014b86` (`fix: 13 expand env var validation with feature-level warnings`).

**Code paths.** `src/lib/env-check.ts`, `src/instrumentation.ts:4-5`.

**Confirmed by tracing.** Loaded at process startup.

### G9: Data retention for unbounded log tables

**Capability.** Daily cron trims `activity_log` (90d), `api_usage_log` (30d), `betapad_notes` (90d) via 1000-row batched DELETE.

**Code paths.** `src/app/api/cron/data-retention/route.ts`. Per commit `fb05ff4`.

**Confirmed by Phase 3 agent.** Batched deletes prevent long-held locks.

### G10: Web Push notifications + PWA registration

**Capability.** Service worker registered in root layout. VAPID keys configured. `push_subscriptions` table holds endpoint + p256dh + auth triples. `/api/push-subscribe`, `/api/push-send`, `/api/push-vapid-key` routes implement the standard Web Push protocol.

**Code paths.** `src/app/layout.tsx:135-145`, push routes, schema model.

**Confirmed by code inspection.** PWA infrastructure is wired.

## 7a.7 AI Generation Capabilities

### A1: Audit generation (Anthropic Sonnet 4 with operator-aware prompt)

Covered in B1.

### A2: Ad creative generation (Anthropic Sonnet 4 for copy, Haiku 4.5 for prompt enhancement, FAL.ai Flux for images, Wan for videos)

**Capability.** Generate Meta-format ad copy in 4 angles (social_proof, convenience, urgency, lifestyle) using Haiku 4.5. Generate AI images from 10 facility-specific templates using FAL.ai Flux with Haiku-enhanced prompts. Generate B-roll videos from 6 templates using FAL.ai Wan-i2v/Wan-t2v.

**Code paths.** `src/app/api/generate-copy/route.ts`, `/api/generate-image/route.ts`, `/api/generate-video/route.ts`.

**Production-readiness.** Production but Angelo's domain — per CLAUDE.md not to be modified without coordination.

### A3: Social content batch generation

**Capability.** Generate batches of 10+ social posts across platforms (Facebook, Instagram, GBP) with mixed types (promotion, tip, seasonal, community, testimonial). Persist as `social_posts` drafts.

**Code paths.** `src/app/api/generate-social-content/route.ts`.

**Confirmed by Phase 3 agent.**

### A4: AI-drafted GBP responses

**Capability.** Generate contextual review replies and Q&A answers using Anthropic Sonnet 4, conditioned on facility name and review sentiment, with tone customization via `gbp_review_settings`.

Covered in O6.

### A5: Marketing plan generation

**Capability.** Generate comprehensive 4-week marketing plan with tab directives, target audiences (2-3), messaging pillars (3), channel strategy, content calendar, KPIs, 90-day projections.

**Code paths.** `src/app/api/marketing-plan/route.ts`. Anthropic Sonnet 4 with max_tokens 8192.

### A6: Website scraping for landing-page assets

**Capability.** Cheerio-based scrape of facility's current website: contact info, hours, address, images.

**Code paths.** `src/lib/scrape-website.ts`, `src/app/api/scrape-website/route.ts`.

## 7a.8 Customer-Facing Surfaces

### S1: Client portal with read-mostly visibility

Covered in Phase 5 Subsystem 3.

### S2: Partner dashboard with team and webhook management

Covered in Phase 5 Subsystem 4.

### S3: Admin shell with 16-tab facility manager

Covered in Phase 5 Subsystem 2.

## 7a.9 Compliance and Privacy Capabilities

### CP1: Meta data-deletion callback

**Capability.** Receive Meta's signed_request data-deletion callback, parse, log to `data_deletion_requests` with `source: 'meta_callback'`, return URL + confirmation code as Meta requires.

**Code paths.** `src/app/api/data-deletion/meta-callback/route.ts`.

**Confirmed by Phase 3 agent.**

### CP2: User-initiated data deletion with admin execution

**Capability.** User-facing `/data-deletion` page. Email-driven request capture. Admin-executed bulk deletion from 7+ related tables (clients, tenants, partial_leads, org_users, etc.) with status tracking and email confirmations.

**Code paths.** `src/app/api/data-deletion/route.ts`.

**Confirmed by Phase 3 agent.**

### CP3: IP hashing with salt

**Capability.** `partial_leads.ip_hash` stores SHA-256(IP + IP_SALT) truncated to 16 chars. No raw IP persisted.

**Code paths.** `src/app/api/partial-lead/route.ts:8-15`.

**Confirmed.**

### CP4: Sentry header scrubbing

Covered in G2.

## 7a.10 Summary

The OBSERVED list is substantial. The platform genuinely:
- Generates AI audits for both light and deep funnels
- Tracks clicks via UTM short links
- Captures lead state via heuristic-scored partial leads
- Forwards conversion events server-side to Meta and Google
- Receives storEDGE move-in webhooks with HMAC verification and idempotency
- Computes campaign-level cost-per-move-in and ROAS
- Predicts tenant churn and identifies ECRI candidates
- Manages four parallel sequence engines (drips, nurture, recovery, retention)
- Operates a 12-route external API with scoped keys and outbound webhooks
- Runs 13 scheduled cron jobs with batching, transactions, and failure alerts
- Implements four distinct authentication systems
- Serves white-label partner dashboards with revenue sharing
- Generates AI-drafted GBP responses

The OBSERVED list is also bounded. The system *captures the move-in signal* but does not *automatically close the click-to-move-in attribution loop* (the spine's critical finding from Phase 4). The system *imports storEDGE data structurally* but does not *integrate with other PMS systems*. The system *runs sequence engines* but has *four parallel engines that have not been consolidated*. Phase 7b documents these and other limitations.
