# 10 — Closed-Loop Attribution (Channel-True CAC + LTV)

**Pillar:** Closed Loop (the moat)
**Strategic priority:** Defensible moat
**Build size:** 5 phases (~5 sessions)
**Depends on:** Existing `call_tracking_numbers`, `call_logs`. Reads from files 01, 02, 04 outputs.
**Blocks:** Many other features want this — 13 (NOI report) especially.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**⚠️ MAJOR OVERLAP — attribution scaffold exists.**

**Existing schema covers:**
- `partial_leads` — **this IS the leads table.** Already has `landing_page_id`, `facility_id`, `session_id`, `email`, `phone`, `name`, `unit_size`, all `utm_*` fields, `fbclid`, `gclid`, `lead_score`, `lead_status`, `monthly_revenue`, `move_in_date`, `recovery_status`, `converted`, `converted_at`, `deleted_at`. Despite the name, it's a full lead model.
- `call_logs` — already has `move_in_linked` boolean and `campaign_source` text.
- `nurture_enrollments` — **already links `lead_id` to `tenant_id`.** The lead → tenant attribution chain partially exists here.
- `tenant_payments` — **this IS `tenant_revenue_events`.**
- `client_campaigns` — per-client per-month: `spend`, `leads`, `cpl`, `move_ins`, `cost_per_move_in`, `roas`, `occupancy_delta`. Per-channel breakdown not present.
- `utm_links` — with `click_count`, `last_clicked_at`.

**Net-new to build:**
- `lead_status_events` — append-only status history (partial_leads only has current status)
- `lead_match_attempts` — PMS-to-lead matching audit log
- `channel_roi_snapshots` — per-channel-per-month roll-up (client_campaigns is per-client, not per-channel)
- `tenant_lifetime_metrics` — denormalized LTV computed from `tenant_payments`

**Revised Phase 1 focus:** SKIP the originally-specced `leads` table. Instead **extend `partial_leads`** with the missing columns from the spec: `visitor_id`, `source_channel`, `source_subchannel`, `programmatic_lp_variant_id`, `call_log_id`, `chat_session_id`, `audit_submission_id`, `matched_tenant_id`. Add `lead_status_events` as a new table. The "stitch inbound to single lead" logic targets the extended `partial_leads`.

For Phase 4 attribution, query existing `nurture_enrollments` for the existing lead→tenant link rather than building a parallel `creative_attribution` linkage from scratch — extend with `utm_content` (creative id) capture.

---

## Why This Exists

Today's attribution story across the platform is fragmented:
- Call tracking shows "12 calls this month" without campaign source (`feature-audit-07-call-tracking.md` notes this is the biggest gap)
- Form submissions go into one bucket, calls into another, chat into a third
- No PMS-side match means we know "a lead came in" but not "a lead became revenue"

Without closed-loop attribution, every other feature in this roadmap is half-blind. With it, every dollar of ad spend gets traced to a tenant, a tenure, and an LTV — and the data feeds back into pricing, displacement triggers, and creative optimization.

This file is the foundation for everything downstream.

## What "Done" Looks Like

A `leads` table unifies inbound from every channel (call, chat, form, audit tool). Each lead has a stitched session ID, source attribution (channel + campaign + creative if known), and a status that progresses from `inquiry` → `tour_booked` → `tour_completed` → `moved_in` → `tenured` → `moved_out`.

When a new active tenant appears in PMS upload, fuzzy match against the leads table by name + phone + email. On match, propagate the lead's full attribution chain to the tenant. Track LTV (cumulative revenue across tenure). Report per channel, per campaign, per creative: cost, leads, move-ins, retention, lifetime revenue, payback period.

## Strategic Value

- **The moat.** 6 months of `creative → tenant → tenure → revenue` data per facility = brutal switching cost.
- **Defends the price.** "We spent $4,200 and generated $47,800 in lifetime revenue" is the only conversation that matters in renewals.
- **Pricing-loop input.** Channel ROI feeds future budget allocation, creative iteration, geo expansion.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Phase 1 is the schema — get it right; everything downstream depends on it.

### Phase 1 — Unified Lead Schema + Inbound Stitching

**Goal:** Every inbound across call, chat, form, audit lands in a single `leads` table with a stitched session/visitor ID and source metadata.

**Database:**
```prisma
model leads {
  id              String   @id @default(uuid())
  facility_id     String?
  visitor_id      String?  // cross-session UUID from localStorage
  contact_first_name String?
  contact_last_name String?
  contact_phone   String?
  contact_email   String?
  contact_phone_hash String?  // for matching without raw PII
  contact_email_hash String?
  source_channel  String   // "phone_call" | "chat" | "form" | "audit_tool" | "receptionist_callback" | "manual"
  source_subchannel String? // "google_organic" | "meta_paid" | "google_paid" | "direct" | "referral"
  utm             Json?    // {source, medium, campaign, content, term}
  landing_page_id String?
  programmatic_lp_variant_id String?
  call_log_id     String?
  chat_session_id String?
  audit_submission_id String?
  status          String   @default("inquiry") // see status list below
  status_at       DateTime @default(now())
  notes           String?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  facility        facilities? @relation(fields: [facility_id], references: [id])
  status_history  lead_status_events[]
  tenant_match    active_tenants? @relation("LeadTenantMatch", fields: [matched_tenant_id], references: [id])
  matched_tenant_id String?

  @@index([facility_id, status])
  @@index([visitor_id])
  @@index([contact_phone_hash])
  @@index([contact_email_hash])
}

model lead_status_events {
  id          String   @id @default(uuid())
  lead_id     String
  from_status String?
  to_status   String
  changed_at  DateTime @default(now())
  changed_by  String?
  notes       String?

  lead        leads @relation(fields: [lead_id], references: [id])

  @@index([lead_id, changed_at])
}
```

**Status taxonomy:**
```
inquiry → qualified → tour_booked → tour_completed → moved_in → tenured (90d+) → moved_out
                                                              ↓
                                                          churned (early)
plus terminal: not_qualified | duplicate | spam | no_response
```

**Inbound stitching:**
- New call log → upsert lead by `(facility_id, phone_hash)` within last 30d. New lead if no match.
- New chat session → same logic but by `visitor_id` first, then phone if collected.
- New form submission → same.
- Visitor ID: set in JS on first page view, stored in localStorage. Sent with every form/chat/audit submission.

**Migration:**
- Backfill existing `call_logs` into leads on first run.

**Verification:**
- [ ] Every existing call_log creates a lead
- [ ] Same caller calling twice in a week = one lead, two events
- [ ] Same visitor submitting form after calling = one lead with both events linked
- [ ] `npm run build` passes

**Out of scope:** PMS matching, status auto-progression, reporting.

**Commit message:**
```
feat(attribution): unified leads schema with inbound stitching (roadmap 10 phase 1)
```

---

### Phase 2 — Tenant Match (PMS → Lead)

**Goal:** When new active tenants land in PMS upload, fuzzy match to `leads` and propagate attribution.

**Matching logic:**
- Exact match on `phone_hash` within facility → high confidence
- Exact match on `email_hash` within facility → high confidence
- Fuzzy match on `last_name + last_4_phone` → medium confidence
- Fuzzy match on `first_name + last_name + zip` → low confidence (requires manual confirmation)
- Time window: lead must have been created within last 90 days before tenant move-in date

**Logic on match:**
- Set `leads.matched_tenant_id`, advance status to `moved_in`
- Set `active_tenants.lead_id` for back-reference
- Emit status event `tour_completed → moved_in` (skip steps if not recorded)

**Database changes:**
```prisma
// Add to active_tenants from file 08:
// lead_id String?
// lead leads? @relation(fields: [lead_id], references: [id])

model lead_match_attempts {
  id              String   @id @default(uuid())
  tenant_id       String
  lead_id         String?
  match_method    String   // "phone_exact" | "email_exact" | "fuzzy_phone" | "fuzzy_zip"
  confidence      Float
  status          String   // "matched" | "ambiguous" | "no_match"
  candidates      Json?    // top 5 candidates for review if ambiguous
  attempted_at    DateTime @default(now())
}
```

**Manual review:**
- Ambiguous matches surface in `/admin/attribution-review` for manager resolution. Approve/reject per case.

**Verification:**
- [ ] Test PMS upload with a tenant matching a recent lead → match succeeds
- [ ] Ambiguous case routes to review queue
- [ ] Confirmed match propagates attribution
- [ ] Unmatched tenants logged with reason

**Out of scope:** LTV calculation, reporting.

**Commit message:**
```
feat(attribution): tenant match from PMS to leads (roadmap 10 phase 2)
```

---

### Phase 3 — Tenure + Revenue Rollup

**Goal:** Each matched tenant has a tenure counter and revenue accumulator. LTV calculated and exposed.

**Logic:**
- On each PMS upload, for each active tenant, append a `tenant_revenue_events` row capturing rent paid for the period.
- Compute `lifetime_revenue = sum(amount)` per tenant.
- Compute `tenure_days = today - moved_in_at`.
- On move-out, lock the tenant's LTV.

**Database:**
```prisma
model tenant_revenue_events {
  id              String   @id @default(uuid())
  tenant_id       String
  event_type      String   // "rent_paid" | "fee" | "credit" | "refund"
  amount          Decimal  @db.Decimal(10, 2)
  period_start    DateTime?
  period_end      DateTime?
  payment_date    DateTime
  source          String   // "pms_upload" | "stripe" | "manual"
  recorded_at     DateTime @default(now())

  tenant          active_tenants @relation(fields: [tenant_id], references: [id])

  @@index([tenant_id, payment_date])
}

model tenant_lifetime_metrics {
  id              String   @id @default(uuid())
  tenant_id       String   @unique
  total_revenue   Decimal  @db.Decimal(12, 2) @default(0)
  payments_count  Int      @default(0)
  tenure_days     Int      @default(0)
  is_active       Boolean
  computed_at     DateTime @default(now())
}
```

**Cron:**
- `POST /api/cron/recompute-ltv` — nightly. Updates `tenant_lifetime_metrics` for active and recently-moved-out tenants.

**Verification:**
- [ ] One tenant accumulates revenue correctly across multiple uploads
- [ ] Move-out locks LTV
- [ ] Tenure counter advances daily
- [ ] Edge: tenant skips a month → revenue gap visible in events

**Out of scope:** Channel reporting (next phase).

**Commit message:**
```
feat(attribution): tenant tenure and revenue rollup (roadmap 10 phase 3)
```

---

### Phase 4 — Creative-Level Attribution Chain

**Goal:** Every lead-to-tenant match propagates back to the originating creative. Per-creative ROI table.

**Creative tracking:**
- For ads from Angelo's pipeline, capture `ad_creative_id` in the UTM `utm_content` parameter when ad launches.
- Landing page receives `utm_content`, stores on `leads.utm`.
- Programmatic LP variants (file 04) likewise.

**Database:**
```prisma
model creative_attribution {
  id              String   @id @default(uuid())
  ad_creative_id  String?  // from Angelo's ad system
  channel         String
  campaign        String?
  lead_id         String
  tenant_id       String?
  matched_at      DateTime?
  realized_revenue Decimal? @db.Decimal(12, 2)
  created_at      DateTime @default(now())

  @@index([ad_creative_id])
  @@index([campaign])
}
```

**Backfill:**
- Existing leads with UTM data backfill into `creative_attribution`.

**Verification:**
- [ ] Lead with UTM `utm_content=creative_abc123` → row in creative_attribution
- [ ] Match to tenant updates realized_revenue
- [ ] Same creative across multiple leads aggregates correctly

**Out of scope:** Cost-per-creative join (depends on ad spend data from Angelo's pipeline).

**Commit message:**
```
feat(attribution): creative-level attribution chain (roadmap 10 phase 4)
```

---

### Phase 5 — Channel ROI Reporting + LTV by Channel

**Goal:** Operator-facing report: per channel, per campaign, per creative — cost, leads, move-ins, retention, lifetime revenue, payback period.

**Data join:**
- Channel cost from ad platform integrations (Angelo's data — read from existing `ad_spend` table if present, else manual entry per channel per month)
- Lead count from `leads`
- Move-in count from matched tenants
- Revenue from `tenant_revenue_events` joined through tenants

**Database:**
```prisma
model channel_roi_snapshots {
  id              String   @id @default(uuid())
  facility_id     String
  snapshot_month  DateTime // first day of month
  channel         String
  campaign        String?
  cost            Decimal  @db.Decimal(10, 2)
  leads           Int
  qualified_leads Int
  move_ins        Int
  cumulative_revenue_to_date Decimal @db.Decimal(12, 2)
  cac             Decimal? @db.Decimal(10, 2)
  ltv_avg         Decimal? @db.Decimal(12, 2)
  payback_months  Float?
  computed_at     DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@unique([facility_id, snapshot_month, channel, campaign])
}
```

**Reports:**
- `/admin/attribution` per facility: monthly table, drill-down by channel/campaign/creative
- Owner-level rollup across facilities
- Feeds 13 (NOI report)

**Verification:**
- [ ] Monthly snapshot generates for a facility with real data
- [ ] CAC = cost / move_ins; LTV = avg revenue per matched tenant; payback = CAC / monthly rate
- [ ] Per-creative breakdown surfaces top 5 and bottom 5
- [ ] Rollup matches sum of facility-level numbers

**Out of scope:** Auto-budget reallocation (operator decision).

**Commit message:**
```
feat(attribution): channel ROI reporting and LTV by channel (roadmap 10 phase 5)
```

---

## Open Questions

- **Cookie + identifier resolution.** Apple ITP and browser privacy changes make visitor_id less reliable. How much do we lean on first-party identifiers vs. fingerprinting?
- **Cross-facility tenants.** A customer who moved between two operator facilities — count once or twice?
- **Cost data ownership.** Ad cost lives in Angelo's pipeline. Do we read from a shared table or denormalize?
- **Manual lead entry.** Some leads come from walk-ins, never touch the digital funnel. Worth a "manual lead" entry path? Probably yes.

## Anti-Goals

- Not building a clean-room CDP.
- Not selling attribution data externally.
- Not over-claiming attribution (last-touch only V1; multi-touch is a deferred upgrade).
- Not hiding match failures. Every unmatched tenant should be visible and resolvable.
