# 13 — Owner NOI Report

**Pillar:** Wrapper / retention
**Strategic priority:** Retention — defends the price, justifies renewal
**Build size:** 5 phases (~5 sessions)
**Depends on:** Best when fed by outputs from 07, 08, 10, 11. Phase 1 can ship with whatever data exists.
**Blocks:** None.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**Existing schema covers:**
- `client_reports` — generic per-client per-period report record with `report_type`, `period_start`, etc. NOI report can be `report_type = "noi_weekly"` or `"noi_monthly"`.
- `facility_pms_revenue_history` — per facility per (year, month): `revenue`, `monthly_tax`, `move_ins`, `move_outs`. **Already provides the revenue spine.**
- `facility_pms_snapshots` — per facility per day: `total_units`, `occupied_units`, `occupancy_pct`, `gross_potential`, `actual_revenue`, `delinquency_pct`, `move_ins_mtd`, `move_outs_mtd`. **Occupancy and revenue snapshots exist.**
- `client_campaigns` — per-client per-month spend/leads/move_ins/cpl/roas/occupancy_delta. **Marketing performance side already tracked.**
- `notifications` — alert/delivery tracking, usable for Phase 3.
- All file 07/08/11 source tables provide pricing lift / ECRI / retention / auction inputs.

**Net-new to build:**
- `noi_report_snapshots` — composed roll-up per facility per period
- `noi_portfolio_snapshots` — org-level roll-up for multi-facility owners
- (`noi_report_deliveries` — could be extended `notifications` table)

**Revised Phase 1 focus:** As written, but **read from existing `facility_pms_revenue_history` and `facility_pms_snapshots`** rather than building a parallel revenue pipeline. The `noi_report_snapshots` is purely a composition/cache table — its job is to assemble numbers from sources, not store source data.

---

## Why This Exists

Every feature in this roadmap creates dollars. But dollars don't speak for themselves — owners need a single report that says "this is what StorageAds did for you this period, in your bank account language."

The Owner NOI Report is the artifact that survives a renewal conversation. It's a 1-page (or per-facility section in a multi-page) weekly + monthly summary that ties platform activity directly to NOI movement. Without it, the platform is a line item; with it, the platform is a revenue partner.

This is the most important retention feature in the entire roadmap.

## What "Done" Looks Like

Every Friday, every facility owner gets an email + PDF:
- **Headline number:** "+$3,847 NOI this week vs prior week"
- **Source breakdown:** dynamic pricing lift, ECRI cycle realized, retention saves, auction proceeds, new move-in revenue
- **Cost breakdown:** platform fee, ad spend, less than the lift above
- **Net:** dollar value delivered this period
- **Trend chart:** 13-week rolling NOI movement
- **Action items:** any pending operator approvals (pending pricing recommendations, pending ECRI cycle, unresolved complaints)

Monthly: same with deeper analytics, channel attribution (file 10), and acquisition leads (file 12) for multi-facility owners.

## Strategic Value

- **Renewal armor.** Hard to cancel a tool that just emailed you a +$X check.
- **Sales asset.** Use a real customer's report (anonymized) in pitch decks.
- **Drives engagement.** Action items at the bottom pull owners back into the product.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Phase 1 produces a real report with whatever data exists — does not block on later features.

### Phase 1 — Report Data Model + Computation

**Goal:** Standardized weekly + monthly report dataset per facility. Composes data from existing sources (PMS, ads, calls, leads, rate snapshots).

**Database:**
```prisma
model noi_report_snapshots {
  id              String   @id @default(uuid())
  facility_id     String
  report_period   String   // "weekly" | "monthly"
  period_start    DateTime
  period_end      DateTime

  // Revenue
  total_revenue   Decimal  @db.Decimal(12, 2)
  rent_revenue    Decimal  @db.Decimal(12, 2)
  fee_revenue     Decimal  @db.Decimal(12, 2)
  auction_revenue Decimal  @db.Decimal(12, 2) @default(0)

  // Movement
  new_move_ins    Int
  move_outs       Int
  net_units       Int

  // Pricing lift (from file 07)
  dynamic_pricing_lift Decimal @db.Decimal(12, 2) @default(0)

  // ECRI (from file 08)
  ecri_realized_lift Decimal @db.Decimal(12, 2) @default(0)

  // Retention (from file 11)
  retention_saves Int @default(0)
  retention_saves_value Decimal @db.Decimal(12, 2) @default(0)

  // Ad/marketing performance (from file 10)
  marketing_spend Decimal @db.Decimal(10, 2) @default(0)
  leads_generated Int @default(0)
  attributed_move_ins Int @default(0)
  attributed_revenue Decimal @db.Decimal(12, 2) @default(0)

  // Comparisons
  vs_prior_period_revenue_delta Decimal @db.Decimal(12, 2)
  vs_year_ago_revenue_delta Decimal @db.Decimal(12, 2)

  // Computed NOI
  estimated_noi_lift Decimal @db.Decimal(12, 2)
  platform_fee   Decimal @db.Decimal(10, 2)
  net_value_delivered Decimal @db.Decimal(12, 2)

  // Action items
  pending_approvals Json  // [{type, count, link}]

  computed_at     DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@unique([facility_id, report_period, period_start])
}
```

**Cron:**
- `POST /api/cron/generate-noi-reports` — runs Friday morning weekly, first-of-month for monthly.

**Computation graceful fallbacks:**
- If file 07 not live → dynamic_pricing_lift = 0 with note "feature not yet active for this facility"
- If file 08 not live → ECRI = 0 similarly
- Report still ships with real numbers for what exists.

**Verification:**
- [ ] One facility produces both weekly + monthly snapshot
- [ ] Computations cross-check against raw DB queries
- [ ] Missing feature data → 0 with note, not crash
- [ ] `npm run build` passes

**Out of scope:** PDF rendering, email delivery, dashboard.

**Commit message:**
```
feat(noi-report): report data model and computation (roadmap 13 phase 1)
```

---

### Phase 2 — PDF Generation

**Goal:** Render a professional 1-page PDF per facility per period.

**Stack:**
- React-PDF or Puppeteer rendering a React component to PDF
- Uses brand palette per CLAUDE.md (sienna gold, Poppins/Lora, cream backgrounds, no pure black/white)

**Layout (1 page, weekly):**
```
[Logo] [Facility Name]               Week ending May 24, 2026

NET VALUE DELIVERED THIS WEEK
+$3,847
─────────────────────────────────────────────────────────────
Source                              Amount      Notes
Dynamic pricing lift                +$1,205     12 unit types updated
ECRI realized                       +$840       Q2 cycle, 23 tenants
Retention saves                     +$1,150     2 saves × est tenure
New move-ins (attributed)           +$680       3 move-ins from Meta
Auction proceeds                    +$0         No auctions
─────────────────────────────────────────────────────────────
Total revenue:        $48,290 (+$3,847 vs last week)
Less platform fee:    $349
Less ad spend:        $612
NET TO YOU:           +$2,886
─────────────────────────────────────────────────────────────

[Trend chart — 13 weeks rolling NOI movement]

ACTION ITEMS
• 4 pending rate recommendations    [Review]
• Q3 ECRI cycle ready to generate   [Generate]
• 1 unresolved complaint            [Resolve]
```

**Storage:**
- Generated PDFs stored in object storage (Vercel Blob or S3-equivalent).
- Path: `noi-reports/{facility_id}/{period}/{date}.pdf`.

**Verification:**
- [ ] Generated PDF renders on-brand
- [ ] Numbers match source snapshot exactly
- [ ] Multi-page version for multi-facility owners works
- [ ] Renders correctly across email clients (image preview / attachment)

**Out of scope:** Email delivery, interactive dashboard.

**Commit message:**
```
feat(noi-report): PDF generation (roadmap 13 phase 2)
```

---

### Phase 3 — Email Delivery

**Goal:** Friday morning email to each owner with embedded summary + PDF attachment. Brand-aligned per CLAUDE.md.

**Delivery:**
- Resend (already integrated) from `reports@storageads.com`
- HTML email with: headline number, key metrics, trend chart embedded as image, attached PDF
- Multi-facility owners get a roll-up with per-facility sections

**Template structure:**
```
Subject: Your week at {facility_name}: +$3,847 NOI

[Headline number block]
[Source table — abbreviated 3 lines]
[Trend chart image]
[Action items — 1-click links]
[Link: View full report PDF]
[Link: View interactive dashboard]
```

**Database:**
```prisma
model noi_report_deliveries {
  id              String   @id @default(uuid())
  facility_id     String
  owner_email     String
  snapshot_id     String
  sent_at         DateTime @default(now())
  resend_message_id String?
  opened          Boolean  @default(false)
  pdf_url         String
  link_clicks     Json?

  snapshot        noi_report_snapshots @relation(fields: [snapshot_id], references: [id])
}
```

**Verification:**
- [ ] Friday morning cron sends emails
- [ ] Multi-facility owner gets one email with all facilities
- [ ] PDF attaches correctly
- [ ] Opens + clicks tracked

**Out of scope:** Multi-facility rollup UI (later).

**Commit message:**
```
feat(noi-report): weekly email delivery (roadmap 13 phase 3)
```

---

### Phase 4 — Multi-Facility Rollup for Management Cos

**Goal:** Management companies (white-label) and multi-facility owners get a portfolio view: total portfolio NOI delivered, per-facility breakdown, comparison ranking.

**Rollup table:**
```prisma
model noi_portfolio_snapshots {
  id              String   @id @default(uuid())
  org_id          String
  report_period   String
  period_start    DateTime
  period_end      DateTime

  total_facilities Int
  total_revenue   Decimal  @db.Decimal(14, 2)
  total_noi_lift  Decimal  @db.Decimal(14, 2)
  total_marketing_spend Decimal @db.Decimal(12, 2)
  total_platform_fee Decimal @db.Decimal(12, 2)
  net_value_delivered Decimal @db.Decimal(14, 2)

  top_performer_facility_id String?
  bottom_performer_facility_id String?
  by_facility     Json   // per-facility summary array

  computed_at     DateTime @default(now())

  @@unique([org_id, report_period, period_start])
}
```

**PDF rendering:**
- Cover page: portfolio summary
- Per-facility sections: same as single-facility report
- Comparison table: facilities ranked by NOI delivered

**White-label:**
- Management cos can replace logo + colors via existing white-label settings (if present).

**Verification:**
- [ ] Org with 5 facilities gets one portfolio report
- [ ] Rankings sort correctly
- [ ] White-label logos render

**Out of scope:** Drill-down interactive dashboard (next phase).

**Commit message:**
```
feat(noi-report): multi-facility portfolio rollup (roadmap 13 phase 4)
```

---

### Phase 5 — Interactive Dashboard

**Goal:** Web view of the report, with drill-downs into each contributing feature (pricing → unit types updated, ECRI → tenant list, attribution → creative breakdown).

**Page:** `/admin/noi/[facility_id]` and `/admin/noi/portfolio` for orgs.

**Components:**
- Same headline numbers as PDF
- Interactive trend chart (90 days / 1 year / all time)
- Click any source row → drills into that feature's detail
- Period selector (this week / last month / Q-to-date / YTD)
- Export current view as PDF

**Verification:**
- [ ] Dashboard loads in < 3s
- [ ] All drill-downs work
- [ ] Period selector recomputes correctly
- [ ] Mobile responsive

**Out of scope:** Forecasting / projections (deferred).

**Commit message:**
```
feat(noi-report): interactive dashboard (roadmap 13 phase 5)
```

---

## Open Questions

- **NOI computation accuracy.** True NOI requires OpEx data we don't have (insurance, taxes, utilities, payroll). Phase 1 reports *NOI lift attributable to platform*, not absolute NOI. Owner needs to understand this distinction — wording matters.
- **Counterfactual baseline.** "+$3,847 vs what?" The honest answer: vs prior period. The more impressive answer: vs "no platform" counterfactual, which requires assumptions. Pick one and be consistent.
- **Owner email vs operator email.** Single owner-operator: same person. Multi-facility owner with on-site managers: different people. Report routing config needed.
- **Quarterly executive summary.** Should there be a Q-end version with strategic recommendations? Probably yes, but defer.

## Anti-Goals

- Not faking precision. "Estimated NOI lift" with assumption footnotes.
- Not bundling cross-facility data without org permission.
- Not sending the report through SendGrid or anywhere other than `*@storageads.com` (per CLAUDE.md).
- Not auto-applying any recommendations from the report — every action requires operator approval per upstream feature rules.
