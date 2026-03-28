# StorageAds.com — Copy QA Audit

**Date:** 2026-03-28
**Auditor:** Claude (Opus 4.6)
**Scope:** All user-facing marketing copy across `/src/components/marketing/`, `/content/blog/`, `/about-page.md`, and related page components.
**Severity Scale:** P0 (broken/misleading UX), P1 (credibility risk), P2 (polish/consistency)

---

## CQ-001 — Hero CTA mislabels a booking link as a product walkthrough

**Severity:** P0
**File:** `src/components/marketing/hero.tsx` line 1055–1058
**Verbatim:**

```tsx
<a href={CALCOM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border font-semibold text-base transition-all hover:border-[var(--color-gold)]/30 hover:shadow-sm" style={{ borderColor: "var(--border-medium)", color: "var(--text-secondary)", fontFamily: "var(--font-heading)" }}>
  <Play size={14} style={{ color: "var(--color-gold)" }} />
  See How It Works
</a>
```

**Problem:** The button reads "See How It Works" and renders a Play icon (implying a video or product walkthrough), but `CALCOM_URL` resolves to `https://cal.com/storageads/30min` — a 30-minute booking page. A visitor who clicks expecting a demo video lands on a calendar picker. This is a trust violation on the highest-visibility element of the entire site.

**Fix — pick one:**

- **Option A (recommended):** Change the label to `Book a Call` and swap the `Play` icon for `Calendar` or `Phone`. This accurately describes the destination.
- **Option B:** Keep the label "See How It Works" but point `href` to `#how-it-works` (the on-page section). Then add a separate, clearly labeled "Book a Call" link.
- **Option C:** Create an actual product walkthrough video or Loom, host it, and point this button to that URL. Keep label and icon as-is.

**Acceptance criteria:** The label, icon, and destination must all describe the same action. A user who clicks must land on a page that matches their expectation within 2 seconds.

---

## CQ-002 — Problem statement stat paragraph is run-on with a broken colon splice

**Severity:** P2
**File:** `src/components/marketing/problem-statement.tsx` lines 55–57
**Verbatim:**

```
National occupancy is at 77%. Google CPCs are up 45%. Up to 90% of
lead conversions go unattributed. And fewer than 5% of independent
operators run Meta ads: CPCs are 75-95% cheaper than Google.
```

**Problem:** Five unrelated stats are crammed into a single `<p>`. The colon before "CPCs are 75-95% cheaper than Google" creates a colon splice — it reads as if "CPCs are 75-95% cheaper" is an explanation of "fewer than 5% of independent operators run Meta ads," but it's actually a separate value proposition (cheap Meta CPCs as an opportunity). A reader has to re-parse the sentence to understand the logical connection.

**Fix:**

Split into two sentences. The colon should become a period or em dash, and the opportunity framing should be explicit:

```
National occupancy is at 77%. Google CPCs are up 45%. Up to 90% of
lead conversions go unattributed. Fewer than 5% of independent
operators run Meta ads — yet Meta CPCs are 75–95% cheaper than Google.
```

Changes:
1. "And fewer" → "Fewer" (drop the conjunction — the preceding sentence already terminated with a period).
2. Colon → em dash. The em dash signals "here's the surprising part," which is the rhetorical intent.
3. Insert "yet" to make the contrast explicit.
4. Hyphen in "75-95" → en dash "75–95" (range convention).

**Acceptance criteria:** Each sentence in the paragraph conveys exactly one stat or claim. No reader should need to re-read any sentence to determine what it means.

---

## CQ-003 — How It Works example URLs will 404 if visited

**Severity:** P1
**File:** `src/components/marketing/how-it-works.tsx` lines 16–19
**Verbatim:**

```ts
examples: [
  "storageads.com/climate-pawpaw-a: for the climate-controlled search ad",
  "storageads.com/10x10-offer-b: for the first-month-free Facebook ad",
  "storageads.com/finish-your-rental-c: for the retargeting campaign",
],
```

**Problem:** These URLs use `storageads.com/<slug>` but the actual product routes landing pages at `/lp/[slug]`. Any prospect who types one of these into their browser will get a 404. Worse, a technical evaluator (e.g., a management company's marketing director) might test these deliberately to validate claims — a 404 at that moment kills the sale.

**Fix — pick one:**

- **Option A (recommended):** Replace with obviously illustrative placeholder domains: `yourfacility.storageads.com/climate-pawpaw` or use a subdirectory pattern that can't be confused with a live URL, e.g., `[your-facility].storageads.com/climate-pawpaw`.
- **Option B:** Create actual redirect routes at `/climate-pawpaw-a`, `/10x10-offer-b`, `/finish-your-rental-c` that 301 to a "See it in action" demo page or the `/lp/` equivalent.
- **Option C:** Change the URL format to match the real product: `storageads.com/lp/climate-pawpaw-a`.

**Acceptance criteria:** No URL displayed on the marketing site should return a 404 if a visitor copies it into their browser. Either the URLs are clearly illustrative (bracket notation, fake TLD) or they resolve to a real page.

---

## CQ-004 — Comparison table agency column has near-invisible text on light background

**Severity:** P0
**File:** `src/components/marketing/three-way-comparison.tsx` line 191
**Verbatim:**

```tsx
<p className="text-sm text-orange-300/80">{row.agency}</p>
```

**Problem:** `text-orange-300/80` is a very light orange (#fdba74 at 80% opacity) rendered on `bg-orange-500/[0.05]` (near-white with a faint orange tint). This fails WCAG AA contrast requirements. The text is effectively invisible on most monitors and completely invisible in bright ambient light. This is the column that describes the competition — if visitors can't read it, the three-way comparison loses its entire persuasive function.

This class was likely written for a dark-background design and not updated when the site moved to light-only.

**Fix:**

Replace `text-orange-300/80` with a color that passes WCAG AA (4.5:1 contrast ratio) against the `bg-orange-500/[0.05]` background. Recommended:

```tsx
<p className="text-sm" style={{ color: "var(--text-secondary)" }}>{row.agency}</p>
```

Or if orange branding on the agency column is desired:

```tsx
<p className="text-sm text-orange-700">{row.agency}</p>
```

`text-orange-700` (#c2410c) provides 5.7:1 contrast on white — passes AA.

Also audit the mobile label at line 187: `text-orange-400` has the same problem:

```tsx
<span
  className="md:hidden text-[10px] font-semibold text-orange-400 uppercase"
  style={{ letterSpacing: "var(--tracking-wide)" }}
>
  Agency
</span>
```

Replace `text-orange-400` with `text-orange-700` or equivalent.

Also check the column header at line 129: `text-orange-400` same issue.

**Acceptance criteria:** All text in the comparison table must pass WCAG AA contrast (4.5:1 for normal text, 3:1 for large text) against its background. Verify with Chrome DevTools > Rendering > CSS Overview or axe-core.

---

## CQ-005 — Inaction timeline "+$43,200" figure is not derivable from stated assumptions

**Severity:** P1
**File:** `src/components/marketing/inaction-timeline.tsx` lines 201–208
**Verbatim:**

```tsx
<p className="text-3xl font-semibold text-[var(--color-gold)]">+$43,200</p>
<p
  className="text-sm mt-1"
  style={{ color: "var(--text-secondary)" }}
>
  Based on $41 cost-per-move-in at 8 move-ins/mo (Growth plan)
</p>
```

**Problem:** The stated assumptions are "$41 cost-per-move-in at 8 move-ins/mo (Growth plan)" but there is no clear path from these inputs to $43,200. Possible intended math:

- 8 move-ins/mo × $150 avg unit rate × 12-month avg stay = $14,400/mo in tenant LTV pipeline? No — that's per-month intake LTV, not a 6-month total.
- 8 move-ins/mo × 6 months = 48 move-ins × $150/mo × 6 months avg remaining = $43,200? This works — but it requires assuming a $150/mo average rate AND a specific LTV calculation that is never stated.
- The Results section (results.tsx line 115–121) uses "$100-150/mo" avg rate and "12-month average tenant stay" = "$1,200-1,800 LTV." At 8 move-ins/mo × 6 months = 48 × $900 midpoint LTV = $43,200. This is the likely derivation.

The problem is the explanation line says "Based on $41 cost-per-move-in at 8 move-ins/mo" — but the $41 cost-per-move-in is an expense metric, not a revenue input. The explanation cites the wrong variables. The actual inputs are: 8 move-ins/mo × 6 months × $900 avg LTV = $43,200.

**Fix:**

Replace the explanation line with the actual derivation:

```
48 move-ins over 6 months × $900 avg lifetime value per move-in
```

Or more precisely:

```
8 move-ins/mo × 6 months = 48 tenants × $900 avg LTV = $43,200
```

If you want to keep it short:

```
Based on 8 move-ins/mo at $900 avg lifetime value per tenant
```

**Acceptance criteria:** Every number displayed on the marketing site must be derivable from the assumptions stated directly adjacent to it. A skeptical operator with a calculator should arrive at the same figure using only the information shown on screen.

---

## CQ-006 — Inaction timeline cumulative loss math conflates monthly loss with cumulative spending

**Severity:** P1
**File:** `src/components/marketing/inaction-timeline.tsx` lines 6–55
**Verbatim (data array):**

```ts
{ month: 1, title: "3 vacant units",   detail: "$450/mo walking out the door", loss: 450,  cumulative: 450 },
{ month: 2, title: "Competitor launches Google Ads", detail: "...", loss: 600,  cumulative: 1050 },
{ month: 3, title: "5 move-outs, 2 move-ins",       detail: "Net loss of 3 units: now 6 vacant", loss: 900,  cumulative: 1950 },
{ month: 4, title: "Summer moving season starts",   detail: "...", loss: 1200, cumulative: 3150 },
{ month: 5, title: "8 vacant units",                detail: "$1,200/mo lost...", loss: 1200, cumulative: 4350 },
{ month: 6, title: "Occupancy below 80%",           detail: "Revenue spiral...", loss: 1500, cumulative: 5850 },
```

**Problem:** The `cumulative` field sums all prior `loss` values as if each month's loss is a one-time event ($450 + $600 + $900 + ...). But lost monthly revenue from vacancy is recurring — if you lose $450/mo in Month 1, you lose it again in Month 2, 3, 4, 5, and 6. The real cumulative loss from 3 vacant units over 6 months is $450 × 6 = $2,700 from those units alone — not $450 once.

The current math underestimates the actual cost of inaction (which hurts the persuasive case) while also being analytically wrong (which hurts credibility with operators who run P&Ls).

Additionally: Month 1 has 3 vacant units at $450/mo ($150/unit). Month 5 has 8 vacant units at $1,200/mo ($150/unit). But Month 3 says "5 move-outs, 2 move-ins" leaving "now 6 vacant." Month 3's loss is $900 = 6 × $150. Month 4's loss jumps to $1,200 = 8 × $150 — but the narrative says nothing about 2 additional move-outs between Month 3 and 4. The vacancy count increases by 2 between Month 3 and Month 5 with no narrative explanation in Month 4.

**Fix:**

Two options:

**Option A (recommended — simplify):** Change the framing from "cumulative loss" to "monthly recurring loss" and show it growing. This is how operators actually think: "I'm bleeding $X/mo and it's getting worse." Drop the cumulative counter entirely and just show the escalating monthly figure.

**Option B (fix the math):** If you want to keep cumulative figures, calculate them as true cumulative recurring losses:

| Month | Vacant | Monthly Loss | Cumulative (sum of all months' losses) |
|-------|--------|-------------|----------------------------------------|
| 1     | 3      | $450        | $450                                   |
| 2     | 4      | $600        | $1,050                                 |
| 3     | 6      | $900        | $1,950                                 |
| 4     | 7      | $1,050      | $3,000                                 |
| 5     | 8      | $1,200      | $4,200                                 |
| 6     | 10     | $1,500      | $5,700                                 |

Note: this requires updating the narrative for months 4 and 6 to explain the new vacancies.

Also update the summary card (`-$5,850`) to match whichever approach you choose.

**Acceptance criteria:** A self-storage operator reading this timeline should not be able to find a math error using back-of-napkin arithmetic. Each month's loss must follow logically from the stated vacancy count × $150/unit.

---

## CQ-007 — Quick calculator hides its assumptions from the user

**Severity:** P1
**File:** `src/components/marketing/quick-calculator.tsx` lines 13–23
**Verbatim:**

```ts
const avgRate = 130;
const vacantUnits = Math.round(totalUnits * (1 - occupancy / 100));
const monthlyLoss = vacantUnits * avgRate;
const annualLoss = monthlyLoss * 12;
const storageadsCost = 999;
const projectedMoveIns = Math.max(2, Math.min(30, Math.round(vacantUnits * 0.2)));
const projectedRecovery = projectedMoveIns * avgRate;
const roi =
  storageadsCost + 1500 > 0
    ? Math.round((projectedRecovery / (storageadsCost + 1500)) * 10) / 10
    : 0;
```

**Problem:** The calculator displays results like "6 move-ins/mo" and "3.1x ROI on Growth plan" but never tells the user:

1. It assumes $130/mo average unit rate (`avgRate = 130`).
2. It assumes 20% of vacant units are recoverable (`vacantUnits * 0.2`).
3. It assumes $999/mo StorageAds cost + $1,500/mo ad spend = $2,499/mo total investment.
4. The ROI is `projectedRecovery / $2,499` — monthly recovered revenue vs. monthly cost — which is not a standard ROI calculation (ROI typically uses net profit, not gross revenue).

An operator who changes the sliders, sees "4.2x ROI," and then asks their CFO to validate it will not be able to reproduce the number. This creates a "gotcha" moment that damages trust.

**Fix:**

1. Display the assumptions below the results in small text:

```
Assumes $130/mo avg unit rate · $999/mo Growth plan · $1,500/mo ad spend · ~20% vacancy recovery rate
```

2. Consider making `avgRate` a third slider input so the operator can match their actual rates.

3. Rename "ROI" to "Monthly Revenue Multiple" or show the actual ROI formula: `(recovered revenue - total cost) / total cost`. Currently, at the default values, if `projectedRecovery` is $910 and total cost is $2,499, the real ROI is negative — but the calculator shows it as a positive ratio. This is because it's dividing gross revenue by cost, not (revenue - cost) / cost.

**Acceptance criteria:**

- Every assumption used in the calculation is visible to the user.
- The displayed metric is labeled with a standard financial term that matches its formula.
- An operator can independently verify the displayed number using only information shown on screen.

---

## CQ-008 — CTA section repeats trust signals within visual proximity

**Severity:** P2
**File:** `src/components/marketing/cta-section.tsx`
**Verbatim (lines 9–14):**

```ts
const TRUST_SIGNALS = [
  { icon: Shield, text: "No contracts required" },
  { icon: Clock, text: "First leads within 7 days" },
  { icon: Wrench, text: "Built and run by a storage operator" },
  { icon: Zap, text: "storEDGE integrated" },
];
```

**Verbatim (lines 302–303):**

```tsx
{["Response within 24 hours.", "Built and run by a storage operator.", "No contracts required."].map(
```

**Problem:** "No contracts required" and "Built and run by a storage operator" appear in both the TRUST_SIGNALS array (rendered below the calendar embed on the right side) and the inline array (rendered below the audit form submit button on the left side). On desktop, these two lists are side-by-side in the same viewport. Repeating the same phrases within ~200px of each other reads as an oversight, not emphasis. It dilutes the trust mechanic — the visitor unconsciously registers "they're padding the page."

**Fix:**

Differentiate the two lists by function:

- **Form trust signals (below submit button):** Focus on what happens next: "Response within 24 hours." / "Free — no credit card required." / "Takes 2 minutes."
- **Calendar trust signals (below embed):** Focus on who you're talking to: "Built and run by a storage operator." / "No contracts required." / "storEDGE integrated." / "First leads within 7 days."

Each list should answer a different unspoken objection: the form list answers "is this safe/fast?" and the calendar list answers "is this legitimate/relevant?"

**Acceptance criteria:** No identical string appears in both trust signal lists. Each list serves a distinct reassurance function.

---

## CQ-009 — Results section header undersells with "our own facilities"

**Severity:** P2
**File:** `src/components/marketing/results.tsx` line 52
**Verbatim:**

```tsx
<h2
  className="font-semibold"
  style={{ fontSize: "var(--text-section-head)" }}
>
  Results from our own facilities.
</h2>
```

**Problem:** "Our own facilities" positions StorageAds as a side project tested on personal properties. Combined with only 2 case studies (both in Michigan), a prospect may conclude: "This is one guy in Michigan who got lucky at his own facilities." The phrasing fails to generalize the proof.

The about page already establishes the founder-operator narrative. By the time the visitor scrolls to Results, that credibility is banked. The Results section should now expand credibility outward, not reinforce the "personal" angle.

**Fix:**

Replace with copy that generalizes:

```
Real operator results. Real facilities.
```

Or:

```
What the numbers look like when ads actually connect to move-ins.
```

Or if you want to keep the operator-founder angle but scale it:

```
We tested it on our own facilities first. Here's what happened.
```

The last option keeps the authenticity but frames it as a milestone in a story ("first") rather than an ongoing limitation ("our own").

**Acceptance criteria:** The section header should not make the visitor question whether the product works outside of the founder's personal portfolio.

---

## CQ-010 — BECAUSE messages include jargon and potentially stale references

**Severity:** P2
**File:** `src/components/marketing/hero.tsx` lines 802–816
**Verbatim — problematic entries:**

```ts
"YOUR MANAGER JUST ASKED WHAT ROAS MEANS AND NOBODY IN THE ROOM KNEW",
```

**Problem:** If the target persona (facility owner/operator) also doesn't know what ROAS means, this message alienates rather than entertains. It's punching down at the audience instead of commiserating with them. The BECAUSE messages work best when the reader thinks "that's me" — not "wait, should I know what that means?"

```ts
"YOUR SPAREFOOT LISTING IS DOING MORE WORK THAN YOUR ENTIRE MARKETING BUDGET",
```

**Problem:** SpareFoot was acquired by StorageMart and has undergone brand/product changes. Verify the brand name is still recognized by the target audience and that the listing product still exists in its referenced form. Stale brand references date the copy.

```ts
"THE LAST AGENCY SHOWED YOU CLICKS YOU ASKED ABOUT MOVE-INS THEY CHANGED THE SUBJECT",
```

**Problem:** This is a comma splice — it reads as three independent clauses with no punctuation. On the split-flap display (all caps, no punctuation), it parses ambiguously. "THE LAST AGENCY SHOWED YOU CLICKS" / "YOU ASKED ABOUT MOVE-INS" / "THEY CHANGED THE SUBJECT" — a reader may not realize these are three sequential events.

**Fix:**

1. ROAS message: Replace with a version that doesn't require marketing jargon knowledge: `"YOUR AGENCY SENDS YOU A REPORT EVERY MONTH AND YOU DON'T UNDERSTAND A SINGLE LINE ON IT"`
2. SpareFoot message: Verify brand currency. If stale, replace with: `"YOUR GOOGLE BUSINESS LISTING IS DOING MORE WORK THAN YOUR ENTIRE MARKETING BUDGET"`
3. Comma splice message: Add punctuation markers or restructure: `"YOU ASKED YOUR AGENCY WHICH ADS DROVE MOVE-INS AND THEY CHANGED THE SUBJECT"`

**Acceptance criteria:** Every BECAUSE message should be instantly parseable by a facility owner who has never worked in marketing. No jargon. No ambiguous clause boundaries.

---

## CQ-011 — About page facility name doesn't appear in Results section

**Severity:** P2
**File:** `about-page.md` line 13 / `src/components/marketing/results.tsx` lines 5–28
**Verbatim (about page):**

```
I tested it on my own facility first. Two Paws Storage became the proving ground.
```

**Verbatim (results section):**

```ts
const CASE_STUDIES = [
  { name: "Midway Self Storage: Cassopolis, MI", ... },
  { name: "Lakeshore Storage: South Haven, MI", ... },
];
```

**Problem:** The about page tells a narrative where "Two Paws Storage" is the origin facility — the hero of the founder story. But the Results section shows "Midway Self Storage" and "Lakeshore Storage" with no mention of Two Paws. A visitor who reads the About page and then views Results will notice the disconnect and wonder: "Why isn't the proving ground facility shown? Did it not work there?"

**Fix — pick one:**

- **Option A (recommended):** Add Two Paws Storage as a third case study in the Results section, even if the numbers are less dramatic. This closes the narrative loop.
- **Option B:** Update the About page to reference the portfolio more broadly: "I tested it across my own facilities first" (plural) — removing the Two Paws name and avoiding the expectation of seeing it later.
- **Option C:** Add a line to the Results section intro: "Two Paws Storage was our first test. Here's what happened when we expanded to other facilities in our portfolio."

**Acceptance criteria:** Every named facility in the About page narrative should either appear in the Results section or be explicitly contextualized as a predecessor/pilot.

---

## CQ-012 — Two blog posts share publication date 2026-03-25

**Severity:** P2
**Files:**
- `content/blog/dedicated-landing-pages-vs-main-website.md` line 4: `date: 2026-03-25`
- `content/blog/hidden-marketing-costs-per-movein.md` line 4: `date: 2026-03-25`

**Problem:** Same-day publication of two long-form articles:
1. Dilutes social distribution — you're competing with yourself for attention on LinkedIn/email.
2. Looks auto-generated to savvy readers (especially if both posts are published on launch day).
3. Blog index sort order becomes arbitrary for same-date entries, leading to non-deterministic page rendering.

**Fix:**

Stagger by at least 5–7 days. Suggested:

- `dedicated-landing-pages-vs-main-website.md` → keep `2026-03-25`
- `hidden-marketing-costs-per-movein.md` → change to `2026-04-01`

**Acceptance criteria:** No two blog posts share the same `date` value. Minimum 3-day gap between publication dates.

---

## CQ-013 — Hero subheadline leads with mechanism instead of matching H1 promise

**Severity:** P2
**File:** `src/components/marketing/hero.tsx` lines 1037–1042
**Verbatim:**

```tsx
<p ...>
  Ad-specific landing pages with embedded rental flow. Full-funnel attribution from ad click to signed lease. You'll know exactly what each move-in cost.
</p>
```

**Context — the H1 directly above (lines 1020–1027):**

```
The marketing system that proves which ads produce move-ins.
```

**Problem:** The H1 makes a promise about proof/attribution ("proves which ads produce move-ins"). The subheadline should immediately reinforce that promise, then layer in the mechanism. Instead, it leads with the mechanism ("Ad-specific landing pages with embedded rental flow") — burying the proof promise in the second sentence.

This is a classic hierarchy inversion. The reader's eye flow is: H1 (proof promise) → subheadline (landing pages?) → wait, what about the proof? → oh, there it is in sentence 2.

**Fix:**

Reorder so the subheadline mirrors the H1 promise before expanding:

```
Full-funnel attribution from ad click to signed lease. Ad-specific landing pages with embedded rental flow. You'll know exactly what each move-in cost.
```

Or tighter:

```
Every move-in traced to the ad that produced it. Custom landing pages with embedded rental flow — from first click to signed lease.
```

**Acceptance criteria:** The first sentence of the subheadline must directly reinforce the H1's core promise (attribution/proof). Mechanism details come second.

---

## CQ-014 — Demand Engine section header uses "systems" — vague and enterprise-heavy

**Severity:** P2
**File:** `src/components/marketing/demand-engine-visual.tsx` lines 103–106
**Verbatim:**

```tsx
<h2 ...>
  Six systems. One engine.{" "}
  <span style={{ color: "var(--color-gold)" }}>Every move-in attributed.</span>
</h2>
```

**Problem:** "Six systems" sounds like enterprise middleware — it evokes SAP, not a tool for a 300-unit facility owner. The actual items listed (Demand Intelligence, Ad Engine, Landing Pages, Conversion Flow, Attribution, Optimization Loop) are capabilities or components, not "systems." The codebase itself names them `COMPONENTS` (line 6: `const COMPONENTS = [`).

For the target buyer (independent operator, 1–20 facilities), "systems" implies complexity they'll have to manage. The value prop is the opposite — StorageAds manages all of it.

**Fix:**

```
Six components. One engine. Every move-in attributed.
```

Or leaning into simplicity:

```
One engine. Six capabilities. Every move-in attributed.
```

Or dropping the count entirely:

```
One engine. Every move-in attributed.
```

The count ("six") only matters if the reader will hold it in memory while scrolling the accordion. Most won't. Consider whether the number adds value.

**Acceptance criteria:** The section header should not use terminology that implies the buyer is responsible for managing multiple discrete systems.

---

## CQ-015 — Footer tagline is generic and doesn't match H1 strength

**Severity:** P2
**File:** `src/components/marketing/footer.tsx` lines 38–40
**Verbatim:**

```tsx
<p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
  Marketing that tells you which ads fill units.
</p>
```

**Problem:** "Marketing that tells you which ads fill units" is serviceable but generic. Compare to the H1: "The marketing system that proves which ads produce move-ins." The footer version is weaker on every axis:

| H1 | Footer |
|----|--------|
| "proves" (strong verb, certainty) | "tells you" (weak verb, passive) |
| "produce" (active, causal) | "fill" (vague, could be coincidental) |
| "move-ins" (specific, industry term) | "units" (less specific) |
| "system" (implies reliability) | "marketing" (generic category) |

The footer is the last thing a visitor reads before deciding to scroll back up or leave. It should reinforce the strongest version of the value prop, not a diluted paraphrase.

**Fix:**

Align with the H1:

```
The marketing system that proves which ads produce move-ins.
```

Or a condensed variant:

```
Prove which ads produce move-ins.
```

**Acceptance criteria:** The footer tagline should use language at least as strong as the H1. Specifically: "proves" not "tells," "move-ins" not "units."

---

## Summary Table

| ID | Severity | File | One-line summary |
|----|----------|------|------------------|
| CQ-001 | P0 | hero.tsx:1055 | CTA label says "See How It Works" but links to Cal.com booking |
| CQ-002 | P2 | problem-statement.tsx:55 | Colon splice jams five stats into one unparseable paragraph |
| CQ-003 | P1 | how-it-works.tsx:16 | Example URLs will 404 if visited |
| CQ-004 | P0 | three-way-comparison.tsx:191 | Agency column text fails WCAG AA contrast on light background |
| CQ-005 | P1 | inaction-timeline.tsx:201 | "+$43,200" figure not derivable from stated assumptions |
| CQ-006 | P1 | inaction-timeline.tsx:6 | Cumulative loss math conflates one-time and recurring revenue |
| CQ-007 | P1 | quick-calculator.tsx:13 | Calculator hides $130 rate, $999 plan, $1500 ad spend assumptions |
| CQ-008 | P2 | cta-section.tsx:9,302 | Identical trust signals repeated within visual proximity |
| CQ-009 | P2 | results.tsx:52 | "Our own facilities" undersells and limits perceived applicability |
| CQ-010 | P2 | hero.tsx:802 | BECAUSE messages include jargon (ROAS) and possibly stale brand ref |
| CQ-011 | P2 | about-page.md:13 | Two Paws Storage named in About but absent from Results |
| CQ-012 | P2 | blog (2 files) | Two posts share 2026-03-25 date — dilutes distribution |
| CQ-013 | P2 | hero.tsx:1037 | Subheadline leads with mechanism instead of matching H1 promise |
| CQ-014 | P2 | demand-engine-visual.tsx:103 | "Six systems" sounds enterprise-heavy for indie operators |
| CQ-015 | P2 | footer.tsx:38 | Footer tagline is weaker than H1 on every dimension |
