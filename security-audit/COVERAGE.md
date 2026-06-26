# StorageAds — Audit Coverage Map

Every `app/api/**/route.ts` (184 files) with its auth surface and a verdict. `'use server'` actions: **0** in the codebase (all server logic is in route handlers), so none to enumerate. Auth model: middleware (`src/proxy.ts`) skips Clerk for all `/api/*`; each route self-gates. Guards: `adminKey` = `requireAdminKey`/`isAdminRequest` (god-mode, all tenants, by design); `session` = `getSession` (org-scoped); `v1key` = `requireApiAuth` (org-scoped); `cron` = `verifyCronSecret`; `access-code` = portal client lookup; `public` = intentionally unauthenticated; `sig` = webhook signature.

Verdict legend: `clean` = no issue found · `SEC-00x` = filed finding · `Mx`/`Ix` = appendix item in INDEX.md.

| Route (`src/app/api/…`) | Methods | Auth | Verdict |
|---|---|---|---|
| 2fa | POST | session + HMAC tempToken | clean — keyed to `session.user.id`; TOTP/backup verified before session issuance |
| activity-log | GET | adminKey | clean |
| admin-facilities | GET,PATCH | adminKey | clean |
| admin-keys | GET,POST,DELETE | adminKey | clean — admin-key management |
| admin-leads | GET,POST,PATCH,DELETE | adminKey | clean |
| admin-pms-queue | GET,PATCH | adminKey | clean |
| admin-reports | GET,POST,PATCH | adminKey | clean |
| admin-settings | GET,PATCH | adminKey | clean |
| alert-history | GET,PATCH | adminKey + access-code | clean — GET resolves client by code; `clientId` param requires admin (correct pattern) |
| analyze-map | POST | **public** | **M5** — unauthenticated Claude vision, no image-size cap, fail-open RL |
| attribution | GET | adminKey + access-code | clean — non-admin forced to own facility; admin may pass `facilityId` |
| audience-sync | GET,POST | adminKey | clean — tenant PII hashed before Meta upload, admin-only |
| audit-approve | POST | adminKey | clean |
| audit-form | POST | public | clean — public lead capture; rate-limited |
| audit-generate-diagnostic | POST | adminKey | clean — EXPENSIVE_API limited |
| audit-generate | POST | adminKey | clean — EXPENSIVE_API limited |
| audit-load | GET | public (slug) | clean — loads shared audit by slug; rate-limited |
| audit-report | GET,POST | adminKey | clean |
| audit-save | POST | adminKey | clean |
| auth/gbp | GET | adminKey | clean (initiation gated) — but mints unsigned `state` → see SEC-004 |
| auth/gbp/callback | GET | **public** | **SEC-004** — unsigned `state`, no auth, token upsert |
| auth/google/callback | GET | **public** | **SEC-004** |
| auth/me | GET | session | clean — returns own session only |
| auth/meta/callback | GET | **public** | **SEC-004** |
| auth/tiktok/callback | GET | **public** | **SEC-004** |
| call-logs | GET,PATCH | adminKey | clean |
| call-tracking | GET,POST,DELETE | adminKey + public phone | clean — public branch returns only a tracking phone number |
| call-webhook | POST | sig (Twilio `validateRequest`) | clean — verified before writes; fail-open only non-prod |
| campaign-alerts | GET | adminKey | clean |
| campaign-spend | GET,POST | adminKey | clean |
| changelog | GET,POST | adminKey | clean |
| checkout-success | GET | public (Stripe session_id) | clean — verifies session with Stripe; finalizes signup |
| churn-predictions | GET,POST,PATCH,DELETE | adminKey | clean |
| client-activity | GET | access-code / **bypassable** | **SEC-002** — `?facilityId=` bypasses access-code branch (IDOR) |
| client-billing | GET,POST,PATCH | adminKey + access-code | clean — non-admin lookup forced to verified client code |
| client-campaigns | GET,POST,PATCH,DELETE | adminKey | clean — client data resolved by access_code |
| client-data | POST,PATCH | access-code (portal login) | clean — re-auths; writes only own `monthly_goal`/prefs |
| client-invoices | GET,POST | POST adminKey; **GET broken** | **SEC-001** — null-`facilityId` fallthrough leaks all tenants' invoices |
| client-messages | GET,POST | access-code + adminKey | clean — verifies code+email; admin sender gated |
| client-onboarding | GET,PATCH | adminKey + access-code | clean — rows resolved via access_code; input whitelisted |
| client-reports | GET,POST | access-code; POST adminKey | clean — `clientId` param requires admin (correct pattern) |
| consumer-lead | POST | public | clean — public lead capture; rate-limited |
| consumer-leads | GET,PATCH | adminKey | clean |
| create-billing-portal | POST | session | clean — Stripe customer fetched by `session.organization.id` |
| create-checkout-session | POST | public (pre-signup) | clean — price server-derived by plan, `quantity=count` (1-999); BILLING_HOURLY |
| data-deletion | GET,POST | adminKey (process) + public submit | **M2** — public submit interpolates name/reason/email unescaped into admin email |
| data-deletion/meta-callback | POST | sig (Meta signed_request) | clean — HMAC w/ length guard before parse, fail-closed |
| diagnostic-analyze | POST | **public** | **M4** — unauthenticated Anthropic (16k tokens), no input cap, fail-open RL |
| diagnostic-intake | POST | public | clean — public audit intake; rate-limited |
| drip-sequences | GET,POST,PATCH,DELETE | adminKey | clean |
| export-leads | GET | adminKey | clean |
| facility-assets | GET,POST,DELETE | adminKey | clean |
| facility-context | GET,POST,DELETE | adminKey | clean |
| facility-creatives | GET,POST,PATCH,DELETE | adminKey | clean (Angelo's domain; admin-gated) |
| facility-lookup | POST | **public** | **SEC-003** — `facilityId` write path has no ownership check |
| facility-pms | GET,POST,PATCH,DELETE | adminKey + access-code | clean — GET enforces `clientFacilityId === facilityId`; writes admin-only |
| funnel-metrics | GET,POST | GET adminKey; **POST public** | **M6** — POST upserts funnel metrics unauthenticated |
| funnels/generate | POST | adminKey | clean — internalFetch targets env host w/ admin key |
| funnels | GET,POST,PATCH,DELETE | adminKey | clean |
| gbp-insights | GET,POST | adminKey | clean |
| gbp-posts | GET,POST,PATCH,DELETE | adminKey | clean |
| gbp-questions | GET,POST | adminKey | clean |
| gbp-review-settings | GET,PATCH | adminKey | clean |
| gbp-reviews | GET,POST,PATCH | adminKey | clean |
| gbp-sync | GET,POST,PATCH | adminKey | clean |
| generate-copy | POST | adminKey | clean — EXPENSIVE_API limited |
| generate-image | GET,POST | adminKey | clean — EXPENSIVE_API limited (I4: FAL safety checker off) |
| generate-social-content | POST | adminKey | clean — parameterized inserts |
| generate-social-post | POST | adminKey | clean |
| generate-video | GET,POST | adminKey | **M3** — admin-gated but no rate limit (FAL/Runway cost) |
| generate-video/status | GET | adminKey | clean — `app` allowlisted, requestId encoded |
| google-ads-keywords | POST | adminKey | clean — EXPENSIVE_API limited |
| google-conversion | POST | public (pixel proxy) | clean (I-note) — no DB write; forwards to Google w/ server creds; consider origin check |
| health | GET | public | clean — status/db-latency/version only, no env leak |
| ideas | GET,POST,PATCH,DELETE | adminKey | clean |
| landing-pages/generate | POST | adminKey | clean — Sonnet from DB facility intel |
| landing-pages | GET,POST,PATCH,DELETE | session; GET public-by-slug; writes adminKey | clean — id-GET scoped to `organization_id`; published-only public |
| lead-analytics | GET | adminKey | clean |
| lead-capture | POST | public | clean — public lead capture; rate-limited |
| lead-score | GET | adminKey | clean |
| market-intel | GET,POST,PATCH | adminKey | clean (**I3** redirect-follow SSRF residual, admin-gated) |
| marketing-plan | GET,POST | adminKey | clean — EXPENSIVE_API limited |
| meta-capi | POST | `verifyCsrfOrigin` (pixel proxy) | clean — origin-allowlisted; forwards to Meta, no DB write |
| moveout-remarketing | GET,POST,PATCH | adminKey | clean |
| notifications | GET | adminKey | clean |
| nurture-sequences | GET,POST,PATCH,DELETE | adminKey | clean |
| occupancy-forecast | GET | adminKey | clean |
| occupancy-intelligence | GET | adminKey | clean — DB reads only |
| onboarding-checklist | GET,PATCH | adminKey | clean |
| org-activity | GET,POST | session | clean (POST: orphan-row hygiene, within-tenant) |
| org-email | POST | adminKey | clean |
| org-facilities | GET,POST,PATCH | session | clean — claim checks `existing.organization_id`; remove scoped to org |
| org-users | GET,POST,PATCH,DELETE | session (org_admin) | clean (PATCH missing role/status enum check — within-tenant hygiene) |
| organizations | GET,POST,PATCH | session + signup | clean — PATCH field whitelist; no plan/limit mass-assign |
| page-interaction-stats | GET | adminKey | clean |
| page-interactions | POST | public | clean — anonymous page telemetry; rate-limited |
| partial-lead | GET,POST,PATCH | adminKey | clean |
| partner-signup | POST | public | clean — SIGNUP_HOURLY; creates pending org/user |
| partner/audit-log | GET | session | clean — hard-scoped to `session.organization.id` |
| partner/avatar | PUT,DELETE | session | clean — keyed to `session.user.id` |
| partner/changelog-viewed | PATCH | session | clean — `where {id: session.user.id}` |
| partner/notifications | GET,PATCH | session | clean — own user / org-null; PATCH org-scoped |
| partner/notifications/preferences | GET,PATCH | session | clean — keyed by user.id; key whitelist |
| partner/onboarding | GET | session | clean — counts scoped to org |
| partner/organization | PATCH,DELETE | session (org_admin) | clean — `where {id: session.user.organization_id}` |
| partner/profile | GET,PATCH | session | clean — keyed by user.id; only name/email writable |
| partner/sessions | GET,DELETE | session | clean — constrained to own `user_id` |
| password-reset | POST | public (token) | clean — token capability flow; rate-limited |
| places-photo | GET | public proxy | clean — `ref` regex-restricted; fixed Google host (no SSRF) |
| platform-connections | GET,DELETE | adminKey | clean — GET omits access/refresh tokens; DELETE nulls tokens |
| pms-data | GET,POST | access-code + adminKey | clean — `authorizeRequest` verifies facility ownership; POST admin-only |
| pms-upload | POST | **public** (email lookup) | **M1** — unauthenticated write keyed only on `contact_email` |
| portal-gbp | GET | access-code | clean — resolves client→facility, scoped |
| portal-upload | GET,POST | access-code + adminKey | clean — `resolveClient` validates code+email; blob path namespaced |
| proxy-video | GET | adminKey | clean — exemplary SSRF guard (allowlist + private-IP deny + `redirect:error`) |
| public-activity | GET | public | clean — redacted ticker (state/city only, no names) |
| public-stats | GET | public | clean — aggregate marketing stats |
| publish-ad | GET,POST | adminKey | clean (Angelo's domain) |
| publish-social | POST | adminKey | clean |
| push-send | POST | adminKey | clean |
| push-subscribe | POST,DELETE | adminKey | clean |
| push-vapid-key | GET | public | clean — returns only the public VAPID key |
| r | GET | public (redirect) | clean — redirects to fixed first-party origin via DB slug (no open redirect) |
| referrals | GET,POST,PATCH | adminKey | clean |
| report-open | GET,POST | public (tracking pixel) | clean — `isValidUuid` then parameterized update; returns 1×1 GIF |
| resend-access-code | POST | public | clean — emails code to the on-file address; rate-limited |
| review-request | POST | public/admin | clean — rate-limited |
| revenue-intelligence | GET | adminKey | clean — DB reads only |
| revenue-loss | GET | adminKey | clean |
| scrape-website | POST | adminKey | clean (**I3** redirect-follow SSRF residual, admin-gated) — initial URL passes SSRF blocklist |
| send-template | GET,POST | adminKey | clean |
| shared-audits | GET,PATCH | adminKey | clean |
| signup | POST | public | clean — SIGNUP_HOURLY; account creation |
| sms-send | POST | adminKey | clean |
| social-posts | GET,POST,PATCH,DELETE | adminKey | clean |
| stock-images | GET | adminKey | clean — fixed Unsplash host |
| storedge-import | POST | adminKey | clean |
| stripe-webhook | POST | sig (Stripe `constructEvent`) | clean — raw-body verify before parse; fail-closed; idempotent |
| style-references | GET,POST,PATCH,DELETE | adminKey | clean |
| subscription-usage | GET | session | clean — counts scoped to org |
| synthesize | POST | adminKey | clean — Anthropic only, no URL fetch |
| tenants | GET,POST,PATCH | adminKey | clean — admin god-mode (storage-tenant PII admin-only) |
| tracking/event | POST | public | clean — anonymous analytics; rate-limited |
| tracking/visit | POST | public | clean — anonymous analytics; rate-limited |
| upload-token | PUT | adminKey | clean — scoped blob upload token |
| upsell | GET,POST,PATCH | adminKey | clean |
| utm-links | GET,POST,DELETE | adminKey | clean |
| verify-email | POST | session + token | clean — send keyed to user.id; verify by secret token |
| walkin-attribution | POST | public | clean — rate-limited attribution capture |
| webhooks/calcom | POST | sig (HMAC) | clean — raw-body verify before parse, fail-closed prod (cosmetic: hex-vs-utf8 compare, still constant-time) |
| webhooks/storedge | POST | sig (HMAC) | clean — raw-body verify before parse; UUID-validated; fail-closed prod |
| **cron/** (20 routes) | GET (+POST→GET) | cron | clean — all gate `verifyCronSecret` on GET; POST variants delegate to GET |
| cron/aggregate-page-stats | GET | cron | clean |
| cron/check-campaign-alerts | GET | cron | clean |
| cron/cleanup-organizations | GET | cron | clean |
| cron/cleanup-sessions | GET | cron | clean |
| cron/data-retention | GET | cron | clean |
| cron/generate-noi-reports | GET,POST | cron | clean — POST delegates to guarded GET |
| cron/process-drips | GET | cron | clean |
| cron/process-gbp | GET | cron | clean |
| cron/process-nurture | GET | cron | clean |
| cron/process-pms-uploads | GET | cron | clean |
| cron/process-recovery | GET | cron | clean |
| cron/process-synthesis-queue | GET | cron | clean |
| cron/retry-diagnostic-audits | GET | cron | clean |
| cron/review-solicitation | GET | cron | clean |
| cron/score-churn-risk | GET,POST | cron | clean — POST delegates to guarded GET |
| cron/score-ecri-sensitivity | GET,POST | cron | clean — POST delegates to guarded GET |
| cron/send-client-reports | GET | cron | clean |
| cron/sync-audiences | GET | cron | clean |
| cron/update-retention-outcomes | GET,POST | cron | clean — POST delegates to guarded GET |
| cron/weekly-digest | GET | cron | clean |
| cron/weekly-synthesis | GET | cron | clean |
| v1/api-keys | GET,POST,DELETE | v1key + adminKey | clean — GET scoped to key org; POST/DELETE admin-only |
| v1/call-logs | GET | v1key | clean — `requireScope` + `requireOrgFacility` |
| v1/facilities | GET,POST,PATCH | v1key | clean — `organization_id` scoped; column whitelist |
| v1/facility-availability | GET | v1key | clean — `requireOrgFacility` |
| v1/facility-snapshots | GET,POST | v1key | clean — `requireOrgFacility` |
| v1/facility-specials | GET,POST | v1key | clean — facility org-validated; double-constrained update |
| v1/facility-units | GET,POST | v1key | clean — `requireOrgFacility`; upsert keyed to facility |
| v1/landing-pages | GET | v1key | clean — JOIN scoped to `organization_id` |
| v1/leads | GET,POST,PATCH | v1key | clean — JOIN/UPDATE scoped to org; whitelist excludes facility_id |
| v1/tenants | GET,POST,PATCH | v1key | clean — org-scoped; cannot relocate tenant cross-facility |
| v1/usage | GET | v1key | clean — aggregates filtered by `organization_id` |
| v1/webhooks | GET,POST,PATCH,DELETE | v1key + sig | clean — all ops constrained to `organization_id`; https + event whitelist |

Summary: 184 routes swept. **4 filed findings** (SEC-001 Critical; SEC-002/003/004 High) across 7 route files (SEC-004 spans 4 callbacks). **7 Medium / 6 Informational** appendix items. All remaining routes verified clean for the audited categories (cross-tenant authz, auth, billing, secrets, SSRF, injection, cost-abuse, misconfig).
