# Task 28 — CLAUDE.md Full Audit & Refresh

**Generated:** 2026-05-28
**Audit scope:** Every claim in `CLAUDE.md` (214 lines) verified against the repo as of commit `c3ebc34`.
**Status:** ✅ **APPLIED 2026-06-06.** Clusters A–E executed against the live repo (facts re-verified first — notably the build script no longer runs `migrate deploy`, and the Enterprise tier does exist alongside Signal/System/Compound). Design System extracted to `.claude/design-system.md`; execution rules moved to `tasks/README.md`; `README.md` boilerplate replaced. Decisions (Cluster D) applied with the recommended defaults documented below: gold banned except the logo lockup; `lucide-react` is the sanctioned icon library; Twilio still "not set up yet" (no CSP/proxy entry). This doc is retained as the audit record. The original planning text follows.

**Re-refresh 2026-06-26.** CLAUDE.md drifted again in the three weeks since 2026-06-06 and was corrected: pricing tiers are now **Launch / Growth / Portfolio** subscriptions + **Single Site / Site + Landing Pages / Portfolio Build** packages (the Signal/System/Compound + Enterprise framing noted above is obsolete — pricing has changed twice); blog count dropped (drift-prone); build command now reflects `generate-changelog`; counts refreshed (models ~98, crons ~23, marketing ~24, facility-tabs ~48); stack gained framer-motion / @react-pdf/renderer / cheerio; Build Priorities replaced with Alpha-readiness + Feature completion. Separately, `.claude/design-system.md` palette hexes were corrected to the live `globals.css` "paper" palette and re-described as palette-aware aliases.

---

## How to use this doc

1. Read this file end-to-end before touching `CLAUDE.md`.
2. Pick **one** action item (or one tight cluster) per session.
3. Use the line-number references to locate the offending text in `CLAUDE.md`.
4. After the edit, mark the item below with a check and a commit SHA.
5. Verification per edit: `npx prisma validate && npx tsc --noEmit && npm run build`.

---

## Severity legend

| Tag | Meaning |
|---|---|
| WRONG | Factually incorrect. Will mislead Claude. Highest priority. |
| STALE | Numbers or refs that have drifted since the doc was written. |
| DECISION | Conflict, contradiction, or needs Blake's call before edit. |
| MISSING | Should be added. The doc is silent on something Claude needs. |
| BLOAT | Accurate but better off as a separate file or compressed. |
| OK | Verified, no action. Listed only so the doc is complete. |

---

## Section-by-Section Findings

### Section 1 — Voice & Copy (CLAUDE.md lines 7–13)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 1.1 | "Read `.claude/copy-voice.md` before writing customer-facing copy" | File exists. | OK |
| 1.2 | "Read `.claude/pitch-voice.md` before writing investor/acquirer copy" | File exists. | OK |
| 1.3 | Section is silent on `.claude/brand-voice-guidelines.md` | File exists. Not linked. | MISSING |
| 1.4 | Section is silent on `.claude/blake-copy-raw.md` | File exists. Not linked. | MISSING |
| 1.5 | Section is silent on `.claude/skills/operator-copy` | Custom skill exists in registry. Not surfaced. | MISSING |

**Action items**

- [ ] **A-1.1** Add a pointer to `.claude/brand-voice-guidelines.md` and clarify the relationship to `copy-voice.md` (is one a superset? a long-form? Blake to confirm).
- [ ] **A-1.2** Add a one-line pointer to `.claude/blake-copy-raw.md` ("raw voice samples — read when you need to hear Blake's actual phrasing").
- [ ] **A-1.3** Add a one-line pointer to the `operator-copy` skill and when to invoke it vs reading the voice docs directly.

---

### Section 2 — Market Data (lines 15–17)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 2.1 | "Read `.claude/market-data-2026.md` before drafting" | File exists. Year matches current date (2026-05-28). | OK |
| 2.2 | "Never fabricate market stats" | Tone-correct, load-bearing rule. | OK |

**Action items:** None. This section is current.

---

### Section 3 — Build & Development Commands (lines 19–30)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 3.1 | `npm run dev` → "Start dev server" | Matches `package.json`: `next dev`. | OK |
| 3.2 | `npm run build` → "Production build (also type-checks)" | Actual: `prisma generate && prisma migrate deploy && next build`. Doc omits that the build **runs migrations against the connected database**. | WRONG |
| 3.3 | `npm run start` | Matches. | OK |
| 3.4 | `npm run lint` → "ESLint" | Matches (`eslint`). | OK |
| 3.5 | `npx prisma generate` and `npx prisma db push` | Both work. There is also a project script `npm run db:push` (alias). | STALE |
| 3.6 | "No test framework is configured" | **`vitest` is in `devDependencies`, `vitest.config.ts` exists, `src/test/setup.ts` and `src/test/helpers.ts` exist.** 8 test files exist across `src/lib/__tests__/` and `src/app/api/v1/__tests__/` and `src/app/api/stripe-webhook/__tests__/`. | WRONG |
| 3.7 | Doc is silent on `npm run lint:safety` | Script runs `bash scripts/check-no-data-loss.sh` to block `--accept-data-loss` reintroduction. Important guardrail. | MISSING |
| 3.8 | Doc is silent on `npm run db:migrate:dev` / `db:migrate:deploy` | Both exist in `package.json`. | MISSING |

**Action items**

- [ ] **A-3.1** Replace "Production build (also type-checks)" with truthful description: builds **also run `prisma migrate deploy` against `DATABASE_URL`**. Flag the implication for non-prod environments.
- [ ] **A-3.2** Replace "No test framework is configured" with "Vitest is configured. Run `npx vitest` (or wire `npm run test`). Test files live in `src/**/__tests__/`. Coverage is partial: API helpers, V1 routes, Stripe webhook, auth helpers."
- [ ] **A-3.3** Document `npm run lint:safety` as a required pre-merge check (per its intent).
- [ ] **A-3.4** Document the three Prisma scripts in `package.json` (`db:push`, `db:migrate:dev`, `db:migrate:deploy`) so Claude does not invent `npx` invocations when a script exists.
- [ ] **A-3.5** Decide: do you want a `npm run test` script wired? If yes, add it.

---

### Section 4 — Product Context (lines 32–44)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 4.1 | "Marketing automation SaaS for self-storage" | Accurate. | OK |
| 4.2 | "Good / Better / Best tiers + custom Enterprise" | **Actual tier names on `/pricing`: Signal / System / Compound.** No "Enterprise" tier surfaced on the page. | WRONG |
| 4.3 | "Primary buyers: facility owners, operators, managers, and management companies (white-label for management cos)" | Matches pricing copy and partner-program intent. | OK |
| 4.4 | "Pre-launch. Alpha testing with Blake's own portfolio of facilities. Not live with paying customers yet." | Memory file `project_priorities.md` and recent commits consistent with this. Blake to confirm still true on 2026-05-28. | DECISION |
| 4.5 | "Deploys straight to production on Vercel — no staging environment" | Matches commit cadence (every push lands on `storageads.com`). | OK |
| 4.6 | "Top-of-funnel: Free audit tool at `/audit-tool` and `/audit/[slug]`" | Both routes exist. | OK |
| 4.7 | "Demo page used for both self-serve demos AND live sales call demos" | `/demo` exists. Dual-use intent is product context, not code-verifiable. | OK |
| 4.8 | "Blog: Not live yet. File-based content in `/content/blog/`" | **Blog IS live.** `src/app/blog/page.tsx` is shipped with full metadata + OG tags. `/content/blog/` has 6 articles. `feed.xml` route exists. | WRONG |

**Action items**

- [ ] **A-4.1** Replace "Good / Better / Best" with the actual tier names: **Signal / System / Compound**. Confirm whether Enterprise tier exists anywhere (off-page custom deals?) and document.
- [ ] **A-4.2** Replace "Blog: Not live yet" with current state: blog is shipped at `/blog`, `feed.xml` is live, 6 articles in `/content/blog/`, parsed by `src/lib/blog.ts`. Note the `PILLARS` taxonomy if relevant.
- [ ] **A-4.3** Confirm with Blake whether pre-launch / alpha status is still accurate on 2026-05-28, or whether copy should shift to "soft launch / early customers."

---

### Section 5 — Architecture (lines 46–155)

#### 5a. Stack (line 48)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5a.1 | "Next.js 16 App Router" | `next@16.2.0`. | OK |
| 5a.2 | "Prisma 5 (PostgreSQL/Neon)" | `prisma@^5.22.0`. | OK |
| 5a.3 | "Tailwind CSS 4" | `tailwindcss@^4`. | OK |
| 5a.4 | "Clerk (middleware only)" | `@clerk/nextjs@^7.0.6`, used in `src/proxy.ts`. "Middleware only" is roughly accurate but understated (see 5b.1 + 5b.2). | STALE |
| 5a.5 | Stripe, Resend, Anthropic, Upstash Redis, Twilio, Vercel | All present in `package.json`. | OK |
| 5a.6 | Doc omits **Sentry** (`@sentry/nextjs@^10.46.0`) | Used in `src/proxy.ts` for route tagging. | MISSING |
| 5a.7 | Doc omits **Vercel Blob** (`@vercel/blob@^2.3.1`) | Asset storage. | MISSING |
| 5a.8 | Doc omits **Cheerio**, **Sharp**, **Recharts**, **Lucide React**, **otpauth**, **web-push**, **react-pdf** | All in `dependencies`. Several are load-bearing (recharts = all admin charts; lucide-react = all icons; sharp = image processing; otpauth = TOTP 2FA; web-push = push notifications). | MISSING |
| 5a.9 | React 19 not noted | `react@19.2.4`. | MISSING |

**Action items**

- [ ] **A-5a.1** Rewrite the stack line to include Sentry, Vercel Blob, React 19, recharts (admin charts), lucide-react (icons — see also A-5f.4 for icon-library conflict), and sharp. Keep it one line per the existing style.

#### 5b. Authentication — Four Independent Systems (lines 50–55)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5b.1 | "Clerk — Proxy at `src/proxy.ts` (Next 16 renamed the `middleware` file convention to `proxy`)" | `src/proxy.ts` exists. Next 16 naming claim is true. | OK |
| 5b.2 | "Clerk wraps all routes but marks everything as public" | `proxy.ts` uses `createRouteMatcher` and `isPublicRoute`. **But the proxy also handles CSP, security headers, CSRF token cookie management, and Sentry route tagging.** Doc reduces it to "Clerk wrapper" which is misleading. | STALE |
| 5b.3 | "Admin key — `X-Admin-Key` header checked against `ADMIN_SECRET`" | `requireAdminKey()` exists in `src/lib/api-helpers.ts`. | OK |
| 5b.4 | "Multiple admins (Blake + Angelo are founders)" | Product context, not code-verifiable. | OK |
| 5b.5 | "Client portal — Email + access code login. Session stored in localStorage." | Code matches. | OK |
| 5b.6 | "Partner/org sessions — POST `/api/organizations` … session tokens (prefixed `ss_`) stored in `org_sessions` table" | **Wrong table name.** Raw SQL in `src/lib/session-auth.ts` reads from and writes to the **`sessions`** table. Prisma model is `model sessions`. No `org_sessions` model exists. | WRONG |
| 5b.7 | "30-day expiry" | Not verified via constant. Expiry is set at insert time; Blake to confirm TTL. | DECISION |
| 5b.8 | Doc is silent on CSRF (`src/lib/csrf.ts` is imported in `proxy.ts`) | Important context. | MISSING |

**Action items**

- [ ] **A-5b.1** Rewrite the Clerk bullet to acknowledge that `proxy.ts` also owns CSP, security headers, CSRF tokens, and Sentry route tagging — not "Clerk wrapper."
- [ ] **A-5b.2** Fix the table name: **`sessions`**, not `org_sessions`. Update the helper bullet to reference `src/lib/session-auth.ts` (which it does correctly).
- [ ] **A-5b.3** Add a one-line CSRF note pointing at `src/lib/csrf.ts` and the `requiresCsrf()` check in `proxy.ts`.
- [ ] **A-5b.4** Verify and document the actual session TTL.

#### 5c. API Route Patterns (lines 57–66)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5c.1 | "All API routes in `src/app/api/`. There are 118+ route directories." | **Actual: 198 directories** (`find src/app/api -type d \| wc -l`). +68% drift. | STALE |
| 5c.2 | "Every route exports `OPTIONS` for CORS preflight via `corsResponse()`" | `corsResponse` exists in `api-helpers.ts`. "Every route" is aspirational; not all routes export `OPTIONS`. Worth qualifying. | STALE |
| 5c.3 | "Admin routes call `requireAdminKey(req)` at the top" | Pattern holds for most `/api/admin-*`. | OK |
| 5c.4 | "Portal-facing routes accept `Authorization: Bearer <accessCode>`" | Matches. | OK |
| 5c.5 | "Partner routes call `getSession(req)`" | Matches. | OK |
| 5c.6 | "Cron routes use shared `verifyCronSecret()` (fail-closed when `CRON_SECRET` is unset)" | `src/lib/cron-auth.ts` exists. Behavior matches. | OK |
| 5c.7 | "V1 external API routes at `src/app/api/v1/` use API key auth via `src/lib/v1-auth.ts`" | Matches. V1 surface: `api-keys`, `call-logs`, `facilities`, `facility-availability`, `facility-snapshots`, `facility-specials`, `facility-units`, `landing-pages`, `leads`, `tenants`, `usage`, `webhooks` + `__tests__`. | OK |

**Action items**

- [ ] **A-5c.1** Update route count from "118+" to current ("~200 route directories"). Consider not using a number at all to avoid future drift — replace with "the API surface is large; map it with `find src/app/api -type d` rather than guessing."
- [ ] **A-5c.2** Soften "every route exports `OPTIONS`" to "most public-facing routes export `OPTIONS`" so Claude does not assume a uniform pattern.

#### 5d. Frontend Structure (lines 68–74)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5d.1 | "Homepage at `src/app/page.tsx` with lazy-loaded chapter components" | Matches. Page uses `next/dynamic` for 10 of the 13 chapters. | OK |
| 5d.2 | "Light theme, **Poppins + Lora fonts**, charcoal-and-cream palette (no gold)" | **Wrong on two counts.** Fonts are Manrope only (correctly stated 30 lines later in the Design System section). And "no gold" contradicts the brand-locked `--brand-gold` for the logo "ads" treatment (also stated later). | WRONG |
| 5d.3 | "Copy is draft — will be regenerated from brand identity/tone docs." | Voice docs now exist (`copy-voice.md`, `pitch-voice.md`, `brand-voice-guidelines.md`, `blake-copy-raw.md`). This note is stale. | STALE |
| 5d.4 | "Admin dashboard … `src/components/admin/admin-shell.tsx`" | Matches. | OK |
| 5d.5 | "Facility manager at `/admin/facilities` has **16+ lazy-loaded tab components**" | **`src/components/admin/facility-tabs/` now has ~60 entries** (mix of components, types, and subdirs). The "needs reorganization" note that follows is partially out of date because ad-publisher and ad-studio subdirs do exist now. | STALE |
| 5d.6 | "Needs reorganization — ad creation, management, and publishing should be separate sections" | Partially shipped: `ad-publisher/`, `ad-studio/`, `creative-studio/`, `google-ads-lab/`, `tiktok-creator/` subdirs exist. Blake to decide if this note is still load-bearing or can be removed. | DECISION |
| 5d.7 | Client portal description | Matches. | OK |
| 5d.8 | Partner dashboard description | Matches. | OK |
| 5d.9 | "Landing pages — Dynamic at `/lp/[slug]`, rendered from DB-stored section configs" | Matches. | OK |
| 5d.10 | Doc is silent on the marketing component inventory (22 active files in `src/components/marketing/`) | Helpful index for Claude when editing marketing pages. | MISSING |

**Action items**

- [ ] **A-5d.1** Replace "Poppins + Lora fonts" with "Manrope" in the marketing-site bullet. Remove "(no gold)" qualifier or add a parenthetical that says "the logo `ads` treatment is the brand-locked exception."
- [ ] **A-5d.2** Delete the "Copy is draft — will be regenerated" sentence entirely. Voice docs exist; copy is now governed by them.
- [ ] **A-5d.3** Update "16+ lazy-loaded tab components" to reflect the current shape: roughly 60 files, with feature subdirs for ad-publisher, ad-studio, creative-studio, google-ads-lab, tiktok-creator, etc.
- [ ] **A-5d.4** Decide whether the "needs reorganization" note still applies. If the ad-studio/ad-publisher split satisfies it, delete the note. If more work is pending, keep but be specific about what is still outstanding.

#### 5e. Database (lines 76–80)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5e.1 | "**~75 models, 1485 lines**" | **Actual: 90 models, 1966 lines** (`grep -c "^model " prisma/schema.prisma && wc -l prisma/schema.prisma`). | STALE |
| 5e.2 | "Key models: `organizations`, `org_users`, `org_sessions`, `facilities`, `clients`, `shared_audits`, `activity_log`, `landing_pages`, `drip_sequences`, `platform_connections`" | `org_sessions` does not exist (see 5b.6). Others exist. The "key models" list could also be expanded to reflect the moats (PMS data, audit funnel). | WRONG |
| 5e.3 | "Singleton client at `src/lib/db.ts`" | Matches. | OK |
| 5e.4 | "Some routes use `db.$queryRawUnsafe()` for complex upserts; prefer Prisma methods where possible." | **No `queryRawUnsafe` in non-test production code.** `$executeRaw` and `$queryRaw` are used in `src/lib/session-auth.ts` for the sessions table. The "queryRawUnsafe" claim is stale. | WRONG |

**Action items**

- [ ] **A-5e.1** Update model count to "**90 models, ~1960 lines**" — or drop the precise number and write "large schema; query with `grep -c '^model ' prisma/schema.prisma` rather than guessing."
- [ ] **A-5e.2** Remove `org_sessions` from the key-models list. Add `sessions`. Optionally curate to ~10 models that genuinely matter for Claude's reasoning (e.g. `facilities`, `clients`, `leads`, `shared_audits`, `landing_pages`, `pms_uploads`, `audit_log`, `sessions`, `organizations`, `org_users`).
- [ ] **A-5e.3** Replace the `$queryRawUnsafe` claim with truthful guidance: "Raw SQL (`$executeRaw`, `$queryRaw`) is used in `src/lib/session-auth.ts` for direct session-table operations. Everywhere else, use Prisma client methods."

#### 5f. Design System — Light Only (lines 82–123)

This section is dense (40 lines). Most is correct. Issues:

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5f.1 | Core palette token values (`--color-dark`, `--color-light`, `--color-body-text`, `--color-mid-gray`, `--color-light-gray`) | Match `globals.css`. | OK |
| 5f.2 | "Sienna gold is banned … Older `--color-gold*` tokens still exist in `globals.css` for now but must not be referenced in new code." | **Multiple gold tokens still exist in `globals.css` and `--brand-gold` is actively referenced** (in the logo treatment). The "banned" claim and the "brand-locked exception" for the logo coexist awkwardly and may confuse Claude. | DECISION |
| 5f.3 | Secondary accents, error red, dashboard surface | Match. | OK |
| 5f.4 | "**Never use … icon libraries**" (line 120) | **`lucide-react` is imported in 202+ files.** This rule is wrong in spirit OR the codebase needs a massive cleanup. Memory: the blog page itself uses `ArrowLeft`, `ArrowRight`, `Clock` from lucide-react. | DECISION |
| 5f.5 | Manrope variable font; weights, line-heights | Match. | OK |
| 5f.6 | CSS variable aliasing list (`--mono`, `--serif`, etc. → `--font-manrope`) | Verified via `grep "Manrope\|--font-manrope" globals.css` (22 matches). | OK |
| 5f.7 | Tabular numerals via `.urbit-landing` | Matches. | OK |
| 5f.8 | Logo two-tone with `--brand-gold` | Matches. | OK |
| 5f.9 | "Chart colors: dark=Meta, blue=Google, green=retargeting" | Convention; recharts is the actual lib. Worth noting recharts. | STALE |
| 5f.10 | "All emails from `*@storageads.com`" | Matches Resend config. | OK |
| 5f.11 | Section length | 40 lines inside CLAUDE.md, denser than any other section. | BLOAT |

**Action items**

- [ ] **A-5f.1** Resolve the "sienna gold is banned" vs "brand-locked `--brand-gold`" tension. Recommended rewrite: "Sienna gold (`#B58B3F`) is banned everywhere **except** the logo 'ads' lockup, where `--brand-gold` is the only legal use. Older `--color-gold*` tokens remain in `globals.css` for legacy compatibility; do not reference them in new code."
- [ ] **A-5f.2** Resolve the icon-library contradiction. Either (a) update the rule to permit `lucide-react` since it is the de facto icon library, or (b) commit to ripping lucide-react out (massive job). Default recommendation: permit `lucide-react`, ban others, document in the rule.
- [ ] **A-5f.3** Note that admin charts use `recharts` with the documented color convention.
- [ ] **A-5f.4** **Extract the Design System section to its own file** at `.claude/design-system.md` and replace with a 2-line pointer in `CLAUDE.md`. Matches the pattern Blake already uses for voice / market-data. Reduces CLAUDE.md by ~40 lines and makes the design system independently editable.

#### 5g. Cron Jobs (lines 125–127)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5g.1 | "**9 Vercel cron jobs** configured in `vercel.json`" | **Actual: 21 crons.** +12 since the doc was written. | STALE |
| 5g.2 | "All at `src/app/api/cron/`" | Matches. 21 subdirs there. | OK |
| 5g.3 | "Each validates `CRON_SECRET` via shared `src/lib/cron-auth.ts`" | Matches. | OK |

**Action items**

- [ ] **A-5g.1** Update count from 9 to 21. Or, again, drop the number: "All cron jobs are configured in `vercel.json` and live at `src/app/api/cron/*`. Map them with `cat vercel.json` rather than guessing."

#### 5h. Key Integrations (lines 129–143)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5h.1 | Anthropic, Resend, Stripe, Twilio, FAL.ai/Runway, Upstash, Google Places, Cal.com, Meta/Google/TikTok Ads | All present. | OK |
| 5h.2 | "Twilio … Not set up yet" | Per recent commits and `proxy.ts` CSP including Twilio call tracking, this may be partially live. Blake to confirm. | DECISION |
| 5h.3 | "FAL.ai / Runway ML — Angelo's work — do not modify" | Strong, useful guardrail. Keep. | OK |
| 5h.4 | "Meta/Google/TikTok Ads — Angelo's work — do not modify" | Keep. | OK |
| 5h.5 | "Cal.com — Demo call booking embed — Blake's calendar" | Misses the critical detail that **the Cal handle is `stowstack`, not `storageads`** (the `storageads` handle was never claimed). The centralized URL lives at `src/lib/booking.ts`. | MISSING |
| 5h.6 | Doc is silent on Sentry, Vercel Blob | See 5a.6 + 5a.7. | MISSING |
| 5h.7 | Doc is silent on Meta CAPI server-side events (separate from "Meta Ads" — implemented by Angelo per commit history) | Worth a row. | MISSING |

**Action items**

- [ ] **A-5h.1** Add a Cal.com row note: "Cal handle is `stowstack/30min`. The `storageads` handle was never claimed. Centralized URL lives at `src/lib/booking.ts` — do not hardcode the URL anywhere else."
- [ ] **A-5h.2** Add Sentry, Vercel Blob, and Meta CAPI rows. Mark Meta CAPI as Angelo's domain.
- [ ] **A-5h.3** Confirm with Blake whether Twilio is still "not set up yet" or whether call-tracking is now live (recent CSP entries suggest some integration).

#### 5i. PMS Integration (lines 145–147)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5i.1 | "Phase 1 (current): Manual upload of facility management reports — **PDF, CSV, and Excel only**." | **Wrong.** `pms-upload-tab.tsx` uses `accept=".csv"` and copy says "Supports .csv files". No PDF or XLSX path. | WRONG |
| 5i.2 | "No API integrations yet" | Accurate per intent. | OK |

**Action items**

- [ ] **A-5i.1** Change "PDF, CSV, and Excel only" to "CSV only (`accept=".csv"` in `pms-upload-tab.tsx`)." If PDF/XLSX support is on the roadmap, link to the task.

#### 5j. Data Scraping Strategy (lines 149–151)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5j.1 | "scrape ALL available sources aggressively: Google Maps, competitor websites, RentCafe, SpareFoot, Yardi, Crexi, and any other public data sources." | Strategy statement, not code-verifiable. Cheerio (in deps) supports this. Blake to confirm it still reflects intent. | OK |

**Action items:** None unless Blake wants to update strategy.

#### 5k. Path Alias (lines 153–155)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 5k.1 | "`@/*` maps to `src/*`" | Matches `tsconfig.json` paths. | OK |

**Action items:** None.

---

### Section 6 — Build Priorities (lines 157–161)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 6.1 | "1. Customer-facing site" | Recent commit cadence supports this. | OK |
| 6.2 | "2. Admin layout/menu reorganization" | Partially shipped (ad-studio, ad-publisher subdirs exist). | DECISION |
| 6.3 | "3. Feature completion across the platform" | Vague — could be sharpened. | DECISION |

**Action items**

- [ ] **A-6.1** Have Blake refresh priorities for current phase. If alpha-testing is the immediate next step (Section 4 status), priorities likely shift to: (a) onboarding flow polish, (b) PMS upload UX, (c) audit-funnel conversion. Blake to decide.

---

### Section 7 — Team (lines 163–166)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 7.1 | Blake / Angelo descriptions | Matches commit history (136 Blake / 82 Angelo / 8 Claude). Angelo's domain (ad platforms + video/image gen) tracks. | OK |

**Action items:** None.

---

### Section 8 — Remediation Tasks (lines 168–213)

| # | Claim | Verified state | Tag |
|---|---|---|---|
| 8.1 | "`tasks/` directory contains numbered `.md` files (**01-23**)" | **Actual: only `24-27` + `README.md` remain.** Tasks 01-23 are archived/closed per `tasks/README.md`. | STALE |
| 8.2 | "453 files and 172 API routes" (line 177) | Stale. API routes are now 198. File count not re-verified but likely changed too. | STALE |
| 8.3 | Execution Rules (9 rules) | Still good as a behavioral contract. Could move to `tasks/README.md` to keep `CLAUDE.md` lean. | BLOAT |
| 8.4 | "How to Start a Task" (7 steps) | Same: useful but bloating CLAUDE.md. | BLOAT |
| 8.5 | "Task Dependencies — 07 before 14, 06 before 16, 11 before 12" | All those tasks are closed (in the 01-23 batch). Stale. | STALE |
| 8.6 | "Build Verification" block | Accurate and still useful as a post-task check. | OK |

**Action items**

- [ ] **A-8.1** Replace "01-23" reference with "current: 24-27 (see `tasks/README.md` for status)." Or remove the count and just point to `tasks/README.md` as source of truth.
- [ ] **A-8.2** Remove stale file/route counts ("453 files and 172 API routes") or update them. Recommend removing — they will drift again.
- [ ] **A-8.3** Remove the stale task-dependency block (07→14, 06→16, 11→12). Those tasks are done.
- [ ] **A-8.4** **Move the Execution Rules + How to Start a Task into `tasks/README.md`.** Leave a 3-line pointer in CLAUDE.md: "Tasks live in `tasks/`. Read `tasks/README.md` for execution rules. After every task: `npx prisma validate && npx tsc --noEmit && npm run build`." This shrinks CLAUDE.md by ~30 lines.

---

## Cross-cutting structural recommendations

These are not single-line fixes; they are restructuring decisions for Blake to weigh.

| # | Recommendation | Rationale |
|---|---|---|
| S-1 | **Extract Design System to `.claude/design-system.md`** (action A-5f.4) | -40 lines from CLAUDE.md; matches the pattern Blake uses for voice + market-data. Design system is also the section most likely to evolve. |
| S-2 | **Move Remediation-Task execution rules to `tasks/README.md`** (action A-8.4) | -30 lines from CLAUDE.md. Rules belong with the tasks they govern. |
| S-3 | **Replace specific counts with "map it yourself" guidance** (actions A-5c.1, A-5e.1, A-5g.1, A-8.2) | Drift is inevitable; teaching Claude to grep is more durable than maintaining numbers. |
| S-4 | **Resolve icon-library contradiction** (action A-5f.2) | This is a foundational design-system call. Decide once. |
| S-5 | **Surface the operator-copy skill in CLAUDE.md** (action A-1.3) | The skill exists but a Claude session that does not read the skill registry will miss it. |

---

## Master action list (prioritized for batching)

Suggested grouping into follow-on task files. Each cluster is small enough that Claude can verify the entire change end-to-end without one-shotting CLAUDE.md.

### Cluster A — Wrong claims that mislead Claude (highest priority)

Single follow-on task: `tasks/29-claude-md-wrong-claims.md`

- A-3.1 build command (runs migrate deploy)
- A-3.2 vitest exists
- A-4.1 pricing tier names (Signal / System / Compound)
- A-4.2 blog is live
- A-5b.2 sessions table name
- A-5d.1 fonts (Manrope, not Poppins+Lora)
- A-5d.2 delete stale "copy is draft" sentence
- A-5e.2 fix key-models list
- A-5e.3 remove stale queryRawUnsafe claim
- A-5i.1 PMS upload formats (CSV only)
- A-5h.1 Cal.com handle is `stowstack`, URL centralized in `src/lib/booking.ts`

### Cluster B — Stale numbers + light refresh

Single follow-on task: `tasks/30-claude-md-stale-numbers.md`

- A-5a.1 stack additions (Sentry, Vercel Blob, React 19, etc.)
- A-5c.1 route count language
- A-5d.3 facility-tabs count + subdirs
- A-5e.1 model count
- A-5g.1 cron count
- A-8.1 task numbering 24-27
- A-8.2 + A-8.3 remove stale execution-section counts and dependency block

### Cluster C — Structural extractions

One task per extraction (do not combine):

- `tasks/31-extract-design-system-doc.md` (covers A-5f.4 + S-1)
- `tasks/32-move-task-execution-rules.md` (covers A-8.4 + S-2)

### Cluster D — Decisions Blake must make before edits

Hold pending Blake decisions; do not start until resolved:

- A-1.1 relationship between voice docs
- A-4.3 launch-status framing
- A-5d.4 still-needs-reorg note
- A-5f.1 gold rule wording
- A-5f.2 icon-library policy (load-bearing — affects future codebase)
- A-5h.3 Twilio status
- A-6.1 priority refresh

### Cluster E — Missing additions (medium priority)

Single follow-on task: `tasks/33-claude-md-missing-additions.md`

- A-1.2 link blake-copy-raw.md
- A-1.3 link operator-copy skill
- A-3.3 lint:safety
- A-3.4 prisma scripts
- A-5b.1 proxy.ts CSP/CSRF/Sentry truth
- A-5b.3 CSRF pointer
- A-5d.5 (optional) marketing component inventory
- A-5f.3 recharts note
- A-5h.2 Sentry + Vercel Blob + Meta CAPI integrations rows

---

## Verification plan

After each cluster lands, run:

```bash
npx prisma validate
npx tsc --noEmit
npm run build
```

Optionally: read CLAUDE.md top to bottom in one sitting and confirm no remaining drift. The audit should be re-run quarterly because the repo is evolving fast.

---

## Footnote — what was deliberately NOT changed

- The "Voice & Copy" memory rules (em-dash ban, voice register) apply to drafted copy and replies, not to CLAUDE.md itself. CLAUDE.md is an internal contract for Claude; em dashes here are acceptable and present in the original.
- The Angelo guardrail ("All ad platform integrations and video/image generation tools are Angelo's domain") is load-bearing and untouched.
- Build verification commands (Section 8) are accurate and unchanged.
