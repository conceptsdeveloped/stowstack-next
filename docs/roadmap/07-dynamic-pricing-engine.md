# 07 — Dynamic Street Rate Engine

**Pillar:** Revenue Intelligence
**Strategic priority:** Margin lift (highest single-feature dollar impact)
**Build size:** 5 phases (~5 sessions)
**Depends on:** Phase 3 wants 09 (competitor occupancy grid) Phase 2 done.
**Blocks:** 13 (NOI report) wants pricing data.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**⚠️ MAJOR OVERLAP — pricing infrastructure substantially scaffolded.**

**Existing schema covers:**
- `facility_pms_rate_history` — already has `unit_type`, `effective_date`, `street_rate`, `web_rate`. **This IS `facility_rate_snapshots`.**
- `facility_pms_tenant_rates` — per-tenant per-unit detail with `standard_rate`, `actual_rate`, `paid_rate`, `rate_variance`, `discount`, plus **`ecri_flag`, `ecri_suggested`, `ecri_revenue_lift`** (the ECRI workflow is partially built).
- `facility_pms_units` — unit catalog per facility.
- `facility_pms_snapshots` — facility-level `total_units`, `occupied_units`, `occupancy_pct`, `gross_potential`, `actual_revenue`, `delinquency_pct`.
- `facility_pms_specials` — promotional pricing.
- `partial_leads`, `call_logs` — demand pressure signal sources (already capture per-facility per-day counts).

**Net-new to build:**
- `rate_recommendations` — the recommendation output table
- `facility_demand_daily` — optional rollup (can be computed on-the-fly initially)

**Revised Phase 1 focus:** SKIP the originally-specced `facility_rate_snapshots` build — that data exists. Phase 1 should be: **ensure PMS upload parser is populating `facility_pms_rate_history` cleanly** + add website scraper writing to the same table (with `source = "website_scrape"` distinguishable somehow). Then jump to Phase 3 recommendation engine on existing data.

For Phase 5 active-rate lookup, query `facility_pms_rate_history` ORDER BY `effective_date` DESC LIMIT 1 per (facility, unit_type) rather than maintaining a separate `facility_rate_active` table.

---

## Why This Exists

Self-storage street rates are sticky. Most operators set rates quarterly or by gut. The big REITs (Public Storage, Extra Space) run revenue management systems that adjust rates daily — sometimes per unit — and they capture 15–25% more revenue per square foot as a result.

Independent operators (1–25 facilities) have no equivalent tool. The pricing model isn't actually hard — local occupancy, competitor rates, seasonality, and unit-type demand — but stitching the data together is. That's the build.

## What "Done" Looks Like

Every facility has a rate sheet snapshotted daily per unit type. A pricing engine evaluates each unit type against:
- Own occupancy (from PMS uploads or estimation)
- Competitor rates (from file 03 Phase 1)
- Seasonality (rolling 12-month curve)
- Demand pressure (call volume, LP traffic, audit-tool submissions in last 30 days)

It produces a recommended rate with confidence and reasoning ("raise 10x10 climate from $145 to $159 — 3 closest competitors averaging $162, your occupancy at 94%"). Operator reviews and approves daily. Approved rates push to website + LP rate displays + AI receptionist. PMS push is deferred (manual update until PMS APIs land).

## Strategic Value

- **Largest dollar lever in the platform.** A 5% blended rate lift on a 500-unit facility = ~$30k/yr added NOI. One facility's pricing engine value > entire annual platform fee.
- **Operator can't replicate.** Spreadsheets don't pull live competitor data. Once the model is calibrated, switching cost is enormous.
- **Defensible at scale.** More facilities = more pricing data = better model.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. The pricing model (Phase 3) is the riskiest — do not let scope leak from adjacent phases.

### Phase 1 — Street Rate Snapshot Per Unit Type

**Goal:** Capture each facility's current street rate per unit type, daily. Source: PMS upload, website scrape, or manual entry. No recommendations yet.

**Database:**
```prisma
model facility_rate_snapshots {
  id              String   @id @default(uuid())
  facility_id     String
  snapshot_date   DateTime
  unit_type       String   // "5x5" | "5x10" | "10x10" | ... | "climate_10x10" | ...
  street_rate     Decimal  @db.Decimal(10, 2)
  promo_rate      Decimal? @db.Decimal(10, 2)
  available_units Int?
  total_units     Int?
  source          String   // "pms_upload" | "website_scrape" | "manual"
  notes           String?
  recorded_at     DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@unique([facility_id, snapshot_date, unit_type])
  @@index([facility_id, unit_type, snapshot_date])
}
```

**Capture mechanisms:**
- PMS upload parser already exists — add rate extraction.
- Website scrape: `POST /api/cron/scrape-own-rates` — scrapes each facility's own website daily. Reuses same parser infrastructure as file 03 Phase 1.
- Manual entry: admin form per facility for facilities without a website.

**Verification:**
- [ ] Every facility produces one snapshot row per unit type per day
- [ ] Re-snapshot on same day updates (not duplicates) via upsert on unique constraint
- [ ] Source noted on every row
- [ ] Per-facility unit type catalog stored cleanly (no "10x10 " with trailing space, etc.)

**Out of scope:** Recommendations, competitor comparison, push.

**Commit message:**
```
feat(pricing): facility rate snapshot per unit type (roadmap 07 phase 1)
```

---

### Phase 2 — Demand Pressure Signals

**Goal:** Aggregate per-facility demand signals daily: inbound call volume, LP traffic, audit submissions, tour bookings. Feed the pricing model.

**Database:**
```prisma
model facility_demand_daily {
  id              String   @id @default(uuid())
  facility_id     String
  snapshot_date   DateTime
  inbound_calls   Int      @default(0)
  qualified_calls Int      @default(0)  // duration ≥30s
  lp_visits       Int      @default(0)
  audit_submissions Int    @default(0)
  tour_bookings   Int      @default(0)
  chat_sessions   Int      @default(0)
  by_unit_type    Json?    // {"10x10": 4, "5x10": 2, ...} if call/chat surfaced size
  recorded_at     DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@unique([facility_id, snapshot_date])
}
```

**Cron:**
- `POST /api/cron/demand-pressure-rollup` — runs nightly. Joins `call_logs`, `landing_pages` visits, `shared_audits`, `tour_bookings`, `ai_chat_sessions`.

**Per-unit-type signal:**
- Parse call transcripts (from file 02) for mentioned unit sizes — increment `by_unit_type`.
- Parse audit submissions for unit_size field if collected.

**Verification:**
- [ ] One day of activity rolls up correctly
- [ ] Per-unit-type signal works for at least 3 unit types
- [ ] No double counting (call counted once even if attributed to multiple sources)

**Out of scope:** Pricing model, recommendations.

**Commit message:**
```
feat(pricing): demand pressure signal rollup (roadmap 07 phase 2)
```

---

### Phase 3 — Rules-Based Pricing Recommendation Engine

**Goal:** For each facility, each unit type, generate a daily recommendation: hold, raise X%, or lower X%, with reasoning.

**Inputs:**
- Own street rate (latest from `facility_rate_snapshots`)
- Own occupancy (if known from PMS)
- Competitor rates (from `competitor_rate_snapshots`, file 03 Phase 1)
- Demand pressure (from Phase 2)
- Seasonality (rolling 12-mo curve — synthetic for first year)

**Rules (V1 — simple, explainable, tunable):**
```
occupancy_score = (own_occupancy - 0.85) * 10   # +0.15 per pt above 85%
competitor_score = (avg_competitor - own_rate) / own_rate  # positive = we're cheap
demand_score = min(qualified_calls_for_unit_type_30d / 10, 0.2)
seasonality_score = seasonality_curve[month] - 1.0

raw_adjustment = occupancy_score + competitor_score + demand_score + seasonality_score
recommendation = own_rate * (1 + clamp(raw_adjustment, -0.10, 0.15))
```

Bounded at -10% / +15% per recommendation (no whiplash).

**Database:**
```prisma
model rate_recommendations {
  id              String   @id @default(uuid())
  facility_id     String
  unit_type       String
  recommendation_date DateTime
  current_rate    Decimal  @db.Decimal(10, 2)
  recommended_rate Decimal @db.Decimal(10, 2)
  delta_pct       Float
  confidence      Float
  reasoning       String   // human-readable explanation
  factors         Json     // {occupancy_score, competitor_score, ...}
  status          String   // "pending" | "approved" | "rejected" | "auto_applied"
  reviewed_by     String?
  reviewed_at     DateTime?
  applied_at      DateTime?
  created_at      DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@unique([facility_id, unit_type, recommendation_date])
}
```

**Cron:**
- `POST /api/cron/generate-rate-recommendations` — daily, after Phase 2 rollup completes.

**Verification:**
- [ ] One recommendation per facility per unit type per day
- [ ] Reasoning string explains all four factors with numbers
- [ ] Bounded between -10% and +15%
- [ ] Missing competitor data → confidence lowered, recommendation still produced

**Out of scope:** ML model, A/B testing, push to PMS/website.

**Commit message:**
```
feat(pricing): rules-based recommendation engine (roadmap 07 phase 3)
```

---

### Phase 4 — Operator Approval Flow + Rate Sheet UI

**Goal:** Operator reviews recommendations daily, approves or rejects, edits if needed. Approved rates become "current" for downstream consumers.

**Admin UI:**
- New page `/admin/pricing` per facility
- Table: unit type | current rate | recommended | delta | confidence | reason | accept/reject/edit
- Bulk-approve action
- "Auto-approve recommendations under +5% delta" toggle per facility (operator opt-in to less work)

**Approval flow:**
- Approve → flip `status = "approved"`, write to `facility_rate_active`
- Edit → operator sets a different rate, original recommendation preserved for model feedback
- Reject → status flipped, reason captured for model tuning

**Database:**
```prisma
model facility_rate_active {
  id              String   @id @default(uuid())
  facility_id     String
  unit_type       String
  street_rate     Decimal  @db.Decimal(10, 2)
  promo_rate      Decimal? @db.Decimal(10, 2)
  effective_from  DateTime @default(now())
  source_recommendation_id String?
  set_by          String?  // admin user or "auto_approve"

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@index([facility_id, unit_type, effective_from])
}
```

**Verification:**
- [ ] Recommendations visible in admin UI within seconds of generation
- [ ] Bulk approve works for all unit types in one click
- [ ] Auto-approve toggle skips manual review for sub-5% changes
- [ ] Edit captures original vs final rate

**Out of scope:** Push to website/AI receptionist.

**Commit message:**
```
feat(pricing): operator approval flow and active rate sheet (roadmap 07 phase 4)
```

---

### Phase 5 — Downstream Push (Website, LPs, Receptionist, Owner Notification)

**Goal:** Approved rates propagate to everywhere a prospect sees them within 1 hour. PMS push deferred.

**Push targets:**
- **Facility's own website** — if managed by StorageAds (landing pages or website builder), update rate display in next render
- **Programmatic LPs** (file 04) — same
- **AI Receptionist** (file 02) — agent quotes from `facility_rate_active`, not stale config
- **Audit tool** — uses current rate as benchmark
- **Owner email** — daily digest: "Today we raised your 10x10 climate $4. Estimated +$2,000/yr at current occupancy."

**Database update:**
- `facility_rate_active` becomes the source-of-truth for all consumers.
- Caching: 5-minute Redis cache in `src/lib/db.ts` wrapper for rate lookups.

**PMS push (deferred):**
- Capture diff in `pms_rate_push_pending` table for when PMS APIs land.
- For now, output as a CSV the operator can upload to their PMS.

**Verification:**
- [ ] Approved rate visible on facility website within 1 hour
- [ ] Receptionist quotes new rate
- [ ] Owner digest email arrives next morning with dollar impact
- [ ] CSV export matches active rates

**Out of scope:** Auto-write to PMS (later, once APIs available).

**Commit message:**
```
feat(pricing): downstream rate propagation and owner digest (roadmap 07 phase 5)
```

---

## Open Questions

- **Seasonality cold start.** Without 12 months of own-facility data, where does the seasonality curve come from? Suggest a published industry curve (SSA report) for V1, replace with own data after 12mo.
- **Auto-approve safety.** What's the right delta threshold? Industry RM systems often auto-approve under 5%, manual review above. Need operator-by-operator.
- **Promo rates vs street rates.** Should the engine recommend both? Phase 3 only handles street. Promo logic (e.g., "first month free", "50% off first 3 months") is more complex.
- **Per-unit pricing.** REITs price per individual unit (climate-controlled 10x10 on first floor vs third floor). Out of scope V1 — type-level only.

## Anti-Goals

- Not auto-writing to PMS without operator approval (compliance + trust).
- Not optimizing for short-term revenue at long-term occupancy cost. Penalize over-aggressive raises that risk move-outs.
- Not building a black-box ML model V1. Rules are explainable; trust matters more than the last 2% of margin.
- Not pricing competitors' units (only ours).
