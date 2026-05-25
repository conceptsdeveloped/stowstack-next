# WHITEPAPER_REFERENCES.md — Code Citation Bibliography

Every architectural claim in `WHITEPAPER.md` is backed by code at a specific file path and line range. This bibliography is the document a developer reads to verify any claim. Citations are grouped by the paper's section and the claim each citation supports.

The analytical phase documents in `analysis/` contain even more granular citations; this file lists the references that appear in the white paper proper.

---

## Section 1: Introduction

[1] **Site self-description as "Full-funnel marketing automation for self-storage facilities. Ads, landing pages, call tracking, and move-in attribution"** — `src/app/layout.tsx:91`.

[2] **Site description: "Stop losing units to bad marketing. StorageAds builds the entire system — ads, landing pages, attribution, and conversion — so independent storage operators fill vacancies and prove every dollar."** — `src/app/layout.tsx:26`.

[3] **JSON-LD aggregate offer: four price points from $499 to $2499** — `src/app/layout.tsx:92-98`.

---

## Section 2: Background

[4] **`client_campaigns.cost_per_move_in` as a first-class schema column** — `prisma/schema.prisma:299`.

[5] **`client_campaigns.roas`** — `prisma/schema.prisma:300`.

[6] **`client_campaigns.occupancy_delta`** — `prisma/schema.prisma:301`.

---

## Section 3: Related Work

(No code citations in Section 3 — this section surveys external products and is sourced from public information about those products. See `analysis/08_comparison.md` for the comparator survey methodology and citations.)

---

## Section 4: System Architecture

[7] **Total Prisma models: 89** — `grep -c "^model " prisma/schema.prisma`.

[8] **Schema line count: 1815** — `wc -l prisma/schema.prisma`.

[9] **Schema indexing density: ~190 `@@index` declarations** — `grep -c "@@index" prisma/schema.prisma`.

[10] **18 composite `@@unique` constraints encoding business invariants** — `grep -c "@@unique" prisma/schema.prisma`.

[11] **Five models with soft-delete (deleted_at/deleted_by)**: `facilities` (`prisma/schema.prisma:600-601`), `clients` (`prisma/schema.prisma:362-363`), `organizations` (`prisma/schema.prisma:1183-1184`), `tenants` (`prisma/schema.prisma:1552-1553`), `partial_leads` (`prisma/schema.prisma:1229`).

[12] **80+ JSON columns across schema** — distributed throughout `prisma/schema.prisma`; representative examples include `ab_tests.variants` (`prisma/schema.prisma:31`), `creative_briefs.brief_json` (`prisma/schema.prisma:424`), `marketing_plans.plan_json` (`prisma/schema.prisma:1066`), `audits.audit_json` (`prisma/schema.prisma:178`), `shared_audits.audit_json` (`prisma/schema.prisma:1470`), `activity_log.meta` (`prisma/schema.prisma:52`), `publish_log.request_payload`/`response_payload` (`prisma/schema.prisma:1312-1313`).

[13] **`facilities` model with 56 relations** — `prisma/schema.prisma:511-609`.

[14] **178 route.ts files, 190 directories under `src/app/api/**`** — `find src/app/api -name route.ts | wc -l` and `find src/app/api -type d | wc -l`.

[15] **13 cron jobs in Vercel configuration** — `vercel.json:4-18`.

[16] **Cron secret authentication helper** — `src/lib/cron-auth.ts:4-17`.

[17] **Org session 30-day expiry, ss_-prefixed tokens** — `src/lib/session-auth.ts:6-15`.

[18] **External v1 API authentication with sk_live_ keys** — `src/lib/v1-auth.ts:38-92`.

[19] **Admin key authentication (legacy + per-admin sa_adm_)** — `src/lib/api-helpers.ts:86-106`.

[20] **CSRF double-submit pattern** — `src/lib/csrf.ts:1-47`.

[21] **Middleware orchestrates CSRF + Sentry + Clerk + security headers** — `src/middleware.ts:88-134`.

[22] **Sentry server-side auth-header scrubbing** — `sentry.server.config.ts:11-19`.

[23] **Sentry route + method tagging in middleware** — `src/middleware.ts:90-91`.

[24] **Vercel deployment region: iad1** — `vercel.json:3`.

[25] **API responses default to Cache-Control: no-store** — `vercel.json:21-24`.

[26] **CSP layer 1 (enforced) in next.config.ts** — `next.config.ts:14-30`.

[27] **CSP layer 2 (report-only) in middleware** — `src/middleware.ts:14-36`.

---

## Section 5: Core Mechanism — Click-to-Move-In Chain

### Step 0 (Configuration)

[28] **`utm_links.short_code` unique 16-char column** — `prisma/schema.prisma:1597`.

[29] **`campaign_spend` composite unique on (facility_id, platform, campaign_id, date)** — `prisma/schema.prisma:263`.

### Step 1 (Click)

[30] **`/api/r` UTM-redirect handler** — `src/app/api/r/route.ts:6-57`.

[31] **`utm_links` click_count and last_clicked_at update** — `src/app/api/r/route.ts:17-22`.

[32] **`landing_pages.slug` lookup** — `src/app/api/r/route.ts:33-39`.

[33] **Five UTM params propagated to redirect** — `src/app/api/r/route.ts:41-51`.

### Step 2 (Page Visit)

[34] **`/api/tracking/visit` handler** — `src/app/api/tracking/visit/route.ts:17-69`.

[35] **`activity_log` row creation for visits** — `src/app/api/tracking/visit/route.ts:48-55`.

[36] **100KB payload cap** — `src/app/api/tracking/visit/route.ts:27`.

### Step 3 (Form Interaction)

[37] **`/api/partial-lead` POST handler** — `src/app/api/partial-lead/route.ts:152-256`.

[38] **Lead score formula** — `src/app/api/partial-lead/route.ts:17-55`.

[39] **IP hashing with SHA-256 and IP_SALT** — `src/app/api/partial-lead/route.ts:8-15`.

[40] **Raw SQL upsert on session_id with merge semantics** — `src/app/api/partial-lead/route.ts:202-249`.

[41] **`partial_leads` schema with fbclid, gclid, utm_*, ip_hash columns** — `prisma/schema.prisma:1193-1243`.

### Step 4 (storEDGE Iframe)

[42] **`/api/tracking/event` handler** — `src/app/api/tracking/event/route.ts:17-68`.

[43] **`landing_pages.storedge_widget_url` column** — `prisma/schema.prisma:1035`.

### Step 5 (Lead Capture)

[44] **`/api/lead-capture` handler** — `src/app/api/lead-capture/route.ts:20-159`.

[45] **`partial_leads` upsert on conversion** — `src/app/api/lead-capture/route.ts:61-93`.

[46] **Fire-and-forget activity_log on lead capture** — `src/app/api/lead-capture/route.ts:96-106`.

### Step 6 (Server-side Conversion Forwarding)

[47] **`/api/meta-capi` handler** — `src/app/api/meta-capi/route.ts:220-279`.

[48] **Meta event-name mapping** — `src/app/api/meta-capi/route.ts:56-68`.

[49] **PII SHA-256 hashing for Meta** — `src/app/api/meta-capi/route.ts:12-54`.

[50] **POST to graph.facebook.com/v21.0/{pixelId}/events** — `src/app/api/meta-capi/route.ts:153-178`.

[51] **`/api/google-conversion` handler** — `src/app/api/google-conversion/route.ts:175-229`.

[52] **Google event-name mapping** — `src/app/api/google-conversion/route.ts:85-95`.

[53] **PII SHA-256 hashing per Google Enhanced Conversions schema (array-wrapped)** — `src/app/api/google-conversion/route.ts:32-83`.

[54] **Google Adservices conversion URL construction** — `src/app/api/google-conversion/route.ts:148-169`.

### Step 7 & 8 (storEDGE Webhook)

[55] **`/api/webhooks/storedge` handler** — `src/app/api/webhooks/storedge/route.ts:47-145`.

[56] **HMAC-SHA256 signature verification with timingSafeEqual** — `src/app/api/webhooks/storedge/route.ts:14-34`.

[57] **Idempotency check via JSONB path lookup** — `src/app/api/webhooks/storedge/route.ts:65-74`.

[58] **`activity_log` row with type 'storedge_webhook'** — `src/app/api/webhooks/storedge/route.ts:98-105`.

[59] **`activity_log` row with type 'attributed_move_in' on tracking_params** — `src/app/api/webhooks/storedge/route.ts:108-135`.

[60] **Webhook does not update `partial_leads`** — observable absence in handler scope; verified by reading handler in full.

### Step 9 (Walk-In)

[61] **`/api/walkin-attribution` handler** — `src/app/api/walkin-attribution/route.ts:10-63`.

[62] **`facilities.access_code` lookup** — `src/app/api/walkin-attribution/route.ts:32-37`.

### Step 10 (Twilio Call Tracking)

[63] **`call_tracking_numbers` schema with `twilio_sid` unique** — `prisma/schema.prisma:225-246`.

[64] **`call_logs` schema with `twilio_call_sid` unique and `move_in_linked` boolean** — `prisma/schema.prisma:198-223`.

### Step 11 (Attribution Reporting)

[65] **`/api/attribution` GET handler** — `src/app/api/attribution/route.ts:18-186`.

[66] **SQL join of campaign_spend × partial_leads on utm_campaign** — `src/app/api/attribution/route.ts:62-95`.

[67] **Cost-per-move-in computation** — `src/app/api/attribution/route.ts:90`.

[68] **ROAS computation with ×12 annualization** — `src/app/api/attribution/route.ts:91`.

### Step 12 (Recovery and Nurture)

[69] **`/api/cron/process-recovery` cron** — `src/app/api/cron/process-recovery/route.ts` (per Phase 3 agent summary).

[70] **`/api/cron/process-nurture` cron with Twilio SMS path** — `src/app/api/cron/process-nurture/route.ts` (per Phase 3 agent summary).

[71] **`/api/cron/check-campaign-alerts` cron with 24h dedup** — `src/app/api/cron/check-campaign-alerts/route.ts` (per Phase 3 agent summary).

---

## Section 6: Supporting Subsystems

### 6.1 Audit Funnel

[72] **`/api/audit-generate-diagnostic` handler with 40+ field input schema** — `src/app/api/audit-generate-diagnostic/route.ts:18-136`.

[73] **Audit prompt with industry-benchmark target values** — `src/app/api/audit-generate-diagnostic/route.ts:486-772`, with benchmarks at lines 617-625.

[74] **Anthropic Sonnet 4 call with 12000 max tokens** — `src/app/api/audit-generate-diagnostic/route.ts:783-805`.

[75] **`shared_audits` 90-day TTL creation** — `src/app/api/audit-generate-diagnostic/route.ts:984-995`.

[76] **Light-path audit handler** — `src/app/api/audit-generate/route.ts:292-477`.

[77] **Light-path occupancy bucket midpoints** — `src/app/api/audit-generate/route.ts:154-165`.

[78] **Light-path Google Places API integration** — `src/app/api/audit-generate/route.ts:55-152`.

### 6.2 PMS Pipeline

[79] **`/api/storedge-import` ECRI eligibility logic** — `src/app/api/storedge-import/route.ts:96-142`.

[80] **9 `facility_pms_*` models normalized for storEDGE report types** — `prisma/schema.prisma:641-818`.

### 6.3 Sequence Engines

[81] **`drip_sequences` model** — `prisma/schema.prisma:492-509`.

[82] **`nurture_sequences`, `nurture_enrollments`, `nurture_messages` models** — `prisma/schema.prisma:1671-1734`.

[83] **`retention_campaigns` model with risk-level trigger** — `prisma/schema.prisma:1398-1413`.

[84] **`moveout_remarketing.new_tenant_id` win-back link** — `prisma/schema.prisma:1090`.

[85] **Nurture sequence delays (60min, 24hr, 72hr, 7d, 14d)** — `src/app/api/nurture-sequences/route.ts:33-37` (per Phase 6 agent finding).

[86] **Post-move-in nurture cadence (2hr, 4d, 30d, 60d, 90d)** — `src/app/api/nurture-sequences/route.ts:53-57`.

[87] **Moveout remarketing 90-day re-engagement step** — `src/app/api/nurture-sequences/route.ts:64-66`.

---

## Section 7: Domain-Specific Design

[88] **Vocabulary density: ~16 occurrences per 1000 LOC** — derived from `grep` counts (1671 + 326 occurrences) divided by 124,291 total LOC.

[89] **Three rate columns in `facility_pms_units`: street_rate, web_rate, push_rate** — `prisma/schema.prisma:807-810`.

[90] **`facility_pms_aging` 5-bucket structure (0-30, 31-60, 61-90, 91-120, 120+)** — `prisma/schema.prisma:647-651`.

[91] **`tenants` move_in_date, move_out_reason, autopay_enabled, has_insurance, days_delinquent** — `prisma/schema.prisma:1528-1538`.

[92] **`facility_pms_tenant_rates` ECRI fields (ecri_flag, ecri_suggested, ecri_revenue_lift)** — `prisma/schema.prisma:785-787`.

[93] **ECRI conjunction rule: 180-day tenure AND <80% rate** — `src/app/api/storedge-import/route.ts:125-126`.

[94] **80% rate-recovery target** — `src/app/api/storedge-import/route.ts:128-129`.

[95] **$110/unit/month average rate default** — `src/app/api/audit-generate/route.ts:256`.

[96] **Non-uniform occupancy bucket midpoints** — `src/app/api/audit-generate-diagnostic/route.ts:234-243`.

[97] **Unit count bucket midpoints** — `src/app/api/audit-generate-diagnostic/route.ts:245-253`.

[98] **Industry benchmarks in AI prompt (78% online, 72% ECRI, 4.2 stars, 55% autopay, etc.)** — `src/app/api/audit-generate-diagnostic/route.ts:617-625`.

[99] **2.0× ROAS minimum threshold** — `src/app/api/campaign-alerts/route.ts:95` and `src/app/api/cron/check-campaign-alerts/route.ts:83`.

[100] **3-view hot-lead threshold for audit page** — `src/app/api/audit-load/route.ts:81-96`.

[101] **Lead score formula weighting** — `src/app/api/partial-lead/route.ts:17-55`.

[102] **90-day audit slug expiry** — `src/app/api/audit-generate-diagnostic/route.ts:984-985`.

[103] **Operator vocabulary instruction in AI prompt** — `src/app/api/audit-generate-diagnostic/route.ts:770`.

[104] **Scoring rule constraints in audit prompt (exactly 2 green, 1 yellow, 3 red flags)** — `src/app/api/audit-generate-diagnostic/route.ts:765`.

---

## Section 8: Evaluation and Limitations

### 8.1 What is built (citations distributed throughout)

(All capabilities cited in `analysis/07a_what_is_built.md`. Citations not duplicated here.)

### 8.2 Limitations

[105] **L1: storEDGE webhook does not update `partial_leads`** — verified by reading `src/app/api/webhooks/storedge/route.ts:47-145` in full; no `update` or `upsert` call on `partial_leads` is present in the handler.

[106] **L1: `/api/attribution` keys on lead_status = 'moved_in'** — `src/app/api/attribution/route.ts:75`.

[107] **L1: `/api/consumer-leads` PATCH is the manual transition path** — `src/app/api/consumer-leads/route.ts` (per Phase 3 lead-capture agent summary).

[108] **L2: PMS integration storEDGE-only** — `src/app/api/storedge-import/route.ts` is the only structured PMS importer.

[109] **L3: PDF accepted at upload but no extraction code** — `src/app/api/portal-upload/route.ts` MIME validation includes `application/pdf` with no follow-on extraction.

[110] **L4: Four parallel sequence engines exist as separate models and routes** — `drip_sequences` (`prisma/schema.prisma:492-509`), `nurture_sequences` (`prisma/schema.prisma:1671-1684`), `retention_campaigns` (`prisma/schema.prisma:1398-1413`), `moveout_remarketing` (`prisma/schema.prisma:1075-1101`).

[111] **L5: Twilio webhook does not verify signatures** — `src/app/api/call-webhook/route.ts` (per Phase 3 webhook agent summary; rate-limit-only protection).

[112] **L6: Outbound webhook delivery does not retry** — `webhooks.failure_count` field exists (`prisma/schema.prisma:1632`) but no retry queue in code.

[113] **L7: `delinquency_escalations` schema exists without advancement automation** — `prisma/schema.prisma:432-448`; no cron handler advances stages.

[114] **L8: No `tenants.is_military` field** — verified by inspecting `prisma/schema.prisma:1517-1559`.

[115] **L9: No cross-device identity resolution** — verified by absence of `tenants.partial_lead_id` or hashed-email merge code.

[116] **L10: Only 8 test files** — `find src -name "*.test.ts" | wc -l`.

[117] **L12: CLAUDE.md model count claim "~75 models" vs actual 89** — `prisma/schema.prisma` grep vs CLAUDE.md text.

---

## Section 9: Comparative Positioning

(External-product citations are from public information about those products and are catalogued in `analysis/08_comparison.md`. The internal capability claims that ground the comparison are cited throughout the paper.)

---

## Section 10: Discussion

(No new code citations in Section 10. Citations for the most-consequential-surprise finding L1 are at [105], [106], [107].)

---

## Section 11: Future Work

[118] **Schema position for lifetime value computation: `tenants.monthly_rate` + `tenants.moved_out_date`** — `prisma/schema.prisma:1527, 1537`.

[119] **`facility_pms_length_of_stay` schema for LTV estimation** — `prisma/schema.prisma:660-674`.

[120] **`rev_share_referrals` and `organizations` for cross-facility portfolio rollups** — `prisma/schema.prisma:1435-1448` and `prisma/schema.prisma:1141-1191`.

[121] **`facility_pms_snapshots` for time-series occupancy modeling** — `prisma/schema.prisma:727-748`.

---

## Section 12: Conclusion

(No new code citations in the conclusion. The summary numbers — 89 models, 178 routes, 16 identifiers, ~15 vocabulary terms per 1000 LOC, 13 cron jobs, 5 auth systems — are catalogued at [7], [14], in Phase 4 §4.3, in Phase 6 §6.1, at [15], and in Phase 3 §3.5 respectively.)

---

## Appendix Citations

### Appendix B (Schema Reference)

[B1] **`facilities` model** — `prisma/schema.prisma:511-609`.

[B2] **`partial_leads` model** — `prisma/schema.prisma:1193-1243`.

[B3] **`client_campaigns` model** — `prisma/schema.prisma:291-307`.

[B4] **10 `facility_pms_*` models** — `prisma/schema.prisma:641-818` (range spans the cluster).

[B5] **`tenants` model** — `prisma/schema.prisma:1517-1559`.

[B6] **`activity_log` model** — `prisma/schema.prisma:45-58`.

### Appendix C (API Surface Reference)

Routes listed in Appendix C with their handler locations:
- `/api/attribution` — `src/app/api/attribution/route.ts`
- `/api/meta-capi` — `src/app/api/meta-capi/route.ts`
- `/api/google-conversion` — `src/app/api/google-conversion/route.ts`
- `/api/walkin-attribution` — `src/app/api/walkin-attribution/route.ts`
- `/api/tracking/event` — `src/app/api/tracking/event/route.ts`
- `/api/tracking/visit` — `src/app/api/tracking/visit/route.ts`
- `/api/audit-form` — `src/app/api/audit-form/route.ts`
- `/api/audit-generate` — `src/app/api/audit-generate/route.ts`
- `/api/diagnostic-intake` — `src/app/api/diagnostic-intake/route.ts`
- `/api/audit-generate-diagnostic` — `src/app/api/audit-generate-diagnostic/route.ts`
- `/api/diagnostic-analyze` — `src/app/api/diagnostic-analyze/route.ts`
- `/api/audit-save` — `src/app/api/audit-save/route.ts`
- `/api/audit-load` — `src/app/api/audit-load/route.ts`
- `/api/audit-approve` — `src/app/api/audit-approve/route.ts`
- `/api/audit-report` — `src/app/api/audit-report/route.ts`
- `/api/shared-audits` — `src/app/api/shared-audits/route.ts`
- `/api/webhooks/storedge` — `src/app/api/webhooks/storedge/route.ts`
- `/api/webhooks/calcom` — `src/app/api/webhooks/calcom/route.ts`
- `/api/stripe-webhook` — `src/app/api/stripe-webhook/route.ts`
- `/api/call-webhook` — `src/app/api/call-webhook/route.ts`
- `/api/data-deletion/meta-callback` — `src/app/api/data-deletion/meta-callback/route.ts`

Cron handlers under `src/app/api/cron/`:
- `cleanup-sessions`, `send-client-reports`, `aggregate-page-stats`, `sync-audiences`, `weekly-digest`, `review-solicitation`, `process-gbp`, `process-drips`, `process-nurture`, `process-recovery`, `check-campaign-alerts`, `cleanup-organizations`, `data-retention`.

External v1 API under `src/app/api/v1/`:
- `api-keys`, `call-logs`, `facilities`, `facility-availability`, `facility-snapshots`, `facility-specials`, `facility-units`, `landing-pages`, `leads`, `tenants`, `usage`, `webhooks`.

---

## Phase Document Cross-References

For deeper detail on any claim in the paper, the corresponding phase document in `analysis/` contains more granular citations and the reasoning chains for inferential claims:

- `analysis/00_calibration.md` — Phase 0 (canonical-paper study, priors, drift vectors, stop conditions)
- `analysis/01_orientation.md` — Phase 1 (repository orientation, quantitative baseline)
- `analysis/02_data_model.md` — Phase 2 (89-model schema analysis)
- `analysis/03_api_surface.md` — Phase 3 (178-route surface analysis)
- `analysis/04_core_workflow.md` — Phase 4 (spine workflow trace, identifier propagation table, sequence diagram, robustness audit)
- `analysis/05_supporting.md` — Phase 5 (14 supporting subsystems)
- `analysis/06_domain_signal.md` — Phase 6 (operator-knowledge encoding)
- `analysis/07a_what_is_built.md` — Phase 7a (OBSERVED capabilities inventory)
- `analysis/07b_what_is_not.md` — Phase 7b (limitations inventory)
- `analysis/08_comparison.md` — Phase 8 (comparative positioning)
- `analysis/09_production_reality.md` — Phase 9 (production reality check)
- `analysis/10_thesis.md` — Phase 10 (thesis selection)
- `analysis/11_synthesis.md` — Phase 11 (pre-writing synthesis)
- `analysis/CONTRADICTIONS.md` — Documentation-versus-code contradiction log
- `analysis/REVISIONS.md` — Phase-document revision log

---

*All citations verified against the codebase at commit `bad7689` (`feat: add soft-delete for leads in pipeline`, 2026-04-06). Line numbers should be considered stable until subsequent commits modify the cited files.*
