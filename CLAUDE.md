# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Build & Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (also type-checks)
npm run start        # Start production server
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema changes to database
```

No test framework is configured. Verify changes with `npm run build` (runs TypeScript type-checking).

## Product Context

**StorageAds.com** — Marketing automation SaaS for the self-storage industry. Per-facility/month pricing with Good / Better / Best tiers + custom Enterprise. Primary buyers: facility owners, operators, managers, and management companies (white-label for management cos).

**Status:** Pre-launch. Finishing build, then alpha testing with Blake's own portfolio of facilities. Not live with paying customers yet.

**Domain:** storageads.com (live). Deploys straight to production on Vercel — no staging environment.

**Top-of-funnel:** Free audit tool at `/audit-tool` and `/audit/[slug]`. Prospect enters facility info → gets a marketing diagnostic → "Schedule a call" to review results → sales pitch for StorageAds.

**Demo page:** Used for both self-serve demos AND live sales call demos.

**Blog:** Not live yet. File-based content in `/content/blog/` parsed by `src/lib/blog.ts`. Articles coming soon.

## Architecture

**Stack:** Next.js 16 App Router, Prisma 5 (PostgreSQL/Neon), Tailwind CSS 4, Clerk (middleware only), Stripe, Resend, Anthropic Claude API, Upstash Redis, Twilio, Vercel deployment.

### Authentication — Four Independent Systems

1. **Clerk** — Middleware at `src/middleware.ts` wraps all routes but marks everything as public. Clerk is not actively enforcing auth on any route; each system gates itself. Keeping Clerk as-is.
2. **Admin key** — `X-Admin-Key` header checked against `ADMIN_SECRET` env var. Used by all `/admin` pages and most `/api/admin-*` routes. Helper: `requireAdminKey()` from `src/lib/api-helpers.ts`. Multiple admins (Blake + Angelo are founders).
3. **Client portal** — Email + access code login. Access codes are generated when a lead status changes to `client_signed`. Session stored in localStorage. Portal pages at `/portal`.
4. **Partner/org sessions** — Email + password + org slug login via `POST /api/organizations`. Session tokens (prefixed `ss_`) stored in `org_sessions` table, 30-day expiry. Helper: `getSession()` from `src/lib/session-auth.ts`. Partner pages at `/partner`. Partners = both resellers and referral partners.

### API Route Patterns

All API routes are in `src/app/api/`. There are 118+ route directories. Common patterns:

- Every route exports `OPTIONS` for CORS preflight via `corsResponse()` from `src/lib/api-helpers.ts`
- Admin routes call `requireAdminKey(req)` at the top
- Portal-facing routes accept `Authorization: Bearer <accessCode>` and look up the client record
- Partner routes call `getSession(req)` to validate the org session token
- Cron routes use shared `verifyCronSecret()` from `src/lib/cron-auth.ts` (fail-closed when `CRON_SECRET` is unset)
- V1 external API routes at `src/app/api/v1/` use API key auth via `src/lib/v1-auth.ts`

### Frontend Structure

- **Marketing site** — Homepage at `src/app/page.tsx` with lazy-loaded chapter components in `src/components/marketing/`. Light theme, Poppins + Lora fonts, sienna gold accent. **Copy is draft — will be regenerated from brand identity/tone docs.**
- **Admin dashboard** — `src/app/admin/` pages wrapped by `src/components/admin/admin-shell.tsx` (sidebar + login gate). Facility manager at `/admin/facilities` has 16+ lazy-loaded tab components in `src/components/admin/facility-tabs/`. **Needs reorganization** — ad creation, management, and publishing should be separate sections rather than everything under facility overview.
- **Client portal** — `src/app/portal/page.tsx` with inline login gate. Onboarding wizard at `/portal/onboarding`. Sub-pages: campaigns, billing, reports, messaging, settings.
- **Partner dashboard** — `src/app/partner/` pages wrapped by `src/components/partner/partner-shell.tsx` (sidebar + login gate).
- **Landing pages** — Dynamic at `/lp/[slug]`, rendered from DB-stored section configs.

### Database

Prisma schema at `prisma/schema.prisma` (~75 models, 1485 lines). All tables use UUID primary keys. Key models: `organizations`, `org_users`, `org_sessions`, `facilities`, `clients`, `shared_audits`, `activity_log`, `landing_pages`, `drip_sequences`, `platform_connections`.

Singleton client at `src/lib/db.ts`. Some routes use `db.$queryRawUnsafe()` for complex upserts; prefer Prisma methods where possible.

### Design System — Light Only

Anthropic-inspired warm palette. CSS custom properties defined in `src/app/globals.css`:

**Core palette:**
- `--color-dark` (#141413) — primary text, never pure black
- `--color-light` (#faf9f5) — backgrounds, never pure white
- `--color-body-text` (#6a6560) — body text
- `--color-mid-gray` (#b0aea5) — secondary/muted
- `--color-light-gray` (#e8e6dc) — card fills, borders, surfaces

**Accent — Sienna Gold (primary):**
- `--color-gold` (#B58B3F) — CTAs, links, key metrics, logo "ads"
- `--color-gold-hover` (#9E7A36) — hover/active
- `--color-gold-on-light` (#9A7A35) — numbers/text on cream backgrounds
- `--color-gold-light` (#F2EBD9) — gold-tinted highlight backgrounds

**Secondary accents:** `--color-blue` (#6a9bcc, Google/informational), `--color-green` (#788c5d, success/growth)
**Error only:** `--color-red` (#B04A3A) — NEVER for CTAs or decorative use
**Dashboard surfaces:** `--color-dark-surface` (#1e1d1b) for admin/partner dashboards

**Typography:** Poppins (headings, 500-600 max) + Lora (body, 400). No other fonts. No weight below 400 or above 600.

**Logo:** `storageads` — "storage" in --color-dark, "ads" in --color-gold. Poppins 600, lowercase, no icon.

**Rules:**
- Never use pure #000 or #fff — always brand tokens
- Never use Tailwind default grays — only brand tokens
- Never use gradients, icon libraries, stock photos, or AI images
- Gold is the ONLY primary accent; blue/green are secondary
- Chart colors: gold=Meta, blue=Google, green=retargeting
- All emails from *@storageads.com

### Cron Jobs

9 Vercel cron jobs configured in `vercel.json`, all at `src/app/api/cron/`. Each validates `CRON_SECRET` via shared `src/lib/cron-auth.ts`.

### Key Integrations

| Service | Env Var | Used For | Notes |
|---------|---------|----------|-------|
| Anthropic | `ANTHROPIC_API_KEY` | Audit generation, copy, marketing plans, GBP responses | |
| Resend | `RESEND_API_KEY` | All transactional email | Free tier (100/day), domain: storageads.com |
| Stripe | `STRIPE_SECRET_KEY` | Billing, webhooks, checkout | |
| Twilio | `TWILIO_ACCOUNT_SID` | SMS, call tracking | Not set up yet |
| FAL.ai / Runway ML | `FAL_KEY` / `RUNWAY_API_KEY` | AI video + image generation | **Angelo's work — do not modify** |
| Upstash | `KV_REST_API_URL` | Redis caching, rate limiting | |
| Google Places | `GOOGLE_PLACES_API_KEY` | Facility lookup, audit tool | |
| Cal.com | — | Demo call booking embed | Blake's calendar |
| Meta/Google/TikTok Ads | various | Ad platform integrations | **Angelo's work — do not modify** |

**Important:** All ad platform integrations and video/image generation tools are Angelo's domain. Do not modify these without coordination.

### PMS Integration

Phase 1 (current): Manual upload of facility management reports — PDF, CSV, and Excel only. No API integrations yet.

### Data Scraping Strategy

Occupancy intelligence and market intelligence features should scrape ALL available sources aggressively: Google Maps, competitor websites, RentCafe, SpareFoot, Yardi, Crexi, and any other public data sources. Mix external scraped data with uploaded FMS report data.

### Path Alias

`@/*` maps to `src/*` — use `@/lib/db`, `@/components/admin/admin-shell`, etc.

## Build Priorities

1. **Customer-facing site** — marketing pages, audit tool, demo, legal pages, blog
2. **Admin layout/menu reorganization** — separate ad creator, manager, publisher from facility overview; better tab/menu structure
3. Feature completion across the platform

## Team

- **Blake** — Founder, product direction, sales, owns marketing site + admin UX decisions
- **Angelo** — Co-founder, built facility overview tools, ad platform integrations, video/image generation. Actively contributing code daily.
