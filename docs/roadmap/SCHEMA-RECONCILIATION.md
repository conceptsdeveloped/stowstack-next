# Schema Reconciliation — Roadmap vs Existing Codebase

**Date:** 2026-05-24
**Status:** Authoritative reference. Read this BEFORE starting any Phase 1 from files 01–13.

## Why This Document Exists

The roadmap files in this directory were drafted as if the codebase were greenfield. It is not. `prisma/schema.prisma` already has **80+ models** (1,815 lines), many of which directly correspond to models the roadmap proposed creating.

Building Phase 1 of each feature without reading this first would create dozens of duplicate tables and a worse codebase. **Use this as the authoritative map.**

---

## Status Legend

- ✅ **EXISTS** — model already present, usable as-is or with trivial additions
- ↗ **EXTEND** — model exists, needs new columns or related table to fully serve the feature
- 🆕 **NET-NEW** — no equivalent model exists, must be created

---

## Existing Models Indexed by Roadmap File

### File 01 — Life-Event Trigger Detection

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `life_event_signals` | 🆕 NET-NEW | — | No equivalent. Build as specced. |
| `trigger_source_config` | 🆕 NET-NEW | — | Build as specced. |
| `college_calendar` | 🆕 NET-NEW | — | Build as specced. |
| `trigger_audiences` | ↗ EXTEND | `audience_syncs` | Existing model handles Meta audience syncs (audience_type, meta_audience_id, record_count). Extend by adding a `source_trigger_id` field, or create a parallel `trigger_audiences` upstream that feeds into `audience_syncs`. |
| `trigger_attributions` | 🆕 NET-NEW | — | Build as specced — but link to existing `tenants.id` not a separate "client" table. |

**Real Phase 1 work:** Add `life_event_signals` + ingestion cron. Reuse `audience_syncs` downstream.

---

### File 02 — AI Voice + Chat Receptionist

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `call_logs` (referenced) | ✅ EXISTS | `call_logs` | Has `twilio_call_sid`, `caller_*`, `duration`, `status`, `recording_url`, `call_outcome`, `campaign_source`, `move_in_linked`. Extend with `ai_handled` boolean. |
| `call_tracking_numbers` (referenced) | ✅ EXISTS | `call_tracking_numbers` | Has `twilio_sid`, `phone_number`, `forward_to`, `landing_page_id`, `utm_link_id`. |
| `ai_call_sessions` | 🆕 NET-NEW | — | Build as specced. Link to existing `call_logs.id`. |
| `facility_tour_slots` | 🆕 NET-NEW | — | Build as specced. |
| `tour_bookings` | 🆕 NET-NEW | — | Build as specced. |
| `ai_chat_sessions` | 🆕 NET-NEW | — | Build as specced. |
| `ai_receptionist_config` | 🆕 NET-NEW | — | Or extend `facilities.metadata` JSON. Decision deferred. |

**Real Phase 1 work:** All net-new except integration with existing `call_logs`. No schema collisions.

---

### File 03 — Competitor Displacement

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `competitor_facilities` | ↗ EXTEND | `facility_market_intel` | Existing has `competitors Json` blob per facility. Either parse out into normalized `competitor_facilities` table OR extend in place. **Recommendation:** Build normalized `competitor_facilities` because daily scraping needs FK targets. |
| `competitor_rate_snapshots` | 🆕 NET-NEW | — | Build as specced. |
| `competitor_reviews` | 🆕 NET-NEW | — | Build as specced. Note: `gbp_reviews` is for OWN facility, not competitors. |
| `competitor_review_summary` | 🆕 NET-NEW | — | Build as specced. |
| `displacement_triggers` | 🆕 NET-NEW | — | Build as specced. |
| `displacement_creatives` | ↗ EXTEND | `creative_briefs`, `ad_variations` | Existing `creative_briefs` handles ad creative generation generically. Extend `creative_briefs.brief_json` with displacement-specific fields, or link via foreign key from a thin `displacement_creatives` table. |

**Real Phase 1 work:** Add normalized `competitor_facilities` + `competitor_rate_snapshots`. Cron writes to those.

---

### File 04 — Programmatic Local Landing Pages

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `landing_pages` (referenced) | ✅ EXISTS | `landing_pages` | Has `slug`, `facility_id`, `status`, `variation_ids`, `meta_title`, `meta_description`. |
| `landing_page_sections` (referenced) | ✅ EXISTS | `landing_page_sections` | Has `sort_order`, `section_type`, `config Json`. Templating pattern already established. |
| `programmatic_lp_templates` | 🆕 NET-NEW | — | Build as specced. |
| `programmatic_lp_variants` | 🆕 NET-NEW | — | Build as specced. Reuses `/lp/[slug]` route. |
| `lp_variant_visits` | 🆕 NET-NEW | — | For per-variant analytics. |

**Real Phase 1 work:** All net-new on top of existing LP infrastructure.

---

### File 05 — Reactivation + Referral Loop

**⚠️ MAJOR OVERLAP — most of this file's schema already exists.**

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `former_tenants` | ✅ EXISTS | `tenants` (where `status = "moved_out"` or `moved_out_date IS NOT NULL`) | Existing `tenants` has `move_in_date`, `moved_out_date`, `move_out_reason`, `monthly_rate`, contact info. **DO NOT create `former_tenants`.** |
| `winback_sequences` | ✅ EXISTS | `moveout_remarketing` | Existing has `sequence_status`, `current_step`, `total_steps`, `last_sent_at`, `next_send_at`, `opened_count`, `clicked_count`, `converted`, `new_tenant_id`, `offer_type`, `offer_value`. **This is exactly the win-back engine.** |
| `winback_messages` | ✅ EXISTS | `nurture_messages` | Generic enrollment-based messaging. Win-back can use `nurture_sequences` + `nurture_enrollments` + `nurture_messages` triad. |
| `winback_conversions` | ✅ EXISTS | `moveout_remarketing.converted` + `new_tenant_id` | Already tracked. Reporting query, not new table. |
| `referral_codes` | ✅ EXISTS | `referral_codes` | Same name. Has `code`, `referrer_name/email`, `credit_balance`, `total_earned`, `referral_count`, `status`. **DO NOT recreate.** |
| `referral_redemptions` | ✅ EXISTS | `referrals` | Has `referred_name/email/phone`, `status`, `credit_amount`, `credit_issued`, `signed_up_at`, `activated_at`. |
| `referral_credits_pending` | ✅ EXISTS | `referral_credits` | Has `type`, `amount`, `description`, `balance_after`. |

**Real Phase 1 work:** Most of file 05 is **wiring + UI, not schema**. Existing models need:
- Cron to enroll former tenants into `moveout_remarketing` or `nurture_enrollments`
- Trigger logic on PMS upload detecting `moved_out_date` changes
- Admin UI surfacing referral_codes and moveout_remarketing performance
- Template content for the 4-touch sequence

---

### File 06 — Reputation Funnel

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `review_request_queue` | 🆕 NET-NEW | — | Build as specced. |
| `review_request_responses` | 🆕 NET-NEW | — | Build as specced. |
| `negative_feedback` | ↗ EXTEND | `tenant_communications` | Existing logs comms per tenant. Negative feedback is one `type`. Decide: dedicated table OR `tenant_communications.type = "negative_feedback"` + `metadata` JSON. |
| `facility_reviews` | ✅ EXISTS | `gbp_reviews` | Has `external_review_id`, `author_name`, `rating`, `review_text`, `response_text`, `response_status`, **`ai_draft` field already present**, `responded_at`. **The draft-response infrastructure already exists.** |

**Real Phase 1 work:** Add `review_request_queue` and `review_request_responses` tables. Wire trigger system from PMS uploads (existing data). Existing `gbp_reviews.ai_draft` infrastructure is reusable for Phase 4.

---

### File 07 — Dynamic Street Rate Engine

**⚠️ MAJOR OVERLAP — pricing infrastructure substantially scaffolded.**

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `facility_rate_snapshots` | ✅ EXISTS | `facility_pms_rate_history` | Has `unit_type`, `effective_date`, `street_rate`, `web_rate`. Per-unit-type rate snapshot. **Use this.** |
| (per-tenant rate detail) | ✅ EXISTS | `facility_pms_tenant_rates` | Per-tenant per-unit, with `standard_rate`, `actual_rate`, `paid_rate`, `rate_variance`, `discount`, **and ECRI fields: `ecri_flag`, `ecri_suggested`, `ecri_revenue_lift`**. |
| `facility_demand_daily` | ↗ EXTEND | None directly | Derive from joins of `call_logs`, `partial_leads` (already has `created_at`, `utm_*`), `shared_audits`. New rollup table OK. |
| `rate_recommendations` | 🆕 NET-NEW | — | Build as specced. Reads from `facility_pms_rate_history` + `competitor_rate_snapshots`. |
| `facility_rate_active` | ↗ EXTEND | `facility_pms_rate_history` | Latest row per facility/unit_type IS the active rate. Add `is_current` boolean or use `effective_date` MAX query. |

**Real Phase 1 work:** Most rate snapshot schema already done. Build the **recommendation engine** + UI.

---

### File 08 — ECRI Optimizer

**⚠️ MAJOR OVERLAP — ECRI is partially scaffolded in PMS schema.**

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `active_tenants` | ✅ EXISTS | `tenants` | Has all needed fields: `monthly_rate`, `move_in_date`, `lease_end_date`, `autopay_enabled`, `has_insurance`, `balance`, `status`, `days_delinquent`, `last_payment_date`, `moved_out_date`, `move_out_reason`. **DO NOT create.** |
| `payment_events` | ✅ EXISTS | `tenant_payments` | Has `amount`, `payment_date`, `due_date`, `method`, `status`, `days_late`, `external_ref`. |
| (per-tenant rate detail with ECRI flag) | ✅ EXISTS | `facility_pms_tenant_rates` | **Already has `ecri_flag`, `ecri_suggested`, `ecri_revenue_lift` columns.** The flagging system exists. |
| `tenant_sensitivity_features` | 🆕 NET-NEW | — | Build as specced. Features computed from existing tables. |
| `ecri_cycles` | 🆕 NET-NEW | — | Build as specced. |
| `ecri_recommendations` | ↗ EXTEND | `upsell_opportunities` | Existing has `tenant_id`, `type`, `current_value`, `proposed_value`, `monthly_uplift`, `confidence`, `status`, `outreach_method`, `sent_at`, `responded_at`. **ECRI could be `upsell_opportunities.type = "ecri"`.** Decide: extend in place OR dedicated `ecri_recommendations` table referencing cycle. |
| `ecri_outcomes` | 🆕 NET-NEW | — | Build as specced. |

**Real Phase 1 work:** Most tenant schema done. Add **sensitivity feature computation** + **cycle/recommendation** layer. Consider whether `upsell_opportunities` should be the recommendation row.

---

### File 09 — Competitor Occupancy Grid

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `competitor_facilities` (from file 03) | ↗ EXTEND | `facility_market_intel.competitors Json` | See file 03 reconciliation. |
| `competitor_inventory_snapshots` | 🆕 NET-NEW | — | Build as specced. |
| `facility_market_snapshots` | ↗ EXTEND | `facility_pms_snapshots` (own facility) + new market table | Existing `facility_pms_snapshots` has `total_units`, `occupied_units`, `occupancy_pct`, `gross_potential`, `actual_revenue`, `delinquency_pct`, `move_ins_mtd`, `move_outs_mtd`. **Own-facility occupancy already tracked.** Add NEW `facility_market_snapshots` for cross-competitor aggregation. |
| `market_alerts` | 🆕 NET-NEW | — | Or extend `notifications` table (already exists). |
| `occupancy_calibration` | 🆕 NET-NEW | — | Build as specced. |

**Real Phase 1 work:** Build `competitor_inventory_snapshots`. Aggregate against existing `facility_pms_snapshots`.

---

### File 10 — Closed-Loop Attribution

**⚠️ MAJOR OVERLAP — attribution scaffold exists.**

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `leads` | ↗ EXTEND | `partial_leads` | Existing has `landing_page_id`, `facility_id`, `session_id`, `email`, `phone`, `name`, `unit_size`, all utm_* fields, `fbclid`, `gclid`, `lead_score`, `lead_status`, `monthly_revenue`, `move_in_date`, `recovery_status`, `converted`, `converted_at`, `deleted_at`. **This IS the leads table.** Add new columns as needed (visitor_id explicit, source_channel enum, call/chat references). |
| `lead_status_events` | 🆕 NET-NEW | — | Build as specced. Currently `partial_leads` only has current status. |
| `lead_match_attempts` | 🆕 NET-NEW | — | Build as specced. |
| `tenant_revenue_events` | ✅ EXISTS | `tenant_payments` | Same data shape. |
| `tenant_lifetime_metrics` | 🆕 NET-NEW | — | Build as specced (or compute on-the-fly with materialized view). |
| `creative_attribution` | ↗ EXTEND | `call_logs.campaign_source` + `partial_leads.utm_content` | Per-creative tracking partially via `utm_content`. Decide: dedicated table OR query rollup. |
| `channel_roi_snapshots` | 🆕 NET-NEW | — | Build as specced. `client_campaigns` exists but tracks monthly spend/leads/cpl/move_ins per client — close but not per-channel. Compose new table. |

**Existing attribution glue:**
- `call_logs.move_in_linked` boolean
- `call_logs.campaign_source` text
- `nurture_enrollments.lead_id` AND `tenant_id` — already links partial_leads to tenants via nurture flow!
- `client_campaigns` tracks per-client per-month spend/leads/move_ins/cost_per_move_in/roas

**Real Phase 1 work:** Add `lead_status_events` + `lead_match_attempts`. EXTEND `partial_leads` with needed fields. Wire match logic from PMS upload to existing infrastructure.

---

### File 11 — Move-Out Prediction + Auctions

**⚠️ MAJOR OVERLAP — churn + delinquency scaffolded.**

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `tenant_signal_events` | ↗ EXTEND | `tenant_communications` + `tenant_payments` | Most signals derivable. Add dedicated `tenant_signal_events` if structured query needs grow. |
| `tenant_churn_scores` | ✅ EXISTS | `churn_predictions` | Has `risk_score`, `risk_level`, `predicted_vacate`, `factors Json`, `recommended_actions Json`, `retention_campaign_id`, `retention_status`, `last_scored_at`. **DO NOT recreate.** |
| `retention_actions` | ✅ EXISTS | `retention_campaigns` | Has `name`, `trigger_risk_level`, `sequence_steps Json`, `enrolled_count`, `retained_count`. Action-level logging may need extending. |
| `delinquency_cases` | ✅ EXISTS | `delinquency_escalations` | Has `stage`, `stage_entered_at`, `next_stage_at`, `notes`, `automated`. **DO NOT recreate.** |
| `auction_listings` | 🆕 NET-NEW | — | Build as specced. |

**Real Phase 1 work:** Most schema done. Build **signal capture extension**, **scoring computation** (factor population for existing `churn_predictions.factors`), **retention-action UI**, **auction workflow**.

---

### File 12 — Acquisition Target Intelligence

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `market_facilities` | ↗ EXTEND | `facilities` (own) + `places_data` (Google data) + `facility_market_intel.competitors` | Discovered-but-not-owned facilities have no equivalent. Build dedicated `market_facilities` to avoid polluting `facilities` (which has billing, ownership, etc.). |
| `market_facility_signals` | 🆕 NET-NEW | — | Build as specced. |
| `acquisition_targets` | 🆕 NET-NEW | — | Build as specced. |
| `acquisition_owner_info` | 🆕 NET-NEW | — | Build as specced. |
| `acquisition_pipeline` | 🆕 NET-NEW | — | Build as specced. |

**Real Phase 1 work:** Mostly net-new. Discovery cron + new tables.

---

### File 13 — Owner NOI Report

| Roadmap-Specced Model | Status | Existing Model | Notes |
|------|---|---|---|
| `noi_report_snapshots` | ↗ EXTEND | `client_reports` (exists generic) + `facility_pms_revenue_history` (exists with year/month/revenue/move_ins/move_outs) | Compose. `client_reports` is per-client per-period; NOI snapshot is per-facility per-period. Can extend client_reports.report_type. |
| `noi_report_deliveries` | ↗ EXTEND | `notifications` (exists) | Or dedicated table. Decide. |
| `noi_portfolio_snapshots` | 🆕 NET-NEW | — | Build as specced. |

**Real Phase 1 work:** Define NOI computation logic. Most source data exists. New snapshot table is a roll-up of existing data.

---

## Cross-Cutting Existing Infrastructure

These existing models touch multiple roadmap features:

| Model | Used By Files | What It Provides |
|---|---|---|
| `facilities` | All | Facility master |
| `organizations` + `org_users` + `org_sessions` | All admin/partner | Multi-tenant + auth |
| `tenants` | 05, 08, 10, 11 | Tenant master with status, rates, dates, payment health |
| `tenant_payments` | 08, 10, 11 | Payment history |
| `tenant_communications` | 06, 08, 10, 11 | All channel comms log |
| `partial_leads` | 01, 04, 10 | Lead capture with UTM |
| `call_logs` + `call_tracking_numbers` | 02, 10 | Call tracking |
| `landing_pages` + `landing_page_sections` | 04 | LP rendering |
| `nurture_sequences` + `nurture_enrollments` + `nurture_messages` | 05, 06 | Multi-touch sequence engine |
| `facility_pms_*` family (8 tables) | 07, 08, 09, 11, 13 | PMS data warehouse |
| `gbp_*` family | 06 | Google Business Profile |
| `audience_syncs` + `platform_connections` | 01 | Ad platform sync |
| `creative_briefs` + `ad_variations` | 03 | Creative generation |
| `churn_predictions` + `retention_campaigns` + `delinquency_escalations` | 11 | Churn/retention/delinquency |
| `moveout_remarketing` | 05 | Win-back sequence |
| `referral_codes` + `referrals` + `referral_credits` | 05 | Referral program |
| `upsell_opportunities` | 08 | Upsell/ECRI candidates |
| `client_reports` | 13 | Report delivery |
| `notifications` | 09, 11, 13 | Alerts/delivery |

---

## Headline Conclusions

1. **Files 05, 08, 11 are 70–90% scaffolded.** Phase 1 of each should be **integration and wiring**, not new schema.
2. **Files 07, 10 are 50% scaffolded.** Major reuse of `facility_pms_*` and `partial_leads`.
3. **Files 06, 09, 13 need new tables but compose heavily from existing PMS + GBP infrastructure.**
4. **Files 01, 02, 03, 04, 12 are mostly net-new schema**, though they integrate with existing tables.

## How To Use This With the Roadmap Files

Each file 01–13 has a phased build plan. **Before executing any phase**, cross-check the model definitions in that file against the "Roadmap-Specced Model" column here. If status is ✅ EXISTS:

- **Do not create the duplicate.** Use the existing model.
- **Update the file** to reflect the actual schema before committing.

If status is ↗ EXTEND:

- **Identify what fields/relations are missing** from the existing model.
- **Add ONLY those columns**, not a parallel table.

If status is 🆕 NET-NEW:

- **Build as specced**, but use existing related-table foreign keys (`facilities.id`, `tenants.id`, etc.) and naming conventions (UUID PKs via `dbgenerated`, `_at` columns as `Timestamptz(6)`, snake_case throughout).

---

## Naming Conventions to Match

From inspection of existing schema:

- PKs: `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
- FKs: `String @db.Uuid`
- Timestamps: `DateTime @default(now()) @db.Timestamptz(6)` / `DateTime @updatedAt`
- Dates: `DateTime @db.Date`
- Decimals: `Decimal @db.Decimal(10, 2)` or `Decimal(12, 2)` for revenue
- Soft delete: `deleted_at DateTime? @db.Timestamptz(6)` + `deleted_by String?`
- Status: `String? @default("...")` — text enum
- Indexes: `@@index([col], map: "idx_table_col")`
- Relations: include `onDelete: Cascade` for tenant-of-facility, `onDelete: SetNull` for optional refs

All new tables added per the roadmap must follow these conventions.
