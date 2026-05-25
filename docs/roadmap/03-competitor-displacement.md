# 03 — Competitor Displacement Engine

**Pillar:** Demand Generation
**Strategic priority:** High leverage
**Build size:** 5 phases (~5 sessions)
**Depends on:** None for Phase 1. Phase 4 wants 09 (competitor occupancy grid) Phase 2 done first.
**Blocks:** None.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**Existing schema covers:**
- `facility_market_intel` — already has `competitors Json` blob per facility (also `demand_drivers`, `demographics`, `operator_overrides`). A starting point for competitor identification but unstructured.
- `creative_briefs` + `ad_variations` — creative generation pipeline already exists. Displacement ads should plug into this, not a parallel `displacement_creatives` model.
- `gbp_reviews` — for OWN facility only. Competitor reviews still need their own table.

**Net-new to build:**
- `competitor_facilities` — normalized table (Phase 1 should populate from existing `facility_market_intel.competitors` JSON)
- `competitor_rate_snapshots` — daily rate snapshots
- `competitor_reviews` + `competitor_review_summary`
- `displacement_triggers` — the trigger state machine

**Revised Phase 1 focus:** Normalize existing `facility_market_intel.competitors` JSON into a structured `competitor_facilities` table. Build daily scraper writing to `competitor_rate_snapshots`. In Phase 4, link displacement creatives via FK from `displacement_triggers` to existing `creative_briefs.id` rather than creating `displacement_creatives`.

---

## Why This Exists

When a competitor raises prices or eats a review-bomb, that's a moment of vulnerability. Their existing customers start shopping. Their new-prospect funnel softens. The facility three miles away that runs a targeted "switch and save" ad in that 7-day window captures move-ins at a 30–50% discount on CAC.

Today, nobody does this systematically. The data is public — Google reviews, scraped pricing, BBB complaints, news mentions. The execution is what's missing.

## What "Done" Looks Like

Daily cron scrapes each competitor in the radius of every StorageAds facility. Detects four events:
1. **Price hike** — street rate up ≥10% on any unit type vs 30-day baseline
2. **Review surge** — three or more 1–2 star reviews in 7 days, OR star-average drop ≥0.3
3. **Availability spike** — competitor's unit inventory drops (someone churned out)
4. **Negative news mention** — Google News or local press picks up a story

On any trigger, the system auto-generates comparison ad creative (text + image) and queues it for Angelo's ad pipeline to launch as a 7-day campaign geo-fenced around the competitor's location.

## Strategic Value

- **Zero-sum competitive play.** Every move-in we steal is a move-in they lose. Compounds.
- **Real-time.** Most operators couldn't respond in 7 days even if they noticed.
- **Defensible.** Once we have 12 months of competitor history per market, the trigger model knows seasonality and false positives.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Each phase requires the next session's input is clean before stopping.

### Phase 1 — Daily Competitor Rate Scraper

**Goal:** For every facility, identify competitors within 5 miles. Scrape current rates from their public websites daily. Store snapshots.

**Competitor discovery:**
- Use Google Places API (already integrated) to pull all storage facilities within 5 miles of each facility's lat/lng.
- Manual override list per facility for facilities that don't surface in Places.

**Database changes:**
```prisma
model competitor_facilities {
  id              String   @id @default(uuid())
  facility_id     String   // the StorageAds facility this is a competitor of
  competitor_name String
  website_url     String?
  google_place_id String?
  lat             Float
  lng             Float
  distance_mi     Float
  is_active       Boolean  @default(true)
  parser_strategy String?  // "extra_space" | "public_storage" | "cubesmart" | "generic_dom" | "manual"
  added_at        DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@unique([facility_id, google_place_id])
}

model competitor_rate_snapshots {
  id                String   @id @default(uuid())
  competitor_id     String
  snapshot_date     DateTime
  unit_type         String   // "5x5" | "5x10" | "10x10" | "10x15" | "10x20" | "10x30" | "climate_*"
  street_rate       Decimal? @db.Decimal(10, 2)
  promo_rate        Decimal? @db.Decimal(10, 2)
  availability      String?  // "available" | "limited" | "waitlist" | "unknown"
  raw_html_hash     String?  // for change detection without storing all HTML
  scraped_at        DateTime @default(now())

  competitor        competitor_facilities @relation(fields: [competitor_id], references: [id])

  @@index([competitor_id, snapshot_date])
  @@unique([competitor_id, snapshot_date, unit_type])
}
```

**Scraper architecture:**
- Per-chain parser modules in `src/lib/scrapers/competitors/`:
  - `extra-space.ts`, `public-storage.ts`, `cubesmart.ts`, `life-storage.ts` — chain-specific HTML/JSON parsing
  - `generic.ts` — fallback heuristic for independent operators (look for `$\d+\.?\d*` near `5x10`-like patterns)
- All scrapers throttled, respect robots.txt where reasonable, use rotating residential proxies (Bright Data or similar).

**Cron:**
- `POST /api/cron/scrape-competitor-rates` — runs daily at 3am facility-local time.

**Verification:**
- [ ] One run populates `competitor_rate_snapshots` for ≥80% of competitors in test market
- [ ] Re-run is idempotent (no duplicate rows for same competitor/date/unit)
- [ ] Parser failures log to `scraper_errors` table, don't crash run
- [ ] `npm run build` passes

**Out of scope:** Review scraping, availability scraping, triggers.

**Commit message:**
```
feat(displacement): daily competitor rate scraper (roadmap 03 phase 1)
```

---

### Phase 2 — Review Surge Detection

**Goal:** Daily scrape Google reviews for each competitor. Detect negative-review spikes.

**Source:**
- Google Places API has reviews but only the most recent 5. Use SerpApi or ScrapingBee for fuller review pulls. Or, since we'll have GBP OAuth (per `feature-audit-08-gbp-management.md`), use GBP API once that's live.

**Database:**
```prisma
model competitor_reviews {
  id            String   @id @default(uuid())
  competitor_id String
  google_review_id String? @unique
  author_name   String
  rating        Int
  text          String?
  posted_at     DateTime
  scraped_at    DateTime @default(now())
  sentiment     Float?   // post-process LLM classification

  competitor    competitor_facilities @relation(fields: [competitor_id], references: [id])

  @@index([competitor_id, posted_at])
}

model competitor_review_summary {
  id                  String   @id @default(uuid())
  competitor_id       String
  snapshot_date       DateTime
  total_reviews       Int
  avg_rating          Float
  reviews_last_7d     Int
  negative_last_7d    Int      // 1-2 star
  rating_drop_7d      Float    // change in avg vs prior 7d

  competitor          competitor_facilities @relation(fields: [competitor_id], references: [id])

  @@unique([competitor_id, snapshot_date])
}
```

**Verification:**
- [ ] Each competitor has ≥30 days of review history backfilled for one test market
- [ ] Summary table updates daily with rolling 7-day windows
- [ ] Sentiment classification runs on new reviews via Anthropic Haiku
- [ ] Cost per competitor per day under $0.05

**Out of scope:** Trigger evaluation, ad activation.

**Commit message:**
```
feat(displacement): competitor review surge detection (roadmap 03 phase 2)
```

---

### Phase 3 — Trigger Evaluation Engine

**Goal:** Daily evaluate each competitor against trigger rules. Emit `displacement_triggers` rows when a competitor crosses a threshold.

**Trigger rules:**
- **Price hike:** any unit type's street_rate up ≥10% vs 30-day median, persisted ≥3 days
- **Review surge:** `negative_last_7d` ≥ 3 OR `rating_drop_7d` ≤ -0.3
- **Availability spike:** ≥50% of unit types flip from "limited"/"waitlist" to "available" in 7 days
- **News mention:** post-MVP, use Google News API filtered to competitor name + city

**Database:**
```prisma
model displacement_triggers {
  id                String   @id @default(uuid())
  competitor_id     String
  facility_id       String   // facility that should run displacement ads
  trigger_type      String   // "price_hike" | "review_surge" | "availability_spike" | "news_mention"
  trigger_data      Json     // details for ad copy generation
  detected_at       DateTime @default(now())
  expires_at        DateTime // 7 days post-detection by default
  status            String   // "pending_review" | "approved" | "rejected" | "active" | "expired"
  reviewed_by       String?
  reviewed_at       DateTime?
  notes             String?

  competitor        competitor_facilities @relation(fields: [competitor_id], references: [id])
  facility          facilities @relation(fields: [facility_id], references: [id])

  @@index([facility_id, status])
}
```

**Admin UI:**
- New page `/admin/displacement` — list of pending triggers, approve/reject per trigger before ad goes live.
- Phase 3 stops at "approved" — actual ad activation is Phase 4.

**Verification:**
- [ ] Test data forces each trigger type to fire
- [ ] Triggers expire after 7 days if not approved
- [ ] Approving a trigger does not yet launch an ad (that's next phase)
- [ ] Cron runs daily, idempotent

**Out of scope:** Auto-generated creative, ad launch, attribution.

**Commit message:**
```
feat(displacement): trigger evaluation engine (roadmap 03 phase 3)
```

---

### Phase 4 — Auto-Generated Comparison Creative

**Goal:** When a trigger is approved, auto-generate 3 ad creative variants (headline + body + image prompt). Queue for Angelo's pipeline.

**Generation:**
- Anthropic `claude-sonnet-4-6` for copy. Prompt includes:
  - Trigger type and data (e.g., "Public Storage on Elm raised 10x10 rates 12% this week")
  - Facility's USP (from `facilities` config)
  - Compliance constraints (no direct competitor name in ad copy if legal restricts)
- Image generation via Angelo's existing image pipeline (queue a request, do not call directly).

**Database:**
```prisma
model displacement_creatives {
  id            String   @id @default(uuid())
  trigger_id    String
  variant       Int      // 1, 2, 3
  headline      String
  body          String
  cta           String
  image_request_id String?  // ref to Angelo's image generation queue
  approved      Boolean  @default(false)
  generated_at  DateTime @default(now())

  trigger       displacement_triggers @relation(fields: [trigger_id], references: [id])
}
```

**Compliance layer:**
- Static rules engine checks copy for: direct competitor name (state-dependent), unsubstantiated claims, prohibited phrasing ("guaranteed cheapest").
- Flag rather than block — facility manager makes final call.

**Verification:**
- [ ] Each approved trigger produces 3 copy variants within 5 minutes
- [ ] Image request lands in Angelo's queue with correct geo and trigger context
- [ ] Compliance flags shown in UI but do not block approval
- [ ] Generated copy stays under Meta and Google length limits

**Out of scope:** Actual ad launch (Angelo's domain), bid management.

**Commit message:**
```
feat(displacement): auto-generated comparison creative (roadmap 03 phase 4)
```

---

### Phase 5 — Activation, Geo-Fencing, Measurement

**Goal:** Hand approved creative to Angelo's ad pipeline with geo-fence parameters and 7-day campaign envelope. Measure incremental move-ins vs control.

**Hand-off contract:**
- Write to a `ad_launch_requests` table (or whatever Angelo's pipeline reads from — coordinate before building):
  - `creative_id`, `geo_radius_mi` (default 3 around competitor), `budget_daily`, `start_date`, `end_date`
- Status updates flow back from Angelo's pipeline: `pending` → `live` → `paused` → `complete`.

**Measurement:**
- During a displacement campaign, tag every inbound lead (call, chat, form) with `displacement_trigger_id`.
- After 30 days post-campaign, generate a report: spend, leads, move-ins, est. lifetime value, payback period.
- Surface in `/admin/displacement` as a "Past Campaigns" tab.

**Verification:**
- [ ] Approved + activated trigger results in `ad_launch_requests` row consumed by Angelo's pipeline
- [ ] Calls/forms during the campaign window are tagged with the trigger
- [ ] Post-campaign report renders with real numbers
- [ ] Control group: if multiple competitors trigger simultaneously, the system doesn't double-attribute

**Out of scope:** Auto-tuning the trigger rules based on performance (manual iteration).

**Commit message:**
```
feat(displacement): activation, geo-fence, measurement (roadmap 03 phase 5)
```

---

## Open Questions

- **Direct competitor naming in ad copy.** Legal varies by state and platform. Need a per-state allowlist. Default to "the storage place on Elm Street" style euphemisms.
- **Bright Data vs ScrapingBee vs in-house proxies.** Cost scaling matters at 10k+ scrapes/day. Bright Data ~3x more expensive but more reliable.
- **Throttle to avoid scraper detection.** Competitors will eventually block us. Need a Tier-2 plan (residential proxies + headless browser) when 403s climb.
- **Trigger fatigue.** If a competitor sustains a bad streak, do we keep triggering or cool off? Suggest one trigger per competitor per 30 days max.

## Anti-Goals

- Not running the ads ourselves. Angelo's pipeline owns ad platform calls.
- Not naming competitors falsely. All claims must be grounded in scraped data with a timestamp.
- Not scraping anything behind login walls.
- Not scraping aggressively enough to harm the competitor's infrastructure.
