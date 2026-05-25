# 04 — Programmatic Local Landing Pages

**Pillar:** Demand Generation
**Strategic priority:** High leverage
**Build size:** 5 phases (~5 sessions)
**Depends on:** Existing `landing_pages` table and `/lp/[slug]` dynamic route
**Blocks:** None.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**Existing schema covers:**
- `landing_pages` — has `facility_id`, `slug`, `status`, `variation_ids`, `meta_title`, `meta_description`. Section-based composition pattern already established.
- `landing_page_sections` — has `sort_order`, `section_type`, `config Json` per section. The template engine pattern already exists in the section_type/config shape.
- `call_tracking_numbers` — already links to `landing_page_id`, so Phase 4's per-variant numbers slot in cleanly.
- `utm_links` — already exists with `short_code`, click tracking.

**Net-new to build:**
- `programmatic_lp_templates` — operator-defined template
- `programmatic_lp_variants` — generated combination instances
- `lp_variant_visits` — per-variant analytics

**Revised Phase 1 focus:** As written. Reuse `landing_page_sections.config Json` shape for `programmatic_lp_variants` rendering so the existing `/lp/[slug]` route can serve both.

---

## Why This Exists

Self-storage demand searches are hyper-specific: "5x10 climate controlled near Pawpaw," "boat storage Tampa," "wine storage Austin." Generic facility pages rank for none of them. Operators who publish 100+ targeted landing pages per facility — one per `unit_size × use_case × neighborhood` — capture the long tail SpareFoot can't compete for.

Doing this manually is a content-team's full-time job. Generating it programmatically — with real local content, unique enough to avoid duplicate-content penalties — turns it into a one-time setup per facility.

## What "Done" Looks Like

For each facility, the system generates 50–300 landing pages across all combinations of:
- Unit size (5x5, 5x10, 10x10, 10x15, 10x20, 10x30, climate-controlled variants)
- Use case (residential, business, boat, RV, wine, document, vehicle)
- Geography (facility city + 3–5 adjacent neighborhoods/towns)

Each LP has:
- Unique LLM-generated intro tailored to the combination
- Local landmarks, distances, directions
- Per-LP tracking number and conversion form
- Real-time pricing pulled from rate engine (file 07)
- Auto-published to sitemap, submitted to Search Console

Performance loop auto-pauses LPs with zero conversions after 60 days, scales budget toward winners.

## Strategic Value

- **Search dominance.** When a prospect searches "10x15 storage Pinellas Park," they find your page, not SpareFoot's listing.
- **CAC compression.** Organic LP traffic costs nothing per click. A converting LP pays for itself in one move-in for the lifetime of the unit's existence.
- **Hard to copy.** Once a facility has 200 ranking pages, a new entrant takes 6–12 months to catch up.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Each phase ships actual ranking pages, not infrastructure for hypothetical future pages.

### Phase 1 — Template Engine + Slug Routing

**Goal:** Generate landing pages from a `programmatic_lp_template` + a `programmatic_lp_variant` row. Render at `/lp/[slug]` reusing existing routing. No content generation yet — variants seeded manually for one facility.

**Database changes (build on existing `landing_pages`):**
```prisma
model programmatic_lp_templates {
  id              String   @id @default(uuid())
  facility_id     String
  template_name   String
  hero_template   String   // Liquid/Mustache-style: "{{unit_size}} Storage Near {{neighborhood}}"
  body_template   String
  cta_template    String
  seo_title_template String
  seo_meta_template  String
  section_config  Json     // reuses existing landing_pages section shape
  created_at      DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])
  variants        programmatic_lp_variants[]
}

model programmatic_lp_variants {
  id              String   @id @default(uuid())
  template_id     String
  slug            String   @unique  // "10x10-climate-storage-pinellas-park"
  variables       Json     // {unit_size: "10x10", use_case: "climate", neighborhood: "Pinellas Park"}
  rendered_html   String?  // cached HTML
  is_published    Boolean  @default(false)
  generated_at    DateTime @default(now())
  last_rendered_at DateTime?
  view_count      Int      @default(0)

  template        programmatic_lp_templates @relation(fields: [template_id], references: [id])

  @@index([template_id, is_published])
}
```

**Rendering:**
- Reuse existing `/lp/[slug]` route. First check `landing_pages` (existing), fall back to `programmatic_lp_variants`.
- Template renderer: simple `{{variable}}` substitution + Markdown for body.

**Verification:**
- [ ] One template + 3 manually-seeded variants render at distinct URLs
- [ ] SEO title, meta, and structured data unique per variant
- [ ] `npm run build` passes
- [ ] No conflict with existing `landing_pages` slugs

**Out of scope:** AI content generation, bulk generation, sitemap, tracking numbers.

**Commit message:**
```
feat(prog-lp): template engine and variant rendering (roadmap 04 phase 1)
```

---

### Phase 2 — Bulk Variant Generation with LLM Content

**Goal:** Given a facility and a template, generate the full combinatorial set of variants. Each gets a unique LLM-written intro paragraph that mentions the specific unit_size + use_case + neighborhood + a real local landmark.

**Variable sources:**
- `unit_sizes` — from facility config or a default set
- `use_cases` — fixed list (residential, business, boat, RV, vehicle, wine, document, seasonal)
- `neighborhoods` — pulled from Google Places API "nearby" search around facility lat/lng, filtered to political/sublocality types

**Generation:**
- For each combination, call Anthropic Haiku with a structured prompt:
  - "Write a 120-word intro for a storage landing page targeting people in {neighborhood} looking for {unit_size} {use_case} storage near {facility_name} at {facility_address}. Mention {nearby_landmark}. Don't use marketing fluff."
- Generated content stored on `programmatic_lp_variants.variables.intro_html`.

**Cost guard:**
- Generation runs as a background job, not synchronously.
- Per-facility cap: 300 variants on initial run. Operator can manually expand.

**New cron / admin action:**
- `POST /api/admin-programmatic-lp/generate` — admin trigger, takes `facility_id` and `template_id`, queues generation.

**Verification:**
- [ ] One facility produces 100+ variants, each with unique intro
- [ ] No two intros are >50% similar (manual spot-check 10 random pairs)
- [ ] Generation cost under $0.05 per variant
- [ ] Variants saved with `is_published = false` for manual review before going live

**Out of scope:** Auto-publish, sitemap, tracking.

**Commit message:**
```
feat(prog-lp): bulk variant generation with LLM content (roadmap 04 phase 2)
```

---

### Phase 3 — Publishing, Sitemap, Search Console Submission

**Goal:** Operator approves variants in bulk (or all). System publishes them, regenerates sitemap, pings Google.

**Approval UI:**
- New page `/admin/programmatic-lp` per facility — table of generated variants with preview, "approve all" + per-row approve/reject.

**Publishing:**
- Flip `is_published = true`.
- Regenerate sitemap at `public/sitemap.xml` (or dynamic route at `/sitemap.xml`) including all published variants.
- Submit sitemap to Google Search Console via Indexing API or simple ping URL.

**Schema for noindex control:**
- Add `seo_index Boolean @default(true)` to `programmatic_lp_variants` for operator override.

**Verification:**
- [ ] Bulk-approve action publishes all variants atomically
- [ ] `/sitemap.xml` includes new URLs
- [ ] Sitemap submitted to GSC (or, if GSC OAuth not yet live, ping URL fires)
- [ ] `noindex` variants do not appear in sitemap

**Out of scope:** Tracking number assignment, performance loop.

**Commit message:**
```
feat(prog-lp): publishing, sitemap, search console (roadmap 04 phase 3)
```

---

### Phase 4 — Per-Variant Tracking Numbers and UTM

**Goal:** Each published variant gets its own call tracking number (Twilio, via existing `call_tracking_numbers`) and inherits UTM parameters from inbound traffic for full source attribution.

**Per-variant number assignment:**
- On publish, provision a tracking number via existing `POST /api/call-tracking` admin route, linked to the variant.
- Display the number prominently on the LP (replaces facility's default number).

**UTM capture:**
- Existing LP code likely already handles UTMs — extend to persist `utm_*` params on a new `lp_variant_visits` table per variant per session.
- When a call comes in to the variant's tracking number, join `call_logs` to `lp_variant_visits` by visitor session.

**Cost guard:**
- Twilio numbers are ~$1/month each. 300 variants × $1 = $300/mo per facility — too much.
- Compromise: provision numbers only for top 30 traffic variants per facility. Use DNI (dynamic number insertion) for the rest, swapping in a pool of 5–10 shared numbers based on visitor session.

**Verification:**
- [ ] Top-30 variants each have a unique tracking number
- [ ] Remaining variants share a pool with DNI per session
- [ ] Inbound call to variant number creates a `call_log` with variant link
- [ ] UTM params persisted and joinable

**Out of scope:** Performance loop, auto-bidding.

**Commit message:**
```
feat(prog-lp): per-variant tracking numbers and UTM attribution (roadmap 04 phase 4)
```

---

### Phase 5 — Performance Loop

**Goal:** After 60 days of data, auto-pause variants with zero conversions, scale exposure to winners.

**Conversion definition:**
- A conversion = phone call ≥30 seconds OR form submission OR chat session with intent classified as `tour_request`.

**Pause logic:**
- If variant has ≥100 unique visitors and 0 conversions over 60 days, set `is_published = false`. Notify operator.
- If variant has CR ≥ 2× facility median, flag for budget scale-up (operator notified, not auto-spent).

**Reporting:**
- `/admin/programmatic-lp` adds a "Performance" tab — sort by visits, conversions, CR.
- Per-variant 90-day chart.

**Verification:**
- [ ] Test data triggers auto-pause for losers
- [ ] Operator can revive a paused variant manually
- [ ] Performance tab shows correct CR
- [ ] Cron runs weekly, idempotent

**Out of scope:** Auto-regenerating losers with new copy (deferred).

**Commit message:**
```
feat(prog-lp): performance loop and auto-pause (roadmap 04 phase 5)
```

---

## Open Questions

- **Duplicate content risk.** Google penalizes mass-generated pages without unique value. The LLM intro is the differentiator — does it need to be longer? More structured? Need to monitor GSC for index coverage issues.
- **Twilio number cost ceiling.** 300 numbers × 50 facilities = 15,000 numbers = $15k/mo. DNI pooling reduces this but adds complexity. Need an operator-facing toggle.
- **Sitemap size.** Per-facility sitemap may exceed Google's 50k URL limit at scale. Need sitemap index file architecture.
- **Programmatic vs. handcrafted LPs.** Should we let operators tag certain variants as "hero" pages that get more design love?

## Anti-Goals

- Not building a CMS. Operators don't edit templates in a WYSIWYG.
- Not generating black-hat doorway pages. Each LP must have substantive unique content.
- Not spamming Search Console with submissions. Batch sitemap updates.
- Not building generic page-builder UX (existing `landing_pages` already covers handcrafted LPs).
