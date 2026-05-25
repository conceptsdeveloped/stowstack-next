# Copy Voice Audit — 2026-05-24

Audited against `.claude/copy-voice.md`.

## Summary

- **24 files scanned** (Tier A: 13, Tier B: 8, Tier C: 8 — with overlaps for compositional pages)
- **~78 total findings**: **17 CRITICAL**, **31 HIGH**, **22 MEDIUM**, **8 LOW**
- **Top 3 worst offenders**:
  1. `src/components/marketing/hero.tsx` — hero `aria-label` says "full-funnel demand engine," two banned trust badges, and ROAS/Full-Funnel/Attribution scattered through customer-visible UI
  2. `src/components/marketing/demand-engine-visual.tsx` — the entire component is named, framed, and built around a banned phrase ("Demand Engine") used as a section heading
  3. `src/app/pricing/page.tsx` — leads with "Demand Engine" as a product name in metadata, headlines, and body; "Full-Stack Acquisition System" headline; "full-funnel" used twice in customer-facing comparison copy
- **Rewrite effort per top file**:
  - `hero.tsx` — **large** (deep, animated, many strings)
  - `demand-engine-visual.tsx` — **large** (rename + reframe the whole component; rename file)
  - `pricing/page.tsx` — **medium** (string-replace + section-rename, no logic touched)
  - `about/page.tsx` — **small** (one banned phrase + one frame fix)
  - `cta-section.tsx` — **small** (one semicolon-in-headline-ish line)
  - `three-way-comparison.tsx` — **small** (one banned phrase in the H2)
  - `inaction-timeline.tsx` — **small** (one banned phrase in body)
  - `changelog/page.tsx` — **small** (one entry title)
  - `audit/[slug]/page.tsx` — **small** (two banned subhead strings + "platform" framing)
  - `drip-email-templates.ts` — **small** (one "full stack" line)

---

## Findings by file

### src/components/marketing/hero.tsx

- **CRITICAL** (line 1005): `aria-label="StorageAds: full-funnel demand engine for self-storage"` — uses **both** "full-funnel" and "demand engine" in the very first hero section aria. Screen-reader users hear the worst possible framing. Bans listed as "never anywhere customer-facing."
- **CRITICAL** (line 140): Capability card desc `"Full-funnel campaigns across platforms"` — banned "Full-funnel" + banned "platforms".
- **CRITICAL** (line 1066): Trust badge `{ icon: Star, text: "Full-funnel attribution" }` — banned phrase right under the hero CTAs.
- **CRITICAL** (line 142): Capability card label `"Full Attribution"` with desc using attribution as the hero concept — voice guide says "Attribution" is acceptable only in deep product/docs, not hero.
- **CRITICAL** (line 150): Typewriter array `["Fill units.", "Prove ROAS.", "Kill bad spend.", "Track every move-in.", "Win your zip code."]` — "Prove ROAS." cycles through the H1-adjacent typewriter. ROAS is on the banned list.
- **CRITICAL** (line 168): Feature highlight `stat: "35x ROAS"` — banned acronym used as the primary callout stat on a feature card.
- **CRITICAL** (line 175): `before: "Vanity metrics (clicks, impressions)", after: "Revenue attribution per ad"` — "impressions" and "attribution" both used as customer-facing comparison copy.
- **HIGH** (line 144): Capability `"Revenue Analytics", desc: "ROAS by creative & campaign"` — ROAS again.
- **HIGH** (line 168): `"Revenue Attribution"` as a feature card title — attribution as hero concept.
- **HIGH** (line 970): Dashboard mockup label `"ROAS"` rendered as visible text inside the hero dashboard image.
- **HIGH** (line 1163): Section H2 `"Full platform capabilities"` — "platform" is on the banned list. Voice guide prefers "system" / "the thing" / plain language.
- **MEDIUM** (line 1041): Subheadline `"Every move-in traced to the ad that produced it. Custom landing pages with embedded rental flow — from first click to signed lease."` — em-dash in subheadline (not technically a CTA so not strictly banned, but the rule is "no em-dashes in CTAs" and this sits in the hero block above the CTAs). Borderline.
- **MEDIUM** (line 1066): Badge "Full-funnel attribution" sits next to "Tested on our own facilities first" — the latter is on-brand operator voice, the former is investor voice. Tonal mismatch.
- **MEDIUM** (line 370): Dashboard tabs `["Overview", "Campaigns", "Pages", "Attribution"]` — "Attribution" rendered as a visible tab in the hero dashboard mockup.
- **MEDIUM** (line 1127): `"From the first impression to the signed lease: every step tracked, every dollar accounted for."` — "first impression" reads as marketing-speak; "impression" is on the banned list (singular use here is borderline, but the construction is the kind of marketer-explaining-marketing language the guide warns against).

### src/components/marketing/problem-statement.tsx

- **HIGH** (line 55): `"National occupancy is at 77%. Google CPCs are up 45%. Up to 90% of lead conversions go unattributed. Fewer than 5% of independent operators run Meta ads — yet Meta CPCs are 75–95% cheaper than Google."` — "lead conversions go unattributed" leads with attribution as the concept. Voice guide says lead with the operator outcome, not the mechanism. Also reads like a marketer explaining marketing.
- **MEDIUM** (line 18): `"They're optimizing for clicks, not leases."` — "optimizing" is on the banned list. The construction is fine; swap the verb (e.g., "They chase clicks, not leases").
- **LOW** (line 46): `"You're spending money on ads. You have no idea which ones are filling units."` — strong, on-voice. No action needed.

### src/components/marketing/how-it-works.tsx

- **HIGH** (line 57): H2 `"From ad impression to signed lease. One system. Full visibility."` — "ad impression" uses the banned word "impression," and "Full visibility" is the abstract-adjective construction the guide warns against ("Numbers over adjectives").
- **HIGH** (line 8): Step 01 title `"We create demand."` — "create demand" is investor/MBA language. Voice guide picks the operator outcome ("Fill units") over the concept ("demand").
- **MEDIUM** (line 63): `"the ad drives the click, the landing page converts it, the rental flow closes it, and attribution tells you which ad deserves the credit."` — "drives" (verb form of banned "drive") + "attribution" as the explainer. Sounds like an agency pitch.
- **MEDIUM** (line 31): `"Cost per reservation. Cost per move-in. Conversion rate by campaign, ad, audience, keyword, and creative. Not clicks. Not impressions. Revenue."` — "impressions" again. The pattern (Not X, not Y, real thing) is on-voice; just swap the banned word.

### src/components/marketing/three-way-comparison.tsx

- **CRITICAL** (line 91): H2 `"Doing It Yourself vs. Hiring an Agency vs. Using a Demand Engine"` — "Demand Engine" rendered as the third option label, highlighted in gold. This is the section's primary framing. Voice guide is explicit: "Demand engine (investor word — keep for pitch decks only)."
- **HIGH** (line 20): Comparison row label `"Attribution"` — attribution as a row label in a customer-facing comparison.
- **MEDIUM** (line 22): `"Clicks and impressions (40% may be existing tenants)"` — banned "impressions" in the agency-column copy. Easy fix.

### src/components/marketing/results.tsx

- **HIGH** (line 14): Stat label `"return on ad spend"` (spelled out, but the stat above is "35x" which is ROAS reframed). Less bad than "ROAS" — borderline acceptable per "deep product pages" carve-out, but this is a homepage section.
- **MEDIUM** (line 121): `"That's a 4-12x return before the system even starts optimizing."` — "optimizing" is banned. Re-word as "before the system even starts learning" or "tightening up."
- **MEDIUM** (line 127): `"As A/B testing and attribution data compound over 6+ months…"` — "attribution data" again in homepage body copy. Swap for "the data on what's filling units."

### src/components/marketing/cta-section.tsx

- **MEDIUM** (line 114): `"Get a free facility audit. We'll look at your current digital presence, ad spend, landing pages, rental flow, and competitive landscape: then show you exactly where you're losing move-ins."` — 30 words, OK on length, but ends a list with a colon-spliced clause that reads like marketing-deck prose. The "digital presence / competitive landscape" register is wrong frame ("marketer explaining marketing"). Operator voice would be: "We'll look at your Google listing, your ads, your website, and what your competition is doing — then show you where you're leaking move-ins."
- **MEDIUM** (line 339): `"30-minute strategy call. Operator to operator. No pitch deck. No account executives. Just Blake walking through your situation."` — strong, on-voice. No action.
- **LOW** (line 108): H2 `"Your ads are going to the wrong page. Let's fix that."` — on-voice.

### src/components/marketing/demand-engine-visual.tsx

- **CRITICAL** (filename + line 6, 81, 87, 88): File and component name `demand-engine-visual.tsx` / `DemandEngineVisual` — visible in the component tree and aria. The aria-label literally says `"The six components of the StorageAds demand engine"`. Section ID is `id="demand-engine"`. Voice guide bans this phrase outright in customer copy.
- **CRITICAL** (line 104): H2 `"One engine. Six capabilities. Every move-in attributed."` — "engine" as the hero noun, "attributed" as the kicker. Pure investor-deck language.
- **CRITICAL** (line 22): Component `title: "Ad Engine"` (second item) — another "engine" hero word.
- **CRITICAL** (line 11): `"We analyze your market, competitors, pricing, occupancy, and demographics to find where demand exists and how to capture it."` — frame: a marketer explaining their own process to the buyer. Rewrite to operator-to-operator ("We map your market — your competitors, their pricing, who's renting. Then we show you where you're missing demand").
- **HIGH** (line 58): Component title `"Attribution"` — attribution as a section title in the homepage scroll.
- **HIGH** (line 60): `"Every move-in traces to the specific ad that produced it. Cost per reservation. Cost per move-in. ROAS by creative. Revenue, not clicks."` — banned "ROAS." Rest is fine.
- **HIGH** (line 70): Component title `"Optimization Loop"` / `"The system gets smarter every month."` — "Optimization" is banned. Reframe.
- **HIGH** (line 114): `"Ads, pages, attribution, optimization: all connected."` — banned "attribution" + "optimization" in one breath. This is the section sub-headline.
- **MEDIUM** (line 12): "demand exists and how to capture it" — "demand" as an abstract noun is the kind of MBA word the guide warns against.

### src/components/marketing/inaction-timeline.tsx

- **CRITICAL** (line 96): `"Here's what happens over 6 months when you don't have a demand engine."` — "demand engine" in body copy of the homepage. Explicit ban.
- **MEDIUM** (line 89): H2 `"Every month you wait costs more than StorageAds"` — on-voice, no action.
- **MEDIUM** (line 220): `"The math isn't complicated. Inaction is the most expensive option."` — strong, on-voice.

### src/components/marketing/quick-calculator.tsx

- **LOW** (line 161): `"StorageAds Projection"` — fine.
- **MEDIUM** (line 172): `"$X/mo recovered · {roi}x revenue multiple on Growth plan"` — "revenue multiple" is acceptable but borderline; "Growth plan" is the SKU name, fine.

No banned words. Clean otherwise.

### src/components/marketing/exit-intent-popup.tsx

Clean. No banned words. Voice fits: "We'll email the complete breakdown for {facility}: the fixes that matter most." On-brand.

### src/components/marketing/nav.tsx

- **LOW** (line 649): Mobile menu footer `"Marketing automation for self-storage"` — "Marketing automation" is generic SaaS register, but it's a tiny footer string. Borderline.

Clean otherwise.

### src/components/marketing/footer.tsx

- **LOW** (line 39): `"Prove which ads produce move-ins."` — on-voice.
- **LOW** (line 45): `"Built by an operator. Tested at my own facilities first."` — on-voice.

Clean.

### src/app/page.tsx

Composition file only. Inherits all hero/section issues above. No standalone violations.

---

### src/app/audit-tool/page.tsx + audit-client.tsx

- **MEDIUM** (audit-client.tsx line 424): `"Your facility has a strong online presence. Focus on conversion optimization."` — banned "optimization" in a result blurb the user sees after running their audit.
- **LOW** (audit-client.tsx line 316): Badge `"Self-Service Audit"` — fine.
- **LOW** (audit-client.tsx line 319): H1 `"How does your facility show up online?"` — on-voice.

Otherwise clean.

### src/app/audit/sample/page.tsx

Just a `redirect()` shell. Nothing to audit.

### src/app/audit/[slug]/page.tsx

- **HIGH** (line 1166): Subhead `"Full-Funnel Lead Tracking"` — banned phrase as a section title shown to every prospect who runs an audit.
- **HIGH** (line 1147): `"Our platform is purpose-built to solve the exact problems this diagnostic found"` — banned "platform" + "purpose-built" is generic SaaS register.
- **HIGH** (line 797): `"Revenue Optimization Opportunity"` — banned "Optimization" in the executive section title.
- **MEDIUM** (line 1160): `"Every ad campaign gets its own conversion-optimized landing page with real-time unit availability, pricing, and online rental — no more sending prospects to a generic website."` — "conversion-optimized" uses the banned verb form. Em-dash in body is fine; em-dash rule is CTA-only.
- **MEDIUM** (line 1169): `"Track every lead from first click to move-in. Know your exact cost-per-lead and cost-per-move-in by campaign, ad group, and keyword — no more guessing."` — "cost-per-lead" abbreviated as "CPL" in the data layer (line 1370). The shown text is OK; the CPL acronym in the legacy section is fine since the guide allows "cost per move-in" in deep product pages.
- **LOW** (line 1370): `<p>CPL</p>` — banned acronym rendered as a column label. Borderline — this is a legacy fallback view, but it's still customer-facing.

### src/app/demo/page.tsx + demo-client.tsx

- **LOW** (demo-client.tsx line 42): Demo data includes labels like `"Lookalike 1% – Move-In Converters"` and `"Pixel data matures"` (line 253). These are **inside the demo dashboard mockup**, which is a product UI mirror, so the words "Lookalike" and "Pixel" appearing as audience names is acceptable register for a product surface. But: the helper text `"CPL decreases as Pixel data matures and audiences sharpen"` (line 253) is shown as marketing prose under a chart. CPL + Pixel + "audiences sharpen" reads like agency-deck language. **Reframe to operator voice.**
- **MEDIUM** (demo-client.tsx line 212): KPI card label `"Current ROAS"` — visible to demo visitors. The demo is positioned as a sales-call asset; ROAS as a metric label inside a dashboard simulation is borderline acceptable (it's a product UI element, not a hero claim). Judgment call.

### src/app/about/page.tsx

- **CRITICAL** (line 166): `"This isn't a marketing agency. It's a demand engine built by someone who signs the same checks you do."` — "demand engine" as the pull-quote conclusion of the about page. Direct ban.
- **MEDIUM** (line 102): `"Not a generic marketing platform."` — banned "platform." The intent is fine; reword (e.g., "Not a generic marketing tool. Not something built for e-commerce and bolted onto storage.").
- **MEDIUM** (line 148): `"Not 'impressions' and 'click-through rates': real answers."` — quoting the banned words to dismiss them is acceptable per the spirit of the guide. Borderline — the construction is on-voice (it's making fun of the agency vocabulary), so it works. Leave.
- **LOW** (line 92): `"My agency sent pretty dashboards. Clicks were up. Impressions looked great."` — same dismissive-quoting construction. On-voice.

### src/app/pricing/page.tsx

- **CRITICAL** (lines 8, 11, 17): Metadata description (title tag, OG, Twitter card) all say `"StorageAds pricing for self-storage demand engine and conversion layer."` — Google SERP + social shares will all show "demand engine." Direct ban.
- **CRITICAL** (line 206): Section H2 `"Demand Engine (Paid Media)"` — labeled as "Product A" headline of the pricing page.
- **CRITICAL** (line 343): `"Sold standalone or bundled with the Demand Engine."` — body text.
- **CRITICAL** (line 433): H2 `"The Bundle: Full-Stack Acquisition System"` — banned "Full-Stack" + "Acquisition System" is investor language.
- **CRITICAL** (line 501): `"They optimize for clicks, not leases."` + `"No Meta ads. No full-funnel attribution."` — banned "optimize" + "full-funnel attribution" together in customer comparison copy.
- **CRITICAL** (line 660): `"…what a full-funnel system would look like for their facilities."` — final-CTA copy. Banned "full-funnel."
- **HIGH** (line 51): `"Full attribution dashboard: cost per reservation, cost per move-in, ROAS by creative"` — "Full attribution" + "ROAS" together in plan features.
- **HIGH** (line 52): `"Bi-weekly optimization calls"` — banned "optimization" in a feature bullet.
- **HIGH** (line 66): `"Cross-facility budget allocation and optimization"` — banned "optimization" again.
- **HIGH** (line 99): `"Ongoing conversion rate optimization"` — banned "optimization." Plan feature bullet.
- **HIGH** (line 67): `"Portfolio-level attribution and reporting"` — "attribution" in a plan feature title.
- **MEDIUM** (line 84): `"Mobile-optimized and speed-optimized"` — "optimized" twice. Reword: "Built for mobile and fast to load."
- **MEDIUM** (line 216): `"We create, manage, and optimize paid ad campaigns."` — banned "optimize."

### src/app/signup/page.tsx

- **MEDIUM** (line 43): Plan feature `"A/B testing & optimization"` — banned "optimization." Reword.
- **LOW** (line 53): `"Full-service marketing for large operators"` — generic-SaaS register. Fine but tonally bland.

Otherwise clean.

### src/app/diagnostic/page.tsx + diagnostic-form.tsx

Clean. No banned words found in the form itself.

---

### Tier C — public surfaces (light pass)

### src/app/guide/page.tsx

- **HIGH** (line 167): Logo renders as `Stow<span>Stack</span>` — **stale "StowStack" branding**. The rebrand to StorageAds is project policy. Not a voice violation per se, but it's a customer-facing brand inconsistency on a portal-adjacent page.
- **MEDIUM** (line 141): `"It typically takes 2-3 months for campaigns to fully optimize and reach peak performance."` — banned "optimize."
- **MEDIUM** (line 343): `"It's normal for CPL to start higher and improve as the campaigns optimize."` — banned "CPL" + "optimize."
- **MEDIUM** (line 358): `"a 3.2x ROAS means for every $1 you spend on ads…"` — explains ROAS. Per the guide: "Acceptable in deep product pages or docs (not hero, not landing, not email)." Client guide is a deep product page, so this is borderline acceptable, but the section title `"ROAS (Return on Ad Spend)"` as the H3 is using the banned acronym as a heading. Reword the heading: "Return on ad spend."
- **LOW** (line 298): KPI label `"Latest ROAS"` — same logic, borderline acceptable for in-portal but ideally swap.

### src/app/insights/page.tsx

- **LOW** (line 8, 11, 26, 28, 42, 98, 184): Multiple uses of "attribution," "impressions," and "engagement" — but every one of them is **quoting** the agency vocabulary to *attack* it, which is exactly the operator-voice frame the guide wants. This is one of the strongest voice fits in the codebase. Leave as-is.
- **LOW** (line 122): `'"Engagement." (Likes don't pay rent.)'` — perfect on-voice.

No action needed. This page is a model for the rest of the site.

### src/app/calculator/page.tsx

- **HIGH** (line 212-214): KPI card `label="ROAS" value={...}x sub="return on ad spend"` — ROAS as the visible label on a public calculator page. This is a top-of-funnel tool, not a deep product page; the guide's carve-out doesn't apply here. Reword the label to "Return on ad spend" and drop the acronym.
- **MEDIUM** (line 17, 26): Code-level `roas` variable is fine. UI label is what matters.

### src/app/changelog/page.tsx

- **HIGH** (line 56): Entry title `"Full-funnel attribution"` — banned phrase as a public changelog headline. Rewrite to "Ad-to-move-in tracking" or similar operator-readable phrasing.

### src/app/compare/[competitor]/page.tsx

- **HIGH** (line 35): Feature row `"Full-funnel ad-to-lease attribution"` — banned "Full-funnel" in a customer comparison table.
- **MEDIUM** (line 32-34): Three rows under category `"Attribution"` — the category label itself is fine (functional category name in a comparison grid is in deep-product register), but rows like `"Cost per click tracking"` and `"Cost per lead tracking"` are listed alongside the better-on-voice `"Cost per move-in tracking"`. The comparison is fine; just kill the "Full-funnel" row.
- **MEDIUM** (line 51): SEO description `"Feature-by-feature comparison of ad management, attribution, and pricing."` — generic SaaS register. Borderline.

### src/app/case-studies/page.tsx

- **LOW** (line 8, 11, 17): Metadata describes the page as `"See how StorageAds delivers attributed move-ins."` — "attributed" is in the same family as the banned "attribution" but used as a past-participle modifier of "move-ins." Borderline acceptable; "attributed" describing a move-in is more concrete than "attribution" as a concept. Leave.

Otherwise clean.

### src/app/blog/page.tsx

Clean. Description `"Operator math, campaign insights, and hard-won lessons from running self-storage facilities and filling them with paid ads."` is strong, on-voice.

### src/lib/drip-email-templates.ts

- **HIGH** (line 181): `"StorageAds handles the full stack — local SEO, paid ads, retargeting, and reputation management — so you can focus on running the facility."` — banned "full stack" + the construction is a generic agency pitch. Rewrite to operator voice (e.g., "StorageAds runs your ads, your Google listing, your retargeting, and your reputation — so you can run the facility.").
- **LOW** (line 55): `"StorageAds — Marketing that fills units."` — on-voice tagline.

---

## Files clean (no findings)

- `src/components/marketing/exit-intent-popup.tsx`
- `src/components/marketing/footer.tsx`
- `src/components/marketing/quick-calculator.tsx` (1 LOW judgment call only)
- `src/components/marketing/nav.tsx` (1 LOW judgment call only)
- `src/app/page.tsx` (composition only)
- `src/app/audit-tool/page.tsx` (metadata shell only — clean)
- `src/app/audit/sample/page.tsx` (redirect shell)
- `src/app/demo/page.tsx` (metadata shell)
- `src/app/diagnostic/page.tsx` + `diagnostic-form.tsx`
- `src/app/case-studies/page.tsx`
- `src/app/blog/page.tsx`
- `src/app/insights/page.tsx` (uses banned terms but always in the dismissive/quoting frame the guide endorses)

---

## Rewrite priority recommendation

1. **`src/components/marketing/hero.tsx`** — This is the first impression. The aria-label, the trust badges, the typewriter, the feature cards, and an entire visible dashboard mockup all carry banned words. Highest leverage rewrite in the codebase. Plan: strip every "ROAS," "Full-Funnel," "Full Attribution," and "Full platform capabilities" string; rewrite the four feature highlights and four capability cards in operator voice; rename the dashboard tab from "Attribution" to something concrete; replace "Prove ROAS." in the typewriter with operator-outcome phrasing.

2. **`src/components/marketing/demand-engine-visual.tsx`** — The component is structurally built around a banned phrase. **Rename the file** (e.g., `system-overview.tsx`), **rename the section ID** (currently `#demand-engine`, possibly linked elsewhere), and rewrite the H2 + the 6 component titles in operator-to-operator voice. Check `page.tsx` and any anchor links pointing at `#demand-engine`.

3. **`src/app/pricing/page.tsx`** — Highest stakes after the hero because it shows up in Google SERPs. The metadata title/description, both product section names, and the bundle H2 ("Full-Stack Acquisition System") all need rewriting. ~9 banned-word strings, all string-level edits, no logic.

4. **`src/components/marketing/three-way-comparison.tsx`** — The "Demand Engine" reveal in the H2 is the entire payoff of the comparison and is one of the most-seen strings on the homepage. Single-headline rewrite, but high visibility.

5. **`src/app/about/page.tsx`** — The "demand engine" pull-quote is the *conclusion* of the founder story. Two-line rewrite, but it's the emotional close of the about page so it has to be perfect operator voice.

6. **`src/components/marketing/inaction-timeline.tsx`** — One "demand engine" reference in the section intro. Trivial fix.

7. **`src/app/audit/[slug]/page.tsx`** — Every prospect who runs the diagnostic sees "Full-Funnel Lead Tracking" and "Revenue Optimization Opportunity" as section titles. Two banned-word strings in the highest-converting page on the site.

8. **`src/app/changelog/page.tsx`**, **`src/app/compare/[competitor]/page.tsx`**, **`src/app/calculator/page.tsx`**, **`src/lib/drip-email-templates.ts`** — single-line banned-word fixes each. Batch.

9. **`src/app/guide/page.tsx`** — Cosmetic bonus: kill the stale "StowStack" branding in the logo render. Voice fixes in the FAQ are deep-product-page register so they're lower priority.
