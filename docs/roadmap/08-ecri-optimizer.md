# 08 — Existing Customer Rate Increase (ECRI) Optimizer

**Pillar:** Revenue Intelligence
**Strategic priority:** Margin lift (second-largest dollar lever after dynamic pricing)
**Build size:** 5 phases (~5 sessions)
**Depends on:** PMS upload data with tenant tenure + payment history.
**Blocks:** 13 (NOI report) consumes ECRI revenue lift.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**⚠️ MAJOR OVERLAP — ECRI is partially scaffolded in the PMS schema.**

**Existing schema covers (DO NOT recreate):**
- `tenants` — has every field specced for `active_tenants`: `monthly_rate`, `move_in_date`, `lease_end_date`, `autopay_enabled`, `has_insurance`, `balance`, `status`, `days_delinquent`, `last_payment_date`, `moved_out_date`, `move_out_reason`.
- `tenant_payments` — has `amount`, `payment_date`, `due_date`, `method`, `status`, `days_late`, `external_ref`. **This IS `payment_events`.**
- `facility_pms_tenant_rates` — **already has `ecri_flag`, `ecri_suggested`, `ecri_revenue_lift` columns.** The flagging system exists at the data layer.
- `upsell_opportunities` — has `tenant_id`, `type`, `current_value`, `proposed_value`, `monthly_uplift`, `confidence`, `status`, `outreach_method`, `sent_at`, `responded_at`. **ECRI recommendations could be `upsell_opportunities.type = "ecri"`** — a strong candidate for reuse.

**Net-new to build:**
- `tenant_sensitivity_features` — feature snapshot per tenant per week
- `ecri_cycles` — cycle metadata
- `ecri_outcomes` — post-cycle retention/move-out result

**Open decision:** Use `upsell_opportunities` for recommendations (extend with a `cycle_id` FK) OR build dedicated `ecri_recommendations`. Recommend the former — fewer tables, existing UI surfaces can reuse.

**Revised Phase 1 focus:** SKIP the originally-specced `active_tenants` and `payment_events` tables — they exist. Phase 1 should be: **audit PMS upload parsers** for completeness on the existing `tenants` and `tenant_payments` tables, ensure all PMS formats populate the relevant fields. Then jump to Phase 2 sensitivity feature computation.

---

## Why This Exists

ECRIs are pure margin. A tenant paying $145 who absorbs a raise to $159 is +$14/mo × remaining tenure with zero acquisition cost. The REITs run ECRI cycles every 6–9 months on every tenant, scaled by sensitivity.

Independent operators ECRI by gut. They send a uniform 8% across the board, lose the price-sensitive 10% to move-outs, and leave 15% on the table from the price-insensitive 30%. A scoring model that targets the right tenant with the right amount captures both ends.

## What "Done" Looks Like

Every active tenant has a `price_sensitivity_score`. Quarterly, the operator gets a recommendation list:
- 200 tenants, broken into 4 buckets (low / med / high / very_high sensitivity)
- Per bucket: recommended increase ($ + %), expected move-out risk, projected revenue lift
- Per tenant: tenure, current rate, market rate gap, payment health, recommendation, reasoning

Operator approves in bulk or per-tenant. Notice letters generated and sent (state-compliance templated). Move-out risk tracked post-ECRI.

## Strategic Value

- **Recurring revenue from existing book.** Doesn't require any new acquisition.
- **Compounds.** Each ECRI cycle bakes in higher revenue baseline.
- **Sales story.** "Show me last quarter's ECRI revenue lift" is a sticky retention argument.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Phase 3 (scoring) defines the model — do not let Phase 4 (recommendations) bleed into model tweaks.

### Phase 1 — Tenant Data Normalization

**Goal:** Active tenant data from PMS uploads lands in a normalized `active_tenants` table with everything needed for scoring.

**Database:**
```prisma
model active_tenants {
  id              String   @id @default(uuid())
  facility_id     String
  pms_tenant_id   String   // upstream id for re-upload merge
  first_name      String?
  last_name       String?
  email           String?
  phone           String?
  unit_number     String?
  unit_type       String?
  unit_sqft       Int?
  current_rate    Decimal  @db.Decimal(10, 2)
  moved_in_at     DateTime
  tenure_months   Int      // computed
  last_rate_change_at DateTime?
  last_rate_change_amount Decimal? @db.Decimal(10, 2)
  autopay         Boolean  @default(false)
  status          String   // "active" | "delinquent" | "moved_out" | "scheduled_moveout"
  ingested_at     DateTime @default(now())
  last_seen_in_upload_at DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])
  payment_history payment_events[]

  @@unique([facility_id, pms_tenant_id])
  @@index([facility_id, status])
}

model payment_events {
  id              String   @id @default(uuid())
  tenant_id       String
  event_type      String   // "paid_on_time" | "paid_late" | "missed" | "rate_change" | "autopay_enabled" | "autopay_disabled"
  event_date      DateTime
  amount          Decimal? @db.Decimal(10, 2)
  days_late       Int?
  notes           String?

  tenant          active_tenants @relation(fields: [tenant_id], references: [id])

  @@index([tenant_id, event_date])
}
```

**Parser updates:**
- Each PMS format parser writes to `active_tenants` and `payment_events`. Per-format mapping (Sitelink, storEDGE, Yardi, Easy Storage).
- Delete-then-replace not allowed — must merge by `pms_tenant_id` to preserve history.

**Verification:**
- [ ] Upload sample report populates `active_tenants` + `payment_events`
- [ ] Re-upload merges, doesn't duplicate
- [ ] Tenure calculation correct (months between `moved_in_at` and now)
- [ ] Status changes (active → moved_out) detected on re-upload

**Out of scope:** Scoring, recommendations.

**Commit message:**
```
feat(ecri): active tenant data normalization (roadmap 08 phase 1)
```

---

### Phase 2 — Price Sensitivity Feature Engineering

**Goal:** For each active tenant, compute features that go into the sensitivity score. Stored daily for trending.

**Features:**
```
tenure_months                        # longer = lower sensitivity
months_since_last_increase           # longer = lower sensitivity
payment_health_score                 # 0..1 from payment_events history
autopay_flag                         # autopay = lower sensitivity
unit_type_demand_score               # from file 07 demand signals
local_market_rate_gap                # (market_rate - their_rate) / market_rate
size_above_typical_flag              # 10x30 = less likely to switch (move cost)
recent_inquiry_to_compete            # if they called asking about lower rate
```

**Database:**
```prisma
model tenant_sensitivity_features {
  id              String   @id @default(uuid())
  tenant_id       String
  snapshot_date   DateTime
  features        Json     // all the above
  sensitivity_score Float  // 0..1 (1 = highly sensitive)
  computed_at     DateTime @default(now())

  tenant          active_tenants @relation(fields: [tenant_id], references: [id])

  @@unique([tenant_id, snapshot_date])
}
```

**Cron:**
- `POST /api/cron/compute-sensitivity` — runs weekly. Computes features + initial heuristic score (V1: weighted sum).

**Initial score formula (V1):**
```
sensitivity_score =
  0.30 * (1 / log(tenure_months + 2)) +
  0.20 * (1 - payment_health_score) +
  0.15 * (1 if not autopay else 0) +
  0.20 * clamp(local_market_rate_gap, 0, 1) +
  0.15 * (1 if size <= 5x10 else 0)
```

**Verification:**
- [ ] Every active tenant has a sensitivity snapshot for current week
- [ ] Score distribution makes intuitive sense (long-tenure autopay folks low, short-tenure delinquent high)
- [ ] Cron idempotent

**Out of scope:** Recommendations, notice letters.

**Commit message:**
```
feat(ecri): price sensitivity feature engineering (roadmap 08 phase 2)
```

---

### Phase 3 — ECRI Recommendation Engine

**Goal:** Produce per-tenant ECRI recommendations grouped into 4 sensitivity buckets, with expected revenue and move-out risk.

**Bucketing:**
```
sensitivity_score < 0.25 → very_low_sensitivity → recommend +15%
0.25..0.50              → low_sensitivity      → recommend +10%
0.50..0.75              → med_sensitivity      → recommend +7%
> 0.75                  → high_sensitivity     → recommend +3% or hold
```

**Caps:**
- No ECRI within 6 months of last increase
- No ECRI within first 6 months of tenure
- Cap absolute new rate at market rate × 1.10
- Cap monthly $ delta per tenant (no $50+ jumps even at low sensitivity)

**Move-out risk estimate:**
```
expected_moveout_risk = sensitivity_score * (delta_pct / 0.10) * 0.35
```
(V1 heuristic — calibrated to industry benchmark of ~7% post-ECRI move-out at 8% raise on med-sensitivity)

**Database:**
```prisma
model ecri_cycles {
  id              String   @id @default(uuid())
  facility_id     String
  cycle_name      String   // "Q2 2026"
  generated_at    DateTime @default(now())
  status          String   // "draft" | "approved" | "sent" | "complete"
  approved_by     String?
  approved_at     DateTime?
  total_tenants   Int
  recommended_lift_monthly Decimal @db.Decimal(10, 2)
  recommended_lift_annual Decimal @db.Decimal(10, 2)

  facility        facilities @relation(fields: [facility_id], references: [id])
  recommendations ecri_recommendations[]
}

model ecri_recommendations {
  id              String   @id @default(uuid())
  cycle_id        String
  tenant_id       String
  sensitivity_score Float
  bucket          String
  current_rate    Decimal  @db.Decimal(10, 2)
  recommended_rate Decimal @db.Decimal(10, 2)
  delta_dollars   Decimal  @db.Decimal(10, 2)
  delta_pct       Float
  expected_moveout_risk Float
  override_rate   Decimal? @db.Decimal(10, 2)  // operator edit
  status          String   // "pending" | "approved" | "rejected" | "sent" | "moved_out" | "retained"
  reasoning       String

  cycle           ecri_cycles @relation(fields: [cycle_id], references: [id])
  tenant          active_tenants @relation(fields: [tenant_id], references: [id])

  @@index([cycle_id, status])
}
```

**Generation:**
- `POST /api/admin-ecri/generate-cycle` — operator triggers cycle for facility.

**Verification:**
- [ ] Cycle generates one recommendation per eligible tenant
- [ ] Eligibility caps respected (no ECRI within 6mo of last, etc.)
- [ ] Aggregate revenue lift estimate computes correctly
- [ ] Per-bucket distribution roughly matches industry pattern (~30% high-sens, ~30% low, ~40% med)

**Out of scope:** Notice letters, send, post-cycle tracking.

**Commit message:**
```
feat(ecri): recommendation engine with sensitivity bucketing (roadmap 08 phase 3)
```

---

### Phase 4 — Operator Approval + Override UI

**Goal:** Operator reviews entire cycle in `/admin/ecri`. Bulk-approve per bucket, edit per tenant, reject specific cases.

**UI:**
- Cycle summary at top: total tenants, projected lift, expected move-out count, by bucket
- Tenant list grouped by bucket, sortable, filterable
- Bulk actions: approve all in bucket, hold all in high-sens
- Per-tenant: edit rate, add note, reject
- "Why this recommendation?" expandable showing factor breakdown

**Approval workflow:**
- `status = draft` → operator edits → `approved_by`/`approved_at` recorded
- Once approved, locked. Reject the cycle to redo.

**Verification:**
- [ ] Cycle of 100+ recommendations renders fast (under 2s)
- [ ] Bulk approve per bucket works
- [ ] Per-tenant edit persists override
- [ ] Approved cycle is locked from further edits

**Out of scope:** Notice letter generation, send.

**Commit message:**
```
feat(ecri): operator approval and override UI (roadmap 08 phase 4)
```

---

### Phase 5 — Notice Letters + Post-Cycle Tracking

**Goal:** Generate state-compliant notice letters. Deliver via email and (optional) mailed letter via Lob. Track move-outs vs retention post-cycle.

**Notice generation:**
- Per-state compliance rules in `src/lib/ecri/state-rules.ts`:
  - CA: 30-day written notice required
  - FL: 30-day notice, must mention right to vacate
  - NY: 30-day notice, specific language
  - Default: 30-day notice
- Template: notice letter with new rate, effective date, contact for questions.

**Delivery:**
- Email via Resend (primary). PDF attachment optional.
- Lob.com integration for physical mail (operator-toggleable, costs ~$1.30/letter).
- Both update `ecri_recommendations.status` to `sent`.

**Tracking:**
- Cron compares post-ECRI uploads to recommendation list:
  - If tenant `status = "moved_out"` within 90 days post-ECRI → flag as ECRI-related move-out
  - If tenant active at 90 days → flag as `retained`, recognize lift
- Aggregate cycle outcome: actual move-out rate vs expected, actual revenue lift vs projected.

**Database:**
```prisma
model ecri_outcomes {
  id              String   @id @default(uuid())
  cycle_id        String
  recommendation_id String  @unique
  outcome         String   // "retained" | "moved_out_lt_30d" | "moved_out_30_90d" | "still_pending"
  realized_monthly_lift Decimal? @db.Decimal(10, 2)
  resolved_at     DateTime?

  cycle           ecri_cycles @relation(fields: [cycle_id], references: [id])
}
```

**Reporting:**
- Per-cycle dashboard: sent → retained / moved-out, projected vs actual lift, calibration delta for model tuning.

**Verification:**
- [ ] Notice letter generates with correct state-specific language
- [ ] Email delivers with proper template
- [ ] Lob delivery works for one test letter
- [ ] 90-day post-cycle tracking flips outcomes correctly

**Out of scope:** Auto-model retraining from outcomes (manual review for V1).

**Commit message:**
```
feat(ecri): notice letters and post-cycle outcome tracking (roadmap 08 phase 5)
```

---

## Open Questions

- **State compliance research.** Each state has different ECRI notice requirements. Need a legal review of the top 15 states by self-storage facility count before Phase 5 ships.
- **Lob vs. internal mailhouse.** Lob is convenient but costs add up. Operators with their own envelope-stuffing may want to download PDFs instead.
- **Sensitivity model calibration.** V1 is heuristic. After 2–3 cycles, we have outcome data — when do we move to ML?
- **Email-only vs mail-required.** Some leases say "written notice" — does email count? Operator-by-operator legal call.

## Anti-Goals

- Not raising rates beyond market. Cap at market × 1.10.
- Not raising rates on tenants who recently complained about price (capture from receptionist).
- Not bundling ECRI cycle with new-tenant special offers in the same campaign (signal noise).
- Not auto-sending notices without operator approval.
