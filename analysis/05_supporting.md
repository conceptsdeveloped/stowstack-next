# Phase 5 — Supporting Subsystems

Phase 4 identified the spine — the click-to-move-in attribution chain. Phase 5 catalogues every subsystem that exists outside the spine, classifying each by relation to the spine (load-bearing, adjacent, decorative, independent), maturity tier (production / functional / prototype / stub), and removal impact (would removing this break the spine, degrade a feature, or be unnoticed).

The codebase contains 14 supporting subsystems. The list is exhaustive — every cluster of routes, models, and lib modules that did not figure into the spine workflow is documented here.

## 5.1 Subsystem 1: B2B Audit Funnel (the Demand Engine)

**What it does.** Generates AI-driven facility audits for prospective customers. The "free audit tool" at `/audit-tool` is the top-of-funnel. Two variants — light (5-field form) and deep (40+ field operator diagnostic) — produce different audit JSON shapes; both terminate in a public `/audit/[slug]` page that the prospect can view, share, and book a sales call from.

**Where it lives.**
- Pages: `src/app/audit-tool/`, `src/app/audit/[slug]/`, `src/app/audit/sample/`, `src/app/diagnostic/`
- Routes: `/api/audit-form`, `/api/audit-generate`, `/api/audit-generate-diagnostic`, `/api/audit-save`, `/api/audit-load`, `/api/audit-report`, `/api/audit-approve`, `/api/shared-audits`, `/api/diagnostic-intake`, `/api/diagnostic-analyze`
- Lib: `src/lib/audit.ts`, `src/lib/sample-audit.ts`, `src/lib/scrape-website.ts`
- Models: `audits`, `audit_report_cache`, `shared_audits`

**Relation to spine.** Independent. The audit funnel is the *demand-generation* surface for B2B sales; the spine is the *attribution* surface for B2C tenant acquisition. They share `facilities` as the central object but operate on different sides of the same row's lifecycle: the audit funnel converts a `facilities` row from `pipeline_status: "submitted"` to `pipeline_status: "client_signed"` (a B2B sale); the spine operates on `facilities` rows that are already paying clients and tracks B2C tenants for them.

**Maturity.** Production. Both light and deep paths generate audits via Anthropic; emails are sent via Resend; admin review and approval workflow is implemented; the shared `/audit/[slug]` URL has view tracking and hot-lead detection. The diagnostic-analyze streaming variant uses Haiku 4.5 for low-latency real-time generation in the browser.

**Removal impact.** *Severe — but commercial, not technical.* Removing this subsystem would eliminate the primary commercial demand-generation path. The spine could still function (clients can be onboarded without the audit), but lead generation would fall back to direct contact.

**Notable structural features.**
- Two parallel diagnostic pipelines coexist (`/audit-tool` vs. `/diagnostic`). The deep path uses an `OCCUPANCY_MAP` and `UNIT_COUNT_MAP` to convert categorical facility-size answers into numeric estimates for the AI prompt (`src/app/api/audit-generate-diagnostic/route.ts:234-253`). The 40+ field diagnostic input schema (`src/app/api/audit-generate-diagnostic/route.ts:18-136`) encodes the operator survey.
- The deep path's prompt to Anthropic includes industry benchmark target values that a non-practitioner would not know (e.g., "ECRI implementation: 72% of facilities"; "Cost per lead: $35-50"; "Autopay adoption: 55%"). These are inline literals — not externalized configuration — so the values are difficult to refresh.
- The `audit-load` route increments view counts and triggers an admin alert at 3+ views ("hot lead" signal). This converts a passive shareable URL into an active sales signal.

## 5.2 Subsystem 2: Admin Operations Surface

**What it does.** Provides Blake and Angelo the in-application UI to run the business — sales pipeline, lead management, facility CRUD, PMS upload review, client report generation, audit approval, internal change log, partner management.

**Where it lives.**
- Pages: `src/app/admin/` (14 sub-routes including `/admin/facilities` with its 16-tab manager)
- Components: `src/components/admin/` (including the 16-tab manager in `src/components/admin/facility-tabs/`)
- Routes: All `/api/admin-*` routes (admin-facilities, admin-keys, admin-leads, admin-pms-queue, admin-reports, admin-settings), plus `/api/admin-leads` (the central CRM), `/api/audit-approve`, `/api/audit-save`, `/api/audit-load`, `/api/audit-report`
- Lib: `src/lib/admin-context.tsx`, `src/lib/admin-keys.ts`, `src/lib/facility-context.tsx`

**Relation to spine.** Adjacent. Admin operations *trigger* spine activities (campaign creation, UTM link generation, lead status transitions, etc.) and *observe* spine outputs (attribution reports, lead pipeline counters, recovery dashboards). But the spine functions without active admin operation — once configured, the daily flow runs autonomously.

**Maturity.** Functional, mid-remediation. The recent commit `5cb290e (fix: 10 replace shared admin secret with per-admin API keys)` migrated 70 files from a shared `ADMIN_SECRET` env var pattern to per-admin keys with the `sa_adm_` prefix and `admin_keys` table. The mega-component refactor `7b779de` (`fix: 15 split 14 mega-components into focused subcomponents`) re-organized the facility-tabs cluster. The surface is large, recently touched, and under continuous structural improvement.

**Removal impact.** *Severe.* Without the admin surface, manual interventions (advancing `lead_status` to `'moved_in'`, approving audits, processing PMS uploads, transitioning lead pipeline state) become impossible. The spine workflow specifically requires admin action at the `'moved_in'` transition (per Phase 4's critical observation).

**Notable structural features.**
- 16 facility tabs: `ad-mockup-preview`, `ad-publisher`, `ad-studio`, `creative-studio`, `facility-overview`, `google-ads-lab`, `lead-nurture-engine`, `lp-section-editor`, `media-library`, `occupancy-intelligence`, `revenue-analytics`, `tiktok-creator`, `utm-links`, `video-generator`. Each is lazy-loaded.
- Custom in-app dev tooling (commit annotations, deploy tags, dev handoffs) is part of the admin surface (see Subsystem 9).
- The admin shell at `src/components/admin/admin-shell.tsx` gates access via the `X-Admin-Key` header pattern.

## 5.3 Subsystem 3: Client Portal

**What it does.** Provides paying clients (facility owners/operators) read access to their analytics, reports, and Google Business Profile data, plus limited write paths (PMS report uploads, onboarding step completion).

**Where it lives.**
- Pages: `src/app/portal/` (sub-routes: billing, campaigns, gbp, messages, onboarding, reports, settings, upload)
- Components: `src/components/portal/`
- Routes: All `/api/client-*` (8 routes) plus `/api/portal-gbp`, `/api/portal-upload`, `/api/resend-access-code`, `/api/onboarding-checklist`
- Lib: `src/lib/portal-helpers.tsx`

**Relation to spine.** Adjacent. The portal *displays* spine outputs (attribution reports, campaign performance, GBP insights) to clients. The portal *contributes* PMS data via `/api/portal-upload`, which feeds the operational-intelligence subsystem rather than the spine directly.

**Maturity.** Functional. The portal is read-mostly. Onboarding is a 5-step wizard (facility details, demographics, unit mix, competitors, ad preferences). PMS upload is configured but parsing is admin-mediated (Phase 3).

**Removal impact.** *Substantial but recoverable.* Clients would lose self-serve visibility into their performance and would need to receive reports via email. The platform would continue to function operationally but client engagement would degrade.

**Notable structural features.**
- Authentication is email + access code. The access code is generated when `facilities.pipeline_status` transitions to `'client_signed'` (16 characters, unique). One-time login codes for the email + code flow are managed in `portal_login_codes` (8-char, 10-min TTL).
- The portal has a Web Push subscription path (`/api/push-subscribe` + `push_subscriptions` model with `user_type: 'admin'` default — but the schema permits client subscriptions too). Combined with the service-worker registration in the root layout, the portal is mobile-installable as a PWA.
- Two-factor authentication (`/api/2fa`) is implemented for partner sessions but not currently used by clients (clients authenticate via access code, not TOTP).

## 5.4 Subsystem 4: Partner Dashboard

**What it does.** Provides reseller and referral partners (typically multi-facility operators and management companies) administrative access to their organization's facilities, team members, billing, webhooks, API keys, and revenue share.

**Where it lives.**
- Pages: `src/app/partner/` (sub-routes: api-keys, audit-log, changelog, facilities, revenue, settings, team, webhooks)
- Components: `src/components/partner/`
- Routes: `/api/partner/*` (7 routes), `/api/organizations`, `/api/partner-signup`, `/api/signup`, `/api/org-users`, `/api/org-email`, `/api/org-facilities`, `/api/org-activity`, `/api/password-reset`, `/api/verify-email`, `/api/auth/me`, `/api/2fa`
- Lib: `src/lib/session-auth.ts`, `src/lib/clerk-auth.ts`, `src/lib/clerk-roles.ts`

**Relation to spine.** Independent. Partners use the spine indirectly (their facilities run the attribution chain), but the partner dashboard itself is a parallel administrative surface — read-most-things, manage-team, manage-webhooks, manage-API-keys.

**Maturity.** Production. The org-session token scheme (`ss_` prefix, scrypt-hashed passwords with SHA-256 legacy rehashing, 2FA, 30-day expiry, IP/UA tracking) is a fully-developed session system. The plan-based facility limits (Starter: 10, Growth: 50, Enterprise: 999) are enforced at signup.

**Removal impact.** *Substantial.* Partners are a distinct user class with distinct workflows. Removing the partner dashboard would eliminate the white-label and reseller channel. The revenue-share model (Cluster R in Phase 2) would have no UI to manage.

**Notable structural features.**
- Three roles: `viewer`, `org_admin`, `org_superadmin`. Role checks in route handlers.
- TOTP 2FA optional, with 10 backup codes (hashed at rest).
- The OAuth-style API key management (`/api/v1/api-keys` admin-protected; partner-issued via `/api/partner/api-keys`) allows partners to integrate their own backends.
- Outbound webhooks (`/api/v1/webhooks`) let partners receive event notifications from the platform.

## 5.5 Subsystem 5: PMS Data Pipeline

**What it does.** Ingests Property Management System reports (storEDGE specifically) and converts them into structured operational data across 9 `facility_pms_*` tables. Powers occupancy intelligence, revenue analysis, ECRI flagging, delinquency tracking, and tenant retention.

**Where it lives.**
- Routes: `/api/pms-upload`, `/api/portal-upload`, `/api/admin-pms-queue`, `/api/pms-data`, `/api/facility-pms`, `/api/storedge-import`, `/api/tenants`
- Lib: `src/lib/pms-column-mapper.ts`, `src/lib/facility-pms-queries.ts`, `src/lib/queries/facility-analytics.ts`
- Models: 9 `facility_pms_*` models + `pms_reports`, `tenants`, `tenant_payments`, `tenant_communications`, `delinquency_escalations`

**Relation to spine.** Adjacent. PMS data does not flow through the spine in real time. The spine's `/api/attribution` query doesn't read from `facility_pms_*` tables — it joins `campaign_spend` with `partial_leads`. But the operational-intelligence subsystem (next) consumes PMS data heavily, and the revenue-attribution-target (move-in completion) is observable both via storEDGE webhook and via PMS report ingest of `facility_pms_revenue_history.move_ins`.

**Maturity.** Functional but Phase 1. As stated in CLAUDE.md, this is upload-and-admin-process; PDF support exists at the upload boundary but no PDF extraction is implemented. The storEDGE-specific import handles seven report types with admin-supplied type selection. No other PMS vendor's report formats are supported.

**Removal impact.** *Severe* for operational intelligence (Subsystem 6) and client reports (Subsystem 7). The spine itself is unaffected — clicks-to-leads attribution does not depend on PMS data.

**Notable structural features.**
- The `storedge-import` route encodes the ECRI eligibility rule: a tenant paying <80% of street rate for 180+ days is flagged with `ecri_suggested = 80% of street_rate`. The projected `ecri_revenue_lift` is computed per unit.
- `pms-column-mapper.ts` provides fuzzy column matching for CSV uploads, allowing admins to handle minor format variations.
- The 9 `facility_pms_*` tables are highly normalized (one table per report type), in contrast with the JSON-blob approach used elsewhere in the schema.

## 5.6 Subsystem 6: Operational Intelligence

**What it does.** Computes higher-order analytics from PMS data: occupancy forecasts, revenue intelligence, churn predictions, upsell opportunities, market intelligence (competitor scraping), revenue-loss analysis.

**Where it lives.**
- Routes: `/api/occupancy-forecast`, `/api/occupancy-intelligence`, `/api/market-intel`, `/api/revenue-intelligence`, `/api/revenue-loss`, `/api/churn-predictions`, `/api/upsell`, `/api/moveout-remarketing`
- Lib: `src/lib/aggregator-scrape.ts`, `src/lib/scrape-website.ts`
- Models: `churn_predictions`, `upsell_opportunities`, `facility_market_intel`, `moveout_remarketing`

**Relation to spine.** Independent — but parallel. The operational intelligence subsystem mirrors the spine's metric philosophy at a different layer. Where the spine answers "what is the cost per move-in for this campaign?", this subsystem answers "which tenants are likely to churn?", "where is revenue leaking?", "which units could be upsold?", "what are competitors doing in this market?"

**Maturity.** Mixed. `/api/churn-predictions` produces real rows in `churn_predictions`. `/api/market-intel` scrapes SpareFoot and SelfStorage.com via Cheerio, with caching in `facility_market_intel`. The remaining routes read existing PMS data and compute on-the-fly.

**Removal impact.** *Substantial.* Removing this subsystem would eliminate the "operational" half of the product's value proposition. The "demand engine" half (Subsystem 1 + Spine) would remain, but the system would lose its differentiation from a generalist marketing platform.

**Notable structural features.**
- The `moveout_remarketing` model carries `new_tenant_id` to track win-backs: when a former tenant signs a new lease, the new tenant ID is linked back to the moveout campaign that won them back. This is win-back attribution at the tenant level.
- `aggregator-scrape.ts` targets SpareFoot and SelfStorage.com aggressively per CLAUDE.md's data-scraping strategy.

## 5.7 Subsystem 7: Client Reports

**What it does.** Generates monthly client reports (PDF and HTML) summarizing performance and operational metrics. Sent automatically by the `send-client-reports` cron (Monday 9 AM UTC). Read on demand by clients via the portal.

**Where it lives.**
- Routes: `/api/client-reports`, `/api/admin-reports`, `/api/report-open` (email-pixel tracking)
- Cron: `/api/cron/send-client-reports`
- Lib: `src/lib/pdf-report.tsx`
- Models: `client_reports`

**Relation to spine.** Adjacent. The reports read from the spine's attribution data and the operational intelligence subsystem's outputs. They aggregate per-client metrics: spend, leads, move-ins, cost-per-move-in, occupancy delta vs. baseline.

**Maturity.** Functional. The cron-driven monthly generation is in place. The `client_reports` model has unique constraint on `(client_id, report_type, period_start)` preventing duplicate generation. The Anthropic API is used to generate narrative summaries in the report (per Phase 3 cron agent).

**Removal impact.** *Substantial.* Without monthly reports, the client's primary regular touchpoint with the platform would disappear. Email recovery (Subsystem 11) and dashboard browsing would remain.

**Notable structural features.**
- Email open tracking via 1px pixel at `/api/report-open` updates `client_reports.opened_at`.
- The PDF rendering uses `@react-pdf/renderer` — a React-native PDF renderer that lets the same JSX produce both HTML and PDF output.

## 5.8 Subsystem 8: Google Business Profile Integration

**What it does.** Connects to a facility's GBP listing via OAuth, syncs reviews and Q&A, drafts AI responses, publishes posts (offers, events, updates), tracks insights (search/maps views, calls, direction requests).

**Where it lives.**
- Pages: `src/app/portal/gbp/`
- Routes: 6 `/api/gbp-*` routes (Phase 3 Cluster I-9)
- Cron: `/api/cron/process-gbp` (4 AM daily)
- Models: 6 `gbp_*` models

**Relation to spine.** Adjacent. GBP insights feed into client reports (Subsystem 7) and into the audit funnel (Subsystem 1 uses Places-API-derived ratings/reviews; GBP integration provides finer-grained insights for ongoing clients). The spine itself does not directly read GBP data.

**Maturity.** Production. The OAuth lifecycle is fully handled (token refresh in cron when within 30 minutes of expiry). The AI-draft-then-human-approve pattern for review responses is the default; auto-respond is off by default.

**Removal impact.** *Moderate.* GBP is one of several reputation-management surfaces. Removing it would eliminate the AI-drafted review-response feature but the rest of the platform continues. Some clients select StorageAds in part for the GBP automation, so removal would have a commercial cost.

**Notable structural features.**
- `gbp_connections.sync_config` JSON: `{ "auto_post": false, "sync_hours": true, "sync_photos": true, "auto_respond": false }` — conservative defaults (sync but don't auto-publish).
- `gbp_questions.ai_draft` and `gbp_reviews.ai_draft` columns store AI-drafted responses awaiting human approval.

## 5.9 Subsystem 9: Internal Developer Tooling

**What it does.** Provides Blake and Angelo with in-application tracking of commits, deployments, code reviews, dev handoffs, beta testing notes, and feature-idea backlog. Drives the public-facing `/changelog` and the internal `/admin/changelog` editor.

**Where it lives.**
- Pages: `src/app/admin/changelog/`, `src/app/changelog/`
- Routes: 9 routes in Phase 3 Cluster I-16
- Models: 9 models in Phase 2 Cluster T (`commit_*`, `deployment_tags`, `dev_handoffs`, `betapad_notes`, `ideas`, `changelog_entries`)

**Relation to spine.** Independent.

**Maturity.** Functional. The 9 routes and models are wired but their utility derives from disciplined use rather than automation. The `commit-notes/sync` subroute hints at syncing with Git history.

**Removal impact.** *None for customers; substantial for the team.* This is the team's process backbone. Customers see the `/changelog` page (which exposes `laymans_summary` fields from `commit_enrichments`); they don't see the rest.

**Notable structural features.**
- Persisting internal dev metadata in the production database (rather than in a separate tool) means the team operates inside the product. This is unusual and is itself a finding (Phase 2 Cluster T discussion).

## 5.10 Subsystem 10: A/B Testing Infrastructure

**What it does.** Per-facility A/B tests over landing pages. Variants, metrics, and per-event analytics. Statistical significance computation.

**Where it lives.**
- Routes: `/api/ab-tests`
- Models: `ab_tests`, `ab_test_events`

**Relation to spine.** Adjacent. A/B tests run on landing pages, which are the surface where the spine begins. Variant selection happens client-side; per-event analytics flow into the dedicated `ab_test_events` table rather than into `activity_log`.

**Maturity.** Functional. The route handles CRUD; the variant configuration uses the `ab_tests.variants` JSON column; events accumulate in `ab_test_events`.

**Removal impact.** *Moderate.* Without A/B testing, landing pages would have a single variant. Optimization velocity would slow.

**Notable structural features.**
- A composite index on `ab_test_events.(test_id, variant_id, visitor_id, event_name)` (`prisma/schema.prisma:21`) supports the per-visitor per-variant dedup-and-count pattern characteristic of A/B event tracking.

## 5.11 Subsystem 11: Drip and Nurture Engines

**What it does.** Four parallel deferred-work engines:
- **`drip_sequences`** — B2B post-audit drip (one per facility) sending emails over a multi-day cadence to a recently-audited lead.
- **`nurture_sequences` + `nurture_enrollments` + `nurture_messages`** — B2C consumer nurture (for prospective tenants from `partial_leads`).
- **`retention_campaigns` + `churn_predictions`** — B2C tenant retention sequences triggered by high churn risk.
- **`moveout_remarketing`** — Ex-tenant win-back sequences.

**Where it lives.**
- Routes: `/api/drip-sequences`, `/api/nurture-sequences`, `/api/moveout-remarketing`
- Crons: `process-drips` (5 AM), `process-nurture` (6 AM), `process-recovery` (7 AM)
- Lib: `src/lib/drip-email-templates.ts`, `src/lib/drip-sequences.ts`
- Models: Cluster O in Phase 2 (7 models)

**Relation to spine.** Mixed.
- `process-recovery` runs daily and touches `partial_leads` directly — *spine-adjacent operationally*, sending emails to leads with `recovery_status='pending'`.
- `process-nurture` advances enrollments that may include partial leads or tenants. Spine-adjacent.
- `process-drips` operates on the B2B audit funnel side.
- `moveout_remarketing` operates on tenants after they leave.

**Maturity.** Functional. The four engines share an architectural pattern: state machine in the database, advanced by a daily cron, per-step delays encoded as `next_*_at` timestamps. The four were not consolidated into a single sequence engine — each has slightly different trigger logic, audience, exit conditions, and message-channel preferences.

**Removal impact.** *Substantial.* Removing the drip/nurture engines would eliminate the platform's automated multi-touch outreach. Manual one-off emails (via Resend) would remain.

**Notable structural features.**
- `nurture_enrollments.lead_id` AND `tenant_id` are both optional and intended to be mutually exclusive (one or the other).
- `moveout_remarketing.new_tenant_id` captures win-back attribution — when a former tenant rents again, the new tenant ID links back to the moveout campaign.
- The drip templates are hardcoded in `src/lib/drip-email-templates.ts` rather than in `drip_sequence_templates` rows. The DB-backed templates exist but appear to be a future feature.

## 5.12 Subsystem 12: Creative Generation

**What it does.** AI-driven generation of ad copy, images, videos, social posts, and complete marketing plans. Multi-platform (Meta, Google, TikTok), multi-format (static image, video, social).

**Where it lives.**
- Routes: `/api/generate-copy`, `/api/generate-image`, `/api/generate-video`, `/api/generate-social-content`, `/api/generate-social-post`, `/api/marketing-plan`, `/api/synthesize`, `/api/scrape-website` (input data), `/api/google-ads-keywords`, `/api/publish-ad`, `/api/publish-social`, `/api/audience-sync`
- Components: `src/components/admin/facility-tabs/ad-studio`, `creative-studio`, `tiktok-creator`, `video-generator`, `media-library`
- Lib: `src/lib/creative.ts`, `src/lib/copy-templates.ts`, `src/lib/style-references.ts`
- Models: `creative_briefs`, `ad_variations`, `marketing_plans`, `assets`, `style_references`, `platform_connections`, `publish_log`, `social_posts`, `audience_syncs`

**Relation to spine.** Adjacent. Creative generation is the *production* side of paid ads; the spine is the *measurement* side. Ads created here generate the clicks that feed the spine.

**Maturity.** Production but Angelo's domain. CLAUDE.md explicitly states the ad platform integrations and video/image generation tools are Angelo's work and must not be modified without coordination.

**Removal impact.** *Severe.* Without creative generation, clients would need to bring their own ad creative. The platform's full-funnel claim ("ads, landing pages, attribution, and conversion") collapses to just landing-pages-and-attribution.

**Notable structural features.**
- Two Anthropic model tiers: Haiku 4.5 for fast generation (prompt enhancement, social posts) and Sonnet 4 for high-stakes structured generation (marketing plans, ad copy, social content).
- FAL.ai for images (Flux model) and videos (Wan-i2v / Wan-t2v).
- Compliance validation post-generation: `ad_variations.compliance_status` and `compliance_flags` track per-ad compliance with platform policies. The corresponding code lives in `src/lib/compliance.ts`.
- 10 image templates and 6 video templates encode common storage-industry creative patterns (`ad_hero`, `lifestyle_moving`, `before_after`, `seasonal_promo`, etc.).

## 5.13 Subsystem 13: Billing and Subscriptions

**What it does.** Stripe-based subscription billing for partner organizations. Three tier price IDs (Launch / Growth / Portfolio). Stripe webhook handling. Customer portal redirect. Subscription usage tracking.

**Where it lives.**
- Routes: `/api/checkout-success`, `/api/create-checkout-session`, `/api/create-billing-portal`, `/api/stripe-webhook`, `/api/subscription-usage`, `/api/client-billing`, `/api/client-invoices`
- Lib: `src/lib/stripe.ts`
- Models: `organizations.stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `trial_ends_at`, `plan`, `facility_limit`

**Relation to spine.** Independent.

**Maturity.** Functional. The Stripe webhook handler is well-implemented: atomic provisioning of organization + admin user on `checkout.session.completed`; idempotency checks; cancellation flow.

**Removal impact.** *Severe.* No billing = no revenue. The platform would have to operate manually.

**Notable structural features.**
- Plan-based facility limits enforced at signup. The `organizations.facility_limit` field encodes per-tier facility caps.
- The cron `cleanup-organizations` (3:30 AM) hard-deletes soft-deleted orgs past grace period, calling Stripe to cancel the subscription first.

## 5.14 Subsystem 14: Notifications, Push, and Web Push

**What it does.** In-app notifications (Redis-backed), Web Push subscriptions and sending, VAPID key distribution, push notification service worker.

**Where it lives.**
- Routes: `/api/notifications`, `/api/push-send`, `/api/push-subscribe`, `/api/push-vapid-key`
- Lib: `src/lib/notifications.ts`, `src/lib/push.ts`
- Models: `push_subscriptions`, `notifications`
- PWA: `public/sw.js`, root layout `<script>` block in `src/app/layout.tsx:135-145`

**Relation to spine.** Independent.

**Maturity.** Functional. VAPID key generation is in `.env.example`. The service worker is registered in the root layout. Push subscriptions accept the standard `endpoint + p256dh + auth` triple.

**Removal impact.** *Minor.* Push notifications enhance engagement but the platform functions without them.

**Notable structural features.**
- The schema permits `push_subscriptions.user_type` to be `'admin'` (default) or `'client'`, but most subscriptions are admin in current usage.
- A `notifications` table sits alongside Redis-backed real-time notifications, suggesting a hybrid approach where Redis is the live feed and Postgres is the audit history.

## 5.15 Subsystem 15: External V1 API and Outbound Webhooks

**What it does.** Provides a partner-facing external API for programmatic data access and writes, plus an outbound webhook subscription system that emits events to partner endpoints.

**Where it lives.**
- Routes: 12 routes under `/api/v1/`
- Lib: `src/lib/v1-auth.ts`
- Models: `api_keys`, `api_usage_log`, `webhooks`, `webhook_deliveries`

**Relation to spine.** Independent. The v1 API allows external consumers to read the same data the platform produces from the spine, and to write data that may feed the spine (leads, tenants).

**Maturity.** Production. 9 scopes, 60 req/min rate limit, full key-management endpoint, three test files (facilities, leads, tenants tests). Webhook subscription with HMAC-SHA256 signing of payloads, test-dispatch endpoint, delivery audit log.

**Removal impact.** *Moderate.* The external API serves partner integrators; removing it would push integrations off-platform. Partner sessions can still access most data via the partner dashboard.

**Notable structural features.**
- 6 webhook event types: `lead.created`, `lead.updated`, `unit.updated`, `facility.updated`, `special.created`, `special.updated`.
- The `api_usage_log` table preserves a record of every API call for billing-visibility and rate-limit forensics.

## 5.16 Cross-Subsystem Synthesis

The fourteen subsystems are not uniform in their relationship to the spine. Some are *operationally upstream* of the spine (creative generation produces the ads whose clicks initiate the spine; admin operations configure UTM links and campaigns). Others are *operationally downstream* (client reports aggregate spine outputs; the partner API exposes spine data to integrators). Some run *parallel* to the spine on different data (operational intelligence on PMS data; GBP integration on Google's data). Some are *independent* of the spine (internal dev tooling, A/B testing infrastructure).

The subsystem boundaries are clean in code: each subsystem's routes, models, and lib helpers are mostly self-contained, with `facilities` as the shared join axis.

A removal-impact ranking from greatest to least:
1. Admin operations — removes the manual transitions that close the spine's attribution loop
2. Audit funnel — removes commercial demand generation
3. Creative generation — removes the full-funnel promise
4. PMS pipeline and operational intelligence (together) — removes operational differentiation
5. Drip / nurture engines — removes automated outreach
6. Billing — removes monetization
7. Client portal — removes self-serve client visibility
8. Partner dashboard — removes reseller channel
9. Client reports — removes regular touchpoint
10. GBP integration — removes reputation automation
11. External v1 API and webhooks — removes programmatic integration
12. A/B testing — removes optimization velocity
13. Notifications and push — removes engagement enhancement
14. Internal dev tooling — removes team coordination surface

The subsystems are individually well-built but collectively under-consolidated — the four sequence engines, the two diagnostic pipelines, and the two CSP layers are the visible signs that the team has prioritized shipping breadth over consolidating depth.

The next phase (Phase 6) examines whether the breadth is *vertical-specific* (operator-built thesis support) or *generic marketing-automation breadth that happens to be deployed against self-storage*.
