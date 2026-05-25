# Phase 2 — Data Model Forensics

The Prisma schema is the most authoritative single document about the system's *intended* behavior. The 89 models in `prisma/schema.prisma:1-1815` encode every entity the application can persist. This document enumerates them, computes the relationship topology, and derives what the schema knows.

## 2.1 Methodology Note on Migration Archaeology

The original task spec asks for migration-by-migration archaeology. The repository contains exactly one migration directory — `prisma/migrations/0_init` — so no historical migration walking is possible. Either the schema was wiped and re-baselined recently, or migrations were not committed during development. In either case, the schema-as-it-stands plus the git history of `schema.prisma` itself are the only available records.

Git history on `schema.prisma` reveals 15+ commits touching the schema in the 15-day active window, with recent additions including `soft-delete pattern for key business entities` (commit `92e371d`), `unbounded log table data retention` (`fb05ff4`), and `add missing @relation and cascade deletes` (`1bde8f5`). The schema is actively under remediation; it has not been frozen.

## 2.2 Quantitative Schema Summary

| Quantity | Value |
|----------|-------|
| Total models | 89 (`grep -c "^model " prisma/schema.prisma`) |
| Total schema lines | 1,815 |
| Total `@id` fields | 89 (one per model, all UUID) |
| Total `@unique` annotations (column-level) | 26 |
| Total `@@unique` composite keys | 18 |
| Total `@@index` declarations | ~190 (estimated by counting; the file has dense indexing) |
| Models with `deleted_at` column | 5 (`facilities`, `clients`, `organizations`, `tenants`, `partial_leads`) |
| Models with `deleted_by` column | 4 (`facilities`, `clients`, `organizations`, `tenants`) |
| Models with `created_at` column | 87 of 89 (98.9%) |
| Models with `updated_at` (with `@updatedAt`) | 21 |
| JSON columns (`Json` type) | 80+ across all models |
| Decimal columns (`Decimal(_,_)` type) | 50+ |
| `Timestamptz(6)` typed columns | 200+ |
| Models with cross-tenant scoping (`facility_id` or `organization_id`) | 76 of 89 (85.4%) |

The 85.4% multi-tenancy rate is the structural signal that this is a SaaS schema and not a single-tenant app. The 80+ JSON columns indicate a deliberate schema-flexibility strategy: the team commits to relational structure where querying matters and to JSON blobs where the shape is expected to evolve or vary per-tenant.

## 2.3 Domain Clustering

The 89 models cluster into 18 distinct subsystems. Each subsystem is documented below with model list, purpose, and notable structural features. Cluster sizes are reported.

### Cluster A: Identity, Access, and Tenancy (6 models)

`organizations`, `org_users`, `sessions`, `api_keys`, `api_usage_log`, `admin_keys`

| Model | Lines | Role |
|-------|-------|------|
| `organizations` | 1141–1191 | The top-level multi-tenant boundary. Each organization is a partner or self-served operator. Holds Stripe subscription state, white-label config, revenue-share configuration, scheduled-deletion timestamp. |
| `org_users` | 1103–1139 | Users within an organization. Holds password hash, role, invite/reset/email-verify tokens, TOTP fields, last-login, granular `email_preferences` (JSON), avatar URL. |
| `sessions` | 1450–1464 | `ss_`-prefixed bearer-token sessions tied to `org_users`. Tracks IP, user-agent, `last_active_at`. |
| `api_keys` | 103–124 | `sk_live_`-prefixed external API keys, per-organization. Scoped permissions, rate limits, revocation. |
| `api_usage_log` | 126–141 | Append-only log of every v1 API call by method/path/status/duration. |
| `admin_keys` | 60–74 | Per-admin keys with `sa_adm_` prefix. Scoped, revocable. Distinct from `api_keys` (org-level) — these are Anthropic-internal admin tooling. |

The organization-as-tenant model is conventional. The presence of three distinct token classes (`ss_` org-session, `sk_live_` API key, `sa_adm_` admin key) plus the legacy shared `ADMIN_SECRET` reveals the team thinks carefully about distinct security boundaries: org users acting on their data, automated systems calling on their behalf, and platform admins acting across all data.

Notable field: `organizations.rev_share_pct Decimal(5,2)` (`prisma/schema.prisma:1157`) and `organizations.rev_share_tier String? @default("auto")` — revenue sharing with partner organizations is encoded in the tenant model itself, not in a separate `partner_organizations` table. This implies partners *are* organizations, just with different settings; not a separate identity.

### Cluster B: Facility Core (4 models)

`facilities`, `facility_context`, `facility_market_intel`, `places_data`

| Model | Lines | Role |
|-------|-------|------|
| `facilities` | 511–609 | The most-central model in the schema. A single self-storage facility. Holds intake fields (`name`, `location`, `contact_*`, `occupancy_range`, `total_units`, `biggest_issue`), Google Places fields (`place_id`, `google_address`, `google_phone`, `google_rating`, `review_count`, `google_maps_url`, `hours`), pipeline state (`status`, `pipeline_status`, `follow_up_date`), client-portal access (`access_code`), occupancy baseline (`baseline_occupancy`, `baseline_date`), org-tenancy (`organization_id`), and soft-delete (`deleted_at`, `deleted_by`). |
| `facility_context` | 611–623 | Free-form operator notes, uploads, and arbitrary context (typed by `type` field, with optional `file_url`). |
| `facility_market_intel` | 625–639 | Per-facility competitive intelligence cache: `competitors`, `demand_drivers`, `demographics`, `operator_overrides`, all as JSON. `last_scanned` timestamp tracks staleness. |
| `places_data` | 1245–1254 | Google Places API photo and review payloads cached by facility. |

A single facility row holds the union of B2B-sales-intake fields *and* B2C-client-of-the-platform fields *and* operational-baseline fields. The `pipeline_status` defaults to `"submitted"` (`prisma/schema.prisma:532`), and `status` defaults to `"intake"` (`prisma/schema.prisma:531`) — these are the B2B-sales-pipeline state machines. After conversion to a paying client, the `clients` row is created and the `access_code` is generated (see `clients` model).

The `facilities` model is structurally the schema's gravitational center — see §2.4.

### Cluster C: Property Management System Data (10 models)

`pms_reports`, `facility_pms_aging`, `facility_pms_length_of_stay`, `facility_pms_rate_history`, `facility_pms_rent_roll`, `facility_pms_revenue_history`, `facility_pms_snapshots`, `facility_pms_specials`, `facility_pms_tenant_rates`, `facility_pms_units`

This is the largest single domain cluster by model count (10) and by the density of industry-specific terminology. The schema parallels the major report types produced by self-storage PMS systems (storEDGE, SiteLink, Yardi Self-Storage, Easy Storage Solutions):

| Model | Lines | Mirrors PMS Report |
|-------|-------|-------------------|
| `pms_reports` | 1279–1299 | Upload manifest — raw file location, parsing status, `report_type`, `report_data` JSON staging area before parse |
| `facility_pms_snapshots` | 727–748 | Occupancy snapshot — `total_units`, `occupied_units`, `occupancy_pct`, `gross_potential` (rental potential at street rates), `actual_revenue`, `delinquency_pct`, `move_ins_mtd`, `move_outs_mtd` |
| `facility_pms_units` | 794–818 | Unit-mix data — `unit_type`, `size_label`, `width_ft`, `depth_ft`, `sqft`, `features`, `total_count`, `occupied_count`, computed `vacant_count`, `street_rate`, `actual_avg_rate`, `web_rate`, `push_rate`, `ecri_eligible` |
| `facility_pms_rent_roll` | 690–708 | Per-unit rent roll snapshot — `unit`, `tenant_name`, `rental_start`, `paid_thru`, `rent_rate`, `insurance_premium`, `total_due`, `days_past_due` |
| `facility_pms_aging` | 641–658 | Accounts-receivable aging — buckets `0-30`, `31-60`, `61-90`, `91-120`, `120+` |
| `facility_pms_tenant_rates` | 768–792 | Per-unit rate variance — `standard_rate`, `actual_rate`, `paid_rate`, `rate_variance`, `discount`, `discount_desc`, `days_as_tenant`, `ecri_flag`, `ecri_suggested`, `ecri_revenue_lift` |
| `facility_pms_revenue_history` | 710–725 | Monthly revenue history — `year`, `month`, `quarter`, `revenue`, `monthly_tax`, `move_ins`, `move_outs` |
| `facility_pms_rate_history` | 676–688 | Historical rate changes — `unit_type`, `effective_date`, `street_rate`, `web_rate` |
| `facility_pms_length_of_stay` | 660–674 | Per-tenant length-of-stay analysis — `move_in`, `move_out`, `days_in_unit`, `lead_source`, `lead_category` |
| `facility_pms_specials` | 750–766 | Active promotional specials — `applies_to`, `discount_type`, `discount_value`, `min_lease_months`, date range, `active` flag |

The vocabulary here is industry-native. "Street rate" is the rate posted on the facility sign; "web rate" is the rate exposed via online listings; "push rate" is the operator's target rate; "actual_avg_rate" is the realized average. "ECRI" stands for *Existing Customer Rate Increase* — the practice of raising rates on current tenants below market rate, a load-bearing revenue strategy in self-storage operations. The `ecri_flag`, `ecri_suggested`, and `ecri_revenue_lift` fields on `facility_pms_tenant_rates` (`prisma/schema.prisma:785-787`) are the schema-level encoding of an industry-specific revenue management practice.

A non-practitioner would not have built `facility_pms_units` with `street_rate`, `web_rate`, and `push_rate` as three distinct columns; they would have built one `rate` column. The schema's three-rate model is operational reality made structural.

The unit `features` array (`prisma/schema.prisma:803`) holds tags like "climate-controlled," "drive-up," "interior," "first-floor" — values verified by sampling field defaults and admin UI usage in Phase 6.

### Cluster D: Tenant Operations (7 models)

`tenants`, `tenant_payments`, `tenant_communications`, `delinquency_escalations`, `churn_predictions`, `moveout_remarketing`, `upsell_opportunities`

Where Cluster C ingests PMS *reports* (denormalized historical snapshots), Cluster D models the tenant as a first-class entity for ongoing operational workflows.

| Model | Lines | Role |
|-------|-------|------|
| `tenants` | 1517–1559 | A single rental tenant. Holds `external_id` (PMS-side ID for sync), `name`, `email`, `phone`, `unit_number`, `unit_size`, `unit_type`, `monthly_rate`, `move_in_date`, `lease_end_date`, `autopay_enabled`, `has_insurance`, `insurance_monthly`, `balance`, `status`, `days_delinquent`, `last_payment_date`, `moved_out_date`, `move_out_reason`. Soft-delete present. |
| `tenant_payments` | 1497–1515 | Per-payment record — `amount`, `payment_date`, `due_date`, `method`, `status`, `days_late`, `external_ref` (PMS reference). |
| `tenant_communications` | 1478–1495 | Outbound communications to a tenant — `channel`, `type`, `subject`, `body`, `status`, optional `related_id` (links to upstream object — campaign, escalation, etc.) |
| `delinquency_escalations` | 432–448 | Formal delinquency stage machine — `stage` (e.g., `late_notice`, `lien_warning`), `stage_entered_at`, `next_stage_at`, `automated`. |
| `churn_predictions` | 268–289 | Per-tenant churn prediction — `risk_score` (Int), `risk_level` (String), `predicted_vacate` (Date), `factors` (JSON), `recommended_actions` (JSON), and optional `retention_campaign_id` linking to enrolled outreach. |
| `moveout_remarketing` | 1075–1101 | Post-move-out re-engagement — `moved_out_date`, `move_out_reason`, `sequence_status`, `current_step` of N, send-cadence, `converted`, `converted_at`, `new_tenant_id` (if they came back!), `offer_type`, `offer_value`. |
| `upsell_opportunities` | 1561–1585 | Identified opportunities to upgrade a tenant — `type`, `current_value`, `proposed_value`, `monthly_uplift`, `confidence`, `outreach_method`, `sent_at`, `responded_at`. |

The state machines here are dense. `delinquency_escalations.stage` plus `stage_entered_at` plus `next_stage_at` is a textbook delinquency-progression machine (e.g., day 5 → reminder, day 10 → late notice, day 30 → pre-lien, day 45 → lien notice — each is a stage transition with an automated next-step time). Self-storage facilities run these manually using PMS-built workflows or using paper-based processes; the schema implies the platform aspires to take over those workflows automatically.

`moveout_remarketing.new_tenant_id` is a notable structural choice: when a former tenant signs a new lease, the back-link from new tenant to the originating moveout campaign is preserved. This enables the rare-but-real "we won them back" attribution.

### Cluster E: Lead Capture and B2B Sales Pipeline (4 models)

`partial_leads`, `lead_notes`, `audits`, `audit_report_cache`

| Model | Lines | Role |
|-------|-------|------|
| `partial_leads` | 1193–1243 | The deepest tracking schema in the codebase. Captures a visitor's identity progression: `session_id`, optional `email`/`phone`/`name`/`unit_size`, plus a behavioral side: `fields_completed`, `total_fields`, `scroll_depth`, `time_on_page`, `exit_intent`. Plus the full UTM and click ID set: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `referrer`, `user_agent`, `ip_hash`, `fbclid`, `gclid`. Plus the recovery state machine: `recovery_status`, `recovery_sent_count`, `next_recovery_at`. Plus the conversion fields: `converted`, `converted_at`, `lead_score`. Plus optional projected `monthly_revenue` and `move_in_date`. Plus `lead_status` field with `status_updated_at`. Plus `lead_notes` free-text. Plus soft-delete. |
| `lead_notes` | 1050–1058 | Admin notes attached to a facility (B2B sales notes — the facility *is* the lead in B2B). |
| `audits` | 175–185 | Internal facility audit record — `audit_json` (full diagnostic), `overall_score`, `grade`. |
| `audit_report_cache` | 156–162 | Cached audit report by facility — `report_json`. One per facility (`@unique`). |

The `partial_leads` table is the schema-level center of gravity for the attribution thesis. It captures both click identifiers (`fbclid`, `gclid`) and the behavioral state of an incomplete form, with the explicit assumption that *most leads do not complete the form on first contact and must be recovered*. The `recovery_status` state machine and the `next_recovery_at` field drive the `process-recovery` cron job (see §2.5).

`partial_leads.ip_hash` rather than `ip_address` is a privacy choice: the IP is salted (`IP_SALT` env var, `.env.example:95`) and hashed before storage. This is a deliberate privacy posture that exceeds CLAUDE.md's silence on the topic.

### Cluster F: Audit Funnel (Public) (1 model)

`shared_audits`

| Model | Lines | Role |
|-------|-------|------|
| `shared_audits` | 1466–1476 | Public-facing audit-result records, keyed by `slug` (used in `/audit/[slug]`). `audit_json` is the full diagnostic. `views` count. `expires_at` (audits expire). |

The single-model cluster reveals a deliberate separation: internal audits (`audits` in Cluster E) are the source-of-truth, *shared* audits are the public derivatives with separate slugs and expiry. The slugs (`@db.VarChar(60)`) are long enough to be hard-to-guess, indicating the URL is the access credential.

### Cluster G: Web Scraping Cache (1 model)

`website_scrape_cache`

| Model | Lines | Role |
|-------|-------|------|
| `website_scrape_cache` | 164–173 | Cached output of `src/lib/scrape-website.ts`, keyed by URL (`@unique`). Lives indefinitely but presumably refreshed on demand. |

The presence of a scrape cache reveals that website analysis is part of the audit pipeline — the facility's existing website is scraped, analyzed, and reported on. The cache prevents re-scraping the same URL on every audit re-generation.

### Cluster H: B2C Client (Paid) (4 models)

`clients`, `client_onboarding`, `client_reports`, `client_campaigns`

| Model | Lines | Role |
|-------|-------|------|
| `clients` | 344–368 | Paid client record. Created when a `facilities` row's `pipeline_status` transitions to `client_signed`. Holds `email`, `name`, `facility_name`, `location`, `occupancy_range`, `total_units`, `access_code` (the bearer credential for the client portal — 16 characters, unique). `monthly_goal` (integer — target move-ins per month). `signed_at`. Soft-delete. |
| `client_onboarding` | 309–320 | Onboarding state per client — `steps` (JSON checklist), `completed_at`. Indexed by `access_code`. |
| `client_reports` | 322–342 | Generated client reports — `report_type` (default `"monthly"`), `period_start`/`period_end`, `report_html`, `report_data` (JSON), `sent_at`, `opened_at`. Unique on `(client_id, report_type, period_start)`. |
| `client_campaigns` | 291–307 | Per-month campaign rollup per client — `month` (string YYYY-MM), `spend`, `leads`, `cpl`, `move_ins`, `cost_per_move_in`, `roas`, `occupancy_delta`. Unique on `(client_id, month)`. |

`client_campaigns.cost_per_move_in` is the schema-level encoding of the metric the product is built to optimize. The decision to make it a first-class column rather than computing it from joins indicates the team intends this metric to be the report's lead figure and to support fast historical queries. `roas` (return on ad spend) and `occupancy_delta` (the difference between the period's ending occupancy and the baseline) sit alongside it.

### Cluster I: Activity, Audit, and Notification Logs (3 models)

`activity_log`, `audit_log`, `notifications`

| Model | Lines | Role |
|-------|-------|------|
| `activity_log` | 45–58 | Per-facility event stream — `type`, `lead_name`, `facility_name`, `detail`, `meta` (JSON). Indexed by `created_at DESC` and `facility_id`. |
| `audit_log` | 1787–1804 | Org-scoped formal audit trail — `action`, `resource_type`, `resource_id`, `metadata`, `ip_address`, `user_agent`. Indexed by org and user. |
| `notifications` | 1770–1785 | In-app per-user or per-org notification — `type`, `title`, `body`, `link`, `read_at`. |

`activity_log` and `audit_log` are conceptually distinct: the former is operational ("a lead came in, a campaign was paused, an audit was generated"), the latter is compliance ("user X took action Y on resource Z at time T from IP I"). The split is correct for a SaaS that may be asked for compliance reports.

### Cluster J: Ad Campaigns and Creative (8 models)

`ad_variations`, `creative_briefs`, `marketing_plans`, `campaign_spend`, `ab_tests`, `ab_test_events`, `assets`, `style_references`

| Model | Lines | Role |
|-------|-------|------|
| `creative_briefs` | 418–430 | High-level brief generated for a facility — `brief_json`, `platform_recommendation` (array), `version`. |
| `ad_variations` | 76–101 | Generated ad variation tied to a brief — `platform`, `format`, `angle`, `content_json`, `asset_urls`, `compliance_status`, `compliance_flags`, `funnel_config`, `funnel_metrics`. |
| `marketing_plans` | 1060–1073 | High-level monthly plan — `plan_json`, `spend_recommendation`, `assigned_playbooks`, `generated_from` (JSON — input lineage). |
| `campaign_spend` | 248–266 | Per-day per-platform spend record — `date`, `platform`, `campaign_id`, `campaign_name`, `utm_campaign`, `spend`, `impressions`, `clicks`. Unique on `(facility_id, platform, campaign_id, date)`. |
| `ab_tests` | 25–43 | A facility-level A/B test — `name`, `variants` (JSON), `metrics` (JSON), `landing_page_ids`, `start_date`/`end_date`, `winner_variant_id`. |
| `ab_test_events` | 11–23 | Per-event A/B test data point — `variant_id`, `visitor_id`, `event_name`, `metadata`. Composite index on `(test_id, variant_id, visitor_id, event_name)` for deduplication. |
| `assets` | 143–154 | Generic asset record — `type`, `source`, `url`, `metadata`. |
| `style_references` | 1755–1768 | Image style reference for ad creative — `image_url`, `title`, `tags`, `analysis` (JSON — AI-extracted style descriptors), `active`. |

The pipeline implied: marketing plan → creative brief → ad variations → publish via platform connection → record outcomes in campaign spend → A/B test the variants → identify winner.

`ad_variations.compliance_status` and `compliance_flags` reveal a post-generation compliance check (matches commit `97837e0` — *"Add post-generation compliance validator for platform ad policies"*). The schema treats compliance as a property of an ad variation rather than as a separate model — a design choice that keeps the variation row self-contained.

### Cluster K: Publishing, Social, and Platform Connections (3 models)

`platform_connections`, `publish_log`, `social_posts`

| Model | Lines | Role |
|-------|-------|------|
| `platform_connections` | 1256–1277 | OAuth connection to ad platforms — `platform`, `status`, `access_token`, `refresh_token`, `token_expires_at`, `account_id`, `page_id`, `metadata`. Unique on `(facility_id, platform)`. |
| `publish_log` | 1301–1320 | Record of every publish attempt — `platform`, `status`, `external_id`, `external_url`, `error_message`, `request_payload`, `response_payload`. Connects to the `variation_id` and `connection_id`. |
| `social_posts` | 1643–1669 | Organic social post — `platform`, `post_type`, `content`, `hashtags`, `media_urls`, `cta_url`, `status`, `scheduled_at`, `published_at`, `external_post_id`, `external_url`, `error_message`, `engagement` (JSON), `ai_generated`, `batch_id`, `suggested_image`. |

The token storage in `platform_connections` is *unencrypted* (`access_token String?`, no encryption indicator in the schema). This is a likely security gap to log — but the encryption may be applied at the database level or at retrieval time in the code. To be verified in Phase 3.

### Cluster L: Audiences (1 model)

`audience_syncs`

| Model | Lines | Role |
|-------|-------|------|
| `audience_syncs` | 1736–1753 | Meta custom-audience sync record — `audience_type`, `audience_name`, `meta_audience_id`, `source_type`, `record_count`, `last_synced_at`. |

Singleton cluster. The `sync-audiences` cron job (Sunday 1am) drives this. The presence of `meta_audience_id` reveals the system pushes audiences to Meta — likely for retargeting and lookalike modeling.

### Cluster M: Landing Pages and Tracking (5 models)

`landing_pages`, `landing_page_sections`, `utm_links`, `call_tracking_numbers`, `call_logs`

| Model | Lines | Role |
|-------|-------|------|
| `landing_pages` | 1024–1048 | A facility-scoped landing page — `slug` (unique), `title`, `status`, `variation_ids` (array of ad-variation UUIDs the page serves), `meta_title`, `meta_description`, `og_image_url`, `theme` (JSON), `storedge_widget_url`, `published_at`. |
| `landing_page_sections` | 1012–1022 | Ordered sections within a landing page — `sort_order`, `section_type`, `config` (JSON). |
| `utm_links` | 1587–1607 | Short-coded UTM links for campaign tracking — `label`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `short_code` (unique, max 16 chars), `click_count`, `last_clicked_at`. |
| `call_tracking_numbers` | 225–246 | A Twilio number assigned to a facility, landing page, or UTM link — `label`, `twilio_sid` (unique), `phone_number`, `forward_to`, `status`, `call_count`, `total_duration`. |
| `call_logs` | 198–223 | A logged call — `twilio_call_sid` (unique), `caller_number`, `caller_city`, `caller_state`, `duration`, `status`, `recording_url`, `call_outcome`, `campaign_source`, `move_in_linked` (boolean!), `started_at`, `ended_at`. |

`call_logs.move_in_linked` is a structural clue: the call-tracking system aspires to mark whether a call led to a move-in. This is a per-call binary join to a separate move-in record, the manual or automated process for setting which would be deeply industry-specific.

`landing_pages.storedge_widget_url` is the URL of the embedded storEDGE reservation widget. This is the structural site of the cross-domain attribution problem: the landing page is on storageads.com, the reservation widget is on storedge.com, and identifiers must propagate across the iframe boundary. (Architecture verified in Phase 4.)

`call_tracking_numbers.forward_to` is the destination phone number — the facility's actual office line. The Twilio number is a swap-out used for tracking.

### Cluster N: Google Business Profile (6 models)

`gbp_connections`, `gbp_insights`, `gbp_posts`, `gbp_profile_sync_log`, `gbp_questions`, `gbp_reviews`

| Model | Lines | Role |
|-------|-------|------|
| `gbp_connections` | 862–883 | OAuth connection to a facility's GBP — `google_account_id`, `location_id`, `location_name`, tokens, `sync_config` JSON with defaults `{ "auto_post": false, "sync_hours": true, "sync_photos": true, "auto_respond": false }`. |
| `gbp_insights` | 885–909 | Per-period GBP analytics — `search_views`, `maps_views`, `website_clicks`, `direction_clicks`, `phone_calls`, `photo_views`, `post_views`, `post_clicks`, `total_searches`, `direct_searches`, `discovery_searches`. |
| `gbp_posts` | 911–936 | GBP posts (the GBP "What's New" / "Offer" / "Event" posts) — `post_type`, `title`, `body`, `cta_type`, `cta_url`, `image_url`, `offer_code`, dates, `status`, `external_post_id`, `ai_generated`. |
| `gbp_profile_sync_log` | 938–950 | Audit trail of sync operations — `sync_type`, `status`, `changes` (JSON diff), `error_message`. |
| `gbp_questions` | 952–972 | GBP Q&A — `external_question_id`, `author_name`, `question_text`, `question_time`, `answer_text`, `answer_status`, `ai_draft`, `answered_at`. |
| `gbp_reviews` | 974–995 | GBP reviews — `external_review_id`, `author_name`, `rating`, `review_text`, `review_time`, `response_text`, `response_status`, `ai_draft`, `responded_at`. |

This is one of the most fully-developed integrations in the schema. The `ai_draft` columns on `gbp_questions` and `gbp_reviews` reveal a recurring product pattern: AI generates a draft response, the operator approves or edits, then it is published. The `auto_respond: false` default in `sync_config` indicates the team is conservative about full automation.

The split between `gbp_connections` (OAuth state) and `gbp_profile_sync_log` (sync history) is sensible: one is current state, the other is audit history. This is a more mature separation than is present in the `platform_connections` cluster.

### Cluster O: Drip, Nurture, and Retention Sequences (7 models)

`drip_sequences`, `drip_sequence_templates`, `nurture_sequences`, `nurture_enrollments`, `nurture_messages`, `retention_campaigns`, `portal_login_codes`

| Model | Lines | Role |
|-------|-------|------|
| `drip_sequences` | 492–509 | Per-facility drip-sequence enrollment (one active per facility, `@unique`) — `sequence_id` (named sequence, default `"post_audit"`), `current_step`, `status`, `enrolled_at`, `next_send_at`, `paused_at`, `completed_at`, `cancelled_at`, `cancel_reason`, `history` (JSON). |
| `drip_sequence_templates` | 477–490 | Per-facility-and-variation drip template — `name`, `steps` (JSON). |
| `nurture_sequences` | 1671–1684 | Per-facility sequence definition (B2C — for tenants and partial leads) — `name`, `trigger_type`, `steps` (JSON), `status`. |
| `nurture_enrollments` | 1686–1713 | A contact (lead or tenant) enrolled in a nurture sequence — `current_step`, `status`, `enrolled_at`, `next_send_at`, `completed_at`, `exit_reason`, `metadata`. The `lead_id` or `tenant_id` is optional (mutually exclusive presence). |
| `nurture_messages` | 1715–1734 | Per-send message — `step_number`, `channel`, `to_address`, `subject`, `body`, `status`, `external_id`, lifecycle timestamps. |
| `retention_campaigns` | 1398–1413 | Per-facility tenant-retention campaign definition — `name`, `trigger_risk_level`, `sequence_steps`, `enrolled_count`, `retained_count`. |
| `portal_login_codes` | 831–841 | One-time login codes for client portal email + code flow — `email`, `code` (8 char), `expires_at`, `used`. |

Three parallel sequence engines exist:
1. **`drip_sequences`** — B2B post-audit drip to facility owners ("we sent you an audit; here's why you should buy").
2. **`nurture_sequences` + `nurture_enrollments` + `nurture_messages`** — B2C consumer nurture (for prospective tenants who didn't complete a reservation, and for current tenants).
3. **`retention_campaigns` + `churn_predictions`** — Tenant-retention sequence targeting predicted churn.

Plus the `moveout_remarketing` model from Cluster D — a fourth sequence engine for ex-tenant re-engagement.

Four parallel sequence engines indicate either (a) the team iterated and didn't consolidate, or (b) the four use cases have genuinely different state-machine requirements (different triggers, audiences, exit conditions, message-cadence rules). Phase 5 will examine this.

### Cluster P: Push Notifications (1 model)

`push_subscriptions`

| Model | Lines | Role |
|-------|-------|------|
| `push_subscriptions` | 1322–1335 | Web Push subscription record — `endpoint` (unique), `p256dh`, `auth`, `user_type` (`"admin"` default), `user_id`, `user_agent`, `last_used_at`, `active`. |

Singleton cluster. The PWA infrastructure plus push subscriptions plus the service-worker registration in the root layout indicates a mobile-installable native-app-like experience is part of the product design — likely targeting facility operators who run the platform from their phone.

### Cluster Q: Webhooks (Outbound) (2 models)

`webhooks`, `webhook_deliveries`

| Model | Lines | Role |
|-------|-------|------|
| `webhooks` | 1625–1641 | Org-level outbound webhook subscription — `url`, `events` (array), `secret`, `active`, `failure_count`, `last_triggered_at`, `last_status`. |
| `webhook_deliveries` | 1609–1623 | Per-delivery record — `event`, `payload`, `status` (HTTP), `response_body`, `duration_ms`, `error`. |

The presence of outbound webhooks reveals the system functions as a webhook *source* in addition to being a webhook *destination*. Partner organizations can subscribe to events from the platform — lead-came-in, move-in-recorded, campaign-finished, etc. This is a B2B / partner-facing feature absent from CLAUDE.md.

### Cluster R: Partner Revenue Share and Referrals (5 models)

`rev_share_payouts`, `rev_share_referrals`, `referral_codes`, `referrals`, `referral_credits`

| Model | Lines | Role |
|-------|-------|------|
| `rev_share_referrals` | 1435–1448 | Per-facility revenue-share lineage — links an `organization` to a `facility` it referred, plus `first_revenue_at`, `total_earned`. Unique on `(organization_id, facility_id)`. |
| `rev_share_payouts` | 1415–1433 | Per-month payout to a partner org — `month`, `facility_count`, `gross_mrr`, `rev_share_pct`, `payout_amount`, `status`. |
| `referral_codes` | 1337–1355 | Per-facility referral code — `code` (unique short string), `referrer_name`, `referrer_email`, `credit_balance`, `total_earned`, `referral_count`, `status`. |
| `referrals` | 1373–1396 | A specific referral made — `referred_name`, `referred_email`, `referred_phone`, `facility_name`, `facility_location`, `status`, `credit_amount`, `credit_issued`, lifecycle timestamps. |
| `referral_credits` | 1357–1371 | Per-credit ledger row — `type`, `amount`, `description`, `balance_after`. |

This cluster encodes two distinct revenue-sharing mechanisms:
- **Org-level**: Partners refer facilities. `rev_share_referrals` tracks the lineage; `rev_share_payouts` distributes the monthly cut.
- **Facility-level**: Existing tenants refer new tenants. `referral_codes`, `referrals`, and `referral_credits` form a credit-ledger.

The two mechanisms operate at different levels of the customer hierarchy (B2B partner channel vs. B2C tenant-to-tenant referrals).

### Cluster S: Compliance and Data Deletion (2 models)

`fb_deletion_requests`, `data_deletion_requests`

| Model | Lines | Role |
|-------|-------|------|
| `fb_deletion_requests` | 820–829 | Facebook-mandated data-deletion request lifecycle — `confirmation_code` (unique), `fb_user_id`, `status`, `requested_at`, `completed_at`. |
| `data_deletion_requests` | 843–860 | General user-initiated data deletion — `email`, `name`, `reason`, `source`, `status`, `data_found` (JSON), `data_deleted` (JSON), `admin_notes`, `requested_at`, `acknowledged_at`, `completed_at`, `completed_by`. |

These two models indicate the team has reckoned with two distinct compliance regimes: Meta's data-deletion callback (required for any app that integrates with Facebook OAuth) and a general GDPR/CCPA-style deletion flow. The `data_found` and `data_deleted` JSON columns indicate the deletion process produces an artifact for compliance audit.

### Cluster T: Internal Developer Tooling (9 models)

`commit_comments`, `commit_enrichments`, `commit_flags`, `commit_reviews`, `deployment_tags`, `dev_handoffs`, `betapad_notes`, `ideas`, `changelog_entries`

| Model | Lines | Role |
|-------|-------|------|
| `commit_comments` | 370–378 | Per-commit comment from a dev. |
| `commit_enrichments` | 380–395 | Per-commit metadata — `subject`, `body`, `dev_note`, `dev_name`, `commit_type` (default `"improvement"`), `laymans_summary`, `technical_summary`, `committed_at`. The `laymans_summary` field is for the public changelog. |
| `commit_flags` | 397–406 | Per-commit flag — `flag_type`, `reason`, `flagged_by`. |
| `commit_reviews` | 408–416 | Per-commit per-reviewer review status — `commit_hash`, `reviewed_by`, `status`. Unique on `(commit_hash, reviewed_by)`. |
| `deployment_tags` | 450–461 | Production deployment marker — `commit_hash`, `environment`, `deployed_by`, `version`, `notes`. |
| `dev_handoffs` | 463–475 | Asynchronous handoff between developers — `from_dev`, `to_dev`, `title`, `body`, `commit_hash`, `status`. |
| `betapad_notes` | 187–196 | A scratchpad session — `session_id`, `entry_type`, `entry_data`. |
| `ideas` | 997–1010 | A backlog of feature ideas — `title`, `description`, `category`, `priority`, `status`, `votes`. |
| `changelog_entries` | 1806–1814 | Published changelog entries — `title`, `body`, `category`, `published_at`. |

The presence of this cluster in the production schema is itself an artifact. A team that ships its own internal change-tracking system as application tables (rather than as a separate side-tool) reveals (a) the team works *in* the application, not alongside it, and (b) the team values keeping its own working state in the same place as its customers' working state. The `laymans_summary` field on `commit_enrichments` is the source for the customer-facing changelog page at `/changelog`. The two-person team has effectively built itself a Mission-Control-style workspace into the product.

This cluster appears nowhere in CLAUDE.md. It is purely emergent from code reading.

## 2.4 Centrality Analysis

Counting the relations of each model gives a structural centrality score. The top-10 most-connected models:

| Rank | Model | Relations (incoming + outgoing) | Role |
|------|-------|------------------------------|------|
| 1 | `facilities` | 56 | The schema's hub — connects to every operational cluster |
| 2 | `tenants` | 8 | Subhub for tenant operations |
| 3 | `organizations` | 9 | Top-level tenant boundary |
| 4 | `partial_leads` | 4 | Top of the funnel |
| 5 | `landing_pages` | 5 | Mid-funnel surface |
| 6 | `org_users` | 5 | User-of-org pivot |
| 7 | `ad_variations` | 4 | Creative artifact |
| 8 | `referral_codes` | 3 | Referral hub |
| 9 | `platform_connections` | 3 | OAuth lineage |
| 10 | `gbp_connections` | 4 | GBP OAuth lineage |

`facilities` is overwhelmingly the most-connected model. 56 relations (most of which are `[]` arrays representing one-to-many from `facilities` to dependent rows) is more than three times the next-most-connected model. The schema is shaped like a wheel: `facilities` is the hub, and every other operational cluster hangs off it.

Two structural implications:
1. Multi-tenancy is enforced at the `facility_id` foreign key on 76 of 89 models. Tenancy isolation is therefore primarily a query-time concern.
2. Cascade-delete semantics matter. Most relations to `facilities` have `onDelete: Cascade`. Deleting a facility removes its entire history. The soft-delete flag (`deleted_at`) is therefore the safety mechanism — hard-delete is reserved for after a grace period (the `cleanup-organizations` cron is the executor).

The graph has no cycles by inspection. `facilities ← tenants → moveout_remarketing → tenants` is a self-referential loop on `tenants` (via `new_tenant_id`) but not a model-level cycle.

There are no truly orphan models — every model relates to at least one other.

## 2.5 Workflow Chains Implied by Relations

State-machine-shaped relation chains are workflow signals. The most prominent:

### Chain 1: B2B Audit Funnel
`shared_audits` (public artifact) ← derived from → `audits` → linked to → `facilities` (pipeline_status state machine: `submitted` → `qualified` → `scheduled` → `client_signed`) → spawns → `clients` (access_code generated) → enrolled in → `client_onboarding` → produces → `client_reports`.

The pipeline_status state machine is encoded as a free-form String defaulting to `"submitted"` (`prisma/schema.prisma:532`). The valid transitions are not enforced at the schema level; they must be enforced in code.

### Chain 2: B2C Lead Funnel
`utm_links` (click) → `partial_leads` (lands, captured) → state transitions: `partial` → `complete` → `qualified` → `converted` → linked to → `tenants` (move-in). The `partial_leads.converted` boolean flips when the lead completes, and `partial_leads.move_in_date` records the projected or actual move-in date.

### Chain 3: Ad Production
`creative_briefs` → `ad_variations` → `publish_log` (publish attempt) → external platform (Meta, Google, TikTok via `platform_connections`) → reports back via webhooks → `campaign_spend` (daily rollup). A/B variations split at `ad_variations` and rejoin at `ab_test_events`.

### Chain 4: Delinquency Escalation
`tenants` (`days_delinquent` accumulates) → `delinquency_escalations` (stage transitions: e.g., `notice` → `late_fee` → `pre_lien` → `lien` → `auction`) → triggers → `tenant_communications` (per-stage messages) → resolution to `tenants.balance = 0` or escalation to formal proceedings.

### Chain 5: Churn Prediction → Retention
`tenants` → `churn_predictions` (model produces `risk_score`) → if high → enrolled in → `retention_campaigns` → drives → `tenant_communications`. The `churn_predictions.retention_campaign_id` is the enrollment lineage.

### Chain 6: Move-Out → Remarketing → Win-Back
`tenants` (`moved_out_date` set) → `moveout_remarketing` (sequence enrollment) → multi-step send via `tenant_communications` → if conversion → new `tenants` row created → `moveout_remarketing.new_tenant_id` is set, capturing the win-back lineage.

### Chain 7: GBP Sync
`gbp_connections` → cron `process-gbp` → fetches → `gbp_insights`, `gbp_questions`, `gbp_reviews` → AI generates → `ai_draft` fields → operator approves → publishes → external GBP → mirrors back into `gbp_posts` and `gbp_profile_sync_log`.

### Chain 8: Drip Engine
`facilities` (`pipeline_status = submitted` triggers default `post_audit` sequence) → `drip_sequences` (enrolled, `next_send_at` set) → cron `process-drips` → fires → email via Resend → updates `current_step`, advances `next_send_at` or marks `completed_at`.

### Chain 9: Nurture Engine
`partial_leads` or `tenants` (matched to a `nurture_sequences.trigger_type`) → `nurture_enrollments` → cron `process-nurture` → renders + sends → `nurture_messages` row per send.

### Chain 10: Partial Lead Recovery
`partial_leads` (`recovery_status = pending`) → cron `process-recovery` → after `next_recovery_at` → sends → updates `recovery_sent_count` and `next_recovery_at` or marks `converted`.

The pattern across chains 8–10 is consistent: a state machine in the database, advanced by a daily cron, with per-step delays expressed as `next_*_at` timestamps. This is the team's house pattern for any deferred work.

## 2.6 Implied Capability Catalogue

### A. Attribution Capabilities

The schema encodes the architecture for the following attribution chains:

- **Click-to-Form-Fill.** `utm_links.short_code` (click capture) → `partial_leads.utm_*` and `fbclid`/`gclid` (form-side capture) → `partial_leads.converted = true` (form complete).
- **Click-to-Call.** `call_tracking_numbers.utm_link_id` (number-to-link binding) → inbound call → `call_logs.campaign_source` (attribution).
- **Click-to-Walk-In.** `call_tracking_numbers.label` or QR code → walk-in scan → `walkin/[code]` route → attribution.
- **Click-to-Reservation.** Landing page embeds storEDGE widget; the cross-domain identifier-propagation challenge is acknowledged in `landing_pages.storedge_widget_url`. Phase 4 traces this.
- **Click-to-Move-In.** `client_campaigns.cost_per_move_in` and `facility_pms_revenue_history.move_ins` (per-month rollup) are the schema's encoding of the move-in attribution target. The join from a specific click to a specific move-in is the hardest path; the existence of `call_logs.move_in_linked` suggests the team intends to make this join, but no schema-enforced linkage between `partial_leads` and a specific `tenants` row exists.

The chain breaks structurally at the click-to-move-in hop: there is no `partial_leads.tenant_id` field. The schema records both ends — clicks in `partial_leads`, move-ins in `tenants` and `facility_pms_revenue_history` — but the join is not made at the row level. Phase 4 must determine whether the chain is reconstructed at query time (e.g., joining on email or name) or whether the chain is genuinely broken at this hop.

### B. Multi-Platform Publishing Capabilities

Five platforms are first-class in the schema (`platform_connections.platform` string): Meta, Google, TikTok, plus the separate GBP integration. The `publish_log.request_payload` and `response_payload` JSON columns preserve every external-API call for debugging.

### C. AI-Assisted Content Capabilities

`ai_generated` (boolean), `ai_draft` (string), and JSON-typed `*_json` columns recur across the schema: `gbp_posts.ai_generated`, `gbp_questions.ai_draft`, `gbp_reviews.ai_draft`, `social_posts.ai_generated`, `creative_briefs.brief_json`, `ad_variations.content_json`, `marketing_plans.plan_json`, `audits.audit_json`, `shared_audits.audit_json`, `audit_report_cache.report_json`, `style_references.analysis`. The schema treats AI-generated content as a first-class category to be flagged, drafted, reviewed, then approved.

### D. Property-Management Intelligence Capabilities

The 10-model PMS cluster (Cluster C) implies:
- Occupancy snapshots over time → trend analysis
- Revenue-history with monthly granularity → seasonality detection
- Per-unit rate variance vs. street rate → revenue-leakage detection
- ECRI eligibility flagging at the unit level → revenue-management workflow
- Aging-bucket roll-up → delinquency reporting

### E. Tenant-Operations Capabilities

Cluster D (`tenants` + 6 satellites) encodes:
- Per-tenant churn risk modeling with named factors
- Per-tenant delinquency staged escalation
- Per-tenant upsell identification with confidence scores
- Per-tenant communications history across channels
- Post-move-out remarketing with win-back attribution

### F. White-Label and Partner Capabilities

The `organizations` model holds `logo_url`, `primary_color`, `accent_color`, `custom_domain`, and `white_label` boolean. The schema permits a partner organization to brand-override the platform for their facilities. The `rev_share_*` cluster (Cluster R) makes partner monetization a first-class part of the multi-tenancy.

### G. External-API Capabilities

The `api_keys` and `api_usage_log` models plus the `webhooks` and `webhook_deliveries` models define a complete external developer surface. Partners can:
- Authenticate with scoped `sk_live_` keys
- Be rate-limited
- Subscribe to event webhooks
- Audit their usage

### H. Compliance and Privacy Capabilities

The `fb_deletion_requests`, `data_deletion_requests`, and `audit_log` models, plus `partial_leads.ip_hash` (salted-hashed IP), plus the email scrubbing in Sentry's `beforeSend` (`sentry.server.config.ts:11-19`), constitute a compliance posture. The platform can answer GDPR/CCPA-style requests, supports Meta's data-deletion callback, and avoids storing raw IPs.

### I. Operational-Hygiene Capabilities

Soft-delete on five business-critical models with the `cleanup-organizations` cron job providing hard-delete after grace. Session cleanup, data retention, and unbounded-log-table trimming round out the operational maintenance. The `data-retention` cron (`fix: 21 add data retention cron for unbounded log tables`) is recent.

### J. Internal Developer Workflow Capabilities

Cluster T (9 models) implies the team uses its own product as a working surface. Commits, deploys, handoffs, and ideas live in the same database as customers' data.

## 2.7 Notable Structural Findings

### F1. `facility_id` is nullable on many "support" models

`activity_log.facility_id`, `assets.facility_id`, `audits.facility_id`, `places_data.facility_id`, `website_scrape_cache.facility_id`, `creative_briefs.facility_id`, `style_references.facility_id` are nullable. This implies these can exist without a facility — e.g., a website scrape cache could be associated with a research URL not yet attached to a facility. The `partial_leads.facility_id` is also nullable, which is structurally consistent with a lead capture happening *before* a facility is identified.

### F2. JSON column proliferation as a deliberate hedge

The 80+ JSON columns include configuration blobs (`organizations.settings`, `gbp_connections.sync_config`), variant-data blobs (`ab_tests.variants`, `ab_tests.metrics`, `nurture_sequences.steps`, `retention_campaigns.sequence_steps`, `drip_sequence_templates.steps`), AI-output blobs (`creative_briefs.brief_json`, `marketing_plans.plan_json`, `audits.audit_json`, `churn_predictions.factors`), and event-payload blobs (`publish_log.request_payload`, `publish_log.response_payload`, `webhook_deliveries.payload`, `activity_log.meta`). The team commits to relational structure where queries must be fast (date-bucketed indexes on `campaign_spend`, `tenant_payments`, etc.) and to JSON where the shape is fluid.

### F3. Soft-delete is selective

Five models have `deleted_at` / `deleted_by` (Cluster A's `organizations`, plus `facilities`, `clients`, `tenants`, and `partial_leads`). These are the five models for which restoration after deletion is a foreseeable need. Everything else hard-deletes via cascade. The selectivity is itself a design choice: the team didn't dogmatically soft-delete everything.

### F4. Composite uniqueness encodes domain invariants

The 18 `@@unique` composite constraints reveal invariants the team is willing to enforce at the DB level:
- `(api_keys.organization_id, name)` — keys must have distinct labels per org
- `(campaign_spend.facility_id, platform, campaign_id, date)` — one daily-spend row per platform-campaign-day
- `(client_campaigns.client_id, month)` — one monthly rollup per client
- `(client_reports.client_id, report_type, period_start)` — no duplicate report generation
- `(facility_pms_revenue_history.facility_id, year, month)` — one revenue row per facility-month
- `(facility_pms_snapshots.facility_id, snapshot_date)` — one snapshot per facility-day
- `(facility_pms_units.facility_id, unit_type)` — one unit-mix row per facility-type
- `(gbp_insights.facility_id, period_start, period_end)` — one insights window per facility
- `(drip_sequence_templates.facility_id, variation_id)` — one drip template per facility-variation
- `(org_users.organization_id, email)` — one user per email-per-org
- `(platform_connections.facility_id, platform)` — one connection per facility-platform
- `(rev_share_payouts.organization_id, month)` — one payout per org-month
- `(rev_share_referrals.organization_id, facility_id)` — one referral-link per org-facility
- `(commit_reviews.commit_hash, reviewed_by)` — one review per commit-reviewer

These invariants double as upsert keys for idempotent ingest paths.

### F5. Indexing density

The schema declares roughly 190 indexes across 89 models — averaging 2+ per model. Composite indexes target common query patterns:
- `partial_leads` has 9 indexes including `(facility_id, lead_status)` and `(recovery_status, next_recovery_at)` — these support the recovery cron's "find leads to re-send" query
- `notifications` has `(user_id, read_at, created_at DESC)` — supports the user's unread feed
- `nurture_enrollments` has `(status, next_send_at)` — supports the nurture cron's "what's due" query
- `tenants` has `(facility_id, external_id)` for PMS-side sync lookups

The indexing density indicates the team thinks about query patterns; this is unusual for a 15-day pre-launch project.

### F6. Cascade-delete posture

Most `@relation` declarations specify `onDelete: Cascade`. This is the simpler choice — when a facility is deleted, every dependent row is removed. The risk is data loss on accidental delete; the soft-delete pattern is the safety net. A few relations use `onDelete: SetNull` (e.g., `nurture_enrollments.lead_id`, `audit_log.organization_id`) — these are cases where the dependent row should outlive the parent.

The CLAUDE.md states that Task 01 was `KILL-ACCEPT-DATA-LOSS`; this name suggests a prior period when cascade deletes were being relied on more dangerously. The current schema reflects post-remediation state.

## 2.8 What the Schema Knows

A synthesis paragraph.

**The schema knows self-storage.** Industry-specific terminology (ECRI, street/web/push rates, rent roll, aging buckets, lien stages, move-in/move-out as primary metrics) is encoded structurally, not commentated. The 10-model PMS cluster mirrors the report types actual operators receive from storEDGE and SiteLink. The `tenants` model holds the fields a self-storage operator tracks (insurance opt-in monthly, autopay, days_delinquent) rather than the generic CRM fields (lead source, lifetime value) a generalist CRM would offer.

**The schema knows acquisition.** UTM, fbclid, gclid, ip_hash, scroll_depth, exit_intent, partial_lead recovery — the lead-capture side is engineered like a paid-acquisition product, not like a contact form. The `client_campaigns.cost_per_move_in` field, with `roas` and `occupancy_delta` alongside, declares the metrics the platform reports to its paying clients.

**The schema knows operator workflows.** Delinquency escalation is staged. Churn is predicted. Retention is campaigned. Move-out triggers remarketing with win-back attribution. GBP reviews and questions are drafted by AI and approved by humans. These are not features in a roadmap; these are tables in a schema, with state machines and join keys.

**The schema knows it has not finished.** The `nurture` engine and the `drip` engine and `moveout_remarketing` and `retention_campaigns` all exist as parallel state machines because the team has built variants for different use cases and not consolidated. Token storage in `platform_connections` is unencrypted by inspection. The migration directory has been reset. The internal-dev-tooling cluster exists in production. The schema is a work-in-progress, in the middle of a remediation pass driven by the 24-task list under `storageads-remediation-tasks/`. The remediation discipline is itself a finding.

**The schema is built like a vertical-SaaS schema, not like a generalist marketing tool.** A generalist marketing platform would have `Contact`, `Lead`, `Account`, `Campaign`, `Email`, `Webhook` and stop. This schema has `facility_pms_tenant_rates` with an ECRI column. The distance between those two design choices is the encoded operator knowledge.

The next phase (API surface) examines what is implemented against this design.
