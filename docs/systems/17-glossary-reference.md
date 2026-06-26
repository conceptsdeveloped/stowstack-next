# 17 · Glossary & Quick Reference

> **Purpose:** the single Cmd-F lookup. Because the schema has **no Prisma enums**, every state machine is a bare `String` field — this doc collects the allowed values, the domain vocabulary, the auth credentials, and the lib-file map in one place. When a status string shows up in code and you don't know its lifecycle, look here.

---

## 1. Domain vocabulary

| Term | Means |
|------|-------|
| **Facility** | A self-storage location. The schema's hub entity (`facilities`); ~50 tables cascade off it. |
| **Organization (org)** | A tenant/partner account. Owns facilities, org_users, api_keys. Multi-facility resellers/management cos. |
| **Lead** | A prospect. `partial_leads` (anonymous → captured) is the marketing-funnel record; keyed on `session_id`. |
| **Client** | A *signed* customer (`clients`), distinct from a lead. Gets a portal access code. |
| **Tenant** | An actual storage renter (`tenants`) — the retention/PMS side, not the marketing side. |
| **Audit** | The free diagnostic. `shared_audits` (public, 90-day slug) vs `audits` (internal). The top-of-funnel wedge. |
| **Funnel** | A marketing strategy object (`funnels`) that owns ad_variations, landing_pages, drip templates. |
| **Nurture vs Drip** | Two automation engines. Nurture (`nurture_*`) is primary; drip (`drip_sequences`) is the legacy fallback. |
| **Doctrine** | The AI-evolved, versioned rulebooks (`doctrine_versions`): CREATIVE / STRATEGY / BRAND. |
| **Synthesis** | The weekly process that rewrites doctrine from campaign performance. |
| **ECRI** | Existing Customer Rate Increase — rent-increase sensitivity scoring on tenants. |
| **NOI** | Net Operating Income — the weekly rollup (`noi_report_snapshots`) stitching all value drivers. |
| **GBP** | Google Business Profile — the listing-management subsystem (`gbp_*`). |
| **Operator-OS** | The product vision name for the AI substrate (synthesis + doctrine + voice + safety). |

---

## 2. Status-value reference (the String state machines)

> No enums — these live as `String @default(...)` with inline comments. Authoritative source is always `prisma/schema.prisma`.

| Model.field | Default | Lifecycle / allowed values | Doc |
|-------------|---------|----------------------------|-----|
| `facilities.status` | `intake` | intake → … | [02](02-data-model.md) |
| `facilities.pipeline_status` | `submitted` | submitted → diagnostic_submitted → audit_generated → audit_sent → call_scheduled → client_signed / lost | [02](02-data-model.md), [03](03-audit-funnel.md) |
| `partial_leads.lead_status` | `partial` | partial → new → contacted → converted → moved_in | [10](10-attribution-tracking.md) |
| `partial_leads.recovery_status` | `pending` | pending → … | [04](04-nurture-lifecycle.md) |
| `funnels.status` | `draft` | draft → testing → live → paused → archived | [15](15-ad-creative-pipeline.md) |
| `funnel_stage_metrics.stage` | — | impression · click · page_view · form_start · form_submit · conversion · drip_sent · drip_opened · move_in | [10](10-attribution-tracking.md) |
| `organizations.subscription_status` | `incomplete` | trialing · active · past_due · canceled | [07](07-billing-stripe.md) |
| `organizations.status` | `active` | active · pending_deletion | [07](07-billing-stripe.md) |
| `org_users.status` / `.role` | `invited` / `viewer` | invited → active / viewer · admin · org_admin | [01](01-authentication.md) |
| `nurture_enrollments.status` | `active` | active · paused · completed · unsubscribed | [04](04-nurture-lifecycle.md) |
| `nurture_messages.status` | `pending` | pending · sent · failed | [04](04-nurture-lifecycle.md) |
| `drip_sequences.status` | `active` | active · cancelled · completed | [04](04-nurture-lifecycle.md) |
| `tenants.status` | `active` | active · delinquent · moved_out | [09](09-retention-engine.md) |
| `churn_predictions.risk_level` | — | low · medium · high · critical | [09](09-retention-engine.md) |
| `churn_predictions.retention_status` | `none` | none · enrolled · retained · churned | [09](09-retention-engine.md) |
| `moveout_remarketing.sequence_status` | `pending` | pending · active · paused · completed · converted | [09](09-retention-engine.md) |
| `delinquency_escalations.stage` | — | late_notice · second_notice · pre_lien · lien_filed · auction_scheduled · auction_complete | [09](09-retention-engine.md) |
| `upsell_opportunities.status` | `identified` | identified · sent · accepted · declined | [09](09-retention-engine.md) |
| `platform_connections.status` | `disconnected` | disconnected · connected · error | [15](15-ad-creative-pipeline.md) |
| `ad_variations.status` | `draft` | draft · review · approved · published · rejected | [15](15-ad-creative-pipeline.md) |
| `ad_variations.compliance_status` | — | passed · flagged · failed | [11](11-security-compliance.md) |
| `publish_log.status` | `pending` | pending · published · failed | [15](15-ad-creative-pipeline.md) |
| `landing_pages.status` | `draft` | draft · published | [15](15-ad-creative-pipeline.md) |
| `gbp_posts.status` | `draft` | draft · scheduled · published · failed | [12](12-gbp-external-api.md) |
| `gbp_reviews.response_status` | `pending` | pending · ai_drafted · published | [12](12-gbp-external-api.md) |
| `gbp_questions.answer_status` | `pending` | pending · ai_drafted · published | [12](12-gbp-external-api.md) |
| `synthesis_log.status` | `pending` | pending · completed · failed · skipped | [14](14-operator-os-ai.md) |
| `ai_safety_events.human_decision` | `pending` | pending · decided | [14](14-operator-os-ai.md) |
| `referrals.status` | `invited` | invited → signed_up → active | [16](16-referrals-revshare.md) |
| `rev_share_payouts.status` | `pending` | pending · processing · paid *(unwired)* | [16](16-referrals-revshare.md) |
| `lead_match_attempts.status` | — | matched · ambiguous · no_match | [10](10-attribution-tracking.md) |
| `data_deletion_requests.status` | `pending` | pending → acknowledged → completed | [11](11-security-compliance.md) |

---

## 3. The two plan namespaces (don't conflate)

| Layer | Names | Where |
|-------|-------|-------|
| **Customer-facing** | Signal · System · Compound · (Enterprise) | pricing page, marketing |
| **Backend / Stripe / gating** | launch · growth · portfolio | `stripe.ts` PLANS, webhook, `plan-limits.ts` |

**No code maps between them.** Treat `src/lib/stripe.ts` `PLANS` as canonical for limits/price-IDs. → [07 · Billing](07-billing-stripe.md) §1

---

## 4. Auth credentials cheat sheet

| System | Credential | Header / location | Verifier |
|--------|-----------|-------------------|----------|
| Admin | `ADMIN_SECRET` (or `sa_adm_*`) | `x-admin-key` | `requireAdminKey()` |
| Portal | 8-char access code | `?accessCode=` or `Authorization: Bearer <code>` | `authenticatePortalRequest()` |
| Partner | `ss_…` token | `Authorization: Bearer ss_` or `x-org-token` | `getSession()` |
| Cron | `CRON_SECRET` | `Authorization: Bearer <secret>` | `verifyCronSecret()` (fail-closed) |
| V1 API | `sk_live_…` | `Authorization: Bearer sk_live_` | `requireApiAuth()` |
| CSRF exempt | any of the above headers | — | `isCsrfExempt()` in `proxy.ts` |

→ [01 · Authentication](01-authentication.md)

---

## 5. Cron inventory (22 jobs)

| Schedule | Cron | Domain |
|----------|------|--------|
| `0 * * * *` | process-pms-uploads | PMS |
| `30 * * * *` | retry-diagnostic-audits | Audit |
| `0 2 * * *` | aggregate-page-stats | Analytics |
| `0 3 * * *` | cleanup-sessions | Maintenance |
| `30 3 * * *` | cleanup-organizations | Billing |
| `0 4 * * *` | data-retention | Compliance |
| `0 4 * * *` | process-gbp | GBP |
| `0 5 * * *` | process-drips | Nurture |
| `0 6 * * *` | process-nurture | Nurture |
| `0 7 * * *` | process-recovery | Nurture |
| `0 8 * * *` | check-campaign-alerts | Ads |
| `0 10 * * *` | review-solicitation | GBP |
| `0 12 * * *` | process-synthesis-queue | AI |
| `0 9 * * 1` | send-client-reports | Reports |
| `0 11 * * 1` | score-churn-risk | Retention |
| `30 11 * * 1` | update-retention-outcomes | Retention |
| `0 11 * * 2` | score-ecri-sensitivity | Retention |
| `0 9 * * 5` | weekly-digest | Reports |
| `0 12 * * 5` | generate-noi-reports | Retention |
| `0 1 * * 0` | sync-audiences | Ads |
| `0 10 * * 0` | weekly-synthesis | AI |
| `0 13 1 * *` | photo-refresh-prompts | GBP |

→ [05 · Background Jobs](05-background-jobs.md)

---

## 6. Key lib-file map

| File | Owns |
|------|------|
| `src/proxy.ts` | Edge gate: CSP, CSRF, Clerk, Sentry tagging |
| `src/lib/db.ts` | Prisma singleton |
| `src/lib/api-helpers.ts` | `requireAdminKey`, `safeCompare`, CORS/error responses |
| `src/lib/session-auth.ts` | Partner `ss_` sessions (raw SQL) |
| `src/lib/portal-auth.ts` | Portal access-code auth |
| `src/lib/cron-auth.ts` | `verifyCronSecret` (fail-closed) |
| `src/lib/v1-auth.ts` | V1 API key auth + scopes |
| `src/lib/csrf.ts` | Double-submit CSRF |
| `src/lib/rate-limit.ts` | Upstash rate limiting |
| `src/lib/stripe.ts` | Stripe client + `PLANS` |
| `src/lib/plan-limits.ts` | Subscription gating |
| `src/lib/nurture-templates.ts` | `SEQUENCE_TEMPLATES` |
| `src/lib/synthesis.ts` | Doctrine synthesis engine |
| `src/lib/doctrine-store.ts` | Versioned doctrine |
| `src/lib/voice/generate.ts` | Voice-shaped AI generation |
| `src/lib/voice/safety.ts` + `blocklist.ts` | Auto-publish safety gate |
| `src/lib/lead-matching.ts` + `lead-events.ts` | Lead↔tenant matching |
| `src/lib/attribution.ts` | Spend → creative attribution |
| `src/lib/compliance.ts` | Ad compliance check |
| `src/lib/booking.ts` | Cal.com URL (never hardcode) |

---

## 7. External integrations (env var → use)

| Service | Env var | Use |
|---------|---------|-----|
| Anthropic | `ANTHROPIC_API_KEY` | Audits, copy, synthesis, GBP |
| Resend | `RESEND_API_KEY` | All email |
| Stripe | `STRIPE_SECRET_KEY` | Billing |
| Twilio | `TWILIO_*` | SMS, call tracking |
| FAL.ai / Runway | `FAL_KEY` / `RUNWAY_API_KEY` | Image/video (Angelo) |
| Upstash | `KV_REST_API_URL` | Rate limit, cache |
| Google Places | `GOOGLE_PLACES_API_KEY` | Facility lookup |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN` | Errors |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` | Asset storage |
| Cal.com | `NEXT_PUBLIC_CALCOM_LINK` | Booking |
| Meta/Google/TikTok | `META_*` / `GOOGLE_ADS_*` / `TIKTOK_*` | Ad platforms (Angelo) |

→ [05 · Background Jobs](05-background-jobs.md) §2
