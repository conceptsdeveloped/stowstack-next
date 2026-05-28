# Operator OS — Phase 1 PRD (Alpha on Blake's Portfolio)

**Status:** Engineering scope spec. Derivative of `docs/operator-os-vision.md`.
**Audience:** Blake (founder, marketing UX + admin reorg owner), Angelo (co-founder, ad-platform + media-gen owner), future contractors.
**Phase target:** First 60-90 days. Alpha runs exclusively on Blake's own facility portfolio. Zero external paying customers.
**Register:** Engineering / pitch hybrid. Plain language for scope; specific paths, table names, and route names for implementation precision.

---

## 1. Scope discipline

This PRD is the implementation contract for Phase 1 only. Phase 1 is the alpha that produces the measurement artifact every downstream sales conversation depends on. Out of scope until Phase 2 or later: external operator onboarding, sales-assisted Better/Best tiers, Spanish-language receptionist, full booking with PMS write-back, competitor warfare modules, white-label management-company tier, RV/boat vertical extension. Scope creep into those areas during Phase 1 is the single largest project risk; the alpha exists to produce data, not to broaden surface area.

### 1.1 What this PRD does

Inventories the substantial existing infrastructure (GBP module, social module, nurture/churn/retention infrastructure, weekly digest, PMS upload processing, AI content generation) and specifies the precise delta required to assemble those primitives into the Operator OS surface. Defines the new tables, routes, cron jobs, and operator-facing surfaces needed to ship a working alpha to Blake's facilities. Specifies the AI safety substrate and the Postiz alpha integration plan. Specifies the measurement instrumentation that produces the 90-day proof artifact.

### 1.2 What this PRD does not do

Does not duplicate or rewrite the existing `gbp_*`, `social_posts`, `nurture_*`, `churn_predictions`, or `retention_campaigns` models — those are operational and the PRD composes on top of them. Does not specify customer-facing copy (that lives in `.claude/copy-voice.md` derivatives). Does not specify the homepage, audit-tool, or sales-page changes — those are derivative artifact 3 from the vision doc and are scoped separately. Does not specify the investor / Storable corp dev one-pager — that is derivative artifact 5.

---

## 2. What already exists — composition map

Phase 1 work is mostly composition of existing primitives, plus a smaller new-build delta. The existing-asset inventory below is the load-bearing claim; it justifies the scope estimate.

### 2.1 GBP module — substantially built

- **Schema:** `gbp_connections`, `gbp_posts`, `gbp_insights`, `gbp_questions`, `gbp_reviews`, `gbp_profile_sync_log`. All facility-scoped, all UUID-keyed, all with AI-draft and external-id fields wired.
- **API routes:** `/api/auth/gbp` (OAuth), `/api/auth/gbp/callback`, `/api/gbp-sync`, `/api/gbp-posts`, `/api/gbp-reviews`, `/api/gbp-review-settings`, `/api/gbp-questions`, `/api/gbp-insights`, `/api/portal-gbp`.
- **Cron:** `/api/cron/process-gbp` (post publishing and sync), `/api/cron/review-solicitation` (review request triggers).
- **What's missing:** the Q&A seeding library, the photo refresh prompt system, the universal voice template applied to AI drafts, the auto-publish toggle on the universal default (today `sync_config.auto_post` defaults to `false` per the existing schema), and the operator-facing surface that unifies the GBP controls.

### 2.2 Social module — substantially built

- **Schema:** `social_posts` (with `external_post_id`, `external_url`, `scheduled_at`, `published_at`, `error_message`, `engagement` JSON, `batch_id`, `ai_generated` — Postiz-compatible shape), `platform_connections` (per-facility OAuth for Meta, Google, others via metadata JSON), `publish_log` (per-publish audit trail).
- **API routes:** `/api/social-posts`, `/api/publish-social`, `/api/generate-social-post`, `/api/generate-social-content`.
- **What's missing:** the Postiz integration adapter, the content trigger engine (weather, calendar, occupancy, ad-sync, evergreen), the per-facility geographic profile that feeds deep localization, and the operator-facing content-calendar surface.

### 2.3 Lifecycle module — substantially built

- **Schema:** `nurture_sequences`, `nurture_enrollments`, `nurture_messages`, `moveout_remarketing`, `churn_predictions`, `retention_campaigns`, `delinquency_escalations`, `tenant_communications`, `tenants`, `tenant_payments`, `referral_codes`, `referral_credits`, `referrals`, `upsell_opportunities`.
- **API routes:** standard CRUD plus `/api/cron/process-nurture`, `/api/cron/process-drips`, `/api/cron/score-churn-risk`, `/api/cron/score-ecri-sensitivity`, `/api/cron/update-retention-outcomes`, `/api/cron/process-recovery`.
- **What's missing in Phase 1 scope:** the three operator-facing toggles (win-back on, churn-prevention on, referral on) and the sequence templates for win-back, referral, and churn-prevention seeded into `drip_sequence_templates`. The infrastructure is there; the seeded content and operator surface are not.

### 2.4 Reporting and digest — substantially built

- **API routes:** `/api/cron/weekly-digest`, `/api/cron/send-client-reports`, `/api/cron/generate-noi-reports`, `/api/cron/aggregate-page-stats`.
- **What's missing:** the daily SMS morning digest cron, the real-time push alert wiring for high-signal events (the `notifications` and `push_subscriptions` models exist; the trigger logic does not), the cross-facility benchmark calculation (deferred to Phase 3 when N≥50 facilities), and the unified Operator OS dashboard surface.

### 2.5 Paid acquisition — substantially built (Angelo's domain)

- **Schema:** `ad_variations`, `creative_briefs`, `creative_performance`, `campaign_spend`, `client_campaigns`, `audience_syncs`.
- **Per CLAUDE.md:** ad platform integrations and video/image generation are Angelo's work; this PRD does not modify them. Phase 1 scope on the paid side is limited to the geo-fence audience definition (which can run on the existing `audience_syncs` table) and the QR signage tracking system (new, see §4.5).

### 2.6 PMS data — Phase 1 manual upload

- **Schema:** `pms_reports`, plus the full `facility_pms_*` family.
- **Cron:** `/api/cron/process-pms-uploads`.
- **What's missing in Phase 1:** nothing. Manual upload is the committed Phase 1 model per CLAUDE.md. Direct PMS API integration is Phase 2+ scope.

---

## 3. What needs to be built — new schema

Nine new tables. Each is additive, each is facility-scoped where applicable, each follows the existing UUID primary key and `@db.Timestamptz(6)` convention.

### 3.1 `voice_profiles`

The brand-voice template applied to every AI output. Phase 1 ships exactly one universal profile (`StorageAds`) with facility-scoped overrides for name, geography, inventory, and tone exceptions. The model exists to support per-facility customization in later phases without schema migration.

```
model voice_profiles {
  id             String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  facility_id    String?    @db.Uuid   // null = universal default
  name           String                 // "StorageAds Universal" or facility-specific name
  tone_descriptors Json                 // { "register": "warm-professional", "reading_level": 7, ... }
  do_use         String[]   @default([])
  do_not_use     String[]   @default([])
  template       String                 // Anthropic system-prompt template with substitution slots
  active         Boolean    @default(true)
  created_at     DateTime   @default(now()) @db.Timestamptz(6)
  updated_at     DateTime   @updatedAt @default(now()) @db.Timestamptz(6)
  facilities     facilities? @relation(fields: [facility_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([facility_id], map: "idx_voice_profiles_facility")
  @@index([active], map: "idx_voice_profiles_active")
}
```

### 3.2 `ai_safety_events`

Every AI output that triggers a safety mechanism — escalation, blocklist hit, QA sample flag, or human-review queue insertion — writes a row. This is the audit trail for the safety architecture and the data source for QA sample selection.

```
model ai_safety_events {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  facility_id     String?    @db.Uuid
  event_type      String                 // "escalation" | "blocklist_hit" | "qa_sample" | "review_queue"
  surface         String                 // "gbp_review_reply" | "inbound_message" | "social_post" | "gbp_qa" | ...
  source_id       String?    @db.Uuid    // FK to the originating record (gbp_review.id, inbound_message.id, etc.)
  ai_draft        String?
  escalation_reason String?
  blocklist_term  String?
  human_decision  String?                // "approved" | "rejected" | "edited" | "pending"
  human_decided_by String?
  human_decided_at DateTime?  @db.Timestamptz(6)
  metadata        Json?
  created_at      DateTime   @default(now()) @db.Timestamptz(6)
  facilities      facilities? @relation(fields: [facility_id], references: [id], onDelete: SetNull, onUpdate: NoAction)

  @@index([facility_id], map: "idx_ai_safety_facility")
  @@index([event_type, created_at(sort: Desc)], map: "idx_ai_safety_type")
  @@index([surface, created_at(sort: Desc)], map: "idx_ai_safety_surface")
}
```

### 3.3 `inbound_conversations`

The conversation envelope for every digital text inbound channel handled by the AI receptionist.

```
model inbound_conversations {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  facility_id     String     @db.Uuid
  channel         String                 // "sms" | "web_form" | "gbp_message" | "fb_messenger" | "ig_dm" | "website_chat"
  external_thread_id String?
  prospect_name   String?
  prospect_phone  String?
  prospect_email  String?
  prospect_meta   Json?
  status          String     @default("active")  // "active" | "escalated" | "closed_won" | "closed_lost" | "abandoned"
  escalated_at    DateTime?  @db.Timestamptz(6)
  escalation_reason String?
  closed_at       DateTime?  @db.Timestamptz(6)
  partial_lead_id String?    @db.Uuid              // joins to existing partial_leads
  first_message_at DateTime  @default(now()) @db.Timestamptz(6)
  last_message_at DateTime   @default(now()) @db.Timestamptz(6)
  message_count   Int        @default(0)
  created_at      DateTime   @default(now()) @db.Timestamptz(6)
  updated_at      DateTime   @updatedAt @default(now()) @db.Timestamptz(6)
  facilities      facilities @relation(fields: [facility_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  inbound_messages inbound_messages[]
  partial_leads   partial_leads? @relation(fields: [partial_lead_id], references: [id], onDelete: SetNull, onUpdate: NoAction)

  @@index([facility_id], map: "idx_inbound_conv_facility")
  @@index([channel, status], map: "idx_inbound_conv_channel_status")
  @@index([last_message_at(sort: Desc)], map: "idx_inbound_conv_recency")
}
```

### 3.4 `inbound_messages`

Every individual message in an inbound conversation, including the AI response messages.

```
model inbound_messages {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  conversation_id String     @db.Uuid
  direction       String                 // "inbound" | "outbound_ai" | "outbound_human"
  body            String
  external_message_id String?
  ai_draft_id     String?    @db.Uuid
  voice_profile_id String?   @db.Uuid
  sent_at         DateTime?  @db.Timestamptz(6)
  delivered_at    DateTime?  @db.Timestamptz(6)
  read_at         DateTime?  @db.Timestamptz(6)
  latency_ms      Int?                   // for outbound_ai: time from inbound received to outbound sent
  error_message   String?
  metadata        Json?
  created_at      DateTime   @default(now()) @db.Timestamptz(6)
  inbound_conversations inbound_conversations @relation(fields: [conversation_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([conversation_id, created_at], map: "idx_inbound_msg_conv")
  @@index([direction, sent_at(sort: Desc)], map: "idx_inbound_msg_direction")
}
```

### 3.5 `content_triggers`

The trigger queue for the content engine. Weather, calendar, occupancy-driven, ad-sync, and evergreen triggers each write rows here; the content generation cron consumes them and produces scheduled posts.

```
model content_triggers {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  facility_id     String     @db.Uuid
  trigger_type    String                 // "weather" | "calendar" | "occupancy" | "ad_sync" | "evergreen"
  trigger_payload Json                   // type-specific structured data
  fires_at        DateTime   @db.Timestamptz(6)
  status          String     @default("pending")  // "pending" | "generated" | "scheduled" | "skipped" | "errored"
  generated_post_id String?  @db.Uuid    // FK to social_posts or gbp_posts depending on surface
  generated_post_table String?           // "social_posts" | "gbp_posts"
  skipped_reason  String?
  created_at      DateTime   @default(now()) @db.Timestamptz(6)
  processed_at    DateTime?  @db.Timestamptz(6)
  facilities      facilities @relation(fields: [facility_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([status, fires_at], map: "idx_content_triggers_due")
  @@index([facility_id, trigger_type], map: "idx_content_triggers_facility_type")
}
```

### 3.6 `photo_refresh_prompts`

The monthly SMS prompt to the operator asking for fresh facility photos, and the resulting upload disposition.

```
model photo_refresh_prompts {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  facility_id     String     @db.Uuid
  prompt_month    DateTime   @db.Date
  prompt_sent_at  DateTime?  @db.Timestamptz(6)
  prompt_channel  String     @default("sms")
  response_received_at DateTime? @db.Timestamptz(6)
  uploaded_photo_ids String[] @default([])
  uploaded_to_gbp_at DateTime? @db.Timestamptz(6)
  status          String     @default("pending")  // "pending" | "sent" | "responded" | "uploaded" | "skipped"
  created_at      DateTime   @default(now()) @db.Timestamptz(6)
  facilities      facilities @relation(fields: [facility_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([facility_id, prompt_month])
  @@index([status, prompt_sent_at], map: "idx_photo_prompts_due")
}
```

### 3.7 `gbp_question_templates`

The seed library of storage-vertical questions and answers used to populate every new facility's GBP profile with 15-20 high-intent Q&As at onboarding.

```
model gbp_question_templates {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  category        String                 // "sizes" | "climate" | "access_hours" | "security" | "payment" | "pets_allowed" | ...
  question_text   String
  answer_template String                 // with substitution slots: {{facility_name}}, {{city}}, {{climate_avail}}
  active          Boolean    @default(true)
  priority        Int        @default(0) // higher = seeded first
  created_at      DateTime   @default(now()) @db.Timestamptz(6)
  updated_at      DateTime   @updatedAt @default(now()) @db.Timestamptz(6)

  @@index([active, priority(sort: Desc)], map: "idx_gbp_q_templates_priority")
  @@index([category], map: "idx_gbp_q_templates_category")
}
```

### 3.8 `signage_qr_codes`

Per-facility signage QR codes routed to tracked landing pages, for offline-to-online attribution capture.

```
model signage_qr_codes {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  facility_id     String     @db.Uuid
  qr_slug         String     @unique @db.VarChar(40)
  sign_location   String                 // "front_gate" | "office_window" | "highway_billboard" | ...
  destination_url String                 // the tracked LP URL with utm_*
  active          Boolean    @default(true)
  scan_count      Int        @default(0)
  last_scanned_at DateTime?  @db.Timestamptz(6)
  created_at      DateTime   @default(now()) @db.Timestamptz(6)
  updated_at      DateTime   @updatedAt @default(now()) @db.Timestamptz(6)
  facilities      facilities @relation(fields: [facility_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([facility_id], map: "idx_qr_codes_facility")
  @@index([qr_slug], map: "idx_qr_codes_slug")
}
```

### 3.9 `pilot_weekly_snapshots`

The locked weekly snapshot of every Tier 1 and Tier 2 measurement metric per facility, written by the Monday 09:00 local cron. This is the data source for the lift-vs-baseline view in the operator dashboard and for the 90-day pilot proof artifact (see `docs/operator-os-pilot-measurement-plan.md` §4.1).

```
model pilot_weekly_snapshots {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  facility_id     String     @db.Uuid
  snapshot_date   DateTime   @db.Date
  occupancy_pct   Float?
  move_ins_period Int?
  net_revenue     Decimal?   @db.Decimal(12, 2)
  cpmi            Decimal?   @db.Decimal(10, 2)
  metrics         Json                       // Tier 2 metric set, structured per the pilot plan §2.2
  baseline_delta  Json                       // computed deltas from the locked baseline
  created_at      DateTime   @default(now()) @db.Timestamptz(6)
  facilities      facilities @relation(fields: [facility_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([facility_id, snapshot_date])
  @@index([snapshot_date(sort: Desc)], map: "idx_pilot_snapshots_date")
}
```

### 3.10 Relation additions to `facilities`

Add the following one-to-many and one-to-one relation declarations to the existing `facilities` model:

- `voice_profiles voice_profiles[]`
- `ai_safety_events ai_safety_events[]`
- `inbound_conversations inbound_conversations[]`
- `content_triggers content_triggers[]`
- `photo_refresh_prompts photo_refresh_prompts[]`
- `signage_qr_codes signage_qr_codes[]`
- `pilot_weekly_snapshots pilot_weekly_snapshots[]`

No relation needed for `gbp_question_templates` (it is a global library, not facility-scoped).

### 3.11 Relation addition to `partial_leads`

Add `inbound_conversations inbound_conversations[]` to the existing `partial_leads` model, since an inbound conversation can ultimately resolve into a captured partial lead.

---

## 4. What needs to be built — new routes and cron jobs

### 4.1 AI receptionist intake

Five intake routes, one per inbound channel. Each route receives a webhook from its platform, creates or appends to an `inbound_conversations` row, drafts a response using the voice profile and the facility context, runs the response through the safety checks, and sends within the 30-second SLA.

- `/api/inbox/sms/route.ts` — Twilio webhook intake.
- `/api/inbox/web-form/route.ts` — internal POST from form submissions on the LP grid and replacement-mode website.
- `/api/inbox/gbp-message/route.ts` — polling-fed intake (GBP does not push webhooks for messages reliably; see §6.3 for the polling cron).
- `/api/inbox/fb-messenger/route.ts` — Meta webhook intake.
- `/api/inbox/ig-dm/route.ts` — Meta webhook intake (Instagram Messaging API).

Each route delegates to `src/lib/receptionist/respond.ts`, the shared draft-and-send pipeline. The pipeline returns `{ status: "sent" | "escalated" | "queued", latency_ms }`.

### 4.2 Operator OS surface

New admin and portal pages, both wrapping a shared component tree:

- `/admin/facilities/[id]/operator-os/page.tsx` — admin view, full-fidelity, every module's state visible.
- `/portal/operator-os/page.tsx` — client portal view, facility-scoped via access code or org session.

Tabs inside Operator OS (lazy-loaded components in `src/components/admin/operator-os-tabs/` per the existing facility-manager pattern):

1. Overview — occupancy chart with baseline overlay, lead volume by channel, AI receptionist activity, GBP performance snapshot.
2. GBP — posts, reviews, Q&A, photos, insights, connection management.
3. Social — content calendar, scheduled queue, published feed, engagement.
4. Inbox — every conversation across channels, with the escalation queue prominent.
5. Lifecycle — win-back, referral, churn-prevention toggles and activity.
6. Ads — read-only view of Angelo-owned campaigns and the Operator-OS-specific geo-fence audiences and QR signage report.
7. Intel — competitor and market intelligence weekly brief.
8. Settings — voice profile selection, escalation rules, alert preferences, OAuth status per channel.

### 4.3 New cron jobs

Five additions to `vercel.json`, all gated by `verifyCronSecret()` per existing convention.

- `/api/cron/generate-content` — runs hourly. Reads due rows from `content_triggers`, generates content via the voice-profile-applied Anthropic call, writes scheduled rows to `social_posts` or `gbp_posts`, marks triggers as `generated`.
- `/api/cron/seed-content-triggers` — runs daily at 02:00 UTC. Populates the `content_triggers` queue for the next 7 days per facility using the weather API (NWS), calendar templates, and current PMS occupancy data.
- `/api/cron/photo-refresh-prompts` — runs monthly on the 1st. Sends an SMS to each facility's operator contact asking for two fresh photos. Writes a `photo_refresh_prompts` row.
- `/api/cron/ai-qa-sample` — runs daily at 06:00 UTC. Samples 5-10% of the prior day's AI outputs across all surfaces, writes `ai_safety_events` rows with `event_type = "qa_sample"`, and surfaces them in the QA queue.
- `/api/cron/poll-gbp-messages` — runs every 5 minutes. Polls GBP messaging API for new messages, dispatches to `/api/inbox/gbp-message`.
- `/api/cron/daily-sms-digest` — runs at facility-local 07:00 (cron triggers UTC; the route filters facilities to those whose local time is currently 07:00). Composes and sends the daily SMS morning digest.

### 4.4 Postiz alpha integration

Per the vision doc §10.1, the alpha runs on Postiz cloud (managed) to minimize MVP time, with a migration trigger at 50 facilities or 6 months. Phase 1 work:

- `src/lib/postiz/client.ts` — typed Postiz API client, configured from `POSTIZ_API_KEY` and `POSTIZ_WORKSPACE_ID` env vars.
- `src/lib/postiz/publish.ts` — adapter that takes a `social_posts` row and pushes to Postiz, returning the `external_post_id` for write-back.
- Extension of `/api/cron/process-gbp` and a new cron job `/api/cron/process-social-postiz` to push scheduled `social_posts` to Postiz for facilities that have Postiz workspaces configured.
- Postiz workspace per facility, with FB Page and IG account connected through Postiz's own OAuth (the operator OAuths once at facility setup; Postiz holds the platform tokens going forward).
- Webhook intake at `/api/webhooks/postiz/route.ts` for delivery confirmations and engagement metric write-back.

### 4.5 Signage QR code service

- `/api/qr/[slug]/route.ts` — public redirect endpoint. Increments scan count, sets a cookie, and 302s to the destination URL with the UTM stack already attached.
- `/admin/facilities/[id]/operator-os/ads/qr` — admin UI to mint and print QR codes per sign location.

### 4.6 Cron-job summary delta

Vercel cron registry grows from 9 to 15 jobs:

- `generate-content` (hourly)
- `seed-content-triggers` (daily 02:00 UTC)
- `photo-refresh-prompts` (monthly 1st)
- `ai-qa-sample` (daily 06:00 UTC)
- `poll-gbp-messages` (every 5 min)
- `daily-sms-digest` (hourly with local-time filter)
- `process-social-postiz` (every 10 min)

Each follows the existing `src/lib/cron-auth.ts` pattern (fail-closed when `CRON_SECRET` is unset).

---

## 5. AI safety architecture — implementation

### 5.1 The four guardrails as code

The vision doc §5 commits to four non-negotiable guardrails. Each translates to a concrete code surface.

**Per-facility brand voice templates** — implemented as `voice_profiles` rows applied as Anthropic system prompts. The shared draft pipeline at `src/lib/receptionist/respond.ts` and the content generation pipeline at `src/lib/content/generate.ts` both require a `voice_profile_id` parameter and refuse to generate without one. Raw LLM output is never returned; every call goes through the voice template substitution.

**Review queues for sensitive surfaces** — implemented as `ai_safety_events` rows with `event_type = "review_queue"`. Surfaces classified as sensitive: `gbp_review_reply` (any rating), `gbp_review_reply` for ratings <= 3 (extra-priority), `complaint_response`, `rate_communication`. The respond pipeline writes the draft to the source table, sets the AI-draft field, but does NOT set the published/sent field; the operator (or in alpha, Blake) approves from the Inbox tab.

**5-10% human QA sample** — implemented by `/api/cron/ai-qa-sample`. Samples per-surface-type (so we get representation across GBP replies, inbound messages, social posts, GBP Q&A). Sample rows surface in a dedicated QA tab in admin only (not portal).

**Hard topic blocklist** — implemented as a config-as-code constant in `src/lib/receptionist/blocklist.ts`, with the list versioned in the repo and a stable test fixture. The respond pipeline runs every draft through a substring + semantic check (Anthropic-side classifier call as a backstop), and any hit creates an `ai_safety_events` row with `event_type = "blocklist_hit"` and forces escalation. The blocklist covers: lawsuits, threats, injuries, deaths, fires, contraband, weapons, hazardous materials, suicide, child endangerment.

### 5.2 Escalation triggers

Per vision doc §4.3, the five non-negotiable escalation triggers:

1. Complaint / refund request / legal threat — classifier-detected from inbound message text.
2. Question outside FAQ / facility data — classifier-detected by attempting answer composition and rejecting when the model's confidence falls below threshold.
3. Explicit human request from prospect — substring match against an escalation phrase list ("real person", "talk to someone", "human", "is this a bot", etc.).
4. High-value pattern — multi-unit ask, commercial account language, contract-length language.
5. Blocklist hit — automatic.

Each escalation writes an `ai_safety_events` row and a notification (existing `notifications` model) to the operator's preferred channel.

### 5.3 Acceptance criteria for the safety substrate

The alpha cannot ship until: every AI output across every surface is tagged with the `voice_profile_id` used; no path exists for raw LLM output to reach a customer without passing through the safety pipeline; the QA sample cron has run successfully for 7 consecutive days; the escalation queue has been tested with synthetic adversarial inputs covering each of the five trigger categories.

---

## 6. AI receptionist — implementation detail

### 6.1 The respond pipeline

`src/lib/receptionist/respond.ts` exposes a single entry point:

```
respond({
  conversation_id: string,
  inbound_message: string,
  facility_id: string,
  channel: string,
}): Promise<{
  status: "sent" | "escalated" | "queued",
  outbound_message_id: string,
  latency_ms: number,
  safety_events: string[],
}>
```

Internal pipeline:

1. Load voice profile (universal or facility-override).
2. Load facility context (name, hours, address, unit inventory, current specials, FAQ) via cached read from `facility_pms_*` and `facilities`.
3. Pre-classify the inbound for escalation triggers 1, 3, 4 (complaint/legal, human request, high-value pattern).
4. If pre-classified for escalation: write `ai_safety_events`, mark conversation `escalated`, send operator notification, return.
5. Otherwise, draft response via Anthropic call with voice template + facility context + conversation history.
6. Run draft through blocklist + topic classifier.
7. If draft fails confidence threshold (trigger 2): escalate.
8. Otherwise, send via channel-appropriate adapter (`twilio-sms`, `meta-messenger`, `meta-instagram`, `gbp-message`, etc.), write `inbound_messages` row with `direction = "outbound_ai"` and `latency_ms`, increment conversation `message_count` and `last_message_at`.

SLA: every channel adapter must guarantee send within 30 seconds of inbound receipt or write an error. SLA monitoring runs as a daily report.

### 6.2 Reservation depth at v1

Per vision doc §4.3, v1 is hold-plus-tour-booked, not full booking with payment. The receptionist offers:

- A 48-hour soft hold on the requested unit size (writes a row to `partial_leads` with hold metadata).
- A booked tour or move-in appointment (writes to `tenant_communications` or a new tour-booking record, scoped to Phase 1 as a JSON field on `partial_leads` to avoid additional schema churn).

The operator completes the rental in person. No PMS write-back in Phase 1. Full booking with payment is a Phase 3 PRD.

### 6.3 GBP messages polling

The GBP messaging API does not push webhooks reliably. The receptionist polls every 5 minutes via `/api/cron/poll-gbp-messages`, fans new messages out to the per-conversation respond pipeline. Polling state stored on `gbp_connections.metadata` (existing JSON field).

### 6.4 English-only at v1

The respond pipeline accepts a `language` parameter that defaults to `en` for Phase 1. Language detection runs but logs only; non-English inbound is escalated to the operator with the original message and a translated summary, per the vision doc's English-only v1 commitment. Spanish-language activation is a Phase 2 environment-flag flip with a Spanish-localized voice profile.

---

## 7. Content engine — implementation detail

### 7.1 Trigger sources

Per vision doc §4.4, five trigger sources, each implemented as a generator function under `src/lib/content/triggers/`:

- `weather.ts` — for each facility, pulls 7-day NWS forecast, identifies high-signal events (winter storm, hurricane watch, heat advisory, freezing rain), writes `content_triggers` rows with `trigger_type = "weather"` and a structured payload.
- `calendar.ts` — pulls per-facility local school district calendar, regional events, national retail moments. Writes `content_triggers` rows with `trigger_type = "calendar"`.
- `occupancy.ts` — reads current PMS occupancy mix from `facility_pms_units` snapshot, identifies vacancy-skewed unit sizes, writes triggers that promote those sizes.
- `ad_sync.ts` — reads active paid campaigns from `client_campaigns`, writes triggers that mirror the campaign's offer and timing.
- `evergreen.ts` — fills gaps in the content calendar with quarterly-refreshed evergreen content from a master library (lives in a JSON config under `src/data/evergreen-templates.json`).

`/api/cron/seed-content-triggers` invokes each generator in sequence, daily at 02:00 UTC, with the 7-day horizon.

### 7.2 Generation cron

`/api/cron/generate-content` runs hourly. For each `content_triggers` row where `status = "pending"` and `fires_at <= now() + 24h`:

1. Resolve the trigger payload into a structured generation request.
2. Load the facility's voice profile and geographic profile.
3. Generate the post body via Anthropic, with deep localization (street names, neighborhoods, school districts) pulled from the geographic profile rather than free-generated.
4. Generate or select the image asset (Phase 1 uses operator-uploaded photo library; AI-generated imagery via Angelo's Runway/FAL stack is a Phase 2 plumbing addition).
5. Insert into `social_posts` or `gbp_posts` with `status = "scheduled"` and `scheduled_at = trigger.fires_at`.
6. Update `content_triggers.status = "generated"`, set `generated_post_id` and `generated_post_table`.

### 7.3 Localization safety

The deep localization commitment (vision doc §4.4) is the highest hallucination-risk surface in the content engine. Mitigation: every local reference (street name, school, landmark) must come from the facility's geographic profile, which is curated at onboarding by extending `facility_context` rows with `type = "local_geography"`. The Anthropic prompt is instructed to use only references from the supplied geography object; any generated post that contains a local reference not in the supplied object is rejected and re-prompted, with the rejection logged as an `ai_safety_events` row of type `qa_sample`.

---

## 8. Operator-facing surface — implementation detail

### 8.1 The Operator OS dashboard at-a-glance

The Overview tab is the at-a-glance surface the operator sees first. Six tiles:

1. Occupancy this week vs. baseline, with sparkline.
2. Leads this week by channel, with channel mix donut.
3. AI receptionist activity — messages handled, average latency, escalation count, escalation queue depth.
4. GBP performance — post engagement, review count delta, average rating, response rate.
5. Lifecycle module activity — win-back enrollments, churn-prevention alerts, referral activations.
6. Top action item — the single most-important thing for the operator to look at, surfaced by a simple priority engine (any escalation > any critical churn signal > review needing approval > LP performance dip > rest).

### 8.2 Push communication cadence

Layered, per vision doc §4.8:

- **Real-time push** for: new move-in, bad review (<= 3 stars), ad spend anomaly (>2σ from rolling mean), escalation in queue > 1 hour. Uses the existing `notifications` + `push_subscriptions` models and Resend for email fallback.
- **Daily SMS morning digest** at facility-local 07:00. Composed by `/api/cron/daily-sms-digest` from the prior day's events.
- **Weekly Monday email digest** via the existing `/api/cron/weekly-digest` route, extended with Operator OS module summaries.

### 8.3 Attribution view

Two views, side by side:

- **Last-click view** — industry-standard multi-touch with last-click weight, computed from the existing `utm_links` and `partial_leads` join.
- **Lift-vs-baseline view** — compares facility's post-onboarding 30-day rolling move-in count to the same facility's pre-onboarding trailing-12-month average. Baseline data captured in `facilities.baseline_occupancy` and `facilities.baseline_date` (already present in schema). Lift-vs-baseline is the headline number on the operator surface because it is the most persuasive renewal artifact.

---

## 9. Postiz alpha integration — full pros/cons resolution for Phase 1

Per vision doc §10.1, the founder flagged Postiz hosting as a critical decision deferred behind pros/cons. Phase 1 commits to:

**Postiz cloud (managed) for the alpha.** Rationale:

- Time-to-MVP is the dominant constraint for the Blake-portfolio alpha. Self-host adds 2-4 weeks of deployment, monitoring, and on-call setup that does not produce alpha data faster.
- Per-account cost on Postiz cloud is bounded at the alpha scale (Blake's portfolio is single-digit facilities). The cost only becomes uneconomical above ~50 facilities.
- The migration path is well-understood — Postiz is MIT-licensed open source, the integration adapter at `src/lib/postiz/client.ts` is API-driven, and the swap from cloud to self-hosted is a base-URL change plus a workspace migration.

**Migration trigger:** the earlier of (a) the platform reaches 50 paying facilities, or (b) 6 months from Phase 1 launch. At the trigger, a Phase 2 PRD scopes the migration to self-hosted on Railway or Render, with the option to fork-and-embed evaluated against the customization needs revealed by the alpha.

**Architectural commitment:** the adapter pattern in `src/lib/postiz/` is the only Postiz contact surface in the application. Direct Postiz API calls outside the adapter are prohibited. This keeps the migration cost bounded.

---

## 10. Observability and acceptance

### 10.1 What gets instrumented

- AI receptionist response latency (p50, p95, p99) per channel, daily and weekly aggregates.
- AI safety event counts by type and surface, daily aggregates.
- Escalation queue depth and time-to-resolution, hourly.
- GBP post publish success rate, photo upload success rate, review response coverage.
- Content trigger throughput — generated, scheduled, errored — per facility per day.
- Cron job success/failure per run (Sentry already wired per existing convention).

### 10.2 Phase 1 acceptance criteria

The alpha is shippable to Blake's portfolio when:

1. Every existing GBP and social module endpoint passes a smoke test against a Blake-portfolio facility.
2. The AI receptionist handles synthetic test conversations on each of the five channels (SMS, web form, GBP message, FB Messenger, IG DM) within the 30-second SLA.
3. The four AI safety guardrails are operational and have processed at least 100 synthetic test inputs each with no false-negative escapes.
4. The content engine successfully generates a 7-day calendar for at least one Blake facility, with every post passing the localization safety check.
5. The Operator OS dashboard renders for at least one Blake facility with live data in every tile.
6. The daily SMS digest sends correctly for at least 7 consecutive days.
7. `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` all pass clean.

### 10.3 Phase 1 explicit non-goals

The alpha does NOT need to: support self-serve external operator onboarding, support sales-assisted onboarding flows, generate AI ad creative (Angelo's domain, already operational), support Postiz self-host, support Spanish-language inbound, support full booking with payment, support TikTok publishing, support multi-facility batched operations for management companies, support the operator-built homepage rewrite. Each of those is its own subsequent PRD.

---

## 11. Build sequence within Phase 1

Six work packages, sequenced for parallelism and dependency.

**Week 1-2 — Schema and safety substrate.**
- New schema migration with the nine new tables.
- Voice profile seeded with the universal `StorageAds` profile.
- Topic blocklist constant + tests.
- Respond pipeline skeleton with safety wiring, no channel adapters yet.

**Week 3-4 — Receptionist channels.**
- Twilio SMS adapter, GBP message polling cron, FB Messenger and IG DM webhooks (Meta webhooks share an intake URL), web form intake from the existing LP grid.
- End-to-end synthetic conversation tests on each channel.
- Latency instrumentation and SLA dashboard.

**Week 3-4 (parallel) — Postiz adapter and social engine.**
- `src/lib/postiz/*` adapter, workspace provisioning script.
- `/api/cron/process-social-postiz` and the post write-back webhook.
- One end-to-end Postiz publish on a Blake test facility.

**Week 5-6 — Content engine.**
- Weather, calendar, occupancy, ad-sync, evergreen trigger generators.
- `/api/cron/seed-content-triggers` and `/api/cron/generate-content`.
- Local geography curation for Blake's facilities (one-time data entry).
- 7-day calendar generation on at least one Blake facility, with QA pass.

**Week 5-6 (parallel) — GBP module composition.**
- Q&A seeding from `gbp_question_templates` (library to be drafted as part of this work package).
- Photo refresh prompt cron and the operator SMS response handler.
- Auto-publish toggle defaulted to `true` on Blake's portfolio.

**Week 7-8 — Operator OS surface.**
- `/admin/facilities/[id]/operator-os` page tree with the eight tabs.
- Real-time push wiring against `notifications` and `push_subscriptions`.
- `/api/cron/daily-sms-digest` and the lift-vs-baseline attribution view.
- Acceptance criteria pass against Blake's portfolio.

**Week 9-12 — Pilot run.**
- Operational shakedown. Daily monitoring of the SLA dashboard, the safety event log, and the escalation queue.
- Weekly review of QA sample audits with prompt revisions as drift is detected.
- Baseline-vs-period measurement capture, ready for the 90-day proof artifact (see derivative artifact 4 — the pilot measurement plan, drafted separately).

Six work packages, four parallelizable, target 12 weeks calendar from kickoff to shippable alpha with 4 weeks of pilot run on Blake's portfolio.

---

## 12. Risks and mitigations specific to Phase 1

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Postiz cloud per-account cost grows unexpectedly during alpha | Low | Low | Capped exposure at Blake-portfolio scale; migration plan documented |
| GBP message polling misses time-sensitive conversation | Medium | Medium | 5-minute polling cadence is acceptable given the 30-second SLA only applies post-detection; consider Pub/Sub if Google ships a reliable webhook |
| AI escalation misfires (false positives flood operator) | High | Medium | Conservative escalation thresholds tuned during Week 9-12 pilot; operator can suppress categories per facility |
| AI hallucinates a local reference despite the geography substitution constraint | Medium | High | Localization safety check rejects + re-prompts; QA sample escalates pattern; if pattern persists, fall back to mid-depth localization (city + neighborhood only) on a per-facility flag |
| Twilio 10DLC registration delay blocks SMS channel | Medium | High | Begin Twilio TFV / 10DLC registration in Week 1 — paperwork lead time is the binding constraint |
| Meta webhook policy change disrupts Messenger or IG DM intake | Low | High | Adapter pattern isolates the impact; receptionist degrades gracefully to operator-handled for the affected channel |
| Blake's portfolio facilities are not representative of the broader beachhead ICP | Medium | High | Measurement artifact (derivative 4) documents Blake-facility specifics so prospects can interpret the lift correctly |

---

## 13. Outputs of Phase 1

At the end of the 12-week build + 4-week pilot:

- A working Operator OS alpha running on Blake's portfolio facilities.
- A 90-day measurement artifact (per `docs/operator-os-pilot-measurement-plan.md`) documenting lift on every committed metric.
- An evidence base of safety event types and frequencies that informs the operator-facing reassurance copy in the Phase 2 homepage rewrite.
- A latency, escalation, and cost-per-facility-per-month operating profile that informs the Phase 2 pricing tier validation.
- A clean handoff package — schema, routes, cron jobs, runbooks — ready for the Phase 2 external pilot of 10 paid operators.

Phase 2 begins on the evidence base Phase 1 produces. The alpha exists to make Phase 2 possible. Scope discipline in Phase 1 is the lever that determines whether Phase 2 starts on schedule with credible proof or starts late with sketchy proof.
