# 11 — Move-Out Prediction + Auction Optimization

**Pillar:** Revenue Intelligence
**Strategic priority:** High leverage
**Build size:** 5 phases (~5 sessions)
**Depends on:** 08 Phase 1 (active_tenants) and Phase 1 of PMS payment data.
**Blocks:** 13 (NOI report) reports retention saves and auction revenue.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**⚠️ MAJOR OVERLAP — churn + delinquency scaffolded.**

**Existing schema covers (DO NOT recreate):**
- `churn_predictions` — has `tenant_id` (unique), `risk_score`, `risk_level`, `predicted_vacate`, `factors Json`, `recommended_actions Json`, `retention_campaign_id`, `retention_status`, `last_scored_at`. **This IS `tenant_churn_scores`.**
- `retention_campaigns` — has `name`, `trigger_risk_level`, `sequence_steps Json`, `enrolled_count`, `retained_count`. Linked from `churn_predictions.retention_campaign_id`.
- `delinquency_escalations` — has `tenant_id`, `facility_id`, `stage`, `stage_entered_at`, `next_stage_at`, `notes`, `automated`. **This IS `delinquency_cases`.**
- `tenant_payments` — full payment history (late counts, status, days_late).
- `tenant_communications` — full comms log including complaints if tagged.
- `tenants` — has `days_delinquent`, `last_payment_date`, `balance`, `move_out_reason`.

**Net-new to build:**
- `tenant_signal_events` — optional structured signal layer (most signals are query-derivable from existing tables — defer unless query complexity grows)
- `retention_actions` — per-action log (existing `retention_campaigns` is the sequence definition, not the per-instance log)
- `auction_listings` — net-new for Phase 5

**Revised Phase 1 focus:** SKIP the originally-specced `tenant_signal_events` build unless needed. Phase 1 should be: **ensure signal-bearing data is populated** in existing `tenants`, `tenant_payments`, `tenant_communications` via PMS uploads.

Phase 2 should be: **populate `churn_predictions.factors` and `risk_score`** via the new scoring cron, using the existing table. Phase 3 retention surface reads existing `churn_predictions` rows.

Phase 4 should: **extend `delinquency_escalations`** with `total_owed`, `auction_scheduled_for`, `auction_listed_at`, `auction_proceeds`, `resolution` columns rather than building parallel `delinquency_cases`. Notices_sent JSON tracked on the same row.

Phase 5 `auction_listings` net-new — FK to `delinquency_escalations`.

---

## Why This Exists

A scheduled move-out is a leading indicator of revenue loss. A delinquent unit is either a future payment (good) or a future auction (different revenue stream). Most operators react to both — they get the move-out notice, they auction when forced by state lien law. Both moments have unrealized leverage:

- **Move-outs:** ~30% of move-outs cite reasons the operator could have addressed (price grievance, gate access issue, billing surprise). Catching the signal 30 days early enables retention saves.
- **Auctions:** Storage Wars made auctions famous; in reality, auction recovery varies wildly by photo quality, listing site, and timing. A 20% lift on auction proceeds across a portfolio = real money.

## What "Done" Looks Like

Every active tenant has a churn risk score updated weekly. High-risk tenants surface in operator dashboard with the strongest signal and a recommended retention action (call, offer rate freeze, address specific complaint). Outcomes tracked.

For delinquent units, a workflow tracks days-past-due, generates state-compliant notices, optimizes auction listing (StorageTreasures vs Lockerfox vs in-house), and reports auction proceeds vs. expected.

## Strategic Value

- **Retention lift.** Even a 10% reduction in churn = significant LTV gain. Compounds with pricing engine value.
- **Auction lift.** Better photos + better timing = 15–25% more proceeds.
- **Cash flow story.** Operators care about delinquency. Solving it = sticky retention.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Churn prediction (Phase 2) and auction (Phase 4) are independent — sequence is flexible after Phase 1.

### Phase 1 — Tenant Signal Capture

**Goal:** Track every signal that predicts move-out or delinquency. Already partial via `payment_events` (file 08 Phase 1) — extend.

**Signals to capture:**
- Payment lateness (already in `payment_events`)
- Autopay enabled/disabled (already)
- Gate access frequency (new — requires PMS access log)
- Customer service touchpoints (calls / chats / complaints tagged from file 02)
- Recent rate change (already)
- Recent competitor rate drops nearby (cross from file 03)
- Move-out notice received (PMS field)

**Database additions:**
```prisma
model tenant_signal_events {
  id              String   @id @default(uuid())
  tenant_id       String
  signal_type     String   // "gate_access" | "complaint" | "rate_inquiry" | "moveout_notice" | "autopay_off" | "late_payment"
  event_date      DateTime
  severity        Float    @default(0.5)
  metadata        Json?
  source          String   // "pms_upload" | "receptionist" | "manual"
  recorded_at     DateTime @default(now())

  tenant          active_tenants @relation(fields: [tenant_id], references: [id])

  @@index([tenant_id, event_date])
}
```

**Source integrations:**
- PMS access logs (if exported) → parse for gate_access events
- AI receptionist (file 02) → existing tenant complaint calls → emit signal event
- Chat sessions → same

**Verification:**
- [ ] Multiple PMS uploads accumulate signals for one test tenant
- [ ] Receptionist call from existing tenant emits signal event
- [ ] Move-out notice from PMS detected and flagged
- [ ] `npm run build` passes

**Out of scope:** Scoring, retention actions.

**Commit message:**
```
feat(moveout): tenant signal event capture (roadmap 11 phase 1)
```

---

### Phase 2 — Churn Risk Scoring + Retention Surface

**Goal:** Weekly compute a churn risk score per tenant. Surface top 20 highest-risk tenants per facility with recommended action.

**Scoring (V1 — heuristic):**
```
churn_score =
  0.30 * recent_late_payments_normalized +
  0.20 * has_complaint_in_last_30d +
  0.15 * autopay_off_recently +
  0.15 * (1 if tenure < 6mo else 0) +
  0.10 * competitor_undercut_amount_normalized +
  0.10 * (1 if recent_rate_increase else 0)
clamp 0..1
```

If `moveout_notice` event in last 30d → score = 1.0 (already certain).

**Database:**
```prisma
model tenant_churn_scores {
  id              String   @id @default(uuid())
  tenant_id       String
  snapshot_date   DateTime
  churn_score     Float
  top_factor      String   // "late_payment" | "complaint" | "rate_increase" | etc.
  recommended_action String
  factors         Json
  computed_at     DateTime @default(now())

  tenant          active_tenants @relation(fields: [tenant_id], references: [id])

  @@unique([tenant_id, snapshot_date])
}

model retention_actions {
  id              String   @id @default(uuid())
  tenant_id       String
  action_type     String   // "call" | "rate_freeze_offer" | "manager_visit" | "issue_resolution"
  initiated_at    DateTime @default(now())
  initiated_by    String?
  outcome         String?  // "saved" | "moved_out" | "no_change" | "in_progress"
  resolved_at     DateTime?
  notes           String?

  tenant          active_tenants @relation(fields: [tenant_id], references: [id])
}
```

**Operator surface:**
- New page `/admin/retention` per facility — top 20 at-risk tenants, each with: tenure, current rate, top risk factor, recommended action, "log action" button.
- Action templates: "Schedule manager call," "Offer 90-day rate freeze," "Address specific complaint."

**Verification:**
- [ ] Every active tenant gets a score weekly
- [ ] Top-20 list surfaces those with highest score
- [ ] Recommended action ties to top factor
- [ ] Logged actions update `retention_actions` and show on tenant view

**Out of scope:** Auction workflow.

**Commit message:**
```
feat(moveout): churn risk scoring and retention surface (roadmap 11 phase 2)
```

---

### Phase 3 — Outcome Tracking + Save Rate Reporting

**Goal:** When a flagged-at-risk tenant either churns or stays, track which retention action contributed. Per-action save rate.

**Logic:**
- Tenant flagged high-risk + retention action logged + 60 days later still active → action = "saved"
- Tenant flagged + action logged + moved out within 60 days → action = "moved_out"
- Tenant flagged + no action + moved out → flag for operator (untaken save opportunity)

**Reporting:**
- Per-facility, per-month: at-risk tenants surfaced, actions taken, save rate by action type
- Estimated revenue saved = sum(monthly rate × est_remaining_tenure) for saved tenants

**Verification:**
- [ ] Test tenant retention outcome tracked end-to-end
- [ ] Save rate by action type renders for facility
- [ ] Untaken save opportunities flagged

**Out of scope:** Auction.

**Commit message:**
```
feat(moveout): retention outcome tracking and save rate reporting (roadmap 11 phase 3)
```

---

### Phase 4 — Delinquency Workflow + State-Compliant Notices

**Goal:** From first missed payment through pre-auction notice, automate the workflow per state's lien law.

**State lien law:**
- Each state has different requirements for: notice timing, format, required language, default disposition method.
- Encode top 15 states in `src/lib/auction/state-rules.ts`.

**Workflow stages:**
```
day_5_late → courtesy SMS / email
day_15_late → late fee assessment (per PMS, just log here)
day_30_late → first notice (certified mail recommended)
day_60_late → second notice + pre-lien notice (state-specific)
day_90_late → final notice + auction date setting
auction_listed → publicize per state requirement
auction_complete → record proceeds, balance owed/refunded
```

**Database:**
```prisma
model delinquency_cases {
  id              String   @id @default(uuid())
  tenant_id       String   @unique
  facility_id     String
  first_missed_payment_date DateTime
  current_stage   String
  total_owed      Decimal  @db.Decimal(10, 2)
  notices_sent    Json     // [{stage, sent_at, method, tracking_number}]
  auction_scheduled_for DateTime?
  auction_listed_at DateTime?
  auction_proceeds Decimal? @db.Decimal(10, 2)
  resolution      String?  // "paid" | "auctioned" | "manager_settled"
  resolved_at     DateTime?

  tenant          active_tenants @relation(fields: [tenant_id], references: [id])
  facility        facilities @relation(fields: [facility_id], references: [id])
}
```

**Notice generation:**
- Reuses notice template engine from file 08 Phase 5.
- Lob.com for physical mail (required for legal sufficiency in most states).

**Verification:**
- [ ] Delinquent tenant from PMS upload opens a case
- [ ] Stage transitions trigger correct notices on schedule
- [ ] State-specific language present
- [ ] Paid case closes correctly

**Out of scope:** Auction listing optimization.

**Commit message:**
```
feat(auction): delinquency workflow with state-compliant notices (roadmap 11 phase 4)
```

---

### Phase 5 — Auction Listing Optimization + Proceeds Tracking

**Goal:** When a unit goes to auction, optimize listing for max proceeds. Track per-auction recovery.

**Optimization:**
- Photo intake: operator uploads 5+ photos of unit contents. Anthropic vision model classifies contents and suggests listing category ("electronics," "furniture," "tools," "general").
- Title generation: LLM-generated listing title with content highlights.
- Multi-site posting: StorageTreasures, Lockerfox, Storage Battles. Manual post for now (auto-API integration deferred).
- Timing recommendation: best day-of-week / time-of-day per platform based on aggregated historical data.

**Tracking:**
```prisma
model auction_listings {
  id              String   @id @default(uuid())
  delinquency_case_id String @unique
  platform        String   // "storagetreasures" | "lockerfox" | "storagebattles" | "in_person"
  listed_at       DateTime
  listing_url     String?
  reserve_price   Decimal? @db.Decimal(10, 2)
  winning_bid     Decimal? @db.Decimal(10, 2)
  buyer_paid_at   DateTime?
  proceeds_to_owner Decimal? @db.Decimal(10, 2)
  fees            Decimal? @db.Decimal(10, 2)
  notes           String?

  delinquency_case delinquency_cases @relation(fields: [delinquency_case_id], references: [id])
}
```

**Reporting:**
- Average proceeds per auction by platform
- Total delinquency loss vs auction recovery vs amount owed
- Calibration: did our content classification + timing recommendation improve proceeds vs baseline?

**Verification:**
- [ ] Photo upload → content classification works
- [ ] Listing copy generated
- [ ] Proceeds recorded, fees deducted, net to owner reported
- [ ] Multi-facility owner sees portfolio-level auction performance

**Out of scope:** Auto-posting to platforms (their APIs are limited / paid; manual post acceptable V1).

**Commit message:**
```
feat(auction): listing optimization and proceeds tracking (roadmap 11 phase 5)
```

---

## Open Questions

- **State lien law completeness.** Top 15 states by facility count covers ~80% of US, but the other 35 need handling eventually. Phase 4 launches with 15 — others manual.
- **PMS access log availability.** Not all PMS exports include gate access logs. Without them, "gate access frequency" signal is unusable. Per-PMS support varies.
- **Auction platform partnerships.** StorageTreasures owns the market. Negotiating a partnership / API access could be a real lever.
- **Content classification accuracy.** Vision model on auction unit photos — how reliable for unit value estimation? Manual override always available.

## Anti-Goals

- Not handling lien lawsuits (out of scope; refer to attorney).
- Not bypassing state-required notice periods. Compliance is non-negotiable.
- Not automating decisions that need a human (e.g., "is this tenant lying about their hardship?").
- Not selling unit content predictions to bidders (conflict of interest).
