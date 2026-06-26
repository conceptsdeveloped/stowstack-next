# StorageAds.com — Site Map & Architecture

> Auto-generated reference. 73 page routes · 184 API routes · 21 cron jobs · 12 v1 external endpoints.
> Last mapped: 2026-06-19. Regenerate by re-walking `src/app/`.

## Auth model (4 independent systems)

| Section | Gate | Mechanism |
|---|---|---|
| Public / marketing | none | Open |
| `/admin/*` | `X-Admin-Key` header vs `ADMIN_SECRET` | `requireAdminKey()` — Blake + Angelo |
| `/portal/*` | Email + access code (localStorage session) | Access code issued when lead → `client_signed` |
| `/partner/*` | Email + password + org slug → `ss_` session token (30-day) | `getSession()` on `org_sessions` |

Clerk wraps all routes via `src/proxy.ts` but marks everything public — each section gates itself.

---

## 1. Public / Marketing (26 pages)

| Route | Purpose |
|---|---|
| `/` | Homepage (lazy-loaded marketing chapters) |
| `/about` | About |
| `/pricing` | Pricing (Good/Better/Best + Enterprise) |
| `/demo` | Demo — self-serve **and** live sales-call demos |
| `/signup` | Signup |
| `/overview` | Product overview |
| `/guide` | Guide |
| `/docs` | Docs |
| `/help` | Help |
| `/status` | System status |
| `/calculator` | ROI/pricing calculator |
| `/diagnostic` | Marketing diagnostic |
| `/cost-of-inaction` | Cost-of-inaction tool |
| `/insights` | Insights |
| `/verify-email` | Email verification |
| `/offline` | PWA offline fallback |

**Audit funnel (top-of-funnel):**
| Route | Purpose |
|---|---|
| `/audit-tool` | Enter facility info → marketing diagnostic |
| `/audit/[slug]` | Shared audit result |
| `/audit/sample` | Sample audit |

**Blog** (not live yet — file-based, `src/lib/blog.ts`):
`/blog` · `/blog/[slug]`

**Case studies:** `/case-studies` · `/case-studies/[slug]`

**Dynamic / programmatic:**
| Route | Purpose |
|---|---|
| `/compare/[competitor]` | Competitor comparison pages |
| `/lp/[slug]` | DB-driven landing pages (section configs) |
| `/walkin/[code]` | Walk-in attribution capture |

## 2. Legal (5 pages)
`/privacy` · `/terms` · `/cookies` · `/dpa` · `/data-deletion`

---

## 3. Admin (24 pages) — `X-Admin-Key`

Shell: `src/components/admin/admin-shell.tsx` (sidebar + login gate). Sidebar groups:

**LEADS**
- `/admin` — Pipeline (home)
- `/admin/kanban` — Kanban
- `/admin/consumer-leads` — Consumer Leads
- `/admin/recovery` — Recovery

**FACILITIES**
- `/admin/pipeline` — Facility Pipeline
- `/admin/portfolio` — Portfolio
- `/admin/facilities` — **Facility Manager** (20-tab workspace, see below)
- `/admin/pms-queue` — PMS Queue

**MARKETING**
- `/admin/funnels` — Funnels  ·  `/admin/funnels/[id]` — funnel detail
- `/admin/campaigns` — Campaigns  ·  `/admin/campaigns/create` — create flow (reached from Campaigns)
- `/admin/style-references` — Creative Library
- `/admin/sequences` — Sequences
- `/admin/insights` — Insights

**REVENUE**
- `/admin/billing` — Billing

**OPERATIONS**
- `/admin/activity` — Activity
- `/admin/calls` — Calls
- `/admin/audits` — Diagnostics
- `/admin/reports` — Reports
- `/admin/partners` — Partners

**SYSTEM**
- `/admin/onboarding` — Setup (operator setup wizard)
- `/admin/settings` — Settings
- `/admin/changelog` — Changelog

**Nested (reached from parent, not its own nav item):** `/admin/campaigns/create` (from Campaigns)

### Facility Manager tabs (`/admin/facilities` — 20 lazy-loaded tabs)
Single page, tab workspace. `src/components/admin/facility-tabs/`.

- **(Overview)** — Overview
- **AD STUDIO** — Creative Studio · Ad Generator · Publish Ads · Google Ads Lab · TikTok Creator · Video Generator · Media Library
- **MARKETING** — Funnels · Landing Pages · UTM Links · Google Business · Social Media · Lead Nurture
- **INTELLIGENCE** — Occupancy Intel · Market Intel · Revenue Analytics
- **OPERATIONS** — Tenant CRM · PMS Data · Call Tracking

> Note: CLAUDE.md flags this for reorg — ad creator/manager/publisher should split out of the facility overview.
> AD STUDIO + video/image gen are **Angelo's domain** — do not modify without coordination.

---

## 4. Client Portal (9 pages) — email + access code

Shell: `src/components/portal/portal-shell.tsx` (desktop sidebar) + `portal-bottom-tabs.tsx` (mobile).

| Route | Sidebar label |
|---|---|
| `/portal` | Dashboard |
| `/portal/campaigns` | Campaigns |
| `/portal/gbp` | GBP |
| `/portal/reports` | Reports |
| `/portal/upload` | Upload (FMS reports — PDF/CSV/Excel) |
| `/portal/messages` | Messages |
| `/portal/billing` | Billing |
| `/portal/onboarding` | Onboarding wizard |
| `/portal/settings` | Settings |

Mobile bottom tabs: Home · Campaigns · Reports · Upload · Messages · Settings

---

## 5. Partner Dashboard (9 pages) — org session (resellers + referral partners)

Shell: `src/components/partner/partner-shell.tsx`.

| Route | Label |
|---|---|
| `/partner` | Overview |
| `/partner/facilities` | Facilities |
| `/partner/team` | Team |
| `/partner/revenue` | Revenue |
| `/partner/api-keys` | API Keys |
| `/partner/webhooks` | Webhooks |
| `/partner/audit-log` | Audit Log |
| `/partner/changelog` | Changelog |
| `/partner/settings` | Settings |

---

## 6. API surface (184 routes, `src/app/api/`)

Every route exports `OPTIONS` for CORS (`corsResponse()`). Grouped by purpose:

**Audit / diagnostic funnel**
`audit-form` · `audit-generate-diagnostic` · `audit-load` · `audit-save` · `audit-approve` · `shared-audits` · `diagnostic-intake` · `analyze-map`

**Leads**
`lead-capture` · `lead-score` · `lead-analytics` · `partial-lead` · `consumer-lead` · `consumer-leads` · `admin-leads` · `export-leads`

**Facilities**
`admin-facilities` · `facility-lookup` · `facility-context` · `facility-assets` · `facility-creatives` · `facility-pms` · `places-photo` · `scrape-website`

**Creative / ad generation (Angelo)**
`generate-copy` · `generate-image` · `generate-video` · `generate-video/status` · `generate-social-content` · `generate-social-post` · `social-posts` · `publish-ad` · `publish-social` · `stock-images` · `proxy-video` · `style-references`

**Google Business Profile**
`gbp-insights` · `gbp-posts` · `gbp-questions` · `gbp-reviews` · `gbp-review-settings` · `gbp-sync` · `portal-gbp`

**Funnels / landing / plans**
`funnels` · `funnels/generate` · `funnel-metrics` · `landing-pages` · `landing-pages/generate` · `marketing-plan` · `ideas`

**Campaigns / sequences / remarketing**
`campaign-alerts` · `campaign-spend` · `drip-sequences` · `nurture-sequences` · `audience-sync` · `moveout-remarketing` · `upsell` · `utm-links` · `review-request`

**Client portal**
`client-activity` · `client-billing` · `client-campaigns` · `client-data` · `client-invoices` · `client-messages` · `client-onboarding` · `client-reports` · `onboarding-checklist` · `portal-upload` · `resend-access-code`

**Partner / org**
`organizations` · `org-activity` · `org-email` · `org-facilities` · `org-users` · `partner-signup` · `partner/profile` · `partner/avatar` · `partner/organization` · `partner/sessions` · `partner/onboarding` · `partner/notifications` · `partner/notifications/preferences` · `partner/changelog-viewed` · `partner/audit-log` · `referrals`

**Billing / Stripe**
`create-checkout-session` · `create-billing-portal` · `checkout-success` · `subscription-usage` · `stripe-webhook`

**PMS / occupancy / revenue intel**
`pms-data` · `pms-upload` · `admin-pms-queue` · `storedge-import` · `occupancy-forecast` · `occupancy-intelligence` · `revenue-intelligence` · `revenue-loss` · `market-intel` · `churn-predictions` · `attribution`

**Calls / SMS**
`call-logs` · `call-tracking` · `call-webhook` · `sms-send`

**Auth / account**
`auth/me` · `auth/gbp` · `auth/gbp/callback` · `auth/google/callback` · `auth/meta/callback` · `auth/tiktok/callback` · `2fa` · `password-reset` · `signup` · `verify-email` · `upload-token`

**Platform connections / conversions**
`platform-connections` · `meta-capi` · `google-conversion` · `google-ads-keywords` · `data-deletion` · `data-deletion/meta-callback`

**Notifications / push**
`notifications` · `push-send` · `push-subscribe` · `push-vapid-key` · `send-template`

**Tracking / analytics**
`tracking/event` · `tracking/visit` · `page-interactions` · `page-interaction-stats` · `report-open` · `walkin-attribution` · `public-activity` · `public-stats` · `activity-log` · `alert-history`

**Admin / system**
`admin-keys` · `admin-reports` · `admin-settings` · `changelog` · `health` · `synthesize` · `tenants` · `r` (short-link redirect)

**Webhooks**
`stripe-webhook` · `webhooks/calcom` · `webhooks/storedge` · `call-webhook` · `data-deletion/meta-callback`

### Cron jobs (21, `src/app/api/cron/`)
All validate `CRON_SECRET` via `src/lib/cron-auth.ts` (fail-closed). 9 wired in `vercel.json`.

`aggregate-page-stats` · `check-campaign-alerts` · `cleanup-organizations` · `cleanup-sessions` · `data-retention` · `generate-noi-reports` · `process-drips` · `process-gbp` · `process-nurture` · `process-pms-uploads` · `process-recovery` · `process-synthesis-queue` · `retry-diagnostic-audits` · `review-solicitation` · `score-churn-risk` · `score-ecri-sensitivity` · `send-client-reports` · `sync-audiences` · `update-retention-outcomes` · `weekly-digest` · `weekly-synthesis`

### V1 external API (12, `src/app/api/v1/`) — API key auth via `src/lib/v1-auth.ts`
`api-keys` · `facilities` · `facility-availability` · `facility-snapshots` · `facility-specials` · `facility-units` · `landing-pages` · `leads` · `tenants` · `call-logs` · `usage` · `webhooks`

---

## 7. Layout / shell architecture

```
src/app/layout.tsx                  ← root (fonts, globals, PWA)
├── (public/marketing)              ← no shared shell; per-page marketing chrome
├── admin/layout.tsx     → admin-shell.tsx     (sidebar + X-Admin-Key gate)
├── portal/layout.tsx    → portal-shell.tsx    (sidebar + bottom tabs + code gate)
└── partner/layout.tsx   → partner-shell.tsx   (sidebar + org-session gate)
```

- **Path alias:** `@/*` → `src/*`
- **DB:** Prisma singleton at `src/lib/db.ts`; schema `prisma/schema.prisma` (~75 models)
- **Design:** light theme only, Manrope font, charcoal-on-light (no gold accent in new code)
