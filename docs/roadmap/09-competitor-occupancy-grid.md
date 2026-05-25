# 09 — Competitor Occupancy Grid

**Pillar:** Revenue Intelligence
**Strategic priority:** Defensible moat (data network effects)
**Build size:** 5 phases (~5 sessions)
**Depends on:** Builds on `competitor_facilities` from file 03 Phase 1.
**Blocks:** 07 (dynamic pricing) Phase 3 wants this. 12 (acquisition intel) wants this.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**Existing schema covers:**
- `facility_market_intel` — has `competitors Json` blob per facility. Useful as a discovery source but unstructured.
- `facility_pms_snapshots` — **own-facility occupancy already tracked**: `total_units`, `occupied_units`, `occupancy_pct`, `gross_potential`, `actual_revenue`, `delinquency_pct`, `move_ins_mtd`, `move_outs_mtd`. The market aggregation in Phase 2 should sum these for the own-facility side.
- `notifications` — generic alerts table. Use for Phase 4 market alerts instead of new `market_alerts` table.

**Net-new to build:**
- `competitor_facilities` (built in file 03 Phase 1) — referenced here
- `competitor_inventory_snapshots` — daily competitor inventory
- `facility_market_snapshots` — aggregated market share per facility per day
- `occupancy_calibration` — ground-truth vs estimate tracking

**Revised Phase 1 focus:** As written. Add `competitor_inventory_snapshots` and extend the file-03 scraper to populate both rates and inventory in one pass (avoid double-loading competitor sites). For Phase 4 alerts, write to existing `notifications` table.

---

## Why This Exists

A facility's #1 strategic question: "Am I winning local share, or losing it?" The answer requires knowing competitor occupancy. Today, the only signals available are vibes ("their lot looks empty") and rumor.

Every chain's website actually displays per-unit availability — Public Storage says "1 left at this price," Extra Space shades unavailable sizes. Daily scraping converts that into an occupancy estimate. Aggregate across all competitors in radius = real-time local market share map.

CubeSmart, Public Storage, and Extra Space already have this for themselves. Independents have nothing.

## What "Done" Looks Like

For every facility, a daily snapshot of:
- Each competitor's estimated occupancy by unit type
- Local market share % (your occupancy vs theirs by sqft)
- Inventory available across the market
- Price-occupancy curve per unit type (who's at 95%+ and cheap, who's at 70% and expensive)
- 30/90/365-day trend per competitor

Operator dashboard surfaces "where can I grow share" and "what's the market telling me about pricing power."

## Strategic Value

- **Network effects.** Each new facility on the platform adds competitor data to the grid; every existing facility benefits.
- **Hard to replicate.** Scraper infrastructure + 12 months of history is a real moat.
- **Feeds pricing.** This data is the input to file 07 Phase 3.
- **Acquisition story.** "Facility X has been at 70% occupancy for 6 months" = a buyable target.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Phase 1 reuses file 03's competitor list — coordinate before duplicating.

### Phase 1 — Competitor Inventory Scraping

**Goal:** For each competitor in `competitor_facilities`, daily scrape unit-by-unit availability. Estimate occupancy per unit type.

**Source patterns:**
- **Public Storage:** unit list endpoint returns inventory per size with "limited" / "available" / "waitlist" flags.
- **Extra Space:** similar JSON endpoint, sometimes per-unit pricing.
- **CubeSmart:** detail page lists units with availability status.
- **Life Storage:** same.
- **Independents:** widely variable, fall back to detecting "out of stock" vs price-shown patterns.

**Estimation logic:**
```
For chains that show unit count explicitly:
  occupancy_pct = (total_units_for_type - available_units) / total_units_for_type

For sites showing only "1 left" / "limited" / "available":
  available_count = max(parse_remaining(), 0)
  if available_count == 0: occupancy_pct = 1.0
  elif available_count <= 2: occupancy_pct >= 0.90 (estimate)
  elif "limited": occupancy_pct >= 0.80
  else: occupancy_pct uncertain, use historical baseline
```

**Database:**
```prisma
model competitor_inventory_snapshots {
  id              String   @id @default(uuid())
  competitor_id   String
  snapshot_date   DateTime
  unit_type       String
  total_units     Int?     // if known
  available_units Int?
  availability_signal String // "available" | "limited" | "1_left" | "waitlist" | "sold_out" | "unknown"
  estimated_occupancy Float? // 0..1
  estimate_confidence Float
  source_url      String?
  scraped_at      DateTime @default(now())

  competitor      competitor_facilities @relation(fields: [competitor_id], references: [id])

  @@unique([competitor_id, snapshot_date, unit_type])
  @@index([competitor_id, snapshot_date])
}
```

**Cron:**
- Extend `POST /api/cron/scrape-competitor-rates` (file 03 Phase 1) to also capture inventory in the same pass. Don't double-load competitor sites.

**Verification:**
- [ ] Each competitor produces inventory snapshots per unit type per day
- [ ] Chain-specific parsers handle availability flags correctly
- [ ] Independent operators get "unknown" with confidence < 0.5 (no false precision)
- [ ] Rate scraper (file 03) still works

**Out of scope:** Aggregate dashboards, alerts.

**Commit message:**
```
feat(occupancy): competitor inventory scraping (roadmap 09 phase 1)
```

---

### Phase 2 — Market Aggregation + Share Calculation

**Goal:** For each facility, aggregate all competitors into a "local market" view. Compute share, total inventory, capacity utilization.

**Logic:**
```
market_inventory_by_type = sum(estimated_units_for_type across competitors + own facility)
market_occupied_by_type = sum(occupied_units estimated across all)
market_occupancy_pct = market_occupied / market_inventory

own_share_of_inventory = own_total_units / market_total_units
own_share_of_occupied = own_occupied_units / market_occupied_units
share_index = own_share_of_occupied / own_share_of_inventory  # > 1 = winning share
```

**Database:**
```prisma
model facility_market_snapshots {
  id              String   @id @default(uuid())
  facility_id     String
  snapshot_date   DateTime
  competitor_count Int
  market_total_units Int?
  market_occupied_units Int?
  market_occupancy_pct Float?
  own_share_of_inventory Float?
  own_share_of_occupied Float?
  share_index     Float?
  by_unit_type    Json     // per-type breakdown
  recorded_at     DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@unique([facility_id, snapshot_date])
}
```

**Cron:**
- `POST /api/cron/aggregate-market-snapshot` — runs after Phase 1 scraping completes nightly.

**Total-unit estimation when unknown:**
- For competitors that don't show total inventory, use Crexi/loopnet listings, GBP "service area" hints, or facility-size estimates from satellite imagery (out of scope V1 — use a manual seed).

**Verification:**
- [ ] One day of data produces market snapshot per facility
- [ ] Share index calculation matches manual spot-check on test market
- [ ] Missing competitor data lowers confidence but doesn't crash

**Out of scope:** UI surfacing, alerts.

**Commit message:**
```
feat(occupancy): market aggregation and share calculation (roadmap 09 phase 2)
```

---

### Phase 3 — Operator Dashboard + Price-Occupancy Map

**Goal:** Operator can see local market at a glance — share trend, competitor strength, pricing-vs-occupancy positioning.

**Page:** `/admin/market-intel/[facility_id]`

**Widgets:**
- **Share index card** — current value, 30-day trend
- **Local occupancy heatmap** — map view, each competitor pin colored by occupancy estimate
- **Price-occupancy scatter** — X = price, Y = occupancy, one dot per competitor per unit type; your facility highlighted
- **Inventory by unit type** — your units vs available market units per size
- **Trend chart** — share, market occupancy, your occupancy over 365 days

**Data:** All from `facility_market_snapshots` joined to `competitor_inventory_snapshots`.

**Verification:**
- [ ] Dashboard loads in < 3s for facility with 15 competitors
- [ ] Scatter plot identifies obvious mispricing (high price + low occupancy)
- [ ] Trend chart shows real 30-day data
- [ ] Mobile responsive

**Out of scope:** Alerts, action recommendations.

**Commit message:**
```
feat(occupancy): operator market intelligence dashboard (roadmap 09 phase 3)
```

---

### Phase 4 — Alerts + Recommended Actions

**Goal:** Surface actionable signals proactively. Operator gets weekly digest, urgent alerts in-product.

**Alert types:**
- **Share loss:** share_index dropped >0.1 in 30 days
- **Market softening:** market_occupancy_pct dropped >5pts in 30 days (industry-wide pressure)
- **Pricing opportunity:** all competitors at >95% occupancy AND your rate >5% below market → raise opportunity
- **Vulnerability:** specific competitor at >95% occupancy for 14 days AND raised prices → their overflow is up for grabs
- **Saturated category:** specific unit type has >30% available inventory across market → don't aggressively price this size

**Database:**
```prisma
model market_alerts {
  id              String   @id @default(uuid())
  facility_id     String
  alert_type      String
  severity        String   // "info" | "opportunity" | "warning" | "urgent"
  message         String
  data            Json
  acknowledged_at DateTime?
  created_at      DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@index([facility_id, created_at])
}
```

**Delivery:**
- In-product: alert badge on dashboard
- Weekly digest email to owner (rolled up across all facilities if multi-facility)

**Verification:**
- [ ] Test data triggers each alert type
- [ ] Weekly digest renders for multi-facility owner
- [ ] Acknowledged alerts hidden from active list

**Out of scope:** Auto-pricing changes (operator approval always required, per file 07).

**Commit message:**
```
feat(occupancy): market alerts and weekly digest (roadmap 09 phase 4)
```

---

### Phase 5 — Historical Backfill + Calibration

**Goal:** Backfill 6–12 months of historical data per market using Wayback Machine. Calibrate occupancy estimates against operators who voluntarily share ground truth.

**Backfill:**
- Wayback Machine has snapshots of competitor sites at various points. Pull snapshots monthly for 12 months, parse same way as live scrape.
- Cron: one-shot per facility, low priority.

**Calibration:**
- Opt-in: operator shares their own actual occupancy via PMS upload (already in DB).
- Compare our scraped estimate of *their* facility (we scrape all facilities including ours) to ground truth.
- Adjust per-chain parser confidence based on accuracy.

**Database:**
```prisma
model occupancy_calibration {
  id              String   @id @default(uuid())
  snapshot_id     String
  ground_truth_pct Float
  estimated_pct   Float
  delta           Float
  recorded_at     DateTime @default(now())
}
```

**Verification:**
- [ ] One test market has 12 months of backfilled data
- [ ] Estimates within ±8pts of ground truth on 80% of snapshots after calibration
- [ ] Per-chain confidence weights adjustable

**Out of scope:** Public-facing market reports (later business model question).

**Commit message:**
```
feat(occupancy): historical backfill and estimate calibration (roadmap 09 phase 5)
```

---

## Open Questions

- **Scraper ToS / legal.** Several chains explicitly prohibit scraping in their ToS. Need legal review. Public data, but cease-and-desist risk is real.
- **Wayback Machine coverage.** Not all competitor sites are well-archived. Backfill quality varies.
- **Operator opt-in for ground truth.** Worth offering a discount/credit for tenants who share PMS data? Higher data quality = better product for everyone.
- **Market definition.** Right now: 5-mile radius. Some markets (urban) want 1-mile. Some (rural) want 15-mile. Per-facility config.

## Anti-Goals

- Not building public-facing market reports (yet — different product, different sales motion).
- Not pretending high precision when data is sparse. Confidence scores everywhere.
- Not scraping aggressively enough to harm competitor infrastructure.
- Not exposing one operator's ground truth to others without permission.
