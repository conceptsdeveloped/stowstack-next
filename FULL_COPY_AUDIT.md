# Full Copy Quality Audit — StorageAds + StowStack

**Date:** 2026-03-31
**Auditor:** Claude (Opus 4.6)
**Scope:** All user-facing copy across both codebases: `stowstack-next` (StorageAds/Next.js) and `stowstack-app` (StowStack/Vite+React), including marketing pages, portal, admin, partner, blog, email templates, ad copy, sales collateral, and landing pages.
**Severity Scale:** P0 (broken/misleading UX), P1 (credibility risk), P2 (polish/consistency)
**Reference:** Brand voice from `/stowstack-work/brand-voice.md`, existing partial audit in `COPY_QA_AUDIT.md` (CQ-001 through CQ-015)

---

## How to read this audit

- **P0** = Fix before any prospect sees it. Broken UX, wrong math visible to users, or trust-destroying inconsistencies.
- **P1** = Fix before launch. Credibility risks that a skeptical operator or technical evaluator will catch.
- **P2** = Fix during polish pass. Brand consistency, tone, minor grammar.

Issues CQ-001 through CQ-015 are in the existing `COPY_QA_AUDIT.md` and are not repeated here.

---

# P0 — Broken / Misleading UX

---

## CQ-016 — Old brand "StowStack" in Privacy/Terms page header

**File:** `stowstack-next/src/components/legal-layout.tsx` lines 32-33
**Verbatim:**
```tsx
Stow
<span style={{ color: "var(--accent)" }}>Stack</span>
```
**Problem:** The shared layout used by `/privacy` and `/terms` displays "StowStack" as the logo. These are live legal pages — every visitor to privacy or terms sees the old brand name.
**Fix:** Replace with `storage` + `ads` brand rendering using `--color-dark` and `--color-gold`.

---

## CQ-017 — Old brand "StowStack" in client guide header

**File:** `stowstack-next/src/app/guide/page.tsx` line 167
**Verbatim:**
```tsx
Stow<span style={{ color: "var(--accent)" }}>Stack</span>
```
**Problem:** Client-facing guide page renders old brand in the header logo. Body copy correctly says "StorageAds," creating an inconsistency on the same page.
**Fix:** Same as CQ-016.

---

## CQ-018 — Old brand "StowStack" in landing page footer (ad traffic sees this)

**File:** `stowstack-next/src/app/lp/[slug]/page.tsx` line 1246
**Verbatim:** `Powered by StowStack by StorageAds.com`
**Problem:** Landing pages are the highest-conversion surface — these are what prospects land on from paid ads. Footer shows two brand names, one of which is dead. Confusing and unprofessional.
**Fix:** Change to `Powered by StorageAds`. Rename `hideStowStack` variable (line 1232) to `hideStorageAds`.

---

## CQ-019 — Portal onboarding session key mismatch breaks login flow

**File:** `stowstack-next/src/app/portal/onboarding/page.tsx` line 49
**Verbatim:**
```ts
const SESSION_KEY = "storageads_portal_session";
```
**vs.** `src/lib/portal-helpers.tsx` line 82:
```ts
const SESSION_KEY = "stowstack_portal_session";
```
**Problem:** Onboarding page defines its own session key (`storageads_portal_session`) that doesn't match the one used by the portal shell and all other portal pages (`stowstack_portal_session`). Result: onboarding page can never find the session, so it redirects logged-in clients back to `/portal`. They can never reach onboarding through normal navigation.
**Fix:** Import the constant from `portal-helpers.tsx` or align the strings. (Then plan a coordinated rename of both to `storageads_portal_session`.)

---

## CQ-020 — Inconsistent ROI/ROAS numbers across the entire StowStack site

**Files (stowstack-app):**
- `src/App.tsx` line 53: `4-12x` (STATS array, ROI)
- `src/App.tsx` line 122: `6.4x` (KPI_METRICS, ROAS)
- `src/App.tsx` line 1312: `ROAS: 4.2x` (KPI Dashboard footer)
- `src/App.tsx` line 1423: `35x` ("Annualized ROAS" in CaseStudyTeaser)
- `11-linkedin-posts.md` line 169: `29:1 ROI`

**Problem:** Five different ROI/ROAS numbers from the same system on the same site. A visitor who scrolls through sees 4-12x, then 6.4x, then 4.2x, then 35x. This destroys credibility with the numbers-driven operators who are the target buyer.
**Fix:** Pick one consistent ROAS figure for the main claim. Label "35x" as "annualized" only where used. Remove conflicting numbers from the same viewport.

---

## CQ-021 — Pricing conflicts across live site and all collateral

**Files (stowstack-app):**
- `src/App.tsx` lines 127-178: Launch $499/mo, Growth $999/mo, Portfolio $1,499/mo
- `14-pricing-page-copy.md` lines 23-40: Launch $750/mo, Growth $1,500/mo, Portfolio Custom
- `07-landing-page-copy.md` line 61: `$750-$1,500/month`
- `09-sales-call-script.md` line 177: `$400-2K`

**Problem:** Four different pricing structures. A prospect who reads a blog post, sees a LinkedIn ad, and visits the site will encounter different numbers.
**Fix:** Align all collateral to current live pricing ($499/$999/$1,499). Update the markdown docs.

---

## CQ-022 — "34 move-ins at $41 each = $1,394 in revenue per unit" — math is wrong

**File:** `stowstack-app/15-retargeting-ad-copy.md` line 12
**Verbatim:** `34 move-ins in 90 days at $41 each. That's $1,394 in revenue per unit.`
**Problem:** 34 x $41 = $1,394 in *ad spend*, not "revenue per unit." Conflates cost of acquisition with revenue generated.
**Fix:** `34 move-ins in 90 days at $41 each. That's $1,394 in total ad spend to generate tens of thousands in recurring revenue.`

---

## CQ-023 — Occupancy claim "60% to 87% in 45 days" appears nowhere else

**File:** `stowstack-app/15-retargeting-ad-copy.md` line 22
**Verbatim:** `One operator went from 60% occupancy to 87% in 45 days.`
**Problem:** Every other instance says "71% to 84%." This ad invents a different case study with no backing data.
**Fix:** Use the consistent claim (71% to 84%) or clearly attribute to a named, different operator.

---

## CQ-024 — "transtone-" typo across all stowstack-app animation classes (broken CSS)

**Files (stowstack-app):**
- `src/App.tsx` lines 240, 426
- `src/components/website/ThreeWayComparison.tsx` line 86
- `src/components/website/InactionTimeline.tsx` lines 77, 99, 138, 154
- `src/components/website/QuickCalculator.tsx` line 34
- `src/components/website/DemandEngineVisual.tsx` lines 102, 126, 133

**Problem:** `transtone-y-*` and `transtone-x-*` should be `translate-y-*` and `translate-x-*`. These are broken Tailwind utility classes — all scroll-reveal animations silently fail.
**Fix:** Global find-and-replace `transtone-` with `translate-` across the stowstack-app codebase.

---

## CQ-025 — Blog post dated April 1 (tomorrow) — renders before publish date, April Fools risk

**File:** `stowstack-next/content/blog/hidden-marketing-costs-per-movein.md` line 5
**Verbatim:** `date: 2026-04-01`
**Problem:** If the blog renderer doesn't filter by date, this post appears live before its publish date. April 1 publish date also risks being perceived as a joke post for a serious cost-math article.
**Fix:** Change to `2026-03-31` or a date after April 1.

---

# P1 — Credibility Risk

---

## CQ-026 — Demo page meta tags contradict each other: "simulated data" vs "real data"

**File:** `stowstack-next/src/app/demo/page.tsx` lines 7, 16
**OG description:** `"See what a StorageAds campaign dashboard looks like with simulated data for a fictional facility."`
**Twitter description:** `"See what a StorageAds campaign dashboard looks like with real data."`
**Problem:** Opposite claims on different social platforms. Technical evaluators will notice.
**Fix:** Align both to the truthful version (simulated data).

---

## CQ-027 — Calculator page uses $14.20 cost-per-move-in; homepage uses $41

**File:** `stowstack-next/src/app/calculator/page.tsx` line 21
**Verbatim:** `const AVG_COST_PER_MOVE_IN = 14.2;` and line 229: `"Average cost per move-in: $14.20 (based on our operator data)"`
**Problem:** Homepage quick calculator (CQ-007) uses $41. This standalone calculator uses $14.20. At default $1,500 budget, this calculator projects 106 move-ins/month — not credible for a single facility. Source claim ("our operator data") appears to be a single case study.
**Fix:** Reconcile the figure across pages. Cap projected move-ins. Source honestly.

---

## CQ-028 — Signup plan description contradicts its own feature list

**File:** `stowstack-next/src/app/signup/page.tsx` lines 26-29
**Verbatim:** Description: `"Perfect for getting started with 1-5 facilities"` / Feature: `"Up to 10 facilities"`
**Problem:** Two different numbers for the same plan on the same card.
**Fix:** Align. If limit is 10, change description to "For operators with up to 10 facilities."

---

## CQ-029 — Signup offers 14-day free trial but product is pre-launch

**File:** `stowstack-next/src/app/signup/page.tsx` lines 209, 753
**Verbatim:** `"Start your 14-day free trial"` / `"No credit card required. Cancel anytime."`
**Problem:** Product is pre-launch with no paying customers. Trial offer sets expectations the product can't meet.
**Fix:** Replace with waitlist/early-access: "Join the early access list" or "Request an invite."

---

## CQ-030 — "127 operators" claim unsubstantiated

**File:** `stowstack-app/15-retargeting-ad-copy.md` line 19
**Verbatim:** `See what 127 operators are doing differently`
**Problem:** Main site references no client count. Cold email says "40+." LinkedIn says "50+." "127" appears nowhere else.
**Fix:** Use a real, consistent number or remove the specific count.

---

## CQ-031 — "15-20 move-ins in month one" contradicts "34 in 90 days" case study

**File:** `stowstack-app/06-meta-ad-copy.md` line 53
**Verbatim:** `We're talking 15-20 move-ins in month one for our operators.`
**Problem:** Case study shows 34 in 90 days (~11/month). Ad copy claims 36-64% more.
**Fix:** `8-12 move-ins in month one for most operators.`

---

## CQ-032 — "50+ facilities" vs "40+ facility owners" across outbound channels

**Files (stowstack-app):**
- `07-landing-page-copy.md` line 152: `50+ facilities`
- `08-cold-email-sequence.md` line 57: `40+ facility owners`
**Problem:** Different numbers in channels prospects may see both.
**Fix:** One consistent number.

---

## CQ-033 — Cold email says "We don't touch your ad spend" — contradicts entire product

**File:** `stowstack-app/08-cold-email-sequence.md` lines 72-73
**Verbatim:** `We don't do that. We don't touch your ad spend.`
**Problem:** The entire product manages ad campaigns. Every other piece of collateral says so.
**Fix:** Rewrite to match: "We don't just run your ads — we control the full funnel from ad to move-in."

---

## CQ-034 — "1-20 units" instead of "1-20 facilities" (wrong target definition)

**Files (stowstack-app):**
- `08-cold-email-sequence.md` line 108: `Self-storage facilities, 1–20 units`
- `06-meta-ad-copy.md` line 145: `Self-storage facility owners/operators with 1-20 units`
**Problem:** A 1-20 *unit* facility is tiny. Should be 1-20 *facilities*.
**Fix:** Change "units" to "facilities."

---

## CQ-035 — Fake hardcoded testimonials in landing page template

**File:** `stowstack-app/src/components/landing-templates/index.tsx` lines 642-646
**Verbatim:**
```
{ name: 'Sarah M.', text: 'Best storage facility in the neighborhood!' },
{ name: 'Mike J.', text: 'Great customer service, very secure.' },
{ name: 'Lisa T.', text: 'Convenient location and reasonable prices.' }
```
**Problem:** Generic, obviously fake placeholder testimonials. If deployed for any client, this is a legal and credibility risk (fabricated reviews).
**Fix:** Make testimonials dynamic from props or remove the hardcoded section.

---

## CQ-036 — Hardcoded trust bar features ("Climate Controlled", "24/7 Access") may be false

**File:** `stowstack-app/src/components/landing-templates/index.tsx` lines 164-166
**Problem:** Features are hardcoded, not from props. A facility without climate control would display a false claim.
**Fix:** Pull from `props.features`.

---

## CQ-037 — "Case Studies" and "How It Works" footer links go to #cta

**File:** `stowstack-app/src/App.tsx` lines 1861-1862
**Problem:** Footer links labeled "Case Studies" and "How It Works" scroll to the CTA form. No case study or how-it-works page exists. Misleading navigation.
**Fix:** Create the pages or relabel: "Get Started."

---

## CQ-038 — CTA promises "reply within 24 hours with your audit" — may not match reality

**Files (stowstack-app):**
- `src/components/cta/IntakeForm.jsx` line 89
- `src/App.tsx` line 1733
**Verbatim:** `Expect a reply within 24 hours with your audit.`
**Problem:** Sales script suggests audits happen on calls, not as delivered documents. If reality is "schedule a call," this is a broken promise.
**Fix:** Align with reality: "We'll reach out within 24 hours to schedule your audit review."

---

## CQ-039 — "We" voice throughout drip emails signed by "Blake, Founder"

**File:** `stowstack-next/src/lib/drip-email-templates.ts` lines 117, 177, 206, 210
**Verbatim:**
- `"We just finished the marketing audit for"`
- `"Most facilities we audit are leaving money on the table"`
**Problem:** Emails are signed by Blake personally but use "we." Brand voice says "I" not "we" for founder-led communication.
**Fix:** Change to "I just finished...", "Most facilities I audit..."

---

## CQ-040 — "We" voice throughout about page copy

**File:** `stowstack-next/about-page.md` line 21
**Verbatim:** `"Every feature we build gets tested on my facility before it reaches yours."`
**Problem:** "We build" breaks the "I" voice on an otherwise first-person page.
**Fix:** `"Every feature I build..."`

---

## CQ-041 — Case studies page has only 1 entry; homepage has 2 different ones; no overlap

**Files:**
- `stowstack-next/src/types/case-study.ts`: Two Paws Self Storage only
- `stowstack-next/src/components/marketing/results.tsx`: Midway Self Storage + Lakeshore Storage
**Problem:** Three different facility names across the site with zero overlap between pages. 2-column grid renders 1 card with empty space.
**Fix:** Add Midway and Lakeshore to the case studies array. Or use single-column layout until 2+ exist.

---

## CQ-042 — "Leverage" (banned jargon) in insights page and LinkedIn

**Files:**
- `stowstack-next/src/app/insights/page.tsx` line 74: `"That's when you have leverage."`
- `stowstack-next/linkedin-posts-founder.md` line 65: same
**Fix:** `"That's when you have the upper hand."`

---

## CQ-043 — "Optimize" (banned jargon) in admin onboarding

**File:** `stowstack-next/src/app/admin/onboarding/page.tsx` line 244
**Verbatim:** `"These connections let StorageAds run and optimize your ads directly."`
**Fix:** `"...run and improve your ads directly."`

---

# P2 — Polish / Consistency

---

## CQ-044 — All 5 changelog entries share date 2026-03-24

**File:** `stowstack-next/src/app/changelog/page.tsx` lines 24-58
**Problem:** Looks bulk-generated. Stagger across 2-3 weeks for credible cadence.

---

## CQ-045 — About page CTA says "diagnostic" but button says "audit"

**File:** `stowstack-next/src/app/about/page.tsx` lines 217-221
**Problem:** "Get a free diagnostic" text, "Get your free facility audit" button, links to `/diagnostic`. Two terms for the same thing in 30px.
**Fix:** Pick one term.

---

## CQ-046 — About page sign-off has redundant "founder" twice

**File:** `stowstack-next/src/app/about/page.tsx` lines 185-191
**Verbatim:** `"Founder, StorageAds.com"` then `"Storage operator & founder"`
**Fix:** Consolidate: `"Founder & operator, StorageAds"`

---

## CQ-047 — Guide page uses wrong CSS tokens (dark-theme instead of light-theme)

**File:** `stowstack-next/src/app/guide/page.tsx` throughout
**Problem:** Uses `--bg-void`, `--accent`, `--accent-glow` (admin dark-theme tokens) instead of `--color-light`, `--color-gold`, `--color-gold-light` (marketing light-theme tokens).
**Fix:** Replace with light-theme equivalents.

---

## CQ-048 — "StorageAds by StorageAds.com" redundant title in guide

**File:** `stowstack-next/src/app/guide/page.tsx` lines 103, 224
**Fix:** Change to `"Welcome to StorageAds"`.

---

## CQ-049 — Signup page uses `#ffffff` instead of brand token

**File:** `stowstack-next/src/app/signup/page.tsx` lines 304, 385
**Problem:** Design system forbids pure `#fff`. Use `var(--color-light)`.

---

## CQ-050 — Landing page footer uses Tailwind defaults instead of brand tokens

**File:** `stowstack-next/src/app/lp/[slug]/page.tsx` lines 1234-1244
**Problem:** `bg-white`, `text-slate-500`, `text-slate-600`, `text-blue-400` — all forbidden by design system.
**Fix:** Replace with brand CSS variables.

---

## CQ-051 — 15+ localStorage/sessionStorage keys still use "stowstack_" prefix

**Files:**
- `stowstack-next/src/lib/portal-helpers.tsx` line 82: `stowstack_portal_session`
- `stowstack-next/src/components/theme-provider.tsx` lines 42, 58, 71: `stowstack-dark-overrides`, `stowstack-theme`
- `stowstack-next/src/app/admin/settings/page.tsx` line 359: `stowstack_admin_key`
- `stowstack-next/src/app/lp/[slug]/page.tsx`: `stowstack_session_id`, `stowstack_fbclid`, `stowstack_gclid`, `stowstack_exit_dismissed`
**Problem:** Old brand name visible in DevTools. Technical evaluators will notice.
**Fix:** Coordinate rename to `storageads_*` prefix (will reset existing sessions — deploy carefully).

---

## CQ-052 — Inconsistent empty-state punctuation across portal/partner pages

**Files:** ~12 instances across portal and partner pages — some have periods, some don't.
**Examples:**
- `"No recent activity yet"` (no period) — portal/page.tsx:326
- `"No invoices yet."` (period) — portal/billing/page.tsx:268
- `"No referrals yet"` (no period) — partner/revenue/page.tsx:263
**Fix:** Add periods to all empty-state messages.

---

## CQ-053 — Portal error page uses `#fff` instead of brand token

**File:** `stowstack-next/src/app/portal/error.tsx` line 32
**Fix:** Change `color: "#fff"` to `color: "var(--color-light)"`.

---

## CQ-054 — "We" voice throughout stowstack-app marketing copy

**Files (stowstack-app):** Dozens of instances across `App.tsx`, `Hero.jsx`, `Differentiators.jsx`, etc.
**Problem:** Brand voice says "I" not "we." Almost all copy uses "we."
**Fix:** Systematically change, or formally update brand voice if "we" is now acceptable.

---

## CQ-055 — "We" voice in all 6 stowstack-next blog posts

**Files:** All posts in `stowstack-next/content/blog/` use "we" where brand voice requires "I."
**Fix:** Global pass to change "we" to "I" in blog copy.

---

## CQ-056 — Corporate jargon in stowstack-app: "Conversion Rate Optimization," "Execution Moat"

**Files (stowstack-app):**
- `src/App.tsx` line 84: `"Conversion Rate Optimization"`
- `src/App.tsx` line 106: `"Compounding Returns"`
- `src/App.tsx` line 203: `"Integration + Execution Moat"`
- `src/components/website/DemandEngineVisual.tsx` line 67: `"Optimization Loop"`
**Fix:** Rephrase: "Better Pages, More Move-Ins" / "It Gets Cheaper Every Month" / "Hard to Replace."

---

## CQ-057 — "Optimize" (banned jargon) in 4 blog posts

**Files (stowstack-next/content/blog/):**
- `cost-per-movein-math.md` lines 15, 73
- `public-storage-earnings-2026-demand.md` line 73
- `ab-tested-headlines-climate-campaign.md` line 78
**Fix:** Replace with "focus on" / "work with" / "run tight operations" / "track."

---

## CQ-058 — "Demand engine" jargon in about page

**File:** `stowstack-next/about-page.md` line 23
**Verbatim:** `"It's a demand engine built by someone who signs the same checks you do."`
**Fix:** `"It's a marketing system built by someone who signs the same checks you do."`

---

## CQ-059 — "moves-in" typo (should be "move-ins") in LinkedIn posts

**File:** `stowstack-app/11-linkedin-posts.md` lines 80, 82, 87, 114
**Fix:** Replace all `moves-in` with `move-ins`.

---

## CQ-060 — No blog posts have closing CTAs

**Files:** All 6 posts in `stowstack-next/content/blog/`
**Problem:** No conversion path at end of any article. Brand rules specify CTAs like "Get Your Free Facility Audit."
**Fix:** Add a closing CTA to each post.

---

## CQ-061 — Empty LinkedIn/Twitter fields in author JSON may render broken links

**File:** `stowstack-next/content/authors/default.json` lines 6-7
**Fix:** Populate with real URLs or remove fields; ensure template checks for existence.

---

## CQ-062 — LinkedIn posts reference 2020/2021 dates — feel stale in 2026

**File:** `stowstack-app/11-linkedin-posts.md` lines 48, 72
**Fix:** Update to recent timeframes or generalize.

---

## CQ-063 — "Full stack" jargon in drip email

**File:** `stowstack-next/src/lib/drip-email-templates.ts` line 181
**Verbatim:** `"StorageAds handles the full stack — local SEO, paid ads, retargeting, and reputation management"`
**Fix:** `"StorageAds handles it all — ..."`

---

## CQ-064 — Messages page exclamation mark off-brand

**File:** `stowstack-next/src/app/portal/messages/page.tsx` line 102
**Verbatim:** `"No messages yet. Start a conversation!"`
**Fix:** Drop the exclamation mark.

---

## CQ-065 — "Contact Us" generic CTA in copy templates

**File:** `stowstack-next/src/lib/copy-templates.ts` line 52
**Problem:** Brand rules say never use generic CTAs.
**Fix:** `"Get a Quote"` or `"Reserve Your Unit"`.

---

# Summary

## By Severity

| Severity | Count | From existing audit | New in this audit | Total |
|----------|-------|--------------------:|------------------:|------:|
| **P0**   | 2     | +10                 | **12**            |       |
| **P1**   | 5     | +13                 | **18**            |       |
| **P2**   | 8     | +22                 | **30**            |       |
| **Total**| 15    | +45                 | **60**            |       |

## By Category

| Category | P0 | P1 | P2 | Total |
|----------|---:|---:|---:|------:|
| Old "StowStack" brand on live pages | 3 | — | 1 | 4 |
| Wrong/inconsistent math | 4 | 2 | — | 6 |
| Pricing inconsistencies | 1 | — | — | 1 |
| Contradictory claims across channels | 1 | 4 | — | 5 |
| Broken UX (session key, CSS classes) | 2 | — | — | 2 |
| Misleading CTAs/labels | 1 | 2 | 1 | 4 |
| Banned jargon ("optimize", "leverage", etc.) | — | 2 | 6 | 8 |
| "We" vs "I" voice | — | 2 | 2 | 4 |
| Design system violations (#fff, Tailwind defaults) | — | — | 4 | 4 |
| Placeholder/fake content | — | 2 | — | 2 |
| Content dating/scheduling | 1 | — | 2 | 3 |
| Other polish | — | — | 6 | 6 |

## Top 10 Actions (Ordered by Impact)

1. **Fix old brand "StowStack"** on legal pages, guide, and landing page footer (CQ-016/17/18) — P0, 3 files
2. **Fix portal onboarding session key mismatch** (CQ-019) — P0, blocks client onboarding
3. **Fix `transtone-` typo** across stowstack-app (CQ-024) — P0, all animations broken
4. **Reconcile ROI/ROAS numbers** across stowstack-app (CQ-020) — P0, 5 conflicting figures
5. **Align pricing** across all collateral (CQ-021) — P0, 4 different structures
6. **Fix demo page meta contradiction** (CQ-026) — P1, "simulated" vs "real" data
7. **Reconcile cost-per-move-in** ($14.20 vs $41) (CQ-027) — P1, different calculators show different numbers
8. **Remove fake testimonials** from landing templates (CQ-035) — P1, legal risk
9. **Fix "we don't touch your ad spend"** in cold email (CQ-033) — P1, contradicts product
10. **Global "optimize"/"leverage" jargon sweep** (CQ-042/43/57) — P1-P2, 8+ instances
