# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Voice & Copy

For customer-facing copy (website, landing pages, cold emails, ads, in-app text), read [.claude/copy-voice.md](.claude/copy-voice.md) before writing. Deeper reference: [.claude/brand-voice-guidelines.md](.claude/brand-voice-guidelines.md) (full guidelines) and [.claude/blake-copy-raw.md](.claude/blake-copy-raw.md) (raw samples of Blake's actual phrasing). The `operator-copy` skill applies this voice automatically — prefer invoking it for customer-facing copy work.

For investor, acquirer, due-diligence, partnership, or whitepaper-adjacent copy, read [.claude/pitch-voice.md](.claude/pitch-voice.md) before writing.

If unsure which register applies, ask before drafting.

## Market Data

For any customer-facing copy, audit-tool insights, blog content, ads, or investor materials that reference self-storage market conditions, occupancy benchmarks, pricing trends, regulatory context, or the acquisition environment, read [.claude/market-data-2026.md](.claude/market-data-2026.md) before drafting. Never fabricate market stats — pull from that file or our own data.

## Dispatch Playbooks

Pre-written, self-contained tasks to fire at this machine from your phone via Claude Dispatch. See [docs/dispatch-playbooks.md](docs/dispatch-playbooks.md). Fire one with a short phone message like "Run StorageAds dispatch playbook 1". A cold dispatch session must read that file's Global Guardrails before acting: `main` auto-deploys to prod, so code/copy changes go to a PR (never pushed to `main` unattended); blog drafts with `draft: true` and `docs/` files are safe to commit to `main`. Cold-safe verify gate is `npm run typecheck && npm test`.

## Build & Development Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # prisma generate && next build — no DB mutation (migrate deploy removed 2026-06-03); needs env vars
npm run start        # Production server
npm test             # vitest run — ~98 tests, mocks @/lib/db so no database is needed
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint — noisy (~12 pre-existing react-hooks warnings in marketing hooks); scope to changed paths
npm run lint:safety  # Blocks reintroduction of prisma --accept-data-loss (scripts/check-no-data-loss.sh)
npx prisma generate  # Regenerate Prisma client after schema changes
npm run db:push      # prisma db push — schema → DB; manual, needs approval, never runs in build
```

**Verify changes with `npm test` + `npm run typecheck`.** CI (`.github/workflows/ci.yml`) gates PRs and pushes to `main` on typecheck + test; lint is `continue-on-error` for now. `npm run build` is the heavier check (needs env vars) but is safe re: the database.

## Product Context

**StorageAds.com** — Marketing automation SaaS for the self-storage industry. Per-facility/month pricing with Signal / System / Compound tiers + custom Enterprise (10+ facilities). Primary buyers: facility owners, operators, managers, and management companies (white-label for management cos).

**Status:** Pre-launch. Finishing build, then alpha testing with Blake's own portfolio of facilities. Not live with paying customers yet.

**Domain:** storageads.com (live). Deploys straight to production on Vercel — no staging environment.

**Top-of-funnel:** Free audit tool at `/audit-tool` and `/audit/[slug]`. Prospect enters facility info → gets a marketing diagnostic → "Schedule a call" to review results → sales pitch for StorageAds.

**Demo page:** Used for both self-serve demos AND live sales call demos.

**Blog:** Live at `/blog` (with `feed.xml`). File-based content in `/content/blog/` (6 articles) parsed by `src/lib/blog.ts`.

## Architecture

**Stack:** Next.js 16 App Router, React 19, Prisma 5 (PostgreSQL/Neon), Tailwind CSS 4, Clerk (proxy only, see below), Stripe, Resend, Anthropic Claude API, Upstash Redis, Sentry (errors + route tagging), Vercel Blob (asset storage), recharts (admin charts), lucide-react (icons), Twilio (not wired yet), Vercel deployment.

### Authentication — Four Independent Systems

1. **Clerk** — Proxy at `src/proxy.ts` (Next 16 renamed the `middleware` file convention to `proxy`). Clerk only activates when production keys (`pk_live_`) are set, and even then marks every route public — it enforces auth on nothing; each system below gates itself. `proxy.ts` also owns CSP + security headers, Sentry route tagging, and the CSRF gate (see below). Keeping Clerk as-is.
2. **Admin key** — `X-Admin-Key` header checked against `ADMIN_SECRET` env var. Used by all `/admin` pages and most `/api/admin-*` routes. Helper: `requireAdminKey()` from `src/lib/api-helpers.ts`. Multiple admins (Blake + Angelo are founders).
3. **Client portal** — Email + access code login. Access codes are generated when a lead status changes to `client_signed`. Session stored in localStorage. Portal pages at `/portal`.
4. **Partner/org sessions** — Email + password + org slug login via `POST /api/organizations`. Session tokens (prefixed `ss_`) stored in the `sessions` table (raw SQL via `$executeRaw`/`$queryRaw` in `src/lib/session-auth.ts`), 30-day expiry. Helper: `getSession()`. Partner pages at `/partner`. Partners = both resellers and referral partners.

**CSRF gate (footgun).** `proxy.ts` runs a double-submit CSRF check on every state-changing `/api/*` request: it needs both a `__csrf_token` cookie and a matching `x-csrf-token` header. No client sends that header, so requests only pass via `isCsrfExempt()` — whitelisted public paths, or an `x-admin-key` / `Authorization: Bearer` / `x-org-token` header. Authenticated admin/partner/portal calls ride the header exemption. **Any new pre-auth public POST route silently 403s in prod unless you add its path to `isCsrfExempt()`** (this is what broke `/portal` login). The only signal is a 403 in Vercel logs — the route handler never runs.

### API Route Patterns

All API routes are in `src/app/api/`. The surface is large (180+ route files) — map it with `find src/app/api -name route.ts` rather than relying on a count. Common patterns:

- Most public-facing routes export `OPTIONS` for CORS preflight via `corsResponse()` from `src/lib/api-helpers.ts` (not universal — don't assume)
- Admin routes call `requireAdminKey(req)` at the top
- Portal-facing routes accept `Authorization: Bearer <accessCode>` and look up the client record
- Partner routes call `getSession(req)` to validate the org session token
- Cron routes use shared `verifyCronSecret()` from `src/lib/cron-auth.ts` (fail-closed when `CRON_SECRET` is unset)
- V1 external API routes at `src/app/api/v1/` use API key auth via `src/lib/v1-auth.ts`

### Frontend Structure

- **Marketing site** — Homepage at `src/app/page.tsx` with lazy-loaded chapter components in `src/components/marketing/`. Light theme, Manrope throughout, charcoal-and-cream palette. Copy is governed by the voice docs (see Voice & Copy above).
- **Admin dashboard** — `src/app/admin/` pages wrapped by `src/components/admin/admin-shell.tsx` (sidebar + login gate). Facility manager at `/admin/facilities` has ~60 files in `src/components/admin/facility-tabs/` (lazy-loaded tabs + types + feature subdirs: `ad-studio`, `ad-publisher`, `creative-studio`, `google-ads-lab`, `tiktok-creator`). **Active redesign:** the admin IA is being reworked into one task-first sidebar + global facility switcher + ⌘K palette — see [docs/admin-ia-redesign-plan.md](docs/admin-ia-redesign-plan.md). Hard rules during the redesign: never modify the tool pages/components themselves; never touch ad-platform or visual-gen internals.
- **Client portal** — `src/app/portal/page.tsx` with inline login gate. Onboarding wizard at `/portal/onboarding`. Sub-pages: campaigns, billing, reports, messaging, settings.
- **Partner dashboard** — `src/app/partner/` pages wrapped by `src/components/partner/partner-shell.tsx` (sidebar + login gate).
- **Landing pages** — Dynamic at `/lp/[slug]`, rendered from DB-stored section configs.

### Database

Prisma schema at `prisma/schema.prisma` (90 models, ~1960 lines — verify with `grep -c '^model ' prisma/schema.prisma`). All tables use UUID primary keys. Key models: `organizations`, `org_users`, `sessions`, `facilities`, `clients`, `shared_audits`, `activity_log`, `landing_pages`, `drip_sequences`, `platform_connections`.

Singleton client at `src/lib/db.ts`. Use Prisma client methods everywhere; the only raw SQL (`$executeRaw`/`$queryRaw`) lives in `src/lib/session-auth.ts` for the `sessions` table.

### Design System — Light Only

Anthropic-inspired warm palette. CSS custom properties defined in `src/app/globals.css`:

**Core palette:**
- `--color-dark` (#141413) — primary text, never pure black
- `--color-light` (#faf9f5) — backgrounds, never pure white
- `--color-body-text` (#6a6560) — body text
- `--color-mid-gray` (#b0aea5) — secondary/muted
- `--color-light-gray` (#e8e6dc) — card fills, borders, surfaces

**Accent — Charcoal-on-light / Light-on-dark (no primary color accent):**
- CTAs use `--color-dark` (#141413) on light surfaces and `--color-light` (#faf9f5) on dark surfaces — contrast-based, not color-based.
- **Sienna gold is banned everywhere except the logo `ads` lockup** (the brand-locked `--brand-gold` — see Logo below). Do not use `#B58B3F`, `--color-gold`, `--color-gold-hover`, `--color-gold-on-light`, `--color-gold-light`, or any near variant in CTAs, links, metrics, charts, or generated assets. The legacy `--color-gold*` tokens still exist in `globals.css` but must not be referenced in new code. The A24/Kubrick editorial feel comes from typography and negative space, not a color accent.

**Secondary accents:** `--color-blue` (#6a9bcc, Google/informational), `--color-green` (#788c5d, success/growth) — use sparingly for categorical distinctions (chart series, informational callouts), never as a primary CTA color.
**Error only:** `--color-red` (#B04A3A) — NEVER for CTAs or decorative use
**Dashboard surfaces:** `--color-dark-surface` (#1e1d1b) for admin/partner dashboards

**Typography:** Manrope variable font (Google Fonts, weights 200–800) for everything — marketing, admin, partner, portal, ad mockups. No second font.

- **Body / paragraphs:** weight 400, line-height 1.6
- **UI (buttons, inputs, labels, captions):** weight 500–600, line-height 1.4
- **Headings (h1–h6):** weight 600–700, line-height 1.2, letter-spacing -0.03em
- **Display / hero / `<Display>` component:** weight 700–800, line-height 1.05–1.2
- **Emphasis:** use weight changes (font-medium / font-semibold / font-bold). **Never use italic** — Manrope has no true italic glyphs. globals.css forces `em`, `i`, `cite`, and Tailwind's `.italic` utility to `font-style: normal`; the `Display` component's `italic` prop is accepted but ignored.

CSS variable mapping (so the 125+ inline `MONO.mono` / `MONO.serif` / `var(--font-jetbrains)` / `var(--font-archivo)` / `var(--font-inter)` refs in components all resolve to Manrope without per-file edits): `--mono`, `--serif`, `--font-jetbrains`, `--font-inter`, `--font-archivo`, `--font-primary`, `--font-warm`, `--font-heading`, `--font-body`, `--font-display`, `--font-mono-family`, `--font` (admin scope), and legacy `--font-poppins` / `--font-lora` are all aliased to `--font-manrope`.

Line-height tokens: `--leading-body` (1.6), `--leading-tight` (1.2), `--leading-snug` (1.3), `--leading-ui` (1.4), `--leading-display` (1.2).

**Tabular numerals:** `.urbit-landing` in globals.css applies `font-variant-numeric: tabular-nums` + `font-feature-settings: "tnum" 1` globally so numbers in the editorial chrome (status bar timestamps, live monitor data cells, sparkline labels, `§ 00 · NUMBERS` count-up cards, ticker tape) keep tabular column alignment despite Manrope being a proportional font. Manrope ships tabular figures via OpenType.

**Logo:** `storageads` (`storageads/attr` in the marketing nav). Manrope 700, lowercase, no icon. **Two-tone color split is brand-mandatory** — "storage" renders in the surface text color (palette-aware: `--text-accent` / `--color-dark` / `#1A1A1A`), "ads" always renders in `var(--brand-gold)` (`#B58B3F`, the original StorageAds sienna gold). `--brand-gold` is defined in `:root` outside any palette scope so the gold survives palette swaps — it is a brand-locked exception to the otherwise palette-driven color system. Used in marketing nav, footer, admin sidebar, and admin login.

**Rules:**
- Use brand tokens, not pure #000/#fff or Tailwind default grays
- Icons: lucide-react is the project's icon library
- Sienna gold lives only in the logo `ads` lockup (see above), nowhere else
- Editorial by default: the look comes from typography and negative space, not gradients, stock photos, or AI imagery
- Charts: recharts (dark=Meta, blue=Google, green=retargeting)
- All emails from *@storageads.com

### Cron Jobs

21 Vercel cron jobs configured in `vercel.json`, all at `src/app/api/cron/`. Each validates `CRON_SECRET` via shared `src/lib/cron-auth.ts`.

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
| Sentry | `NEXT_PUBLIC_SENTRY_DSN` | Error tracking, route tagging (`proxy.ts`) | |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` | Asset/image storage (uploads, avatars) | 5 routes |
| Cal.com | `NEXT_PUBLIC_CALCOM_LINK` | Demo call booking embed | Handle is `stowstack` (`storageads` unclaimed); URL centralized in `src/lib/booking.ts` — never hardcode |
| Meta/Google/TikTok Ads | various | Ad platform integrations | **Angelo's work — do not modify** |

**Important:** All ad platform integrations and video/image generation tools are Angelo's domain. Do not modify these without coordination.

### PMS Integration

Phase 1 (current): Manual upload of facility management reports — CSV only (`accept=".csv"` in `pms-upload-tab.tsx`). No API integrations yet.

### Data Scraping Strategy

Occupancy intelligence and market intelligence features should scrape ALL available sources aggressively: Google Maps, competitor websites, RentCafe, SpareFoot, Yardi, Crexi, and any other public data sources. Mix external scraped data with uploaded FMS report data.

### Path Alias

`@/*` maps to `src/*` — use `@/lib/db`, `@/components/admin/admin-shell`, etc.

## Build Priorities

1. **Customer-facing site** — marketing pages, audit tool, demo, legal pages, blog
2. **Admin IA redesign** — one task-first sidebar + global facility switcher + ⌘K palette, replacing the two competing menus. Plan: [docs/admin-ia-redesign-plan.md](docs/admin-ia-redesign-plan.md). Relocate/re-route freely; never modify the tool pages themselves.
3. Feature completion across the platform

## Team

- **Blake** — Founder, product direction, sales, owns marketing site + admin UX decisions
- **Angelo** — Co-founder, built facility overview tools, ad platform integrations, video/image generation. Actively contributing code daily.

## Remediation Tasks

The `tasks/` directory contains numbered `.md` files. Current open: **24-28** (see `tasks/README.md` for status; 01-23 are closed). Each is a self-contained surgical remediation spec.

### Execution Rules

1. **One file per session.** When told "run task 05", work ONLY on `tasks/05-*.md`. Nothing else exists.
2. **Read the entire file first.** Understand all steps, dependencies, and verification before writing code.
3. **Follow steps in order.** Do not skip, combine, or reorder steps.
4. **Search before assuming.** When a task says to find files matching a pattern, run the grep/find. Do not rely on memory — the codebase is large (180+ API route files).
5. **Do not improvise.** No unrelated refactors, no "while I'm here" fixes, no added features.
6. **Verification is not optional.** Run every verification command listed. Show output. Fix failures before declaring done.
7. **Commit exactly as specified.** Use the commit message format at the bottom of each task file. Do not combine commits across tasks.
8. **Stop and report when done.** State: which task, how many files modified, any verification outputs needing attention. Do NOT start the next task.
9. **If ambiguous, ask.** If a path doesn't exist or a pattern returns nothing, stop and ask rather than improvising.

### How to Start a Task

When told "run task 05" or "do 05":

1. Read `tasks/05-*.md` completely
2. Confirm: "Read task 05. [X] steps identified. Starting Step 1."
3. Execute each step sequentially
4. Run all verification commands
5. Show verification output
6. Commit with the specified message
7. Stop and report

### Task Dependencies

Current open tasks (24-28) are independent; tasks 01-23 (which carried the cross-dependencies) are closed. Check `tasks/README.md` for per-task status before starting.

### Build Verification

After every task:

```bash
npx prisma validate   # only when prisma/schema.prisma changed
npm run typecheck     # tsc --noEmit — must be clean
npm test              # vitest run — must pass
```

`npm run build` is the heavier final check (needs env vars). Fix breaks within the current task scope before committing.
