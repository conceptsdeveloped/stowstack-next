# Phase 1 — Repository Orientation

## 1.1 Identity

The project is `storageads-next` (`package.json:2`), a Next.js 16 application on the App Router, deployed on Vercel at `iad1` (`vercel.json:3`). The product self-identifies in the root layout's JSON-LD metadata as `StorageAds` — a `BusinessApplication` providing *"Full-funnel marketing automation for self-storage facilities. Ads, landing pages, call tracking, and move-in attribution"* (`src/app/layout.tsx:91`), with an aggregate offer of four price points ranging from $499 to $2499 (`src/app/layout.tsx:92-98`). The site description in the head metadata reads: *"Stop losing units to bad marketing. StorageAds builds the entire system — ads, landing pages, attribution, and conversion — so independent storage operators fill vacancies and prove every dollar."* (`src/app/layout.tsx:26`).

This is the product's self-presentation. Whether the code supports the claim is the subject of subsequent phases.

## 1.2 Quantitative Baseline

| Quantity | Value | Source |
|----------|-------|--------|
| Total `.ts` files in `src/` | 285 | `find src -name "*.ts" | wc -l` |
| Total `.tsx` files in `src/` | 287 | `find src -name "*.tsx" | wc -l` |
| Total files in `src/` | 575 | `find src -type f | wc -l` |
| Total LOC in `src/` (TS+TSX+JS+JSX) | 124,291 | aggregated `wc -l` |
| Prisma models | 89 | `grep -c "^model " prisma/schema.prisma` |
| `prisma/schema.prisma` lines | 1,815 | `wc -l prisma/schema.prisma` |
| Prisma migrations | 1 (`0_init`) | `ls prisma/migrations/` |
| API route directories under `src/app/api/**` | 190 | `find ... -type d` |
| `route.ts` files in API tree | 178 | `find ... -name route.ts` |
| Page directories under `src/app/` (non-api) | 74 | `find ... -type d` (excludes api) |
| Vercel cron jobs | 13 | `vercel.json:4-18` |
| Environment variables in `.env.example` | 51 | `grep -E "^([A-Z_]+)=" .env.example` |
| Runtime dependencies | 24 | `package.json:16-40` |
| Dev dependencies | 15 | `package.json:41-56` |
| Git commits in history | 115 | `git log --oneline | wc -l` |
| First commit | 2026-03-22 | `git log --reverse --format=%aD` |
| Last commit | 2026-04-06 | `git log --format=%aD | head -1` |
| Active development span | ~15 days | first/last commit delta |
| Distinct authors | 2 (Blake Burkett, angelo) | `git log --format=%an | sort -u` |
| Existing tests | 8 test files | `find src -name "*.test.ts"` |
| Components root directories | 16 | `ls src/components` |
| `lib/` modules | 49 | `ls src/lib` (top-level) |
| `facility-tabs/` subdirectories | 16 | `ls src/components/admin/facility-tabs` |
| Files using `queryRawUnsafe`/`executeRawUnsafe` | 4 (all tests) | `grep -l` survey |
| Files importing Supabase | 0 | `grep -l "supabase" src/...` |
| Files importing FAL.ai | 2 | `src/app/api/generate-video/route.ts`, `src/app/api/generate-image/route.ts` |
| Files calling Meta `graph.facebook.com` or naming "capi" | 10+ | `grep` survey |

The 15-day active-development span over 115 commits is the most striking quantitative fact. The codebase was assembled at high velocity by a two-person team. Every other observation in this analysis is conditioned on that fact.

## 1.3 Stack Semantics

### Core Framework Stack

- **Next.js 16.2.0** (`package.json:30`). The very recent Next 16 release uses the App Router exclusively in this project. No `pages/` directory exists. App Router server components are the dominant pattern in non-`api` routes.
- **React 19.2.4** (`package.json:32-33`). React 19's server-component primitives are available.
- **TypeScript 5.x** (`package.json:54`). Strict mode enabled (`tsconfig.json:7`).
- **Tailwind CSS 4** (`package.json:53`). PostCSS pipeline (`postcss.config.mjs:1-7`).

### Database and ORM

- **Prisma 5.22.0** (`package.json:20`, `package.json:52`).
- **PostgreSQL** (`prisma/schema.prisma:7`). The `directUrl` pattern (`prisma/schema.prisma:8`) is the Neon serverless-Postgres convention — but `DATABASE_URL` is the only one used at runtime; `DIRECT_URL` is used by Prisma migrations. The `@db.Timestamptz(6)` annotations throughout the schema, `gen_random_uuid()` defaults, and `dbgenerated("(total_count - occupied_count)")` for computed columns confirm a PostgreSQL-native schema.
- **Migration archaeology is unavailable.** A single `0_init` migration exists. Either the schema was wiped and re-baselined recently, or migrations were never committed during early development. Either way, the schema-as-it-stands is the only record. Git history on `schema.prisma` itself becomes the substitute.

### Auth and Session

- **Clerk** (`@clerk/nextjs@^7.0.6`, `@clerk/themes@^2.4.57`). Used selectively — see §1.5.
- **In-house org-session tokens.** `ss_`-prefixed bearer tokens, SHA-256 hashed in the `sessions` table (`src/lib/session-auth.ts:7-15`). 30-day expiry. Two header conventions: `Authorization: Bearer ss_...` and `X-Org-Token: ss_...`.
- **In-house v1 API keys.** `sk_live_`-prefixed bearer tokens, SHA-256 hashed in the `api_keys` table, scoped permissions, rate-limited per key, usage logged (`src/lib/v1-auth.ts:38-92`).
- **In-house admin keys.** Two flavors: legacy shared `ADMIN_SECRET` environment variable and per-admin keys prefixed `sa_adm_` in the `admin_keys` table (`src/lib/api-helpers.ts:86-106`). The recent commit `5cb290e` (`fix: 10 replace shared admin secret with per-admin API keys`, 70 files changed) shows the migration is in progress.
- **One-time client codes.** `portal_login_codes` table (`prisma/schema.prisma:831-841`) for email-based magic-code flow. 8-character codes.
- **TOTP/2FA.** `org_users.totp_secret`, `totp_enabled`, `totp_backup_codes` (`prisma/schema.prisma:1122-1124`). Library: `otpauth@^9.5.0` (`package.json:31`). The `/api/2fa` route group exists.

The five distinct authentication systems are an artifact of the four distinct user-types the product serves: anonymous site visitors, paid clients (via the portal), partner-organization users (via partner shell), and admins (Blake + Angelo, with provisions for virtual assistants). The external v1 API is the fifth, for downstream programmatic consumers.

### Payment and Subscriptions

- **Stripe** (`stripe@^20.4.1`, `@stripe/stripe-js@^8.11.0`). Three price IDs in env: `STRIPE_PRICE_LAUNCH`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PORTFOLIO` (`.env.example:20-22`). The product framing names a fourth (custom Enterprise), but only three are environment-bound. Webhook signature verification via `STRIPE_WEBHOOK_SECRET`.

### Email, Messaging, Telephony

- **Resend** (`resend@^6.9.4`). Single transactional email provider per CLAUDE.md.
- **Twilio** (`twilio@^5.13.0`). The presence of the SDK, `STOREDGE_WEBHOOK_SECRET` (`.env.example:91`), `TWILIO_PHONE_NUMBER`, `TWILIO_FROM_NUMBER`, and the `call_logs` and `call_tracking_numbers` models with `twilio_call_sid`/`twilio_sid` unique fields contradicts CLAUDE.md's claim that "Twilio is not set up yet." The data model is present and the SDK is installed; actual usage in route handlers is verified in Phase 3.
- **Web Push** (`web-push@^3.6.7`). VAPID keys configured (`.env.example:26-28`); `push_subscriptions` model; `/api/push-*` routes.

### AI / Generative

- **Anthropic SDK** (`@anthropic-ai/sdk@^0.80.0`). The canonical LLM client. Listed uses per CLAUDE.md: audit generation, copy, marketing plans, GBP responses.
- **Runway ML** (`RUNWAY_API_KEY` in env). Video generation per CLAUDE.md.
- **Replicate** (`REPLICATE_API_TOKEN` in env). Per `next.config.ts:86` it's allowed as an image origin (`replicate.delivery`).
- **FAL.ai** referenced in CLAUDE.md but `FAL_KEY` is absent from `.env.example`. The actual generate-video and generate-image route handlers do import FAL — confirmed in Phase 3.
- **Unsplash** (`UNSPLASH_ACCESS_KEY`). Stock images via `/api/stock-images`.

### Ad and Marketing Platforms

- **Meta** (`META_APP_ID`, `META_APP_SECRET`, `META_PIXEL_ID`, `META_ACCESS_TOKEN`, `FB_APP_SECRET`, `NEXT_PUBLIC_META_PIXEL_ID`). No SDK in `package.json`; calls are direct `fetch` to `graph.facebook.com`. `/api/meta-capi` exists.
- **Google Ads** (`GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_CONVERSION_ID`, `GOOGLE_CONVERSION_LABEL`). No SDK; direct OAuth + REST.
- **Google Analytics 4** (`NEXT_PUBLIC_GA4_MEASUREMENT_ID`). Client-side gtag + server-side Measurement Protocol (verified Phase 3).
- **Google Business Profile** (`GOOGLE_GBP_CLIENT_ID`, `GOOGLE_GBP_CLIENT_SECRET`). Separate OAuth client from Ads — substantial subsystem with 6 `gbp_*` models.
- **Google Places API** (`GOOGLE_PLACES_API_KEY`). Used for facility lookup at intake.
- **TikTok** (`TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`). OAuth + publish.
- **Cal.com** (`NEXT_PUBLIC_CALCOM_LINK`). Embed only; webhook handler at `/api/webhooks/calcom`.

### Storage and Edge

- **Vercel Blob** (`@vercel/blob@^2.3.1`, `BLOB_READ_WRITE_TOKEN`). Used for file uploads (PMS reports, creative assets).
- **Upstash Redis** via Vercel KV (`@upstash/redis@^1.37.0`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`). Rate limiting and caching.

### Observability

- **Sentry** (`@sentry/nextjs@^10.46.0`). Three config files (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`), with `tracesSampleRate: 0.1` and a `beforeSend` hook that scrubs `authorization`, `cookie`, `x-admin-key`, and `x-org-token` headers from outgoing events (`sentry.server.config.ts:11-19`). Replay sessions enabled at error-rate only on the client (`sentry.client.config.ts:7-8`).

### Other Notable Dependencies

- **`cheerio@^1.2.0`** — HTML parsing. Implies website scraping (confirmed in `src/lib/scrape-website.ts`).
- **`@react-pdf/renderer@^4.3.2`** — Server-rendered PDFs. Used by `src/lib/pdf-report.tsx`. Not mentioned in CLAUDE.md.
- **`recharts@^3.8.0`** — Client charting. Used in dashboards.
- **`lucide-react@^0.577.0`** — Icon library. Used despite CLAUDE.md's "never use icon libraries" rule. This is a CLAUDE.md-vs-code inconsistency to log.
- **`sharp@^0.34.5`** — Image processing.
- **`happy-dom@^20.8.8`** + **`vitest@^2.1.9`** + `@testing-library/react@^16.3.2` + `@testing-library/jest-dom@^6.9.1` — A full test infrastructure that CLAUDE.md says does not exist.

### Vestigial: Supabase

`@supabase/ssr@^0.9.0` and `@supabase/supabase-js@^2.99.3` are in dependencies (`package.json:24-25`), but no source file under `src/` imports either. The packages are dead weight — likely a holdover from a pre-Neon iteration. Not mentioned in CLAUDE.md.

## 1.4 Build, Deploy, and Operational Posture

### Build Script

```
build: prisma generate && prisma migrate deploy && next build
```

(`package.json:7`). Migrations are deployed at build time. Because only `0_init` exists, this is a no-op except for schema-drift detection. There is no separate "release" or "deploy" command — Vercel builds from `main` and that's the deploy.

### Regions and Headers

- Deployment region: `iad1` (`vercel.json:3`). US-East-1 only.
- All `/api/*` responses default to `Cache-Control: no-store` (`vercel.json:21-24`).
- Long-lived caching on static SVGs and fonts (`vercel.json:26-37`).

### Security Headers

Two layers of security-header application — and they disagree.

**In `next.config.ts:4-30`** — sets the actual enforced CSP via the `headers()` callback. The CSP is permissive in `script-src` (includes Facebook Connect, GTM, Google Adservices, GA4, Cal.com, Clerk, Stripe, Sentry) and in `frame-src` (includes `*.storedge.com`, Cal.com, Stripe Checkout, Stripe Hooks, Clerk). This is the user-facing CSP.

**In `src/middleware.ts:14-28`** — sets `Content-Security-Policy-Report-Only` (note: report-only) and a different set of directives. This second CSP would be advisory if the first weren't present.

In practice, the enforced CSP is the more permissive `next.config.ts` version because Next applies `headers()` before middleware response headers. The middleware CSP appears to be a remediation work-in-progress (`fix: 17 add security headers and CSP in report-only mode`, commit `e081721`). This contradiction has been logged.

### Sentry Configuration

Three environments (`server.config`, `client.config`, `edge.config`). The server-side beforeSend hook scrubs sensitive headers from outgoing events. The middleware sets `Sentry.setTag("route", request.nextUrl.pathname)` and `Sentry.setTag("method", request.method)` for every request (`src/middleware.ts:90-91`), enriching every captured error with route context.

### Cron Jobs (13)

| # | Path | Schedule | Inferred Purpose |
|---|------|----------|------------------|
| 1 | `/api/cron/cleanup-sessions` | `0 3 * * *` | Delete expired org sessions |
| 2 | `/api/cron/send-client-reports` | `0 9 * * 1` | Weekly Monday-morning client reports |
| 3 | `/api/cron/aggregate-page-stats` | `0 2 * * *` | Aggregate raw `page_interactions` into rollups |
| 4 | `/api/cron/sync-audiences` | `0 1 * * 0` | Weekly Sunday Meta custom-audience sync |
| 5 | `/api/cron/weekly-digest` | `0 9 * * 5` | Friday weekly digest email |
| 6 | `/api/cron/review-solicitation` | `0 10 * * *` | Daily review solicitation outreach |
| 7 | `/api/cron/process-gbp` | `0 4 * * *` | Daily GBP sync and post processing |
| 8 | `/api/cron/process-drips` | `0 5 * * *` | Daily drip-sequence advancement |
| 9 | `/api/cron/process-nurture` | `0 6 * * *` | Daily nurture-sequence advancement |
| 10 | `/api/cron/process-recovery` | `0 7 * * *` | Daily partial-lead recovery sends |
| 11 | `/api/cron/check-campaign-alerts` | `0 8 * * *` | Daily campaign performance alerts |
| 12 | `/api/cron/cleanup-organizations` | `30 3 * * *` | Hard-delete soft-deleted orgs after grace period |
| 13 | `/api/cron/data-retention` | `0 4 * * *` | Trim unbounded log tables |

Two of these (`process-drips`, `process-nurture`) implement parallel sequence engines — see Phase 5. Three (`process-recovery`, `review-solicitation`, `weekly-digest`) drive outbound customer touches. Four (`cleanup-sessions`, `cleanup-organizations`, `data-retention`, `aggregate-page-stats`) are operational hygiene. The schedules are staggered every hour from 1 AM through 10 AM UTC — likely to avoid spiking Anthropic or Resend usage limits in any single minute.

Three of these cron jobs are not described in any of the CLAUDE.md drift (the doc claims 9). All 13 are wired in `vercel.json` and have corresponding directories under `src/app/api/cron/`.

## 1.5 Authentication Topology

The middleware (`src/middleware.ts:88-134`) orchestrates four protocols in sequence:

1. **Sentry route tagging** for every request.
2. **CSRF validation** for state-changing API requests. Exempt paths: `/api/webhooks/`, `/api/stripe-webhook`, `/api/call-webhook`, `/api/cron/`, `/api/v1/`, plus any request bearing `x-admin-key`, `Authorization: Bearer`, or `x-org-token` (`src/middleware.ts:75-86`). Token-authenticated requests are CSRF-exempt because they aren't cookie-authenticated.
3. **API short-circuit.** `/api/*` requests skip Clerk entirely. API handlers self-authenticate (`src/middleware.ts:110-112`).
4. **Clerk gate.** Only applied when production Clerk keys are present (`pk_live_` prefix). With test or missing keys, Clerk is silently skipped to avoid Vercel preview-deployment errors. When Clerk is applied, every path in the public-route list bypasses `auth.protect()` (`src/middleware.ts:46-67`). The public-route list includes essentially every page route in the app (`/portal(.*)`, `/partner(.*)`, `/admin(.*)`), which means Clerk does not currently gate access to those pages either. Per-page in-code gating is the operative pattern.

The CSRF system uses a double-submit pattern: `__csrf_token` cookie + `x-csrf-token` header, both 32-byte hex, constant-time-compared (`src/lib/csrf.ts:27-41`).

The CSRF token is generated using Web Crypto API (`crypto.getRandomValues`) rather than Node's `crypto.randomBytes`, per recent commit `b654c5a` (`fix: use Web Crypto API in CSRF lib for edge runtime compatibility`). This is the right choice — `src/middleware.ts` runs in the edge runtime and Node `crypto` would fail there.

## 1.6 Directory Cartography

### `src/app/` (Non-API)

```
about/                  — Static marketing page
admin/                  — Admin shell (sidebar + login gate). 14 sub-routes:
  activity/               (live event feed)
  audits/                 (generated audit list)
  billing/                (Stripe management)
  calls/                  (Twilio call log)
  campaigns/, campaigns/create/  (ad campaign manager)
  changelog/              (internal changelog editor)
  consumer-leads/         (B2C leads to facilities, not B2B leads to the platform)
  facilities/             (the 16-tab facility manager — the largest single surface)
  insights/               (cross-facility analytics)
  kanban/                 (pipeline kanban for B2B leads)
  onboarding/             (admin-driven client onboarding)
  partners/               (partner org administration)
  pipeline/               (B2B sales pipeline)
  pms-queue/              (PMS upload processing queue — admins process portal uploads)
  portfolio/              (portfolio analytics across facilities)
  recovery/               (partial-lead recovery dashboard)
  reports/                (client-report generator)
  sequences/              (drip/nurture sequence editor)
  settings/, style-references/
audit/[slug]/           — Public shared-audit landing page (the spine endpoint)
audit/sample/           — Demo audit
audit-tool/             — Audit funnel entry form
blog/                   — File-system-backed blog (with feed.xml RSS)
calculator/             — Marketing calculator (utility for sales)
case-studies/[slug]/    — Static case-study pages
changelog/              — Public-facing changelog
compare/[competitor]/   — Comparison landing pages (e.g., StorageRankers, Storable)
cookies/, privacy/, terms/, dpa/, data-deletion/  — Legal pages
demo/                   — Self-serve and live-call demo
diagnostic/             — Alternate/older diagnostic tool (parallel to audit-tool)
docs/                   — Product documentation
guide/                  — Onboarding/getting-started guide
help/                   — Help center
insights/               — Public market insights
lp/[slug]/              — Dynamic landing pages from DB
offline/                — Service-worker offline page (PWA)
partner/                — Partner shell. 8 sub-routes: api-keys, audit-log, changelog, facilities, revenue, settings, team, webhooks
portal/                 — Client portal. 8 sub-routes: billing, campaigns, gbp, messages, onboarding, reports, settings, upload
pricing/                — Pricing page (3-4 tier reference)
signup/                 — Org signup flow
status/                 — Status page
verify-email/           — Email verification
walkin/[code]/          — QR code-driven walk-in attribution capture (industry-specific)
```

The route directory itself encodes the product's surface. Three primary authenticated dashboards (`admin`, `partner`, `portal`) plus the public marketing site, plus the audit and diagnostic funnels, plus the walk-in attribution capture. Twenty-nine top-level page routes, of which fourteen are admin-only.

### `src/app/api/` Top-Level Groups

178 `route.ts` files spread across 190 directories. The 25 most distinctive top-level groups (selection from §1.6, full list referenced in Phase 3):

- `attribution/`, `meta-capi/`, `google-conversion/`, `walkin-attribution/`, `tracking/event/`, `tracking/visit/` — six attribution endpoints
- `audit-form/`, `audit-generate/`, `audit-generate-diagnostic/`, `audit-load/`, `audit-report/`, `audit-save/`, `audit-approve/`, `shared-audits/` — eight audit-pipeline endpoints
- `diagnostic-analyze/`, `diagnostic-intake/` — two diagnostic-pipeline endpoints (parallel to audit, see Phase 4)
- `lead-capture/`, `partial-lead/`, `lead-analytics/`, `lead-score/`, `consumer-lead/`, `consumer-leads/`, `export-leads/` — seven lead endpoints
- `auth/google/`, `auth/meta/`, `auth/tiktok/`, `auth/gbp/`, `auth/me/` — five OAuth endpoints
- `gbp-insights/`, `gbp-posts/`, `gbp-questions/`, `gbp-reviews/`, `gbp-review-settings/`, `gbp-sync/` — six GBP endpoints
- `cron/...` (13) — see §1.4
- `v1/` (12 sub-routes) — external API surface
- `webhooks/calcom/`, `webhooks/storedge/`, `stripe-webhook/`, `call-webhook/`, `data-deletion/meta-callback/` — five inbound webhook handlers
- `commit-comments/`, `commit-flags/`, `commit-notes/`, `commit-reviews/`, `deployment-tags/`, `dev-handoffs/`, `betapad-notes/`, `ideas/` — eight internal-developer-tooling endpoints
- `generate-copy/`, `generate-image/`, `generate-video/`, `generate-social-content/`, `generate-social-post/` — five AI-generation endpoints
- `pms-data/`, `pms-upload/`, `facility-pms/`, `admin-pms-queue/`, `storedge-import/`, `portal-upload/` — six PMS-data ingest endpoints
- `occupancy-forecast/`, `occupancy-intelligence/`, `market-intel/`, `revenue-intelligence/`, `revenue-loss/`, `churn-predictions/`, `upsell/` — seven operational-intelligence endpoints

The functional distribution (counted carefully in Phase 3): tracking and attribution endpoints are ~6 of 178 (3.4%); audit and diagnostic pipeline ~10 (5.6%); admin and admin-key-protected endpoints ~18 (10.1%); platform integrations and OAuth ~20 (11.2%); PMS-data ingest ~6 (3.4%); operational intelligence ~7 (3.9%); content generation ~5 (2.8%); internal dev tooling ~8 (4.5%); cron ~13 (7.3%); v1 external API ~12 (6.7%). The remaining ~70 endpoints cover billing, portal, partner, GBP, lead pipeline, sequences, and the long tail of CRUD.

### `src/lib/` (49 modules)

The library directory is the spine of cross-cutting concerns. Notable inhabitants beyond those covered in §1.5:

- `aggregator-scrape.ts` — scraping competing aggregators (SpareFoot, etc.) for market intel
- `compliance.ts` — ad-platform compliance checks
- `copy-templates.ts`, `creative.ts` — creative-generation prompts and templates
- `csv-exporter.ts` — admin and partner exports
- `drip-email-templates.ts`, `drip-sequences.ts` — drip engine internals
- `facility-context.tsx` — React Context for facility selection (admin-side state)
- `facility-pms-queries.ts` — shared SQL for PMS dashboards
- `logger.ts` — Sentry-integrated structured logger
- `notifications.ts` — in-app notification helpers
- `pdf-report.tsx` — React PDF rendering for client reports
- `platform-auth.ts` — OAuth helpers for ad platforms
- `pms-column-mapper.ts` — heuristic column-name mapper for PMS CSV/Excel upload
- `push.ts` — Web Push helpers
- `queries/facility-analytics.ts` — shared SQL queries (recently extracted, per commit `f58be98`)
- `rate-limit.ts`, `rate-limit-tiers.ts`, `with-rate-limit.ts` — rate-limit infrastructure
- `sample-audit.ts` — sample audit JSON for `/audit/sample`
- `scrape-website.ts` — Cheerio-based website scraper
- `soft-delete.ts` — soft-delete helpers
- `style-references.ts` — image style references for ad creative
- `synthesis.ts` — AI synthesis helpers (multi-step Anthropic calls)
- `tracking-params.ts` — UTM/click ID extraction helpers

### `src/components/` (16 root subdirectories)

- `admin/` — admin shell + `campaigns/` + `facility-tabs/` (16 tabs) + `settings/`
- `marketing/` — homepage chapters
- `portal/`, `partner/` — shell-and-page components for those dashboards
- `billing/`, `blog/`, `case-studies/`, `dashboard/`, `date/`, `export/`, `keyboard/`, `onboarding/`, `search/`, `team/`, `ui/` — supporting clusters
- `storedge/` — storEDGE-specific widget embed components

### `src/test/`

- `setup.ts` — vitest setup (imports `@testing-library/jest-dom/vitest`)
- `helpers.ts` — test helpers

Test framework: configured (`vitest.config.ts:5`) but exercised only on auth helpers, v1 API routes, and the Stripe webhook handler (8 test files, see §1.2). The rest of the codebase has no test coverage.

## 1.7 CLAUDE.md Exegesis

Only one CLAUDE.md file exists in the project (the root one, also embedded in the prompt). No nested CLAUDE.md files override it. AGENTS.md is included as a brief reference to Next 16's API churn.

Substantive rules in CLAUDE.md, categorized:

### Governance
- "Stop and report when done." (task discipline)
- "If ambiguous, ask. Do not improvise." (task discipline)
- "Commit exactly as specified." (commit hygiene)
- "Build verification" — must run `prisma validate`, `tsc --noEmit`, `npm run build` after every task.

### Style
- Light theme only. No dark mode.
- Color palette tokens enumerated (`--color-dark`, `--color-light`, etc.)
- Typography: Poppins (headings) + Lora (body); no other fonts.
- "Logo: `storageads` — 'storage' in --color-dark, 'ads' in --color-gold." (Matches `src/app/layout.tsx` JSON-LD branding.)
- Never use pure black or white; never use Tailwind default grays; never gradients; never icon libraries.

(The "never icon libraries" rule contradicts `lucide-react` being a dependency. This is logged.)

### Architectural Constraint
- Path alias `@/*` → `src/*`.
- Singleton Prisma client in `src/lib/db.ts`.
- All emails from `*@storageads.com`.
- Admin authentication is `X-Admin-Key` header.
- Client portal: email + access code, localStorage-stored.
- Partner sessions: `ss_`-prefixed tokens in `org_sessions` (actual model name is `sessions` — minor naming drift).

### Business-Rule Encoding
- "Phase 1 (current): Manual upload of facility management reports — PDF, CSV, and Excel only. No API integrations yet."
- Aggregators to scrape "aggressively": Google Maps, competitor websites, RentCafe, SpareFoot, Yardi, Crexi.
- Angelo owns ad platform integrations and video/image generation; do not modify without coordination.

### Prohibition
- `$queryRawUnsafe`/`$executeRawUnsafe` are ESLint-banned (`eslint.config.mjs:19-25`). The ban is enforced in code.

The CLAUDE.md is more accurate as a *normative* document (what should be) than as a *descriptive* one (what is). Several descriptive claims have drifted from the code as the code grew. The contradictions are logged.

## 1.8 Documentation Layer

The root directory contains 14 large markdown documents totaling ~250 KB of prose. Categorized:

- **Strategy and copy**: STRATEGY.md (28 KB), CREATIVE.md (16 KB), about-page.md, linkedin-posts-founder.md
- **QA results**: AUDIT_RESULTS.md (44 KB), CODEX_SAAS_QA_REVIEW.md (12 KB), COPY_QA_AUDIT.md (29 KB), FULL_COPY_AUDIT.md (23 KB)
- **Shipping readiness**: SHIP_READINESS_AUDIT.md (18 KB), CHANGELOG.md, MOBILE_OPTIMIZATION.md (39 KB)
- **Compliance**: COMPLIANCE.md (6 KB)
- **Process**: CLAUDE.md, AGENTS.md, CLAUDE_CODE_ENFORCEMENT.md (4 KB), README.md (the default Next.js boilerplate, content-free)

In `docs/`:
- `ad-builder-spec.md` — ad builder feature specification
- `feature-audit-00-overview.md` and `01-08` — eight per-feature audit documents (performance reporting, audit funnel, onboarding, marketing site, client portal, monthly reports, call tracking, GBP management)
- `claude-qa-fix-brief.md`, `raw-query-audit.md`, `security-audit.md` — operational audit briefs

In `storageads-remediation-tasks/`:
- 24 numbered task files (00-INDEX + 01-23). Each is a self-contained remediation spec — security fixes, architecture cleanups, data-integrity tightening. Many have been executed (visible in commit messages: `fix: 10`, `fix: 11`, …, `fix: 23`).

In `StorageAds-Market-Research/`:
- External market research (not yet read; if it informs Phase 8 it will be incorporated then).

The volume and structure of these documents is itself a finding: the system has been subjected to multiple rounds of formalized audit and remediation. This is unusually disciplined for a 15-day pre-launch codebase.

## 1.9 Initial Hypothesis (To Be Tested)

Based on Phase 1 evidence:

> The system is a full-funnel marketing and operations platform for self-storage operators that simultaneously (a) generates demand via a free public audit tool and SEO landing pages, (b) operates a multi-platform paid-acquisition engine (Meta + Google + TikTok), (c) attributes outcomes server-side from click through to walk-in / call / form-fill, and aspires to attribute through to move-in, (d) ingests and analyzes property-management system (PMS) data for occupancy and revenue intelligence, (e) automates retention, churn-prediction, and move-out remarketing on the tenant side, and (f) layers on a partner / white-label channel for management companies that re-sell or refer.

The technical center of gravity is the click-to-conversion attribution chain (`/api/attribution`, `/api/meta-capi`, `/api/google-conversion`, `/api/walkin-attribution`, `/api/tracking/...`, `/api/call-webhook`, plus the `partial_leads`, `utm_links`, `call_logs`, `campaign_spend` schema). This chain is the candidate spine for Phase 4. The audit tool is the public-facing surface that fills the top of the funnel; it is not the spine but it is the demand source that feeds the spine.

**Evidence supporting the hypothesis** (all to be confirmed in subsequent phases):
- Six dedicated attribution endpoints (`api/attribution`, `api/meta-capi`, `api/google-conversion`, `api/walkin-attribution`, `api/tracking/{event,visit}`)
- The `partial_leads` schema captures `fbclid`, `gclid`, full UTM, IP hash, exit intent, scroll depth (`prisma/schema.prisma:1207-1242`) — engineering-grade tracking
- `client_campaigns.cost_per_move_in` and `roas` fields exist (`prisma/schema.prisma:299-300`) — the move-in metric is first-class in the schema
- `/walkin/[code]` and `/api/walkin-attribution` route pair — walk-in (industry-specific) attribution
- Nine `facility_pms_*` tables — full PMS data model (occupancy, rent roll, revenue, tenant rates, ECRI, aging, length-of-stay, specials, snapshots)
- ECRI fields (`ecri_flag`, `ecri_suggested`, `ecri_revenue_lift`) — industry-specific terminology in the schema (encoded operator knowledge)
- `tenants` table with `move_in_date`, `lease_end_date`, `days_delinquent` — tenant data model exists
- Six `gbp_*` tables — Google Business Profile substantial subsystem (review responses, posts, Q&A, insights)
- 13 cron jobs implementing scheduled operational hygiene
- Three drip / nurture engines (drip, nurture, moveout_remarketing) — repeated pattern indicates the team learned which model fits which use case
- `rev_share_*` and `referrals` models — partner monetization is built-in to the platform

**Evidence that would refute or weaken the hypothesis:**
- If the attribution endpoints turn out to be empty stubs (Phase 3 must verify)
- If the PMS ingest path requires manual processing the system cannot automate (CLAUDE.md states this is true for Phase 1)
- If the move-in attribution chain breaks at a specific hop and the missing piece is not architecturally specified anywhere (Phase 4 must trace)
- If the domain-specific terminology is shallow — only in field names but not in defaults or edge-case handling (Phase 6)

**Surprises so far:**
- The 13-cron schedule, not 9
- The 89-model schema, not 75 — a substantial 19% drift
- The `commit_*` and `dev_handoffs` internal-developer-tooling models persisted to the production database
- The data-deletion compliance models (`fb_deletion_requests`, `data_deletion_requests`) — privacy posture is more developed than CLAUDE.md indicates
- The TOTP and email-verification flows — security posture is more developed than CLAUDE.md indicates
- The external v1 API (12 routes, full key-scope-rate-limit infrastructure, three test files) — this is a load-bearing surface, not a side-project
- The PWA registration (`navigator.serviceWorker.register('/sw.js')`) in the root layout — there is a mobile-installable client wrapper
- The two parallel "diagnostic" pipelines (`/audit-tool` + `/api/audit-*` and `/diagnostic` + `/api/diagnostic-*`) — Phase 4 must determine which is canonical

The hypothesis stands. Phases 2–10 will sharpen it, refute pieces of it, or replace it.

## 1.10 Bridge to Phase 2

The next phase reads the schema model-by-model, computes the relationship graph centrality, traces the entity-chains that form workflows, and produces the implied-capabilities catalogue. The 89-model schema is the single richest source of evidence in the codebase about what the system was *designed* to do. The API surface (Phase 3) will then reveal what is *implemented*, and the divergence between them is itself a finding.
