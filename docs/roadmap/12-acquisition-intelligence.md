# 12 — Acquisition Target Intelligence

**Pillar:** Revenue Intelligence (strategic / multi-facility owners)
**Strategic priority:** Strategic — high-ticket but narrow ICP
**Build size:** 5 phases (~5 sessions)
**Depends on:** 09 (competitor occupancy grid) Phase 2 — uses competitor data to detect underperformers.
**Blocks:** None.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**Existing schema covers:**
- `facilities` — own facilities only. Should NOT be polluted with discovered-but-not-owned market facilities (it has billing, ownership, etc.).
- `places_data` — Google Places enrichment with `photos`, `reviews` JSON per facility. Discovery layer for own facilities; can be extended for market facilities.
- `facility_market_intel` — already has `competitors Json` per own facility. A starting point for discovery.

**Net-new to build:**
- `market_facilities` — discovered facilities (separate from owned `facilities`)
- `market_facility_signals` — performance snapshots
- `acquisition_targets` — ranked subset
- `acquisition_owner_info` — owner enrichment (compliance-sensitive)
- `acquisition_pipeline` — deal pipeline CRM

**Revised Phase 1 focus:** As written. Build `market_facilities` as a separate table from `facilities` to keep owned-vs-discovered cleanly separated. Discovery cron seeds from Google Places + Crexi. Cross-reference with existing `facility_market_intel.competitors` for facilities already known to the system.

---

## Why This Exists

Multi-facility owners and management companies grow through acquisition. The market is fragmented — ~30,000 US self-storage facilities, 70% owned by independents — and the best targets are facilities running 60–80% occupancy with weak pricing, weak online presence, and an aging owner. Those facilities can lift NOI 30–50% under new operations and become buyable at favorable cap rates.

Today, finding those targets means walking the lot, pulling tax records, and talking to brokers. Automating identification turns one acquisition into ten by surfacing the universe of opportunity ranked by potential lift.

This feature targets a specific buyer subset: existing multi-facility owners and management companies. It's a separate revenue motion from the per-facility marketing subscription.

## What "Done" Looks Like

Operator inputs target geographies (states, MSAs, drive radii from existing facilities). System produces a ranked list of acquisition candidates with:
- Estimated occupancy (from file 09)
- Reviews + reputation signal
- Owner info (age estimate, length of ownership)
- Estimated NOI lift opportunity
- Pricing softness (rates below market)
- Online presence score (website, GBP, social)
- Contact info enrichment

Operator can save targets, track outreach, and run a "buyability" report.

## Strategic Value

- **High-ticket upsell.** Sold to portfolio owners ($500–$5,000/mo tier).
- **Sticky.** Once a portfolio is using this for deal flow, switching means losing pipeline.
- **Compounds with platform data.** Every additional facility on StorageAds improves the underlying competitor data.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Phase 1 (discovery) is the data foundation; subsequent phases enrich and rank.

### Phase 1 — Geographic Facility Discovery

**Goal:** Given a region (state, MSA, lat/lng+radius), produce a master list of all self-storage facilities. Foundation for everything else.

**Sources:**
- Google Places API (`type=storage`)
- Crexi public listings
- LoopNet
- County tax assessor records where available
- Self-Storage Association directory

**Database:**
```prisma
model market_facilities {
  id              String   @id @default(uuid())
  name            String
  street          String?
  city            String
  state           String
  zip             String?
  county          String?
  lat             Float
  lng             Float
  google_place_id String?  @unique
  estimated_sqft  Int?
  unit_count_estimate Int?
  brand           String?  // "Public Storage" | "Extra Space" | independent_name | null
  is_independent  Boolean  @default(true)
  primary_source  String   // "google_places" | "crexi" | "tax_assessor" | "manual"
  source_data     Json
  discovered_at   DateTime @default(now())
  last_refreshed_at DateTime @default(now())

  @@index([state, city])
  @@index([lat, lng])
}
```

**Discovery process:**
- `POST /api/admin-acquisition/discover-market` — operator inputs region, system fetches from all sources, dedupes.
- Cron refreshes facility list monthly per active region.

**Verification:**
- [ ] Test region (one county) produces a deduplicated facility list
- [ ] Chains correctly identified vs independents
- [ ] Re-running merges, doesn't duplicate

**Out of scope:** Performance signals, ranking, contact info.

**Commit message:**
```
feat(acquisition): geographic facility discovery (roadmap 12 phase 1)
```

---

### Phase 2 — Performance Signal Enrichment

**Goal:** For each market facility, enrich with performance indicators.

**Signals:**
- **Occupancy estimate** — from file 09 if scraped. Otherwise heuristic from "X available" website signals.
- **Pricing** — current rates from website scrape (reuses file 03 / 09 scraper infra)
- **Reviews** — count, avg rating, last review date (older = stale operator)
- **Website quality** — load time, mobile score, HTTPS, schema markup (Lighthouse-style scoring via Vercel API or own check)
- **Google Business Profile completeness** — has hours, photos, response rate
- **Social presence** — Facebook page, last post date
- **Age of business** — Google Place opening date or county records

**Database:**
```prisma
model market_facility_signals {
  id              String   @id @default(uuid())
  facility_id     String
  snapshot_date   DateTime
  occupancy_estimate Float?
  occupancy_confidence Float
  avg_rate_per_sqft Float?
  review_count    Int?
  avg_rating      Float?
  last_review_at  DateTime?
  website_score   Float?
  gbp_completeness Float?
  has_social_presence Boolean?
  estimated_business_age_years Float?
  pricing_softness_score Float?  // how far below market
  computed_at     DateTime @default(now())

  facility        market_facilities @relation(fields: [facility_id], references: [id])

  @@unique([facility_id, snapshot_date])
}
```

**Cron:**
- `POST /api/cron/enrich-market-signals` — runs for active acquisition regions, throttled.

**Verification:**
- [ ] Test market produces signal snapshot per facility
- [ ] Independents flagged correctly (higher acquisition potential vs chains)
- [ ] Sparse data → low confidence, not faked precision

**Out of scope:** Owner enrichment, contact info, ranking.

**Commit message:**
```
feat(acquisition): performance signal enrichment (roadmap 12 phase 2)
```

---

### Phase 3 — Underperformance Scoring + Buyability Ranking

**Goal:** Rank all discovered facilities by "buy and improve" opportunity.

**Buyability score (V1 heuristic):**
```
underperformance_signals =
  + 0.25 * (1 - occupancy_estimate)         # lower occupancy = more upside
  + 0.20 * pricing_softness_score            # below-market rate = upside
  + 0.15 * (1 - normalize(review_count))     # low review count = invisible
  + 0.15 * (1 if last_review_at older than 1yr else 0)
  + 0.10 * (1 - website_score)
  + 0.10 * (1 - gbp_completeness)
  + 0.05 * (1 if no_social_presence else 0)

NOI_lift_estimate_pct = underperformance_signals * 0.35  # cap at 35% NOI lift estimate

buyability_score = underperformance_signals * (1 if is_independent else 0.3) * (1 if business_age > 15yr else 0.7)
```

**Database:**
```prisma
model acquisition_targets {
  id              String   @id @default(uuid())
  facility_id     String   @unique
  owner_org_id    String?  // which operator is evaluating
  underperformance_score Float
  noi_lift_estimate_pct Float
  buyability_score Float
  rank_in_region  Int?
  key_levers      Json     // ["pricing_softness", "low_occupancy", ...]
  computed_at     DateTime @default(now())

  facility        market_facilities @relation(fields: [facility_id], references: [id])
}
```

**Cron:**
- Per acquisition region, rank facilities daily.

**Verification:**
- [ ] Test region produces ranked list with clear top targets
- [ ] Top targets pass manual sanity check (low occupancy + below-market pricing + weak online)
- [ ] Chains down-weighted (acquisition unlikely)

**Out of scope:** Owner contact info, outreach.

**Commit message:**
```
feat(acquisition): underperformance scoring and buyability ranking (roadmap 12 phase 3)
```

---

### Phase 4 — Owner Contact Enrichment

**Goal:** For top-ranked targets, enrich with owner contact info. LLC ownership, registered agent, owner name + phone + email where legally available.

**Sources:**
- County property records (free where digital, paid scrapes elsewhere)
- Secretary of State LLC filings
- Skip-trace providers (TLO, IDI, BeenVerified) for owner contact (paid, compliance-sensitive)
- LinkedIn for likely-owner profile match

**Database:**
```prisma
model acquisition_owner_info {
  id              String   @id @default(uuid())
  target_id       String   @unique
  owner_name      String?
  owner_type      String?  // "individual" | "llc" | "trust" | "reit"
  owner_address   String?
  owner_phone     String?
  owner_email     String?
  registered_agent String?
  property_purchase_date DateTime?
  property_purchase_price Decimal? @db.Decimal(14, 2)
  ownership_confidence Float
  data_sources    Json
  enriched_at     DateTime @default(now())

  target          acquisition_targets @relation(fields: [target_id], references: [id])
}
```

**Compliance note:**
- Skip-trace data has TCPA/CAN-SPAM implications for outreach. Document use case at enrichment time.
- Owner can opt-out — `owner_opted_out` table for global suppression.

**Verification:**
- [ ] Top 10 targets in test region get enriched
- [ ] LLC ownership resolves to real beneficial owner where possible
- [ ] Opt-out list respected globally

**Out of scope:** Outreach automation.

**Commit message:**
```
feat(acquisition): owner contact enrichment (roadmap 12 phase 4)
```

---

### Phase 5 — Outreach Tracking + Deal Pipeline

**Goal:** Operator can save targets, log outreach, track deal stage. Light CRM layer specific to acquisition.

**Schema:**
```prisma
model acquisition_pipeline {
  id              String   @id @default(uuid())
  target_id       String
  owner_org_id    String
  stage           String   // "saved" | "initial_outreach" | "in_conversation" | "loi_sent" | "under_contract" | "closed" | "passed" | "dead"
  stage_changed_at DateTime @default(now())
  notes           String?
  next_action     String?
  next_action_due DateTime?
  outreach_log    Json     // [{date, channel, summary, outcome}]
  estimated_purchase_price Decimal? @db.Decimal(14, 2)
  estimated_cap_rate Float?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  target          acquisition_targets @relation(fields: [target_id], references: [id])

  @@index([owner_org_id, stage])
}
```

**UI:**
- `/admin/acquisition` — kanban or table view of pipeline by stage
- Per-target detail view with all signals + owner info + history
- "Generate outreach email" action (Anthropic-generated, founder-to-founder voice)

**Reporting:**
- Pipeline value by stage
- Avg time per stage
- Win rate
- Total NOI lift opportunity in pipeline

**Verification:**
- [ ] Add target → save → log call → advance stage works end-to-end
- [ ] Pipeline view loads fast for 100+ targets
- [ ] Generated outreach email reads founder-to-founder, not spammy

**Out of scope:** DocuSign integration, full deal-room (deferred — partner with broker tools instead).

**Commit message:**
```
feat(acquisition): outreach tracking and deal pipeline (roadmap 12 phase 5)
```

---

## Open Questions

- **Skip-trace vendor.** TLO is best-known, expensive, compliance-strict. BeenVerified cheaper, less reliable. Need vendor eval.
- **Pricing tier.** This is a different product than the per-facility marketing tool. Standalone module? Add-on to enterprise tier?
- **County data fragmentation.** Property record sources vary by county. Bulk providers (ATTOM, CoreLogic) cost real money. Start with FL, TX, CA, GA, NC where data is good.
- **Self-cannibalization.** If an operator buys an underperforming facility from another StorageAds customer, who wins?

## Anti-Goals

- Not facilitating hostile outreach to unwilling owners.
- Not violating TCPA/CAN-SPAM in skip-trace use.
- Not pretending acquisition recommendations are investment advice.
- Not exposing one operator's saved targets to another operator.
