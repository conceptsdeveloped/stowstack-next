# StorageAds — Security Audit Findings Index

Date: 2026-05-29
Auditor: Whitehat static review (source only; no live testing, no code modified)
Scope: `src/app/api/**` (184 route files, 0 `'use server'` actions), auth/session/billing/rate-limit libraries, middleware (`src/proxy.ts`), `next.config.ts`, Prisma schema, git history (secrets).
Method: route + auth + tenant-scoping + secret inventories (`recon/`), per-method guard scan, four parallel category sweeps, then per-finding confirmation in source. Every filed finding carries file:line, data-flow, exploit, and reachability proof.

Stack (verified from lockfile): Next.js 16.2.0 · @clerk/nextjs 7 · Prisma 5.22 · Stripe 20.4 · @upstash/redis 1.37 · @anthropic-ai/sdk 0.80 · Sentry 10.46 · Vercel.

> **CVE-2025-29927 (Next.js middleware auth bypass via `x-middleware-subrequest`):** **Not applicable.** Fixed in Next 15.2.3 / 14.2.25; this app runs 16.2.0. Independently, `src/proxy.ts` does not use middleware as the auth boundary for APIs — it returns `NextResponse.next()` for all `/api/*` and every route self-gates — so a middleware bypass would not expose API data even on an unpatched build.

## Findings by severity

| ID | Sev | Location | OWASP/CWE | One-line |
|----|-----|----------|-----------|----------|
| [SEC-001](./SEC-001-client-invoices-unauthenticated-cross-tenant-disclosure.md) | **Critical** | `client-invoices/route.ts:281-329` | API1/API2, CWE-306/639/200 | Unauthenticated GET; null-`facilityId` fallthrough returns the 24 most recent `invoice_sent` rows (client emails, $ amounts, facility names) across **all** tenants. |
| [SEC-002](./SEC-002-client-activity-idor-lead-pii.md) | **High** | `client-activity/route.ts:41-110` | API1, CWE-639/306 | IDOR: `?facilityId=<uuid>` bypasses the access-code branch → any facility's lead activity (incl. `lead_name` PII), unauthenticated. |
| [SEC-003](./SEC-003-facility-lookup-unauthenticated-facility-overwrite.md) | **High** | `facility-lookup/route.ts:65-198` | API1/API5, CWE-639/306/770 | Unauthenticated POST with `facilityId` overwrites any facility's Google fields and wipes/replaces its Places assets (no ownership check); + uncapped billed Places fan-out. |
| [SEC-004](./SEC-004-oauth-callback-unsigned-state-connection-fixation.md) | **High** | `auth/{gbp,google,meta,tiktok}/callback/route.ts` | API8, CWE-352/345/306 | OAuth callbacks trust an unsigned base64 `state={facilityId}` with no auth → cross-tenant fixation of provider OAuth tokens (4 providers). |

Root-cause themes: (1) **broken object-level authz on portal reads** — request-supplied `facilityId`/`clientId` trusted instead of derived from a verified credential (SEC-001, SEC-002); the codebase already has the correct pattern in `client-reports:42`, `pms-data` `authorizeRequest`, `facility-pms:42`, `alert-history`. (2) **unauthenticated state-changing endpoints** that key writes off an attacker-supplied id (SEC-003, SEC-004).

## Medium / Informational appendix (not filed individually)

Medium:
- **M1 — `pms-upload` POST unauthenticated write keyed on `contact_email`** (`pms-upload/route.ts:17-72`). No auth; facility resolved by matching `contact_email`. An attacker who knows a facility's (often public) contact email can store arbitrary `report_data` (≤10 MB), flip `facilities.pms_uploaded`, and trigger admin notification emails. Data-poisoning of PMS/occupancy intelligence + notification spam. Fix: require portal access code or admin key (cf. `portal-upload` `resolveClient`). Notification HTML is `escapeHtml`-escaped (no XSS).
- **M2 — HTML injection into data-deletion notification emails** (`data-deletion/route.ts` `buildAdminNotificationEmail`, ~`:413-426`, and the user confirmation email). Unauthenticated public submit interpolates `email`/`name`/`reason` raw (no escaping) into email HTML; `escapeHtml` exists in `@/lib/validation` but is unused here. Stored-HTML/email-injection toward admins. Fix: `escapeHtml` all three fields.
- **M3 — `generate-video` POST has no rate limit** (`generate-video/route.ts:470-472`). Admin-gated (`isAdminRequest`) but the only AI generator missing `applyRateLimit`; multi-clip FAL/Runway jobs → uncapped spend by any holder of the shared `ADMIN_SECRET`. Fix: add `applyRateLimit(EXPENSIVE_API_HOURLY)`.
- **M4 — `diagnostic-analyze` POST unauthenticated Anthropic call, no input-size cap** (`diagnostic-analyze/route.ts:98-135`). Public audit endpoint; `max_tokens: 16384` streaming Claude call on uncapped `formData`; only protection is `EXPENSIVE_API_HOURLY` (5/hr/IP) which fails open. Fix: input byte cap + auth/CAPTCHA + consider fail-closed limit.
- **M5 — `analyze-map` POST unauthenticated Claude *vision* call, no image-size cap** (`analyze-map/route.ts:65-132`). Public; user base64 `image` → Sonnet vision `max_tokens: 8192`, only mime-type checked, no byte cap; same fail-open 5/hr/IP. Fix: cap image bytes + auth.
- **M6 — `funnel-metrics` POST unauthenticated metric write** (`funnel-metrics/route.ts:171-208`). GET is admin-gated; POST is not — anyone can upsert/increment `funnel_stage_metrics` for any `funnelId`, polluting funnel analytics. Fix: gate POST with `requireAdminKey` (or treat as a signed first-party event).
- **M7 (systemic) — rate limiting fails open** (`src/lib/rate-limit.ts:33-36, 67-70`). `checkRateLimit` returns `{allowed:true}` when `KV_REST_API_URL/TOKEN` are unset or Upstash errors, and is keyed on the first `x-forwarded-for` hop. If KV is ever misconfigured in prod, every limiter — including the unauthenticated paid-API routes (M3-M5, SEC-003) — becomes unthrottled. Fix: fail-closed (or low static fallback) for unauthenticated cost-bearing routes.

Informational / hardening:
- **I1 — CSP allows `'unsafe-inline'` in `script-src`** (enforcing CSP in `next.config.ts:25`), weakening XSS defense; also two different CSPs ship (`proxy.ts` sends `Content-Security-Policy-Report-Only`, `next.config.ts` sends an enforcing `Content-Security-Policy` with `img-src … https: http:`). Reconcile to one strict, nonce-based policy. Current XSS sinks are limited to JSON-LD `dangerouslySetInnerHTML` (`JSON.stringify`'d structured data — low risk).
- **I2 — CORS allowlist includes `http://localhost:3000` and `:5173`** in all environments (`api-helpers.ts:6-11`). Strip localhost from production builds.
- **I3 — SSRF-via-redirect residual** in `scrape-website`/`market-intel`: the initial URL passes an SSRF blocklist but `fetchWithRetry` follows redirects without re-validating (admin-gated). `proxy-video` is the correct model (`redirect:"error"` + host allowlist + private-IP denylist). Apply the same to `scrapeWebsite`.
- **I4 — FAL image gen sets `enable_safety_checker:false`** (`generate-image/route.ts:319`) — content-safety, admin-only.
- **I5 — shared `ADMIN_SECRET` is god-mode across all tenants** (`api-helpers.ts:78-95`); per-admin `sa_adm_` scoped keys exist as the migration path. Tracked in `storageads-remediation-tasks/10-PER-ADMIN-API-KEYS.md`.
- **I6 — `requireAdminAuth` Clerk fallback is effectively inert for `/api/*`** (`api-helpers.ts:130-162`): middleware skips Clerk for API routes, so `auth()` has no populated session — those routes are admin-key-only in practice (lockout risk, not a bypass).

## What is solid (verified, not findings)
- **Billing integrity.** `stripe-webhook` verifies `constructEvent` on the **raw** body before parsing, fail-closed on missing sig/secret; handlers idempotent. `create-checkout-session` derives `priceId` server-side from plan and sets `quantity = facilityCount` (clamped 1-999) — no client-controlled price/plan/entitlement.
- **Other webhooks.** `webhooks/storedge`, `webhooks/calcom`, `call-webhook` (Twilio `validateRequest`), `data-deletion/meta-callback` (Meta `signed_request`) all verify HMAC/signature on the raw body, constant-time, fail-closed in production.
- **v1 API tenant isolation.** Every `/api/v1/*` route derives the org from the API key and scopes by `organization_id` / `requireOrgFacility`; column whitelists prevent mass-assignment (`facility_id`/`organization_id` not settable).
- **Partner/org session routes** scope every read/write to `session.user.organization_id`; `organizations`/`org-users` use explicit field whitelists.
- **No SQL injection:** no `$queryRawUnsafe`/`$executeRawUnsafe` in app code (test-only); all raw SQL uses parameterized tagged templates.
- **No RCE sinks:** no `child_process`/`exec`/`eval`/`new Function`/`vm`/dynamic `import(var)`.
- **No client-side secret leakage:** intersection of 252 `"use client"` files × 95 secret-referencing files is empty; only `NEXT_PUBLIC_*` (publishable/pixel/measurement/VAPID-public) reach the client.
- **No open redirects:** `r/` redirects to a fixed first-party origin using a DB-derived slug; all `redirect()` targets are server-derived.
- **No secrets in git history:** scan across all 225 commits surfaced only fake test values; no tracked `.env`.
- **Auth primitives:** scrypt password hashing; SHA-256-hashed session/API-key tokens; timing-safe admin/cron comparisons; the legacy unsigned base64 session token from the March 2026 audit has been removed. `proxy-video` is an exemplary hardened SSRF proxy.

See [COVERAGE.md](./COVERAGE.md) for the per-route verdict on all 184 routes.
