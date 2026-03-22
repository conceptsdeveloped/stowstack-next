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

## Architecture

**Stack:** Next.js 16 App Router, Prisma 5 (PostgreSQL/Neon), Tailwind CSS 4, Clerk (middleware only), Stripe, Resend, Anthropic Claude API, Upstash Redis, Twilio, Vercel deployment.

### Authentication — Four Independent Systems

1. **Clerk** — Middleware at `src/middleware.ts` wraps all routes but marks everything as public. Clerk is not actively enforcing auth on any route; each system gates itself.
2. **Admin key** — `X-Admin-Key` header checked against `ADMIN_SECRET` env var. Used by all `/admin` pages and most `/api/admin-*` routes. Helper: `requireAdminKey()` from `src/lib/api-helpers.ts`.
3. **Client portal** — Email + access code login. Access codes are generated when a lead status changes to `client_signed`. Session stored in localStorage. Portal pages at `/portal`.
4. **Partner/org sessions** — Email + password + org slug login via `POST /api/organizations`. Session tokens (prefixed `ss_`) stored in `org_sessions` table, 30-day expiry. Helper: `getSession()` from `src/lib/session-auth.ts`. Partner pages at `/partner`.

### API Route Patterns

All API routes are in `src/app/api/`. There are 118+ route directories. Common patterns:

- Every route exports `OPTIONS` for CORS preflight via `corsResponse()` from `src/lib/api-helpers.ts`
- Admin routes call `requireAdminKey(req)` at the top
- Portal-facing routes accept `Authorization: Bearer <accessCode>` and look up the client record
- Partner routes call `getSession(req)` to validate the org session token
- Cron routes use shared `verifyCronSecret()` from `src/lib/cron-auth.ts` (fail-closed when `CRON_SECRET` is unset)
- V1 external API routes at `src/app/api/v1/` use API key auth via `src/lib/v1-auth.ts`

### Frontend Structure

- **Marketing site** — Homepage at `src/app/page.tsx` with 7 lazy-loaded chapter components in `src/components/marketing/`. Dark theme, Satoshi font (loaded via CSS), blue accent (#3B82F6).
- **Admin dashboard** — `src/app/admin/` pages wrapped by `src/components/admin/admin-shell.tsx` (sidebar + login gate). Facility manager at `/admin/facilities` has 16 lazy-loaded tab components in `src/components/admin/facility-tabs/`.
- **Client portal** — `src/app/portal/page.tsx` with inline login gate. Onboarding wizard at `/portal/onboarding`.
- **Partner dashboard** — `src/app/partner/` pages wrapped by `src/components/partner/partner-shell.tsx` (sidebar + login gate).
- **Blog** — File-based content in `/content/blog/` parsed by `src/lib/blog.ts`. No MDX — custom markdown parser.
- **Landing pages** — Dynamic at `/lp/[slug]`, rendered from DB-stored section configs.

### Database

Prisma schema at `prisma/schema.prisma` (~75 models, 1485 lines). All tables use UUID primary keys. Key models: `organizations`, `org_users`, `org_sessions`, `facilities`, `clients`, `shared_audits`, `activity_log`, `landing_pages`, `drip_sequences`, `platform_connections`.

Singleton client at `src/lib/db.ts`. Some routes use `db.$queryRawUnsafe()` for complex upserts; prefer Prisma methods where possible.

### Design Tokens

CSS custom properties defined in `src/app/globals.css`:
- Backgrounds: `--bg-void` (#050505), `--bg-primary` (#0A0A0A), `--bg-elevated` (#111), `--bg-surface` (#1A1A1A)
- Text: `--text-primary` (#F5F5F7), `--text-secondary` (#A1A1A6)
- Accent: `--accent` (#3B82F6)
- All components use these variables, not hardcoded colors

### Cron Jobs

9 Vercel cron jobs configured in `vercel.json`, all at `src/app/api/cron/`. Each validates `CRON_SECRET` via shared `src/lib/cron-auth.ts`.

### Key Integrations

| Service | Env Var | Used For |
|---------|---------|----------|
| Anthropic | `ANTHROPIC_API_KEY` | Audit generation, copy, marketing plans, GBP review responses |
| Resend | `RESEND_API_KEY` | All transactional email (17+ routes) |
| Stripe | `STRIPE_SECRET_KEY` | Billing, webhooks, checkout |
| Twilio | `TWILIO_ACCOUNT_SID` | SMS, call tracking |
| Runway ML | `RUNWAY_API_KEY` | AI video generation |
| Upstash | `KV_REST_API_URL` | Redis caching, rate limiting |
| Google Places | `GOOGLE_PLACES_API_KEY` | Facility lookup, audit tool |

### Path Alias

`@/*` maps to `src/*` — use `@/lib/db`, `@/components/admin/admin-shell`, etc.
