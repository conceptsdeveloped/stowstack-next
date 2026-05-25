# Phase 3 — API Surface Cartography

The API surface — what the system can be asked to do over HTTP — is the second-strongest source of evidence about the system after the data model. Where the schema answers *what the system can persist*, the API surface answers *what the system can be asked to do*. The gap between them — schema with no route, route with no persistence, route that exists but returns stubs — is a useful diagnostic.

## 3.1 Quantitative Baseline

| Quantity | Value |
|----------|-------|
| Total directories under `src/app/api/**` | 190 |
| Total `route.ts` files | 178 |
| External v1 API routes (under `/api/v1/`) | 12 |
| Cron routes (under `/api/cron/`) | 13 |
| Webhook handlers (under `/api/webhooks/` + standalone) | 5 |
| OAuth integration routes (under `/api/auth/`) | 5 |
| Test files alongside route handlers | 4 (in `__tests__` directories) |
| Distinct ESLint-banned `queryRawUnsafe`/`executeRawUnsafe` occurrences | 0 outside tests |

The route-to-model ratio is ~2:1 (178 routes against 89 models), which is reasonable for a SaaS where many models have full CRUD (read, write, list, delete) plus specialized actions (publish, sync, generate, approve).

## 3.2 Methodology

The full surface was catalogued in passes. The author read the spine endpoints — attribution (`/api/attribution`, `/api/meta-capi`, `/api/google-conversion`, `/api/walkin-attribution`, `/api/tracking/event`, `/api/tracking/visit`), audit-funnel (`/api/audit-form`, `/api/audit-generate`, `/api/audit-generate-diagnostic`) — directly in full. The remaining 169 route handlers were summarized by sub-agent passes, one per cluster: cron, v1 external API, webhooks, PMS ingest, lead capture, GBP, admin-key, AI generation, portal & partner, and a final pass for the remaining operational, internal-dev-tooling, and notification clusters. Citations name file paths and line ranges throughout.

## 3.3 Behavioral Clustering

The 178 routes self-cluster into 16 behavioral groups. Each route is in exactly one group. Group sizes are reported; the proportional distribution is itself a finding.

### Cluster I-1: Attribution Forwarders (6 routes — 3.4%)

| Route | Method | Auth | Behavior | LOC |
|-------|--------|------|----------|-----|
| `/api/attribution` (`src/app/api/attribution/route.ts`) | GET | Admin OR client access code | Joins `campaign_spend` × `partial_leads` by `utm_campaign` to compute CPL, cost-per-move-in, and ROAS per campaign and per month | 186 |
| `/api/meta-capi` (`src/app/api/meta-capi/route.ts`) | POST | Public (rate-limited webhook tier) | Hashes PII (SHA-256), maps event names (`reservation_started → InitiateCheckout`, `move_in_completed → Purchase`), forwards to `https://graph.facebook.com/v21.0/${pixelId}/events` | 279 |
| `/api/google-conversion` (`src/app/api/google-conversion/route.ts`) | POST | Public (rate-limited webhook tier) | Hashes PII, maps event names (`move_in_completed → purchase`), fires GET to `googleadservices.com/pagead/conversion/{id}/?label=...&value=...&gclid=...` | 229 |
| `/api/walkin-attribution` (`src/app/api/walkin-attribution/route.ts`) | POST | Public (access code) | Logs walk-in attribution event to `activity_log` with `source`, `sawOnlineAd`, `tenantName`, `unitRented` | 63 |
| `/api/tracking/event` (`src/app/api/tracking/event/route.ts`) | POST | Public (rate-limited) | Logs storEDGE embed events to `activity_log` with `type: storedge_${event.type}`; 100 KB payload cap | 68 |
| `/api/tracking/visit` (`src/app/api/tracking/visit/route.ts`) | POST | Public (rate-limited) | Logs landing-page visits to `activity_log` with `tracking_params`; 100 KB payload cap | 69 |

**Cluster behavior.** Three of the six forward events server-side to third parties (Meta CAPI, Google Ads, Resend in the reporting cron). The other three are *inbound* event logs that funnel into the `activity_log` table. The reporting endpoint (`/api/attribution`) is the only one that *reads* attribution data — it aggregates `campaign_spend` against `partial_leads.utm_campaign` to compute the cost-per-move-in metric the product advertises.

**Critical structural observation.** The attribution join is on `utm_campaign` (a string) — not on a click-ID chain (e.g., `fbclid` → `partial_leads.fbclid` → `tenants.fbclid` → reported back to Meta as a click match). The system *captures* `fbclid` and `gclid` (in `partial_leads`), and *forwards* `fbclid`/`fbp`/`fbc` to Meta CAPI, but the *reconciliation* of which click became which move-in is performed by matching campaign names. This is the same reconciliation method an ad agency would use with a spreadsheet — but performed at server-side speed against database tables.

### Cluster I-2: Audit Funnel Pipeline (10 routes — 5.6%)

| Route | Method | Auth | Behavior |
|-------|--------|------|----------|
| `/api/audit-form` | POST | Public | Creates `facilities` row with `pipeline_status: "submitted"`; sends admin notification email; returns `facilityId` (`src/app/api/audit-form/route.ts:12-108`) |
| `/api/audit-generate` | POST | Admin | Fetches Google Places data and competitors; calls Anthropic Sonnet 4 to generate audit JSON; transactional write to `audits`, `places_data`, `facilities`; emails admin (`src/app/api/audit-generate/route.ts:292-477`) |
| `/api/audit-generate-diagnostic` | POST | Admin | Parses CSV or JSON of full 40+ question diagnostic; calls Anthropic Sonnet 4 with 100+ field prompt; creates `shared_audits` + `audits`; emails operator AND admin (`src/app/api/audit-generate-diagnostic/route.ts:866-1157`) |
| `/api/audit-save` | POST | Admin | Creates `shared_audits` row directly (preview-mode save) |
| `/api/audit-load` | GET | Public | Reads `shared_audits` by slug; increments `views`; sends admin alert on first view and on 3+ views (hot-lead signal) |
| `/api/audit-report` | GET, POST | Admin | Cached audit report from `audit_report_cache`; deterministic scoring based on facility profile |
| `/api/audit-approve` | POST | Admin | Approves audit; creates `shared_audits` link; enrolls in `post_audit` drip sequence; emails lead |
| `/api/diagnostic-intake` | POST | Public | Stores full diagnostic submission; fire-and-forgets `audit-generate-diagnostic` call |
| `/api/diagnostic-analyze` | POST | Rate-limited public | Streams audit JSON in real time using Anthropic Haiku 4.5 with streaming |
| `/api/shared-audits` | GET | Admin | Lists or filters `shared_audits` records |

**Cluster behavior.** Two parallel diagnostic pipelines coexist:

- *Light path*: `/audit-tool` → `/api/audit-form` (5-field intake) → `/api/audit-generate` (Sonnet 4, with Google Places data + competitors).
- *Deep path*: `/diagnostic` → `/api/diagnostic-intake` (40+ field operator survey) → `/api/audit-generate-diagnostic` (Sonnet 4 with ~12 000 max tokens, 8-category structured output) → `/api/audit-approve` (admin approval + email to lead + drip enrollment).

The *deep path* is the one CLAUDE.md describes as the primary funnel. The *light path* is the older five-field version retained for top-of-funnel low-friction capture. The schema's `shared_audits` table is the persistence boundary that joins them.

**Operator vocabulary in prompts.** The `audit-generate-diagnostic` prompt (`src/app/api/audit-generate-diagnostic/route.ts:486-772`) explicitly instructs the model: *"Use operator language: 'move-ins' not 'customers', 'units' not 'rooms', 'street rate' not 'price'."* It seeds the model with industry-benchmark target values (industry-average occupancy at 78%, ECRI implementation at 72%, cost-per-lead $35-50, autopay adoption at 55%) drawn from REIT and SSA reports. This is evidence of encoded domain knowledge baked into the prompt itself.

### Cluster I-3: B2C Lead Capture and Funnel (14 routes — 7.9%)

| Route | Method | Auth | Behavior |
|-------|--------|------|----------|
| `/api/lead-capture` | POST | Public | Full-form submission; upserts `partial_leads` with `recovered=true, lead_score=80`; sends facility notification email |
| `/api/partial-lead` | POST | Public | Incremental lead-state update; computes heuristic score from time-on-page, scroll, fields, exit intent; upsert via raw SQL `ON CONFLICT (session_id)` |
| `/api/partial-lead` | GET, PATCH | Admin | Admin views; recovery state transitions |
| `/api/lead-score` | GET | Admin | Heuristic facility-level lead scoring (separate from partial-lead behavioral score) |
| `/api/lead-analytics` | GET | Admin | Funnel stage counts, conversion rate, weekly velocity |
| `/api/consumer-lead` | POST | Public | Landing-page form for prospective tenants; creates `partial_leads` with `lead_status='new'` |
| `/api/consumer-leads` | GET, PATCH, DELETE | Admin | List/filter/update consumer leads; state transitions: `new → contacted → toured → reserved → moved_in` (with `lost` exit) |
| `/api/export-leads` | GET | Admin | CSV export |
| `/api/r` | GET | Public | UTM short-link redirector; increments `utm_links.click_count`; does *not* create a `partial_leads` row |
| `/api/utm-links` | GET, POST, DELETE | Admin | UTM link CRUD; short-code generation (8-char hex) |
| `/api/call-tracking` | GET | Admin | Twilio number queries |
| `/api/call-logs` | GET, POST | Admin / Twilio webhook | Call log entries |
| `/api/call-webhook` | POST | Twilio (signed) | Receives Twilio status callbacks; logs to `call_logs` with `ON CONFLICT (twilio_call_sid) DO NOTHING` |
| `/api/page-interactions`, `/api/page-interaction-stats` | GET, POST | Admin | Landing-page interaction analytics |

**Cluster behavior.** Two distinct scoring systems:
- *Behavioral score* on `partial_leads.lead_score` (0–100, formula: 40pts fields_completed/total ratio + 20pts time-on-page + 15pts scroll-depth + 25pts contact info presence + 5pts exit-intent). Encoded in `src/app/api/partial-lead/route.ts:17-55`.
- *Facility lead score* in `/api/lead-score` (0–100, formula: 8–20pts facility size + 25pts max occupancy urgency + 5–15pts issue type + 3–15pts pipeline stage + 1–10pts recency + 3–15pts engagement). Letter grade A (80+), B (60+), C (40+), D (20+), F (<20). Encoded in `src/app/api/lead-score/route.ts:129-236`.

**Structural observation: the UTM redirector does not create a lead row.** The `/api/r` route only increments `click_count` on the `utm_links` row and 302-redirects with UTMs appended to the destination URL (`src/app/api/r/route.ts:1-57`). The `partial_leads` row is only created when the visitor lands on the landing page *and* the client-side tracker fires its first `/api/partial-lead` POST. Visitors who click but never load the page are visible in `utm_links.click_count` but invisible in `partial_leads`. This is an attribution boundary worth naming.

### Cluster I-4: OAuth and Platform Integrations (5 routes — 2.8%)

| Route | Method | Auth | Behavior |
|-------|--------|------|----------|
| `/api/auth/google` | GET | Public callback | Google OAuth (general); writes to `platform_connections` |
| `/api/auth/meta` | GET | Public callback | Meta OAuth |
| `/api/auth/tiktok` | GET | Public callback | TikTok OAuth |
| `/api/auth/gbp` | GET | Public callback | Google Business Profile OAuth (distinct credentials from Google Ads) |
| `/api/auth/me` | GET | Org session | Returns current user + organization |

These five routes plus `/api/platform-connections/route.ts` form the OAuth substrate. Tokens land in `platform_connections.access_token` and `refresh_token` — stored as plaintext strings in the database column (`prisma/schema.prisma:1263-1265`). The encryption posture is not verified from the schema alone; presumably tokens are encrypted by Postgres-level encryption-at-rest if at all. This is a security observation rather than a bug — it matches the maturity of the rest of the codebase.

### Cluster I-5: Inbound Webhook Handlers (5 routes — 2.8%)

| Route | Method | Verification | Idempotency | Downstream Writes |
|-------|--------|--------------|-------------|-------------------|
| `/api/webhooks/calcom` (`src/app/api/webhooks/calcom/route.ts`) | POST | HMAC-SHA256, header `x-cal-signature-256` | No (vulnerable to retry duplicates) | `facilities.pipeline_status → "call_booked"`; `activity_log`; admin email via Resend |
| `/api/webhooks/storedge` (`src/app/api/webhooks/storedge/route.ts`) | POST | HMAC-SHA256, header `x-storedge-signature` | Yes (webhook_id dedup in `activity_log`) | `activity_log` only (logs both `storedge_webhook` and `attributed_move_in` rows) |
| `/api/stripe-webhook` (`src/app/api/stripe-webhook/route.ts`) | POST | `stripe.webhooks.constructEvent` | Partial (event-type-specific) | `organizations`, `org_users`, `activity_log`; auto-provisions org admin on `checkout.session.completed` |
| `/api/call-webhook` (`src/app/api/call-webhook/route.ts`) | POST | Rate limit only (no Twilio signature verification) | Yes (`ON CONFLICT (twilio_call_sid) DO NOTHING`) | `call_logs`, `call_tracking_numbers` (count/duration aggregates) |
| `/api/data-deletion/meta-callback` (`src/app/api/data-deletion/meta-callback/route.ts`) | POST | Meta `signed_request` HMAC-SHA256 | No | `data_deletion_requests` |

**The storEDGE webhook is the load-bearing webhook in the attribution thesis.** It receives `reservation.created`, `reservation.cancelled`, `move_in.completed`, `move_in.cancelled` events from the storEDGE reservation system embedded on facility landing pages. When the event payload contains tracking_params (`utm_source`, `utm_campaign`, `fbclid`, `gclid`), the handler creates a *second* `activity_log` row with type `attributed_move_in` and the tracking data in `meta`. **The handler does not update `partial_leads`.** The cross-domain identifier propagation ends at `activity_log`. Phase 4 returns to this finding.

**The Cal.com webhook is the B2B booking bridge.** When a prospect clicks "Schedule a call" on the audit page, Cal.com handles the booking, then POSTs `BOOKING_CREATED` to `/api/webhooks/calcom`. The handler matches `attendees[0].email` against `facilities.contact_email` (case-insensitive). On match, `pipeline_status` transitions to `"call_booked"`. The matching is by email only — not by a token passed through the booking URL — so multiple people from the same facility share the same booking link.

**The Stripe webhook auto-provisions organizations.** On `checkout.session.completed`, the handler creates an `organizations` row (with `slug` derived from `metadata.companyName` and a timestamp-suffix collision avoider), a first `org_users` row (with a cryptographically-random invite token), and an `activity_log` entry — all in a single transaction. The pattern is more robust than typical: the entire org bootstrap is atomic.

### Cluster I-6: Cron Jobs (13 routes — 7.3%)

All 13 use `verifyCronSecret(req)` from `src/lib/cron-auth.ts` for authentication and fail-closed if `CRON_SECRET` is unset.

| Job | Schedule | Work | Batch Pattern |
|-----|----------|------|---------------|
| `cleanup-sessions` | 3 am daily | Delete expired sessions | Raw SQL DELETE |
| `cleanup-organizations` | 3:30 am daily | Hard-delete soft-deleted orgs past grace period; cancel Stripe subscription first | Per-org transactional |
| `data-retention` | 4 am daily | Trim unbounded log tables (`activity_log` 90d, `api_usage_log` 30d, `betapad_notes` 90d) | 1000-row batched DELETE |
| `aggregate-page-stats` | 2 am daily | Roll up `page_interactions` into `page_interaction_stats`; delete old raw rows | LIMIT 100 pages, 45s budget |
| `sync-audiences` | 1 am Sunday | Push Meta custom audiences via `audience_syncs` | 20 connections batched |
| `weekly-digest` | 9 am Friday | Send weekly digest emails | 20 clients batched, cursor pagination |
| `send-client-reports` | 9 am Monday | Generate + email monthly client reports | 20 clients batched, cursor pagination; uses Anthropic for narrative |
| `review-solicitation` | 10 am daily | Email move-in tenants asking for Google reviews | 50 batched, de-duped by `activity_log` |
| `process-gbp` | 4 am daily | Sync GBP posts, reviews, Q&A; refresh tokens | 20 connections, OAuth refresh, transaction-wrapped |
| `process-drips` | 5 am daily | Advance `drip_sequences` next step | 20 batched |
| `process-nurture` | 6 am daily | Advance `nurture_enrollments` next step | 50 batched, SMS via Twilio |
| `process-recovery` | 7 am daily | Send abandoned-form recovery emails to `partial_leads` | 50 batched, hot-lead alerts async |
| `check-campaign-alerts` | 8 am daily | Detect campaign performance alerts (CPL, ROAS) | 20 clients, 24h de-dupe |

**Cluster behavior.** The schedules are staggered 1 am–10 am UTC to avoid spiking Resend or Anthropic usage limits. Three batching patterns recur: cursor-based pagination (digest, reports, alerts — uses UUID cursor and resumes on next run if time-budgeted), time-budgeted loops (page-stats, audience-sync — 45s budget on 60s timeout), and chunked deletes (data-retention — 1000-row LIMIT with loop). Every job sends an admin failure alert via Resend (fire-and-forget) on fatal error. Three jobs use explicit Prisma transactions: `send-client-reports`, `process-gbp`, `cleanup-organizations` — the cases where partial completion would corrupt state.

### Cluster I-7: PMS Data Ingest (7 routes — 3.9%)

| Route | Method | Auth | Behavior |
|-------|--------|------|----------|
| `/api/pms-upload` | POST | Public (rate-limited) | External webhook for PMS report upload; raw JSON storage in `pms_reports.report_data` |
| `/api/portal-upload` | GET, POST | Client access code OR admin | File upload (PDF, CSV, Excel) → Vercel Blob → `pms_reports`; admin email notification |
| `/api/admin-pms-queue` | GET, PATCH | Admin | Lists pending reports; PATCH to mark processed |
| `/api/pms-data` | GET, POST | Admin / client access code | Read normalized data from 9 `facility_pms_*` tables; admin POST for manual entry |
| `/api/facility-pms` | GET, POST | Admin / client access code | Similar to `pms-data`; per-facility focus |
| `/api/storedge-import` | POST | Admin | The actual parser — handles 7 specific storEDGE report types, transactional writes to all relevant `facility_pms_*` tables |
| `/api/tenants` | GET, POST | Admin | Tenant CRUD |

**Cluster behavior.** The CLAUDE.md statement "Phase 1 (current): Manual upload of facility management reports — PDF, CSV, and Excel only. No API integrations yet" is accurate. The upload path stops at `pms_reports` (with a Vercel Blob URL for the file). The conversion to structured data in the 9 `facility_pms_*` tables requires admin action — usually via the `storedge-import` endpoint with the report-type explicitly specified by the admin. PDF support exists at upload (MIME type accepted, stored as blob) but there is no PDF extraction code; admins are presumably expected to convert PDFs manually before re-uploading as structured data.

**storEDGE specialization.** The `storedge-import` endpoint handles seven storEDGE report types specifically: `consolidated_occupancy`, `rent_roll`, `rent_rates_by_tenant`, `aging`, `annual_revenue`, `length_of_stay`, `move_in_kpi`. Each maps to a distinct write pattern. The `rent_rates_by_tenant` handler is particularly notable: it flags ECRI candidates by the rule *"paying <80% of street rate for 180+ days,"* suggests a recovery rate at 80%, and computes the projected revenue lift per unit. This is industry-specific business logic encoded in code (`src/app/api/storedge-import/route.ts`, approximately lines 134-175 per the agent's summary).

No SiteLink, Yardi, RentCafe, or Crexi handlers exist. The "manual upload" Phase 1 is real; the system is built to ingest storEDGE data structurally and other PMS data as opaque blobs.

### Cluster I-8: External v1 API (12 routes — 6.7%)

All 12 use `requireApiAuth` and rate-limit to 60 requests/minute per `api_key_id`.

| Route | Methods | Scopes | Behavior |
|-------|---------|--------|----------|
| `/api/v1/api-keys` | GET, POST, DELETE | Admin-key (not API-key) | Manage keys, see scopes available |
| `/api/v1/call-logs` | GET | `calls:read` | Read call logs by facility |
| `/api/v1/facilities` | GET, POST, PATCH | `facilities:read/write` | Facilities CRUD + webhook trigger on changes |
| `/api/v1/facility-availability` | GET | `units:read` | Unit availability + active specials |
| `/api/v1/facility-snapshots` | GET, POST | `facilities:read/write` | Occupancy snapshots (upsert) |
| `/api/v1/facility-specials` | GET, POST | `units:read/write` | Promotional specials CRUD |
| `/api/v1/facility-units` | GET, POST | `units:read/write` | Unit mix CRUD (upsert on conflict) |
| `/api/v1/landing-pages` | GET | `pages:read` | Read-only landing page data |
| `/api/v1/leads` | GET, POST, PATCH | `leads:read/write` | Lead CRUD with webhook trigger |
| `/api/v1/tenants` | GET, POST, PATCH | `tenants:read/write` | Tenant CRUD with batch upsert |
| `/api/v1/usage` | GET | Any valid key | Per-key API usage analytics |
| `/api/v1/webhooks` | GET, POST, PATCH, DELETE | `webhooks:manage` | Outbound webhook subscription management, test dispatch with HMAC-SHA256 signing |

**Six webhook event types are emitted:** `lead.created`, `lead.updated`, `unit.updated`, `facility.updated`, `special.created`, `special.updated`. Subscribers receive HMAC-signed payloads.

**Test coverage on v1:** Three test files in `src/app/api/v1/__tests__/`: `facilities.test.ts`, `leads.test.ts`, `tenants.test.ts`. The other nine v1 routes have no automated tests.

**Cluster behavior.** This is a real external developer API, not a marketing feature. The scope system has nine distinct scopes; the rate limit is per-key; usage is logged to `api_usage_log` for billing visibility; outbound webhook subscriptions support six event types. The contrast with the rest of the API surface is sharp — most non-v1 routes are admin- or session-protected; the v1 routes are bearer-token-protected and stateless. A partner organization can integrate StorageAds-as-a-data-source via these routes. This is built like a B2B platform, not a B2C product.

### Cluster I-9: GBP (Google Business Profile) (6 routes — 3.4%)

| Route | Methods | Auth | AI Integration |
|-------|---------|------|---------------|
| `/api/gbp-insights` | GET, POST | Admin | None (data fetch only) |
| `/api/gbp-posts` | GET, POST, PATCH, DELETE | Admin | Anthropic Sonnet 4 — generates post copy from facility name + PMS data + specials |
| `/api/gbp-questions` | GET, POST | Admin | Anthropic Sonnet 4 — drafts contextual answers |
| `/api/gbp-review-settings` | GET, PATCH | Admin | None |
| `/api/gbp-reviews` | GET, POST, PATCH | Admin | Anthropic Sonnet 4 — drafts review responses by tone (friendly / professional / casual) |
| `/api/gbp-sync` | GET, POST, PATCH | Admin | None (OAuth orchestration) |

**Cluster behavior.** The recurring pattern is *fetch from Google → AI drafts response → admin approves → publish back to Google*. The `sync_config` JSON on `gbp_connections` controls four binary toggles: `auto_post`, `sync_hours`, `sync_photos`, `auto_respond` — all default to either `true` (sync) or `false` (auto-respond, which requires human approval by default). The Anthropic prompt for review responses includes the facility's actual name and the review sentiment, and conditions on tone preference from `gbp_review_settings`. This is one of the more mature integrations in the codebase.

### Cluster I-10: AI Generation (10 routes — 5.6%)

| Route | Provider | Model | Storage |
|-------|----------|-------|---------|
| `/api/generate-copy` | Anthropic | Haiku 4.5 (`claude-haiku-4-5-20251001`) | None — transient |
| `/api/generate-image` | FAL.ai (Flux) | Haiku 4.5 enhances prompt | `assets` (`type=photo, source=ai_generated`); Vercel Blob |
| `/api/generate-video` | FAL.ai (Wan-i2v/Wan-t2v) | Haiku 4.5 enhances prompt | None — transient |
| `/api/generate-social-content` | Anthropic | Sonnet 4 (`claude-sonnet-4-20250514`) | `social_posts` (batch) |
| `/api/generate-social-post` | Anthropic | Sonnet 4 | None — transient |
| `/api/marketing-plan` | Anthropic | Sonnet 4 (8192 max tokens) | `marketing_plans` |
| `/api/scrape-website` | Cheerio (no AI) | n/a | `assets`, `facilities` |
| `/api/synthesize` | Anthropic | (delegated to `src/lib/synthesis.ts`) | Variable |
| `/api/diagnostic-analyze` | Anthropic | Haiku 4.5 (streaming) | None — streamed |
| `/api/diagnostic-intake` | Anthropic (downstream) | n/a directly | `facilities`, triggers downstream |

**Cluster behavior.** Two Anthropic models, three FAL.ai endpoints, plus Cheerio scraping. Haiku 4.5 is used for time-sensitive operations (streaming the diagnostic to the client, enhancing image/video prompts) and for cheap structured generation (`/api/generate-copy`). Sonnet 4 is used for high-value structured generation: the diagnostic audit, the marketing plan, the GBP responses, the social content. The pattern is consistent: Haiku for fast/cheap, Sonnet for high-stakes.

The FAL.ai integration uses *Flux* for images and *Wan-i2v/Wan-t2v* for videos. These are video and image generation models with their own template systems on the StorageAds side: 10 image templates (`ad_hero`, `lifestyle_moving`, `before_after`, etc.) and 6 video templates (`facility_showcase`, `hero_shot`, `seasonal_promo`, etc.). The CLAUDE.md flag *"FAL.ai / Runway ML — Angelo's work — do not modify"* applies to this cluster.

### Cluster I-11: Admin-Key-Protected Lead and Audit Ops (10 routes — 5.6%)

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/admin-facilities` | GET, PATCH | Facility list with Places data; 14 editable fields; 8-stage status enum |
| `/api/admin-keys` | GET, POST, DELETE | Per-admin key management (the new `sa_adm_` keys) |
| `/api/admin-leads` | GET, POST, PATCH, DELETE | Lead CRM + portal provisioning on `client_signed` |
| `/api/admin-pms-queue` | GET, PATCH | PMS upload processing queue |
| `/api/admin-reports` | GET, POST, PATCH | Performance report generation (monthly_performance, campaign_detail, attribution) |
| `/api/admin-settings` | GET, PATCH | Admin settings in Upstash Redis |
| `/api/audit-approve`, `/audit-save`, `/audit-load`, `/audit-report` | various | Audit lifecycle (covered in Cluster I-2) |

**Cluster behavior.** This cluster is the *internal sales-tooling* surface: lead pipeline, audit lifecycle, PMS upload review, performance reports. The `admin-leads` route is the heart of the B2B sales operation. When a lead status transitions to `client_signed`, it triggers a synchronous provisioning flow: generate access code, create the `clients` row, send welcome email. This is the moment a `facilities` row stops being a sales lead and starts being a paying client.

### Cluster I-12: Portal (Client) (16 routes — 9.0%)

| Route | Methods | Auth |
|-------|---------|------|
| `/api/client-activity`, `/client-billing`, `/client-campaigns`, `/client-data`, `/client-invoices`, `/client-messages`, `/client-onboarding`, `/client-reports` | various | Access code + email |
| `/api/portal-gbp`, `/api/portal-upload` | various | Access code + email OR admin |
| `/api/resend-access-code` | POST | Public (rate-limited) |
| `/api/2fa` | POST (4 actions) | Mixed (TOTP setup; verify) |
| `/api/onboarding-checklist` | GET, PATCH | Admin OR access code |
| `/api/checkout-success`, `/api/create-checkout-session`, `/api/create-billing-portal` | various | Stripe-validated or session |
| `/api/subscription-usage` | GET | Admin |

**Cluster behavior.** This is the client-facing portal. Access-code-and-email is the bearer credential pattern. Some operations are mirrored: a client can view their billing portal, but an admin can view all clients' billing portals (the route accepts `?all=true` with admin key). The portal is *read-mostly* — clients see reports, GBP insights, campaign analytics, but their write paths are limited to onboarding step updates, PMS file uploads, and invoice generation. They do not directly create campaigns or modify facility data; that is admin-mediated.

### Cluster I-13: Partner (Org) (12 routes — 6.7%)

| Route | Methods | Auth |
|-------|---------|------|
| `/api/organizations` | GET, POST, PATCH | Session, admin, or public (signup) |
| `/api/partner-signup`, `/api/signup` | POST | Public (rate-limited) |
| `/api/partner/audit-log`, `/api/partner/avatar`, `/api/partner/changelog-viewed`, `/api/partner/notifications`, `/api/partner/onboarding`, `/api/partner/organization`, `/api/partner/profile`, `/api/partner/sessions` | various | Partner session |
| `/api/org-users`, `/api/org-email`, `/api/org-facilities`, `/api/org-activity` | various | Partner session (role-gated) |
| `/api/password-reset`, `/api/verify-email` | POST | Public + email-verifying |

**Cluster behavior.** The partner dashboard is the white-label and reseller surface. Partners are organizations with users (`org_users`) and an explicit role system: `viewer`, `org_admin`, `org_superadmin`. Login via email + password (scrypt-hashed; legacy SHA-256 rehashes to scrypt on first successful login). Sessions tracked in `sessions` table with 30-day expiry. TOTP 2FA optional. Plan limits enforced at signup (Startup: 10 facilities, Growth: 50, Enterprise: 999). Activity and audit logging on lifecycle events.

### Cluster I-14: Operational Intelligence (8 routes — 4.5%)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/occupancy-forecast` | GET | Seasonal occupancy forecasts from PMS data |
| `/api/occupancy-intelligence` | GET | Cross-facility occupancy aggregates |
| `/api/market-intel` | GET | Competitor pricing + occupancy scraped from SpareFoot and Google Maps |
| `/api/revenue-intelligence` | GET | Revenue rollups |
| `/api/revenue-loss` | GET | Vacancy revenue impact |
| `/api/churn-predictions` | GET | Per-tenant churn risk scoring |
| `/api/upsell` | GET | Upsell opportunity identification |
| `/api/moveout-remarketing` | GET | Move-out remarketing dashboard |

**Cluster behavior.** This cluster reads from the PMS data layer (Cluster I-7's output) and computes operational analyses. All admin-protected, all rate-limited at EXPENSIVE_API tier (because some routes scrape external sources). `/api/market-intel` is the only route that scrapes — using `src/lib/aggregator-scrape.ts` against SpareFoot and SelfStorage.com — and caches results in `facility_market_intel`. Only `/api/churn-predictions` writes back (to the `churn_predictions` table); the others are pure computation against existing data.

### Cluster I-15: Publishing, Notifications, and Utility (32 routes — 18.0%)

The largest residual cluster. Routes for publishing ads (`/publish-ad`, `/publish-social`), social posts CRUD (`/social-posts`), landing-page CRUD (`/landing-pages`), style references (`/style-references`), drip and nurture sequence config (`/drip-sequences`, `/nurture-sequences`), email and SMS sending (`/send-template`, `/sms-send`), push notifications (`/push-send`, `/push-subscribe`, `/push-vapid-key`), file proxies and external content (`/places-photo`, `/proxy-video`, `/stock-images`), uploads (`/upload-token`), platform connections (`/platform-connections`), activity and notifications (`/activity-log`, `/notifications`), audience sync (`/audience-sync`), A/B tests (`/ab-tests`), campaign alerts (`/campaign-alerts`), Google Ads keyword research (`/google-ads-keywords`), email open tracking pixel (`/report-open`), map analysis (`/analyze-map`), health check (`/health`).

This cluster is the *long tail* — none individually shape the system's identity, but together they constitute the operational plumbing that lets every other cluster function.

### Cluster I-16: Internal Developer Tooling (9 routes — 5.1%)

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/commit-comments`, `/api/commit-flags`, `/api/commit-notes`, `/api/commit-notes/sync`, `/api/commit-reviews`, `/api/deployment-tags`, `/api/dev-handoffs` | various | Internal dev process tracking |
| `/api/betapad-notes`, `/api/ideas` | various | Beta-testing notes, feature ideas |
| `/api/changelog` | GET, POST | Public-facing changelog builder |

**Cluster behavior.** These nine routes serve the two-person engineering team rather than customers. They power the `/admin/changelog`, `/admin/activity`, and similar internal dashboards. The fact that the team built and deployed a custom commit-annotation and developer-handoff workflow as part of the production application is itself a finding — it indicates the team works *inside* the application rather than alongside it.

## 3.4 Proportional Distribution

| Cluster | Route count | % of 178 |
|---------|-------------|----------|
| I-1 Attribution forwarders | 6 | 3.4% |
| I-2 Audit funnel | 10 | 5.6% |
| I-3 B2C lead capture | 14 | 7.9% |
| I-4 OAuth | 5 | 2.8% |
| I-5 Webhooks | 5 | 2.8% |
| I-6 Crons | 13 | 7.3% |
| I-7 PMS ingest | 7 | 3.9% |
| I-8 External v1 API | 12 | 6.7% |
| I-9 GBP | 6 | 3.4% |
| I-10 AI generation | 10 | 5.6% |
| I-11 Admin ops | 10 | 5.6% |
| I-12 Portal | 16 | 9.0% |
| I-13 Partner | 12 | 6.7% |
| I-14 Operational intelligence | 8 | 4.5% |
| I-15 Publishing / utility | 32 | 18.0% |
| I-16 Internal dev tooling | 9 | 5.1% |
| (Other / edge / not yet clustered) | 3 | 1.7% |
| **Total** | **178** | **100%** |

The largest cluster (publishing/utility) is the long tail of plumbing. The next largest (portal at 9.0%) reveals that direct client-of-the-platform engagement is a substantial built-out surface. The combined attribution + audit + lead-capture footprint is 16.9% (6 + 10 + 14 = 30 routes), which is the larger-than-it-appears top-of-funnel and conversion-tracking footprint. Crons (7.3%) and the external v1 API (6.7%) together constitute 14% — the platform's bidirectional integration surface (in via cron jobs that pull from external sources, out via webhooks and v1 API). The internal dev tooling cluster (5.1%) is more substantial than the GBP cluster (3.4%).

## 3.5 Authentication-Strategy Distribution

Inferred from the cluster analyses:

| Auth method | Approximate route count | Routes |
|-------------|------------------------|--------|
| Admin key (`X-Admin-Key`) | ~70 | Admin ops, internal dev, intelligence, generation, GBP, parts of portal and PMS |
| Public (no auth, possibly rate-limited) | ~30 | Audit form, lead capture, partial lead, tracking events, walkin, push subscribe, vapid, health, places photo, etc. |
| Client access code | ~12 | Most `/api/client-*` and `/api/portal-*` routes |
| Org session (`Bearer ss_*`) | ~16 | `/api/partner/*`, `/api/org-*`, `/api/auth/me`, etc. |
| External v1 API key (`Bearer sk_live_*`) | 12 | `/api/v1/**` (except `/api-keys` which is admin) |
| Cron secret (`Bearer ${CRON_SECRET}`) | 13 | `/api/cron/*` |
| Webhook signature | 5 | The five webhook handlers |
| Stripe session validation | 2 | `checkout-success`, `create-checkout-session` |
| Twilio (rate limit only, no signature) | 1 | `/api/call-webhook` (security observation) |

The Clerk dependency is *configured* but not enforcing anything for these routes — middleware skips Clerk for `/api/*` (`src/middleware.ts:110-112`). Every route self-authenticates.

## 3.6 Dead Routes, Stub Routes, and Verification Gaps

The author looked for routes that exist but return stubs, lack auth on tenant-data endpoints, or otherwise hint at incomplete work. Findings:

- **`/api/call-webhook` does not verify Twilio signatures** — relies on rate limiting only (`src/app/api/call-webhook/route.ts`). Twilio webhook signature verification (X-Twilio-Signature) would close this gap. Logged.
- **`platform_connections.access_token` and `refresh_token` stored unencrypted at the schema level**. Phase 3 cannot confirm whether application-level encryption is applied at read/write. Logged.
- **The Cal.com webhook lacks event idempotency** — no `event_id` deduplication. Retried bookings would produce duplicate facility-status updates. Logged.
- **The Meta data-deletion callback lacks idempotency** — every callback creates a new `data_deletion_requests` row. Logged.
- **The `audience-sync` cron calls an internal `/api/audience-sync` route** — fan-out pattern. The internal route is rate-limited at the admin tier but the cron should not be rate-limited; this could throttle large syncs.
- **Two parallel diagnostic pipelines** (`/audit-tool` + `/api/audit-*` vs. `/diagnostic` + `/api/diagnostic-*`) coexist. Per Phase 3 reads, these are not duplicates — they are different-tier funnels for different audiences. Both are live.
- **`@supabase/ssr` and `@supabase/supabase-js` in dependencies are unused** — no imports anywhere in `src/`. Logged in Phase 1 as a vestigial dependency.

No routes were found that return 501-style stubs, no routes were found with TODO comments without subsequent fix commits, and no routes were found that accept parameters they never read.

## 3.7 Integration Heatmap

Counts of routes touching each external system. A single route may touch several systems.

| External system | Route count touching it |
|-----------------|------------------------|
| Anthropic API (`api.anthropic.com`) | ~15 routes — audit, diagnostic, GBP responses, copy generation, social, marketing plan, cron reports |
| Resend (email) | ~30 routes (every transactional moment; every cron) |
| Vercel Blob | ~6 routes (portal-upload, upload-token, asset uploads, video proxy) |
| Upstash Redis | ~10 routes (rate limiting, settings, notifications, campaign alerts) |
| Google Places API | ~5 routes (facility-lookup, audit-generate, places-photo, analyze-map) |
| Google Ads / Conversion API | 2 routes (`/api/google-conversion`, plus auth) |
| Google Business Profile API | 6 routes (Cluster I-9) |
| Google OAuth | 2 (general Google + GBP) |
| Meta Graph API / CAPI | 3 routes (`/api/meta-capi`, `/api/auth/meta`, `/api/data-deletion/meta-callback`) |
| TikTok | 1 route (`/api/auth/tiktok`) |
| Stripe | 3 routes (`/api/stripe-webhook`, `/api/create-checkout-session`, `/api/create-billing-portal`) |
| Twilio (calls + SMS) | 3 routes (`/api/call-webhook`, `/api/sms-send`, `/api/call-tracking`) |
| Cal.com | 1 route (`/api/webhooks/calcom`) |
| storEDGE | 2 routes (`/api/webhooks/storedge`, `/api/storedge-import`) |
| FAL.ai | 2 routes (image, video generation) |
| Runway ML | 0 routes verified (env var exists; no code uses it directly per agent survey) |
| Replicate | 0 routes verified (env var and CSP allow `replicate.delivery`; no code uses it directly) |
| Unsplash | 1 route (`/api/stock-images`) |
| External web scraping (Cheerio, fetch) | 2 routes (`/api/scrape-website`, `/api/market-intel`) |
| Web Push / VAPID | 3 routes (`/api/push-send`, `/api/push-subscribe`, `/api/push-vapid-key`) |

Anthropic, Resend, and Vercel Blob dominate by route count. The three primary platforms (Meta, Google, TikTok) all have OAuth + write paths. storEDGE is the only PMS-vendor integration. No SiteLink, Yardi, RentCafe, ESS, or Tenant Inc integration exists in the API surface.

## 3.8 What the Surface Knows

The 178-route surface confirms and refines the schema's implied capabilities:

**It confirms:**
- The system implements server-side attribution via Meta CAPI and Google Ads conversion forwarding (Cluster I-1) — including SHA-256 hashing of PII per platform requirements and event-name mapping.
- The system implements a two-tier audit funnel (light + deep, Cluster I-2), generating audits with Anthropic Sonnet 4 grounded in Google Places data and an extensive operator-supplied diagnostic.
- The system supports external partner integration via a 12-route v1 API with scopes, rate limits, outbound webhooks, and usage logging (Cluster I-8).
- The system runs 13 daily/weekly cron jobs covering five sequence engines (drips, nurture, recovery, retention, moveout) plus operational hygiene (Cluster I-6).
- The system has a mature Google Business Profile integration with AI-drafted responses (Cluster I-9).

**It refines:**
- The "attribution chain" the marketing claims is a *UTM-campaign-keyed* join rather than a *click-ID-chain* join. The system captures fbclid and gclid, forwards them server-side to the ad platforms, and joins server-side spend and lead counts by `utm_campaign`. The cross-domain attribution from click to move-in flows through the storEDGE webhook into `activity_log` — not into a structured per-lead per-move-in join.
- The PMS ingest path is genuinely manual: upload-to-blob plus admin-driven storEDGE-specific import. No automated PMS API. No PDF extraction. The schema is more aspirational than the API surface in this area.
- The cron jobs are remediated and structured: every one uses cron-secret auth, every one bounds work via batching, every one sends an admin failure alert. This is unusual quality for 15-day-old code.

**It surprises:**
- The internal dev tooling cluster (9 routes, 5.1%) — comparable in size to the GBP integration — exists in the production application.
- The portal cluster (16 routes, 9.0%) is the second-largest behavioral cluster after the publishing/utility long tail. Direct client engagement is a substantial built-out surface, despite the product being pre-launch.
- The two parallel diagnostic pipelines have not been consolidated.
- The Twilio call webhook (`/api/call-webhook`) does not verify Twilio signatures, contrasting with the disciplined HMAC verification on the storEDGE, Stripe, Meta, and Cal.com webhooks.

The next phase identifies the spine workflow — the single longest, most-elaborate end-to-end workflow — and traces its identifier propagation in detail.
