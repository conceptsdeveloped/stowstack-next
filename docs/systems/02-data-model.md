# 02 · Data Model

> **The headline:** 94 Prisma models, all UUID-keyed. `facilities` is the gravitational center — ~50 tables cascade-delete off it. There are **no native Prisma enums**; every state machine is a `String` field with a `@default()` and an inline comment listing allowed values.

Source: `prisma/schema.prisma` (~1960 lines). Singleton client at `src/lib/db.ts`.

---

## 1. The three hub models

Everything orbits three tables. If you understand these and their cascade topology, you understand the schema's shape.

```mermaid
graph TB
    ORG["🏢 organizations<br/><i>multi-tenant / partner root</i><br/>Stripe billing · white_label · facility_limit"]
    FAC["🏬 facilities<br/><i>THE hub — ~50 child relations</i><br/>status · pipeline_status · lead_score<br/>access_code · shared_audit_slug"]
    FUN["🎯 funnels<br/><i>marketing-automation root</i><br/>archetype · status · config · metrics"]

    ORG -->|"organization_id (nullable)"| FAC
    FAC -->|"facility_id (Cascade)"| FUN
    FUN -->|owns| LP[landing_pages]
    FUN -->|owns| AD[ad_variations]
    FUN -->|owns| PL[partial_leads]
    FAC -->|"~50 cascade children"| MANY["clients · tenants · audits<br/>nurture · drips · calls · GBP<br/>PMS data · platform_connections …"]
    ORG -->|owns| OU[org_users]
    OU -->|owns| SESS[sessions]
    ORG -->|owns| AK[api_keys]

    classDef hub fill:#1e1d1b,stroke:#141413,color:#faf9f5
    classDef child fill:#e8e6dc,stroke:#141413,color:#141413
    class ORG,FAC,FUN hub
    class LP,AD,PL,MANY,OU,SESS,AK child
```

**Cascade topology you must respect (prod has no staging — see [project safety notes]):**
- Deleting a **facility** cascades through ~50 tables.
- Deleting an **organization** cascades to `org_users → sessions`, `api_keys → api_usage_log`, etc.
- Soft-delete (`deleted_at` / `deleted_by`) exists on `facilities`, `organizations`, `clients`, `tenants`, `partial_leads` — prefer it over hard delete.

---

## 2. The core ER diagram (sales + automation spine)

This is the connective tissue from a stranger → a paying client, and the automation that surrounds it.

```mermaid
erDiagram
    organizations ||--o{ facilities : "owns (nullable)"
    organizations ||--o{ org_users : owns
    org_users ||--o{ sessions : "ss_ tokens"
    organizations ||--o{ api_keys : "V1 auth"

    facilities ||--o{ funnels : owns
    facilities ||--o| clients : "signs → portal"
    facilities ||--o{ audits : has
    facilities ||--o{ nurture_sequences : has
    facilities ||--o{ drip_sequences : has
    facilities ||--o{ tenants : has
    facilities ||--o{ platform_connections : "ad OAuth"
    facilities ||--o{ call_tracking_numbers : has

    funnels ||--o{ landing_pages : owns
    funnels ||--o{ ad_variations : owns
    funnels ||--o{ partial_leads : owns

    landing_pages ||--o{ partial_leads : captures
    partial_leads ||--o{ lead_status_events : "append-only history"
    partial_leads ||--o{ nurture_enrollments : enrolled
    partial_leads }o--o| tenants : "LeadTenantMatch"

    nurture_sequences ||--o{ nurture_enrollments : enrolls
    nurture_enrollments ||--o{ nurture_messages : sends
    tenants ||--o{ nurture_enrollments : enrolled

    clients ||--o{ client_campaigns : runs
    clients ||--o| client_onboarding : "6-step wizard"
    clients ||--o{ client_reports : "weekly"

    call_tracking_numbers ||--o{ call_logs : records
    call_logs ||--o{ partial_leads : "attributes call"

    shared_audits }o..o| facilities : "slug (soft link, no FK)"
```

> **Note the dotted/soft links** (no FK constraint — render mentally as dotted):
> - `facilities.shared_audit_slug` → `shared_audits.slug`
> - `drip_sequences.lead_id` → `partial_leads.id`
> - `lead_status_events.source_ref_id` → polymorphic into `call_logs` / `tenants`
> - Named relations: `"LeadTenantMatch"` (partial_leads ↔ tenants), and two `moveout_remarketing` relations to `tenants` (`tenant_id` = moved-out, `new_tenant_id` = re-rented).

---

## 3. The 94 models by domain

```mermaid
mindmap
  root((94 models))
    Auth / Tenancy
      organizations
      org_users
      sessions
      admin_keys
      api_keys / api_usage_log
      webhooks / webhook_deliveries
      audit_log / notifications
      push_subscriptions
      portal_login_codes
    Facilities core
      facilities
      facility_context
      facility_market_intel
      facility_learnings
      places_data
    PMS ingest
      pms_reports
      facility_pms_snapshots
      facility_pms_units
      facility_pms_rent_roll
      facility_pms_aging
      facility_pms_rate_history
      facility_pms_revenue_history
      facility_pms_tenant_rates
      facility_pms_length_of_stay
      facility_pms_specials
    Tenants / Retention
      tenants
      tenant_payments
      tenant_communications
      churn_predictions
      delinquency_escalations
      retention_campaigns
      moveout_remarketing
      upsell_opportunities
      noi_report_snapshots
    Clients / Leads
      clients
      client_campaigns
      client_onboarding
      client_reports
      partial_leads
      lead_notes
      lead_status_events
      lead_match_attempts
    Audits
      shared_audits
      audits
      audit_report_cache
      website_scrape_cache
    Marketing automation
      funnels
      funnel_stage_metrics
      landing_pages
      landing_page_sections
      ad_variations
      creative_briefs / creative_performance
      marketing_plans
      drip_sequences
      drip_sequence_templates
      nurture_sequences
      nurture_enrollments
      nurture_messages
    Ads / Attribution
      platform_connections
      audience_syncs
      campaign_spend
      call_tracking_numbers
      call_logs
      utm_links
    Google Business Profile
      gbp_connections
      gbp_insights
      gbp_posts
      gbp_reviews
      gbp_questions
    Referrals / Rev-share
      referral_codes
      referrals
      referral_credits
      rev_share_referrals
      rev_share_payouts
    Operator-OS / AI
      voice_profiles
      ai_safety_events
      doctrine_versions
      synthesis_log
      changelog_entries
```

---

## 4. State machines (encoded as `String @default`, not enums)

Because there are no Prisma enums, these lifecycles live as string fields. Draw them as the real state machines they are:

```mermaid
stateDiagram-v2
    direction LR
    [*] --> partial : lead created
    partial --> new : email captured
    new --> contacted
    contacted --> converted
    note right of partial
      partial_leads.lead_status
      full history in lead_status_events
      (from_status → to_status, append-only)
    end note
```

```mermaid
stateDiagram-v2
    direction LR
    [*] --> intake
    intake --> diagnostic_submitted : /diagnostic
    diagnostic_submitted --> audit_generated : AI done
    audit_generated --> audit_sent : approved
    audit_sent --> call_scheduled
    call_scheduled --> client_signed
    audit_sent --> lost
    note right of client_signed
      facilities.pipeline_status
      client_signed → mints portal access_code
      {call_scheduled, client_signed, lost}
      auto-cancel active drips
    end note
```

Other important status fields (all `String` defaults):

| Model.field | Default | Allowed values |
|-------------|---------|----------------|
| `funnels.status` | `draft` | draft · testing · live · paused · archived |
| `funnel_stage_metrics.stage` | — | impression · click · page_view · form_start · form_submit · conversion · drip_sent · drip_opened · move_in |
| `organizations.subscription_status` | `incomplete` | Stripe statuses |
| `org_users.status` / `.role` | `invited` / `viewer` | invited→active · viewer/admin |
| `nurture_enrollments.status` | `active` | active · paused · completed · unsubscribed |
| `nurture_messages.status` | `pending` | pending · sent · failed |
| `drip_sequences.status` | `active` | active · cancelled · completed |
| `platform_connections.status` | `disconnected` | disconnected · connected · error |
| `synthesis_log.status` | `pending` | pending · completed · failed · skipped |
| `upsell_opportunities.status` | `identified` | identified · … |

---

## 5. Reading guide

- **One Prisma client**, singleton at `src/lib/db.ts`. Use client methods everywhere.
- **Raw SQL is intentional and contained** to `src/lib/session-auth.ts` (the `sessions` table) and a few nurture/V1 lookups. The `sessions` table here is the *partner/org* session — distinct from Clerk and from the client-portal access-code flow.
- **The `funnel_stage_metrics.stage` list is the funnel telemetry vocabulary** — impression → click → page_view → form_start → form_submit → conversion → drip_sent → drip_opened → move_in. That's the canonical journey the analytics measure.
- When changing the schema, go through the `schema-guardian` agent — prod has no staging and no dev DB copy, so `db push` hits production.
