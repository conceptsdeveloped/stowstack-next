# BACKLOG.md — StorageAds (stowstack-next) Pre-Alpha Completion Backlog

> Read-only QA sweep. Senior-QA methodology per PREALPHA_AUDIT.md, golden-path + tenancy lens ADAPTED to this repo's 4-auth-system architecture (the audit doc targets the v2 rewrite; this repo is the live product). Hand to the build swarm.

## Summary

**62 findings** after review (7 dropped as false-positive/out-of-scope at verification).

| Severity | Count |
|---|---|
| P0 | 2 |
| P1 | 22 |
| P2 | 17 |
| P3 | 21 |

### Golden Path — 10-step verdict

| # | Step | Verdict | Notes |
|---|---|---|---|
| 1 | Top-of-funnel | **PARTIAL** | Public funnel returns inline Google quick-score + lead capture; full shared_audits diagnostic auto-gen is admin-key-gated (audit-generate-diagnostic). Prospect never auto-gets the shareable diagnostic. |
| 2 | Lead capture & pipeline | **COMPLETE** | consumer-lead persists; admin pipeline shows leads; status transitions work. (orphan lead-capture/partial-lead endpoints exist but live path is consumer-lead.) |
| 3 | Client conversion | **COMPLETE** | status->client_signed issues access code; resend-access-code emails it; portal login authenticates via authenticatePortalRequest. |
| 4 | Onboarding | **COMPLETE** | /portal/onboarding wizard saves each step to client-onboarding (CSRF-exempt); fully wired. |
| 5 | PMS data | **PARTIAL** | CSV upload->pms-import pipeline persists facility data + cron processes queue. UI advertises PDF/Excel but parser is CSV-only; non-CSV silently stuck 'uploaded'. |
| 6 | Campaigns -> landing pages | **COMPLETE** | landing-pages/generate + funnels/generate persist landing_pages/sections w/ unique slug; /lp/[slug] renders DB sections publicly. |
| 7 | Marketing surfaces fire | **PARTIAL** | Drip/email + GBP send for real. BUT drips never enroll from the live consumer-lead path (enrollInFunnelDrip only in orphan lead-capture). SMS code-complete but inert until TWILIO_* set (ops/context). |
| 8 | Reports / intelligence | **PARTIAL** | occupancy/revenue/market/churn intel compute from real persisted PMS data (NOT mock). BUT occupancy-forecast revenueLoss = flat $110/unit constant; storEDGE move_in.completed webhook writes activity_log only -> client-reports/attribution undercount move-ins. |
| 9 | Attribution | **BROKEN** | attribution metrics (CPL, cost-per-move-in, ROAS) are SQL-computed. BUT walk-in flow is DOUBLY broken: GET /api/walkin-attribution 405s on page load (no GET handler) AND POST 403s at the proxy CSRF gate on submit. storEDGE webhook move-ins not recorded to the tables attribution reads. |
| 10 | Billing (agency revenue) | **PARTIAL** | Stripe webhook sig-verify + CSRF + admin-key on writes PASS; handlers idempotent; subscription.updated backfills creation. BUT post-checkout activation handoff broken (invite_token orphaned, no welcome email, checkout-success reads userId/tempPassword never set). Self-serve checkout intentionally unwired pre-launch (alpha=Blake's own portfolio). |

### Tenancy verdict

**PASS with 1 P0 defect.** All 203 routes across the 4 auth systems + cron + v1 were traced: admin (requireAdminKey), facility-scoped (requireFacilityAccess), portal (authenticatePortalRequest), partner (getSession->org), v1 (requireApiAuth+requireScope+org-scoped SELECTs), cron (verifyCronSecret). No unauthenticated tenant-data routes; no unscoped queries on a resolved caller — EXCEPT one cross-tenant IDOR: `src/app/api/tenants/route.ts:64` (a manage-session scoped to facility A reads facility B renter PII via `?tenantId`); upgraded to P0 at review.

### Cross-cutting theme: the proxy CSRF gate

The single highest-leverage fix. `src/proxy.ts isCsrfExempt()` 403s mutating public/pre-session POSTs that send no `x-csrf-token` (no client sends it). One exemption-list fix (or a client-side token injector) resolves a cluster: walk-in attribution (P0), signup/password-reset/2fa (P1, live CTAs), verify-email/manage (P2), and several silently-swallowed tracking beacons. See `audit/CROSS_PARTITION_NOTES.jsonl`.

---

## P0 — 2 findings

### SA-0001 · P0 · tenancy-breach · golden-path step 8
`src/app/api/tenants/route.ts:64`  ·  partition: tenancy
Claim violated: tenant/renter data is scoped to the operator's own facility
Evidence: `if (tenantId) { ... WHERE t.id = ${tenantId}::uuid ... } (all sub-queries scoped only by tenant_id, never re-checked against the facility the caller is authorized for)`
Done when: a manage-session scoped to facility A that requests ?facilityId=A&tenantId=<tenant of facility B> receives 401/404, and a regression test asserts cross-facility tenantId reads are denied
Hint: after fetching the tenant by id, resolve its facility_id and call requireFacilityAccess(req, tenant.facility_id) (mirror the pattern already used in call-logs PATCH / facility-context DELETE) before returning payments/escalations/churn/communications

### SA-0002 · P0 · integration-gap · golden-path step 9
`src/app/api/walkin-attribution/route.ts:10`  ·  partition: api-attribution-tracking
Claim violated: walk-in move-ins are attributed back to ad source
Evidence: `export async function POST(req: NextRequest) — route is NOT listed in isCsrfExempt() (src/proxy.ts:80-130); caller src/app/walkin/[code]/page.tsx:67 POSTs with headers { 'Content-Type': 'application/json' } only (no x-csrf-token, no x-admin-key/Bearer/x-org-token).`
Done when: POST /api/walkin-attribution succeeds (200, row persisted) when called from the public /walkin/[code] page in production; either the path is added to isCsrfExempt() in src/proxy.ts (it authenticates via accessCode in the body, same model as the existing audit-form/consumer-lead/client-data exemptions) OR the client sends a valid double-submit x-csrf-token. Verified by a non-403 POST in prod.
Hint: Add `if (path === "/api/walkin-attribution") return true;` to isCsrfExempt() in src/proxy.ts — it is body/accessCode authenticated and rate-limited, matching the existing public-lead exemptions. proxy.ts requiresCsrf('POST')=true + not exempt + no token = hard 403 'Invalid or missing CSRF token'.

## P1 — 22 findings

### SA-0003 · P1 · integration-gap · golden-path step 2
`src/app/api/signup/route.ts:57`  ·  partition: api-admin-misc
Claim violated: an operator/partner can self-serve sign up (the public pricing-page signup CTA)
Evidence: `POST /api/signup is called from src/app/signup/page.tsx via fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" } }) — no x-csrf-token, no Bearer/x-admin-key/x-org-token; and /api/signup is NOT in isCsrfExempt() (src/proxy.ts:80-130).`
Done when: a public signup POST succeeds in prod: either /api/signup is added to isCsrfExempt() (it authenticates by email+password in the body, no ambient session to protect), OR a first-party client helper injects the x-csrf-token double-submit header. Today the proxy CSRF gate (src/proxy.ts:138-152) runs validateCsrf(), which fails because no client sends x-csrf-token (grep finds the header only in src/lib/csrf.ts), so every signup POST 403s before reaching the handler. Same root cause that broke /porta
Hint: add path==="/api/signup" to isCsrfExempt() next to /api/organizations, OR ship a global csrf-token fetch wrapper

### SA-0004 · P1 · integration-gap · golden-path step 3
`src/app/api/password-reset/route.ts:1`  ·  partition: api-admin-misc
Claim violated: a partner can recover their account via password reset
Evidence: `All 3 actions called from src/components/partner/partner-shell.tsx via plain fetch("/api/password-reset", {method:"POST", headers:{"Content-Type":"application/json"}}); /api/password-reset is NOT in isCsrfExempt() (src/proxy.ts:80-130).`
Done when: password-reset POST succeeds in prod: add /api/password-reset to isCsrfExempt() (pre-login flow, no session cookie to protect; abuse bounded by per-IP/email rate limits) OR inject the x-csrf-token header client-side. Today the proxy CSRF gate 403s all three actions before the handler runs, so password reset is fully non-functional in prod.
Hint: exempt /api/password-reset in isCsrfExempt() alongside the other pre-auth endpoints

### SA-0005 · P1 · integration-gap · golden-path step 3
`src/app/api/2fa/route.ts:1`  ·  partition: api-admin-misc
Claim violated: a partner who enabled 2FA can complete the 2FA login challenge
Evidence: `2FA login-challenge verify is called from src/components/partner/two-factor-setup.tsx:475 via plain fetch("/api/2fa",{method:"POST",headers:{"Content-Type":"application/json"}}) with a tempToken (pre-session); /api/2fa is NOT in isCsrfExempt().`
Done when: the tempToken-based 2FA verify POST succeeds in prod (exempt /api/2fa in isCsrfExempt or inject x-csrf-token). Today it 403s at the proxy, locking out any partner who enabled 2FA. NOTE: the 2fa enable/setup call at line 42 uses authFetch (sends Authorization: Bearer ss_), so THAT path is auto-exempt — only the pre-session login challenge (line 475, plain fetch) is broken.
Hint: exempt /api/2fa for the tempToken challenge, or make two-factor-setup.tsx:475 use the authFetch/token wrapper

### SA-0006 · P1 · config-gap · golden-path step 3
`src/app/api/client-messages/route.ts:84`  ·  partition: api-portal-client
Claim violated: the finished portal two-way messaging UI is backed by a durable Postgres store
Evidence: `const rows = await db.client_messages.findMany({ where: { client_id: clientId }, ... })`
Done when: prisma/manual/2026-06-28-customer-dashboard-tables.sql is applied to prod (npx prisma db execute) and verified; GET/POST /api/client-messages return 200 against the real table instead of throwing (caught -> 500). There is NO migration that creates this table (prisma/migrations has only 0_init); the model exists in schema.prisma so typecheck/build pass and the gap is invisible until runtime.
Hint: apply the documented manual DDL to prod, then redeploy so the generated client matches; consider promoting it to a real migration so deploys are self-applying

### SA-0007 · P1 · contract-break · golden-path step 3
`src/components/partner/partner-shell.tsx:74`  ·  partition: contract
Claim violated: a partner/org user can reset their password
Evidence: `fetch("/api/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: { action: "verify"|"request", ... } }) — no exempting header; /api/password-reset not in isCsrfExempt()`
Done when: POST /api/password-reset succeeds in prod for both actions; /api/password-reset added to isCsrfExempt() and a test asserts the proxy does not 403 it
Hint: add `if (path === "/api/password-reset") return true;` to isCsrfExempt() in src/proxy.ts (public pre-auth, rate-limited at the route)

### SA-0008 · P1 · contract-break · golden-path step 3
`src/app/verify-email/page.tsx:23`  ·  partition: contract
Claim violated: a user can verify their email from the emailed link
Evidence: `fetch("/api/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: { action: "verify", token } }) — no exempting header; /api/verify-email not in isCsrfExempt()`
Done when: clicking the verification link verifies the email in prod; /api/verify-email added to isCsrfExempt() and a test asserts no proxy 403
Hint: add `if (path === "/api/verify-email") return true;` to isCsrfExempt() in src/proxy.ts (token-in-body auth, rate-limited)

### SA-0009 · P1 · missing-impl · golden-path step 5
`src/app/admin/onboarding/page.tsx:202`  ·  partition: ui-admin
Claim violated: storEDGE step says 'Your storEDGE API key connects your reservation system to StorageAds. This is how we track move-ins.' but the form is inert
Evidence: `<button type="button" ...>Test & Save</button>  // no onClick; adjacent <input placeholder="storEDGE API Key"> has no value/onChange binding`
Done when: entering a key and clicking Test & Save calls a real endpoint and persists/validates the connection
Hint: wire the input to state and POST to a platform-connections endpoint; or gate the step behind 'Blake will set this up'

### SA-0010 · P1 · contract-break · golden-path step 7
`src/app/api/consumer-lead/route.ts:116`  ·  partition: api-audit-funnel
Claim violated: converting on a funnel landing page enrolls the lead in that funnel's post-conversion drip sequence
Evidence: `db.partial_leads.create({ data: { ... converted: true, lead_status: "new" ... } }) — no funnel post_conversion drip enrollment anywhere in this handler`
Done when: a conversion through /api/consumer-lead on a funnel-owned landing page creates a drip_sequences row for that funnel's post_conversion template (the enrollInFunnelDrip logic currently dead in lead-capture is invoked from the live path).
Hint: call/port enrollInFunnelDrip (lead-capture/route.ts:13) into consumer-lead after the partial_leads.create, keyed on landing_page_id -> funnel_id; OR repoint landing-page forms at /api/lead-capture and CSRF-exempt it.

### SA-0011 · P1 · stub-return · golden-path step 8
`src/app/api/occupancy-forecast/route.ts:134`  ·  partition: api-pms-intel
Claim violated: Occupancy forecast presents data-driven projected revenue loss per facility
Evidence: `const revenueLoss = vacantUnits * 110;`
Done when: revenueLoss uses the facility's computed average/street rate instead of a flat $110 constant
Hint: Compute avgRate from the latest snapshot (actual_revenue/occupied_units) or units street_rate and multiply by vacantUnits

### SA-0012 · P1 · integration-gap · golden-path step 9
`src/app/api/tracking/visit/route.ts:17`  ·  partition: api-attribution-tracking
Claim violated: paid-click visits (gclid/fbclid/utm) are captured for attribution
Evidence: `POST not in isCsrfExempt() (src/proxy.ts); caller src/hooks/use-tracking-params.ts:48 fires fetch('/api/tracking/visit',{method:'POST',headers:{'Content-Type':'application/json'}}).catch(()=>{}) — no x-csrf-token, failure swallowed silently.`
Done when: POST /api/tracking/visit returns 200 and persists a visit in prod; add the path to isCsrfExempt() in src/proxy.ts OR have the hook send a valid x-csrf-token. Verified by a non-403 POST in prod.
Hint: Add `/api/tracking/visit` to isCsrfExempt() (public anonymous beacon, no session, rate-limited PUBLIC_WRITE). Currently 403s in prod and the .catch(()=>{}) hides it, so visit/UTM attribution silently records nothing.

### SA-0013 · P1 · integration-gap · golden-path step 9
`src/app/api/tracking/event/route.ts:17`  ·  partition: api-attribution-tracking
Claim violated: reservation/move-in funnel events from the storEDGE embed are captured
Evidence: `POST not in isCsrfExempt() (src/proxy.ts); caller src/components/storedge/storedge-embed.tsx:142 fires fetch('/api/tracking/event',{method:'POST',headers:{'Content-Type':'application/json'}}).catch(()=>{}) — no x-csrf-token, failure swallowed silently.`
Done when: POST /api/tracking/event returns 200 and persists in prod; add the path to isCsrfExempt() in src/proxy.ts OR send a valid x-csrf-token. Verified by a non-403 POST in prod.
Hint: Add `/api/tracking/event` to isCsrfExempt() (public anonymous embed beacon, rate-limited). Currently 403s in prod; the embed's .catch(()=>{}) hides the failure, so storEDGE funnel events are silently dropped.

### SA-0014 · P1 · integration-gap · golden-path step 9
`src/app/api/page-interactions/route.ts:32`  ·  partition: api-attribution-tracking
Claim violated: landing-page engagement (scroll depth, time-on-page, clicks) is captured for A/B and attribution
Evidence: `POST not in isCsrfExempt() (src/proxy.ts); caller src/app/lp/[slug]/page.tsx:922 fires fetch('/api/page-interactions',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true}).catch(()=>{}) — no x-csrf-token, failure swallowed silently.`
Done when: POST /api/page-interactions returns 200 and persists in prod; add the path to isCsrfExempt() in src/proxy.ts OR send a valid x-csrf-token. Verified by a non-403 POST in prod.
Hint: Add `/api/page-interactions` to isCsrfExempt() (public anonymous landing-page beacon, IP rate-limited 30/60s). Currently 403s in prod; .catch(()=>{}) hides it, so landing-page analytics record nothing.

### SA-0015 · P1 · integration-gap · golden-path step 9 · ⚠️angelo-domain(advisory)
`src/app/api/meta-capi/route.ts:221`  ·  partition: api-attribution-tracking
Claim violated: server-side Meta conversion events (CAPI) fire for ad attribution
Evidence: `POST not in isCsrfExempt() (src/proxy.ts); caller src/app/lp/[slug]/page.tsx:884 fires fetch('/api/meta-capi',{method:'POST',...}) from the browser with no x-csrf-token. NOTE: meta-capi route logic is Angelo's domain; the fix is in proxy.ts (Blake's).`
Done when: POST /api/meta-capi from the browser returns non-403 in prod; add the path to isCsrfExempt() in src/proxy.ts OR send a valid x-csrf-token. Verified by a non-403 POST in prod.
Hint: Add `/api/meta-capi` (and likely `/api/google-conversion`) to isCsrfExempt() in src/proxy.ts. Advisory: route internals are Angelo's; the CSRF exemption is Blake's proxy.ts. Currently the browser-fired CAPI call 403s in prod.

### SA-0016 · P1 · integration-gap · golden-path step 9
`src/app/api/v1/webhooks/route.ts:113`  ·  partition: api-v1-external
Claim violated: server-side fetches cannot be pointed at internal infrastructure (SSRF)
Evidence: `const resp = await fetch(webhook.url, { method: "POST", headers: {...}, body, signal: controller.signal }); ... const responseBody = (await resp.text()).slice(0, 1024); ... responsePreview: responseBody.slice(0, 200)`
Done when: webhook target URLs are validated against private/loopback/link-local/metadata ranges (RFC1918, 127.0.0.0/8, 169.254.0.0/16, ::1, .internal/.local) at create-time AND re-checked at test/dispatch-time (resolve hostname to defeat DNS rebinding), mirroring proxy-video's isAllowedUrl; blocked URLs return 400
Hint: extract proxy-video's isAllowedUrl into a shared lib (e.g. src/lib/ssrf-guard.ts) and call it in v1/webhooks test + lib/webhook.ts dispatchWebhook (lib-core / Scout 5 owns webhook.ts — coordinate)

### SA-0017 · P1 · contract-break · golden-path step 9
`src/app/walkin/[code]/page.tsx:40`  ·  partition: contract
Claim violated: walk-in attribution capture page validates a code and lets a manager log an in-person move-in
Evidence: `const res = await fetch(`/api/walkin-attribution?code=${encodeURIComponent(code)}`); ... if (!res.ok) { setInvalidCode(true); return; }`
Done when: loading /walkin/<valid-code> renders the attribution form (not the invalid-code screen); a regression test asserts GET /api/walkin-attribution?code=<valid> returns 200 with facilityName, and the page shows the form
Hint: add an `export async function GET` to src/app/api/walkin-attribution/route.ts that looks up the facility by access code and returns { facilityName } (scoped to that client), OR point the client validation at an existing endpoint that resolves a code to a facility

### SA-0018 · P1 · contract-break · golden-path step 9
`src/app/walkin/[code]/page.tsx:67`  ·  partition: contract
Claim violated: a facility manager can log an in-person walk-in move-in
Evidence: `fetch("/api/walkin-attribution", { method: "POST", headers: { "Content-Type": "application/json" }, body: ... }) — no x-admin-key/Bearer/x-org-token/x-csrf-token; /api/walkin-attribution is NOT in proxy.ts isCsrfExempt()`
Done when: submitting the walk-in form persists a walkin_attribution row in prod; a test asserts POST /api/walkin-attribution without a CSRF token is not rejected by the proxy (route added to isCsrfExempt, mirroring the other credential-in-body public routes)
Hint: add `if (path === "/api/walkin-attribution") return true;` to isCsrfExempt() in src/proxy.ts (it authenticates via accessCode in the body, like resend-access-code/client-data)

### SA-0019 · P1 · integration-gap · golden-path step 9
`src/app/api/webhooks/storedge/route.ts:126`  ·  partition: golden-path
Claim violated: every move-in is tied back to campaign/source and counted in cost-per-move-in
Evidence: `if (payload.event === 'move_in.completed' && ...) { await db.activity_log.create({ data: { type: 'attributed_move_in', facility_id: facilityId, ... } }); }`
Done when: a move_in.completed webhook with tracking params flips the matched partial_leads row to moved_in (and writes a lead_status_events 'moved_in' row), and attribution/route.ts move_ins + cost_per_move_in reflect it; covered by a test.
Hint: The branch only inserts an activity_log 'attributed_move_in' row; attribution/route.ts and client-reports count move-ins exclusively from partial_leads.lead_status='moved_in' and lead_status_events.to_status='moved_in', so webhook-sourced move-ins are invisible to every revenue metric.

### SA-0020 · P1 · missing-impl · golden-path step 10
`src/app/api/checkout-success/route.ts:59`  ·  partition: api-billing-stripe
Claim violated: post-checkout the operator is handed a working path into their account
Evidence: `if (meta.userId) { await db.$executeRaw`UPDATE org_users SET setup_token_hash = ${setupTokenHash} ...` } ... return jsonResponse({ ..., tempPassword: meta.tempPassword, ... })`
Done when: the dead setup_token_hash branch (meta.userId is never set) and the always-empty tempPassword are removed and replaced with the real invite_token activation path; a test proves the returned payload yields a working first login.
Hint: meta.userId and meta.tempPassword are never set anywhere (neither the webhook nor create-checkout-session set them), so the setup_token_hash UPDATE never runs and tempPassword is always empty. Wire to the invite_token activation flow.

### SA-0021 · P1 · config-gap · golden-path step 10
`src/app/api/client-billing/route.ts:110`  ·  partition: api-portal-client
Claim violated: M5: invoices are a single Postgres system of record surfaced in the portal billing tab
Evidence: `const rows = await db.client_invoices.findMany({ orderBy: { issued_at: "desc" }, ... })`
Done when: prisma/manual/2026-06-28-customer-dashboard-tables.sql applied to prod and verified; GET/POST/PATCH /api/client-billing operate on the real client_invoices table instead of throwing (caught -> 500). Same un-migrated-table gap as client_messages: model is in schema.prisma but no migration creates it.
Hint: apply the documented manual DDL; promote to a migration to make it deploy-safe

### SA-0022 · P1 · missing-impl · golden-path step 10
`src/app/api/stripe-webhook/route.ts:88`  ·  partition: api-billing-stripe/golden-path
Claim violated: a paying operator can sign in after checkout completes
Evidence: `const inviteToken = randomBytes(32).toString("hex"); ... await tx.org_users.create({ data: { ... invite_token: inviteToken, password_hash: "" } });`
Done when: checkout dispatches an activation email keyed on invite_token; a route consumes invite_token to set the initial password and grant first login; covered by a test.
Hint: invite_token is generated but never emailed/consumed; no welcome email in handleCheckoutComplete; checkout-success reads meta.userId/meta.tempPassword that are never set. Cross-partition dup of the api-billing-stripe finding; dedups at merge. Not alpha-blocking (alpha = Blake's own portfolio, self-s

### SA-0023 · P1 · schema-drift
`src/app/api/client-invoices/route.ts:323`  ·  partition: api-billing-stripe
Claim violated: a single canonical invoice system of record (client_invoices) per the M5 migration
Evidence: `const invoices = await db.activity_log.findMany({ where: { type: "invoice_sent", ...(facilityId ? { facility_id: facilityId } : {}) }, ... }); return jsonResponse({ success: true, data: invoices });`
Done when: client-invoices GET reads client_invoices (not activity_log) and returns the same invoice shape as client-billing, or this stale endpoint is removed; verified by a test asserting the source table.
Hint: POST persists to client_invoices (line 254) but GET still lists activity_log rows of type 'invoice_sent' — two divergent invoice readers (client-billing reads client_invoices). Migrate or delete.

### SA-0024 · P1 · config-gap
`src/app/api/client-invoices/route.ts:15`  ·  partition: api-billing-stripe
Claim violated: invoice amounts reflect the operator's actual subscription price
Evidence: `const PLAN_PRICES: Record<string, number> = { launch: 499, growth: 999, portfolio: 1499 };  // vs src/lib/stripe.ts PLANS: launch 750, growth 1500, portfolio 0`
Done when: plan prices come from one shared constant (or the canonical pricing page values) so invoiced management fees match subscription pricing; mismatch resolved and covered by a test.
Hint: client-invoices hardcodes 499/999/1499 as the plan management fee while lib/stripe.ts PLANS hardcodes 750/1500/0. Consolidate; reconcile against src/app/pricing/page.tsx (canonical per CLAUDE.md).

## P2 — 17 findings

### SA-0025 · P2 · scope-gap · golden-path step 1
`src/app/api/audit-generate-diagnostic/route.ts:918`  ·  partition: golden-path
Claim violated: prospect enters facility info -> gets a marketing diagnostic -> schedule a call to review results (CLAUDE.md top-of-funnel)
Evidence: `const authErr = await requireAdminKey(req); ... // and neither src/app/api/audit-form/route.ts nor src/app/api/consumer-lead/route.ts ever invokes diagnostic generation or creates a shared_audits row`
Done when: either audit-form/consumer-lead triggers diagnostic generation that persists a shared_audits row rendered at /audit/[slug] for the prospect, or product owner confirms the inline quick-audit is the deliverable and the /audit/[slug] shared audit is an admin/sales-only artifact (then this drops to context).
Hint: Today the rich Claude diagnostic + shared_audits slug is created only by admin-gated routes (audit-generate-diagnostic POST requires admin key; audit-save/audit-approve are admin). The public funnel delivers a Google-Places quick score + lead capture only. Ambiguous scope -> filed as scope-gap to re

### SA-0026 · P2 · integration-gap · golden-path step 2
`src/app/api/verify-email/route.ts:88`  ·  partition: api-admin-misc
Claim violated: a user can verify their email via the emailed link
Evidence: `action 'verify' is called from src/app/verify-email/page.tsx:23 via plain fetch (no auth header) with a body token; /api/verify-email is NOT in isCsrfExempt().`
Done when: the email-link verify POST succeeds in prod (exempt /api/verify-email or inject the token client-side). Today it 403s at the proxy. NOTE: the 'resend' action sends Authorization/X-Org-Token and is auto-exempt; only the link-driven 'verify' branch (which uses the body token, not a session) is broken.
Hint: exempt /api/verify-email in isCsrfExempt() (the verify branch authenticates by the body token, not a session)

### SA-0027 · P2 · contract-break · golden-path step 5
`src/app/portal/upload/page.tsx:42`  ·  partition: golden-path
Claim violated: operator can upload their PMS report and have it processed
Evidence: `ACCEPT includes .csv,.pdf,.xlsx,.xls (UI), but src/app/api/portal-upload/route.ts:204-206 comment: 'PDF/XLSX stay uploaded for manual handling (parser is CSV-only by design)' and cron/process-pms-uploads returns needs_review for non-CSV`
Done when: either the upload accept list is narrowed to .csv (matching the parser) with clear copy, or a PDF/XLSX parse path is implemented; the operator gets explicit status that a non-CSV needs manual handling. Verified by a test.
Hint: UI promises PDF/Excel support the backend does not deliver; files silently sit in 'uploaded'. Known gap (Scout 2 ui-portal / Scout 5 api-pms-intel own the per-route depth); recorded here as the step-5 spine contract mismatch.

### SA-0028 · P2 · stub-return · golden-path step 8
`src/app/api/occupancy-forecast/route.ts:105`  ·  partition: api-pms-intel
Claim violated: The 'with ads vs without ads' occupancy delta is the forecast's headline output
Evidence: `const monthlyChurnRate = 0.06; ... const organicMoveIns = Math.round(avgMoveInsPerMonth * 0.3 * seasonalFactor);`
Done when: churn and organic-retention factors are computed from facility_pms_revenue_history move_outs / move_ins or surfaced as explicit, tunable assumptions
Hint: Derive monthlyChurnRate from historical move_outs/occupied; derive organic share from pre-ads months; or annotate the response as assumption-based

### SA-0029 · P2 · validation · golden-path step 9
`src/app/api/page-interactions/route.ts:45`  ·  partition: api-attribution-tracking
Claim violated: per-facility analytics are accurate and isolated
Evidence: `const { landingPageId, facilityId, ... } = body; if (!landingPageId || !facilityId) { return errorResponse('Missing required fields',400) } — no isValidUuid() check and no ownership verification, unlike sibling routes src/app/api/tracking/event/route.ts:32 and tracking/visit/route.ts:38 which call i`
Done when: page-interactions rejects or null-guards non-UUID landingPageId/facilityId (via isValidUuid from @/lib/validation) so a public caller cannot write arbitrary cross-facility analytics rows or trigger raw-SQL type errors; covered by a test.
Hint: Import isValidUuid from @/lib/validation and validate landingPageId & facilityId (same pattern as tracking/event + tracking/visit). Public route accepts both IDs straight from the untrusted body into $executeRaw INSERTs.

### SA-0030 · P2 · contract-break · golden-path step 9
`src/app/lp/[slug]/page.tsx:884`  ·  partition: contract
Claim violated: campaign landing pages emit conversion/interaction tracking used for attribution
Evidence: `public landing page POSTs /api/meta-capi (line 884) and /api/page-interactions (line 922), and src/components/storedge/storedge-embed.tsx:142 POSTs /api/tracking/event — all with only Content-Type, none in isCsrfExempt()`
Done when: LP tracking POSTs return 2xx in prod; /api/meta-capi, /api/page-interactions, /api/tracking/event (or /api/tracking/) added to isCsrfExempt() and a test asserts they are not 403'd
Hint: add these public tracking paths to isCsrfExempt() in src/proxy.ts (they are unauthenticated, abuse-bounded by rate limits). meta-capi is Angelo's domain — coordinate.

### SA-0031 · P2 · contract-break · golden-path step 10
`src/app/api/create-checkout-session/route.ts:11`  ·  partition: api-billing-stripe
Claim violated: an operator can subscribe (agency revenue) end-to-end
Evidence: `export async function POST(req: NextRequest) { ... }  // no x-csrf-token check, not in proxy.ts isCsrfExempt() list; pricing page (src/app/pricing/page.tsx) is explicitly 'not a self-serve' flow and links to /#cta, never calls this route`
Done when: if/when a browser CTA is wired to create-checkout-session, the route is added to proxy.ts isCsrfExempt() (it sends no x-admin-key/Bearer/x-org-token and no client sends x-csrf-token, so the proxy 403s it) OR the client sends the double-submit token; otherwise the self-serve checkout path is documented as intentionally manual.
Hint: Same CSRF footgun that broke /portal login in prod: a mutating /api POST not in isCsrfExempt and not header-authed is 403'd before reaching the handler. create-billing-portal is exempt (proxy.ts:125) but create-checkout-session is not. Currently latent because no UI calls it.

### SA-0032 · P2 · contract-break · golden-path step 10
`src/app/api/client-invoices/route.ts:323`  ·  partition: api-portal-client
Claim violated: client_invoices is the single system of record for invoices (M5)
Evidence: `const invoices = await db.activity_log.findMany({ where: { type: "invoice_sent", ... } })`
Done when: client-invoices GET reads the canonical client_invoices table (like client-billing GET) rather than the legacy activity_log 'invoice_sent' events, OR this GET is removed in favor of client-billing GET; the two portal invoice views can no longer disagree (POST writes client_invoices + activity_log; this GET reads only activity_log).
Hint: point this GET at db.client_invoices scoped by client/facility, or delete it and consolidate on client-billing

### SA-0033 · P2 · integration-gap
`src/app/api/manage/unlock/route.ts:35`  ·  partition: api-admin-misc
Claim violated: a facility owner can unlock the /manage owner-tools
Evidence: `POST /api/manage/unlock is called from src/app/manage/page.tsx:28 via plain fetch; manage session is an httpOnly cookie (src/lib/manage-session.ts:13) so no exempting header is sent; /api/manage/unlock is NOT in isCsrfExempt() and its own verifyCsrfOrigin() (line 38) never runs because the proxy gat`
Done when: manage unlock succeeds in prod (exempt /api/manage/unlock + /api/manage/scratch in isCsrfExempt — they already enforce Origin via verifyCsrfOrigin in-route — OR inject x-csrf-token). Today both 403 at the proxy before their own Origin check runs, so the entire cookie-based /manage owner-tools subsystem (and every requireFacilityAccess mutation reached via a manage session) is unreachable for owners; only x-admin-key callers (the admin dashboard) work. Scope caveat: confirm /manage is in alpha sc
Hint: exempt /api/manage/unlock and /api/manage/scratch in isCsrfExempt(); they self-enforce via verifyCsrfOrigin()

### SA-0034 · P2 · validation
`src/app/api/manage/unlock/route.ts:53`  ·  partition: api-admin-misc
Claim violated: the manage unlock code cannot be brute-forced
Evidence: `// TODO(pre-launch): add per-IP rate limiting (Upstash) to slow code guessing.`
Done when: manage/unlock applies a per-IP rate limit (e.g. applyRateLimit/Upstash) so the access code cannot be brute-forced; the documented pre-launch TODO is closed.
Hint: wrap POST with applyRateLimit on a strict tier keyed by IP

### SA-0035 · P2 · error-handling
`src/app/api/stripe-webhook/route.ts:75`  ·  partition: api-billing-stripe
Claim violated: a completed checkout always provisions an org or surfaces a failure
Evidence: `if (!email || !plan || !companyName) return;`
Done when: the early return logs an error and/or captures to Sentry (captureRouteError) with the session id; verified by a test that a metadata-less session triggers an alert.
Hint: Our own create-checkout-session always sets metadata, but a Stripe-dashboard or Payment-Link checkout would hit this silent return — paid, no org, no signal. Relevant since checkout is currently founder-initiated.

### SA-0036 · P2 · validation
`src/app/api/org-email/route.ts:134`  ·  partition: api-partner-org
Claim violated: branded org emails render untrusted lead data safely
Evidence: `${vars.leadName ? `<p ...><strong>Name:</strong> ${vars.leadName}</p>` : ""}`
Done when: all interpolated `vars.*` values in the welcome/campaign_live/monthly_report/lead_notification templates are passed through escapeHtml() (already used in partner-signup/org-users) so a lead name like `<img src=x onerror=...>` cannot inject markup into the operator-facing email
Hint: reuse escapeHtml from src/lib/validation; wrap every ${vars.X} that is text content

### SA-0037 · P2 · contract-break
`src/app/manage/page.tsx:28`  ·  partition: contract
Claim violated: a facility owner can unlock a manage session and operate facility tabs without an admin key
Evidence: `POST /api/manage/unlock and POST /api/manage/scratch (manage/page.tsx:52) send only Content-Type; /api/manage/* is NOT in isCsrfExempt(); additionally authHeaders() (src/lib/facility-auth.ts:47) sends x-manage-token, which proxy.ts does NOT treat as a CSRF-exempt header (only x-admin-key/Bearer/x-or`
Done when: manage/unlock + manage/scratch succeed in prod and a manage-session user can perform a facility-tab mutation; /api/manage/* added to isCsrfExempt() AND x-manage-token added to the exempt-header checks in isCsrfExempt()
Hint: in src/proxy.ts isCsrfExempt(): add `if (path.startsWith("/api/manage/")) return true;` and `if (req.headers.get("x-manage-token")) return true;`

### SA-0038 · P2 · missing-impl
`src/app/admin/onboarding/page.tsx:309`  ·  partition: ui-admin
Evidence: `Review step reads state.storedgeConnected / metaConnected / googleConnected, but the storedge step onNext = ()=>{setCurrentView('ad_accounts')} (line 444) and ad_accounts onNext = ()=>{setCurrentView('review')} (line 449) never call completeStep, so those flags are never set`
Done when: after a successful storEDGE/ad connection the Review shows 'Connected' instead of always 'Pending'
Hint: call completeStep('storedge') / completeStep on successful connect; only mark done on real success

### SA-0039 · P2 · integration-gap
`src/app/admin/billing/page.tsx:267`  ·  partition: ui-admin
Claim violated: client_invoices/client_messages models exist in schema but await a one-time prod DDL apply (per project memory)
Evidence: `useAdminFetch<...>("/api/client-invoices") and admin/messages/page.tsx fetches /api/client-messages`
Done when: client_invoices and client_messages tables are applied in prod and both admin pages load without 500s
Hint: apply the pending DDL for client_invoices/client_messages before alpha; verify the routes return 200

### SA-0040 · P2 · integration-gap
`src/app/admin/changelog/page.tsx:501`  ·  partition: ui-admin
Claim violated: rich changelog restored in code but awaits one prod DDL step (prisma/manual/restore-changelog-tables.sql per memory)
Evidence: `fetch("/api/commit-notes") backing the rich changelog; backed by changelog_entries model`
Done when: changelog_entries DDL is applied in prod and /admin/changelog renders entries without error
Hint: run the pending changelog restore SQL in prod, then verify the sync + list

### SA-0041 · P2 · stub-return
`src/app/status/page.tsx:21`  ·  partition: ui-marketing
Claim violated: the public /status page reports real system health and uptime
Evidence: `// System components — wire to /api/health-check when monitoring is set up\nconst components = [{ name: "Dashboard", status: "operational", uptime: 99.98 }, ... { name: "storEDGE Integration", status: "operational", uptime: 99.96 }, ...]`
Done when: /status renders live/last-checked status from a real source (e.g. /api/health) instead of hardcoded 'operational' + invented uptime constants; components not actually monitored are not shown as 99.9x% operational.
Hint: wire to /api/health (exists) per the in-file TODO; at minimum drop the fabricated uptime figures. Note: 'storEDGE Integration' is shown operational but the storEDGE API is not built (widget embed only) — remove or correct.

## P3 — 21 findings

### SA-0042 · P3 · config-gap · golden-path step 2
`src/proxy.ts:89`  ·  partition: api-audit-funnel
Claim violated: public lead-capture endpoints accept conversions without a session/CSRF token
Evidence: `isCsrfExempt() lists audit-form/consumer-lead/diagnostic-intake/facility-lookup but NOT /api/lead-capture or /api/partial-lead; changelog.json:610 claims 'Exempt public lead-capture endpoints from CSRF' yet lead-capture is absent. No client sends x-csrf-token.`
Done when: if lead-capture/partial-lead are meant to be public POST endpoints they are added to isCsrfExempt() (or confirmed dead and removed); a browser POST to the live conversion endpoint never 403s on CSRF.
Hint: reconcile changelog claim with proxy.ts; tie to the orphan decision above — if consumer-lead remains the live path (already exempt) this is moot once the orphans are removed.

### SA-0043 · P3 · scope-gap · golden-path step 5
`src/app/api/portal-upload/route.ts:204`  ·  partition: api-portal-client
Claim violated: uploaded PMS reports are ingested
Evidence: `PDF/XLSX stay "uploaded" for manual handling (parser is CSV-only by design) — only text/csv is auto-processed (line 208).`
Done when: confirm an admin workflow exists to process PDF/Excel uploads that sit at status "uploaded" (cross-ref Scout 5 api-pms-intel/ui-admin admin-pms-queue). The portal UI already correctly discloses this (upload/page.tsx:244 "CSV process automatically. PDF and Excel are reviewed by our team"), so this is NOT a user-facing contract break — the only residual risk is non-CSV uploads accumulating with no admin action surface. The API 415 message advertising CSV/PDF/Excel is accurate.
Hint: verify admin-pms-queue surfaces status=uploaded non-CSV files for manual processing; if not, add it

### SA-0044 · P3 · context · golden-path step 7
`src/app/api/sms-send/route.ts:42`  ·  partition: golden-path
Claim violated: SMS marketing surfaces fire
Evidence: `if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) { return ...500 }  // Twilio not set up yet per CLAUDE.md`
Done when: N/A — context. Provision Twilio creds to activate; no code change required. Owned by Scout 4 (api-attribution-tracking) for depth.
Hint: Not a code defect; a config/integration deferral. Email/drip/GBP marketing surfaces are fully live.

### SA-0045 · P3 · context · golden-path step 10
`src/app/pricing/page.tsx:1`  ·  partition: api-billing-stripe
Claim violated: self-serve subscription checkout is wired
Evidence: `Pricing page copy: 'This isn't a self-serve [signup]. StorageAds is built for operators...' CTAs link to / and /#cta; no client code calls /api/create-checkout-session anywhere in src/.`
Done when: N/A — context note. Confirm self-serve checkout being unwired is intentional for alpha; the activation-email + CSRF-exempt gaps above must be closed before wiring a self-serve CTA.
Hint: Not a defect for alpha; recorded so the build swarm wires activation email + CSRF exemption together when self-serve billing is turned on.

### SA-0046 · P3 · scope-gap
`src/app/api/lead-capture/route.ts:87`  ·  partition: api-audit-funnel
Claim violated: lead-capture is the landing-page conversion endpoint
Evidence: `export async function POST(req) — no in-repo caller (rg over src finds zero fetch('/api/lead-capture') call sites); live landing pages + exit-intent popup post to /api/consumer-lead instead`
Done when: lead-capture either has a real caller or is deleted with its enrollInFunnelDrip/meta-capi logic relocated; no orphaned conversion endpoint remains.
Hint: decide canonical conversion endpoint; this orphan is why SA(post-conversion drip) is dead — see the P1 above.

### SA-0047 · P3 · scope-gap
`src/app/api/partial-lead/route.ts:152`  ·  partition: api-audit-funnel
Claim violated: partial-lead POST captures abandoned/partial form leads for the recovery pipeline
Evidence: `export async function POST(req) {...} writes partial_leads via raw INSERT — but no in-repo client caller; consumer-lead already creates partial_leads, and admin/recovery only uses GET/PATCH`
Done when: partial-lead POST has a real caller or is removed; the recovery pipeline's input source is unambiguous (currently fed only by consumer-lead).
Hint: confirm consumer-lead is the sole intended writer and delete the dead POST, or wire the partial-capture client to it.

### SA-0048 · P3 · scope-gap
`src/app/api/analyze-map/route.ts:65`  ·  partition: api-audit-funnel
Claim violated: analyze-map powers a map/competitor analysis step in the audit funnel
Evidence: `export async function POST(req) — EXPENSIVE_API_HOURLY rate-limited AI endpoint with no in-repo caller (zero fetch('/api/analyze-map') call sites)`
Done when: analyze-map has a caller or is deleted; no orphaned billed AI endpoint remains in the funnel.
Hint: verify against the audit-tool flow; if unused, remove to shrink the un-CSRF-exempt public POST surface.

### SA-0049 · P3 · integration-gap
`src/app/api/stripe-webhook/route.ts:29`  ·  partition: api-billing-stripe
Claim violated: webhook is idempotent against Stripe at-least-once redelivery
Evidence: `try { switch (event.type) { ... } } catch (err) { ... }  // no record of processed event.id; no idempotency-key store`
Done when: the handler records event.id and short-circuits on replay, or each handler is provably idempotent and that is documented/tested.
Hint: Org creation is guarded by stripe_customer_id and the updateMany handlers are naturally idempotent, but there is no explicit event-id dedup.

### SA-0050 · P3 · config-gap
`src/app/api/create-checkout-session/route.ts:25`  ·  partition: api-billing-stripe
Claim violated: plan set matches the productized tiers (no Enterprise tier per CLAUDE.md)
Evidence: `const validPlans = ["launch", "growth", "portfolio", "enterprise"]; ... const priceMap = { launch:..., growth:..., portfolio:... };`
Done when: 'enterprise' is removed from validPlans (it passes validation then fails at priceId lookup with a misleading 'Invalid plan'), aligning with CLAUDE.md 'No Enterprise tier'.
Hint: Drop 'enterprise' from validPlans or add a real price; currently a misleading dead branch.

### SA-0051 · P3 · validation
`src/app/api/referrals/route.ts:283`  ·  partition: api-partner-org
Claim violated: referral credit redemption cannot corrupt a balance
Evidence: `const { code_id, amount, description } = body; ... if (parseFloat(String(codeRow.credit_balance)) < amount) ... const newBalance = parseFloat(String(codeRow.credit_balance)) - amount;`
Done when: redeem rejects amount unless it is a finite number > 0 (and <= credit_balance); same numeric guard applied wherever amount feeds arithmetic
Hint: validate `typeof amount === 'number' && Number.isFinite(amount) && amount > 0` before the balance check; admin-key gated so impact is low

### SA-0052 · P3 · validation
`src/app/api/org-activity/route.ts:77`  ·  partition: api-partner-org
Claim violated: activity rows are bound to the writer's org
Evidence: `const activity = await db.activity_log.create({ data: { type, facility_id: facilityId || null, facility_name: facilityName || null, detail } });`
Done when: org-activity POST requires a facilityId that belongs to the caller's org (reject when absent) so every activity row is org-bound, OR drop the write path if unused
Hint: make facility ownership check mandatory (currently only runs `if (facilityId && orgId)`); low severity since GET is org-scoped

### SA-0053 · P3 · validation
`src/app/api/v1/api-keys/route.ts:78`  ·  partition: api-v1-external
Claim violated: API keys are least-privilege by default
Evidence: `const requestedScopes = scopes || VALID_SCOPES;`
Done when: key creation requires an explicit non-empty scopes array (or defaults to a minimal read-only set), so over-privileged keys are an explicit choice not a silent default
Hint: return v1Error when scopes is missing/empty, or default to a documented minimal set

### SA-0054 · P3 · marker
`src/app/help/page.tsx:107`  ·  partition: contract
Claim violated: help-page contact options are actionable
Evidence: `{ icon: MessageCircle, label: "Chat", value: "Coming soon", href: undefined, external: false }`
Done when: either wire the chat option to a real channel, or hide the card until chat ships, so the public help page shows no dead contact methods
Hint: remove the Chat entry from the contact list (or gate it behind a flag) until live chat is implemented

### SA-0055 · P3 · context
`src/app/_CONTRACT_VERDICT:0`  ·  partition: contract
Evidence: `Contract verdict: 1 P1 break, 1 P3 placeholder. Diffed every literal fetch('/api/...') call in src/app + src/components against the 203 route.ts files: ALL referenced static AND dynamic-segment paths resolve to an existing route (0 missing-route breaks; query-param design means no orphaned path segm`
Done when: n/a

### SA-0056 · P3 · context
`src/app/_CONTRACT_VERDICT_CSRF:0`  ·  partition: contract
Evidence: `CSRF-gate sub-audit (per Coordinator guardrail): scanned all mutating client fetches (POST/PUT/PATCH/DELETE) against src/proxy.ts isCsrfExempt(). Admin facility-tabs are SAFE (send X-Admin-Key via authHeaders()/inline; proxy reads case-insensitively). Partner pages SAFE (Authorization: Bearer via us`
Done when: n/a

### SA-0057 · P3 · context
`src/app/api/audit-form/route.ts:1`  ·  partition: golden-path
Evidence: `ADAPTED 10-STEP GOLDEN PATH VERDICT (v1 stowstack-next, per audit/README_SWARM.md): 1.Top-of-funnel=PARTIALLY-WIRED (audit-tool shows inline Google quick-score + consumer-lead capture; audit-form creates a facilities row but never calls audit-generate-diagnostic, which is requireAdminKey-gated at au`
Done when: steps 1,5,9,10 reach present-and-complete per their individual findings
Hint: Trace summary row; actionable items are the sibling findings.

### SA-0058 · P3 · stub-return
`src/lib/v1-auth.ts:87`  ·  partition: lib-core
Evidence: `INSERT INTO api_usage_log (api_key_id, organization_id, method, path, status_code, duration_ms) VALUES (${row.id}::uuid, ${row.organization_id}::uuid, ${method}, ${path}, 200, ${duration})`
Done when: api_usage_log rows reflect the true response status (e.g. log written from a route wrapper after the handler resolves) instead of a constant 200
Hint: Move usage logging into a response wrapper that knows the final status, or backfill status via a deferred update keyed on api_key_id+path+timestamp

### SA-0059 · P3 · context
`src/app/api/tenants/route.ts:54`  ·  partition: tenancy
Evidence: `requireFacilityAccess(req) with no explicit facilityId falls back to the ?facilityId query param; the helper validates that param but cannot know the actual record being queried in id/tenantId branches`
Done when: audit note only — see SA tenants IDOR finding above

### SA-0060 · P3 · context
`src/app/api/_VERDICT:0`  ·  partition: tenancy
Evidence: `Tenancy verdict: PASS with 1 cross-tenant defect. Traced all 203 route.ts files across the 4 auth systems. Admin routes (admin-*, ecri, ideas, drip-sequences, churn-predictions, campaign-*, etc.) call requireAdminKey/isAdminRequest. Facility-scoped data routes (facility-assets/context/creatives/pms,`
Done when: n/a

### SA-0061 · P3 · missing-impl · ⚠️angelo-domain(advisory)
`src/app/admin/onboarding/page.tsx:276`  ·  partition: ui-admin
Claim violated: 'These connections let StorageAds run and optimize your ads directly' but Connect does nothing
Evidence: `Meta/Google 'Connect' buttons rendered in SetupStep3AdAccounts have no onClick handler`
Done when: clicking Connect starts a real platform-connection flow
Hint: reuse the settings/integration-card connect flow, or remove the dead buttons

### SA-0062 · P3 · scope-gap
`src/components/theme-provider.tsx:1`  ·  partition: ui-misc-shared
Claim violated: a shipped theme toggle is wired into the app
Evidence: `ThemeProvider/ThemeToggle are imported only by src/components/__tests__/theme-toggle.test.tsx and referenced in a globals.css comment; no app/layout.tsx or page mounts them`
Done when: ThemeProvider/ThemeToggle are either mounted in the real component tree or deleted; no exported-but-never-rendered theme UI remains.
Hint: confirm intent (theme switching is not part of the light-only design system) and remove, or mount if intended.
