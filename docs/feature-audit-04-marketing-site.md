# 04 — Marketing Site

**Priority:** BUILD NOW
**Why it matters:** Prospects will visit this site before, during, and after sales calls. If it doesn't clearly communicate "we fill units and prove it," the deal dies.

---

## What Exists

### Pages Inventory

| Page | Status | Quality |
|------|--------|---------|
| Homepage (`/`) | Live | Excellent — clear messaging, real metrics, compelling structure |
| Pricing (`/pricing`) | Live | Strong — transparent ROI math, competitive comparison |
| About (`/about`) | Live | Strong — founder-operator credibility, authentic voice |
| Blog (`/blog`) | Live | Excellent — 6 data-driven, operator-focused posts |
| Insights (`/insights`) | Live | Excellent — 20+ short-form "Operator Notes" |
| Case Studies (`/case-studies`) | Live | Good — real facility data |
| Audit Tool (`/audit-tool`) | Live | Good — instant Google audit (see audit 02) |
| Diagnostic (`/diagnostic`) | Live | Good — deep 5-step intake |
| Demo (`/demo`) | Live | Exists — sales demo page |
| Privacy (`/privacy`) | Live | Professional — GDPR-adjacent |
| Terms (`/terms`) | Live | Professional |
| Data Deletion (`/data-deletion`) | Live | Professional |

### Homepage Sections (Top → Bottom)

1. **Hero** — Animated typewriter ("Fill units." "Prove ROAS." "Cut waste.") + pipeline flow animation (Ad → Page → Reserve → Move-in). Live stats: 34 move-ins, $41 CPM, 8.7% LP conversion, 35x ROAS.

2. **Problem Statement** — Three operator pain points:
   - "Every ad goes to the same page" (generic dead-end)
   - "Your rental flow lives on someone else's page" (trust + conversion loss)
   - "You can't tell what's working" (click metrics vs lease attribution)
   - Kicker: "You're not paying for marketing. You're paying for guesswork."

3. **How It Works** — Four-step system with concrete examples:
   - Create demand (Meta, Google, retargeting)
   - Ad-specific landing pages (with URL examples)
   - Embedded storEDGE rental flow (no bounce)
   - Full attribution (cost per move-in)

4. **Three-Way Comparison** — DIY vs. Agency vs. StorageAds across 10 dimensions. Visual contrast with color-coded columns.

5. **Results** — Two real case studies:
   - Midway Self Storage: 247 units, 71%→84% occupancy, $41 CPM, 35x ROAS
   - Lakeshore Storage: seasonal market, 22 move-ins in 60 days, $38 CPM, 8.7% LP conversion
   - ROI math: single move-in = $1,200-1,800 LTV

6. **Inaction Timeline** — 6-month cost of doing nothing (-$5,850 cumulative loss). Compares inaction vs. investment.

7. **CTA Section** — Split layout: free audit form (left) + Cal.com calendar (right). Trust signals: no contracts, results in days, built by operator.

### Pricing Structure

**Demand Engine (Paid Media):**
- Launch: $750/mo per facility (Meta ads, 2 pages, static creative, monthly reporting)
- Growth: $1,500/mo per facility (Meta + Google, 5 pages, retargeting, A/B testing, video, full dashboard, bi-weekly calls)
- Portfolio: Custom for 5+ facilities (20-35% discount)

**Conversion Layer (Custom Site + storEDGE):**
- Single Site: $3,000 build + $199/mo
- Site + Landing Pages: $5,000 build + $299/mo
- Portfolio Build: Custom, 25-40% discount

**Bundle:** 6-month Growth commitment → site build drops from $5,000 to $2,500.

**Competitive positioning vs.:** SEO shops ($299-899/mo, no attribution), Google-only platforms ($149-399/mo, clicks not leases), SpareFoot ($130-390 per move-in commission).

### Navigation

**Desktop header:** How It Works, Results, Pricing, About, Insights, Book a Call, "Get a Free Audit" CTA button
**Footer:** All nav links + Blog, Demo, Diagnostic, Privacy, Terms, Data Deletion, blake@storageads.com

---

## Assessment: Would This Convert?

### Strengths (Keep These)

1. **Problem articulation is the best I've seen in storage marketing.** The homepage immediately speaks to the operator's pain in their language — not marketing jargon.

2. **Attribution message is front-and-center.** "Cost per move-in, not cost per click" is repeated throughout. This is the core differentiator and it's not buried.

3. **Founder-operator credibility is strong.** Blake is a real operator. The About page, Insights notes, and blog posts all reinforce this. Prospects trust operators over marketers.

4. **Pricing is transparent with ROI context.** Not just "$1,500/mo" — it's "$1,500/mo and here's the math showing 4-12x return." The SpareFoot comparison is particularly effective.

5. **CTA is low-friction.** Free audit, no contracts, 30-min call. Multiple entry points (form, calendar, audit tool).

6. **Blog content is exceptional.** Data-driven, tactical, operator-focused. "We A/B Tested 6 Headlines" is exactly the kind of content that builds trust.

7. **Insights page is authentic.** 20+ short notes in Blake's voice. Reads like a trusted peer, not a sales pitch.

### Weaknesses (Fix These)

1. **Blog is buried.** Not in main navigation — only in footer. This is the best content on the site and nobody will find it unless they scroll to the bottom.

2. **Insights page is hidden.** It's in the nav but positioned after About. Should be more prominent — it's Blake's strongest trust asset.

3. **Social proof is limited.** Only 2 case studies on homepage. No video testimonials, no operator quotes, no logos. As you get beta customers, add their results.

4. **No "How Much Am I Losing?" calculator.** The audit page calculates vacancy cost, but the marketing site doesn't have a quick interactive calculator that shows: "Enter your units and occupancy → see your monthly revenue gap."

5. **SEO is basic.** Title and meta description tags exist but:
   - No OpenGraph tags for social sharing previews
   - No structured data / JSON-LD (pricing schema, FAQ schema, organization schema)
   - No blog post structured data (article schema)
   - Organic discovery of blog posts will be weak

6. **Demo page discoverability.** Demo exists but isn't prominently featured. For sales calls, Blake should be able to share a link that goes directly to an impressive demo experience.

7. **No mobile-specific optimization evidence.** Code uses responsive Tailwind classes throughout (looks solid), but no evidence of mobile-specific testing or optimization.

---

## What to Build (Prioritized)

### P0 — Fixes for Next Sales Call

| Task | Effort | Impact |
|------|--------|--------|
| Add Blog to main navigation (between About and Insights, or after Insights) | Tiny | Best content becomes discoverable |
| Add OpenGraph meta tags to all pages (title, description, image) | Small | Social sharing looks professional |
| Add 1-2 operator quotes/testimonials to homepage (even from beta testers) | Small | Social proof at conversion point |
| Add interactive vacancy cost calculator to homepage or as standalone page | Medium | Engagement tool + lead qualifier |

### P1 — Strengthens Conversion

| Task | Effort | Impact |
|------|--------|--------|
| Add JSON-LD structured data (Organization, Product, FAQ, Article schemas) | Small | Better search appearance |
| Add case study detail pages (not just cards) with full before/after narrative | Medium | Deeper proof for serious prospects |
| Promote Insights page higher in nav or feature on homepage | Tiny | Blake's voice reaches more prospects |
| Add "Schedule Demo" or "See It Live" section to homepage | Small | Clear path for tire-kickers |

### P2 — Growth & SEO

| Task | Effort | Impact |
|------|--------|--------|
| Blog post SEO optimization (meta descriptions, canonical URLs, sitemap) | Medium | Organic traffic from search |
| Add video content (facility walkthrough, platform demo, Blake intro) | Large | Huge trust-builder but production cost |
| FAQ page with schema markup | Small | Catches long-tail search queries |
| Location-based landing pages ("Self-Storage Marketing in [City]") | Large | Local SEO for geographic targeting |

---

## Key Files

```
Homepage:
  src/app/page.tsx
  src/components/marketing/hero-section.tsx
  src/components/marketing/problem-section.tsx
  src/components/marketing/how-it-works-section.tsx
  src/components/marketing/comparison-section.tsx
  src/components/marketing/results-section.tsx
  src/components/marketing/inaction-section.tsx
  src/components/marketing/cta-section.tsx

Pages:
  src/app/pricing/page.tsx
  src/app/about/page.tsx
  src/app/blog/page.tsx
  src/app/insights/page.tsx
  src/app/case-studies/page.tsx
  src/app/demo/page.tsx

Layout:
  src/app/layout.tsx (global meta tags, fonts)
  src/components/marketing/header.tsx (navigation)
  src/components/marketing/footer.tsx

Content:
  content/blog/*.md (6 blog posts)
  src/lib/blog.ts (blog parser)
```
