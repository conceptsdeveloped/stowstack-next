# Codex SaaS QA Review

Date: 2026-03-28
Repo: `/Users/blake/Documents/stowstack-next`

## Scope

This review combined:

- Static code review across auth, portal, admin, billing, and API routes
- Framework/config review for Next.js 16
- Runtime checks: lint, typecheck, tests, build
- Dependency audit

## Checks Run

- `npm run lint`
  - Failed
- `npx tsc --noEmit`
  - Passed
- `npx vitest run`
  - Passed: 99 tests
- `npx next build --webpack`
  - Failed
- `npm audit --json`
  - Reported 8 total vulnerabilities
- `npm audit --omit=dev --json`
  - Reported 1 production vulnerability

## Priority Findings

### P0

#### Legacy org token fallback bypasses session signing

File: `src/lib/session-auth.ts`

`getSession()` still accepts any `x-org-token` without the `ss_` prefix and decodes it as base64 `orgId:email`. Until June 24, 2026, anyone who can learn a valid org UUID and email can mint an authenticated session with no shared secret or token record.

Impact:

- Direct auth bypass for partner/org session flows
- No token issuance, revocation, or signature enforcement

Recommended fix:

- Remove the legacy base64 token path immediately
- Invalidate any active clients still relying on it
- Keep only server-issued hashed session tokens

### P1

#### Admin master key is persisted in the browser

File: `src/components/admin/admin-shell.tsx`

The admin login flow stores the raw `ADMIN_SECRET` in `localStorage`, and the admin UI reuses it on client-side fetches.

Impact:

- Any XSS, malicious extension, or shared machine compromise exposes full admin access
- Encourages long-lived browser possession of the highest-value secret in the app

Recommended fix:

- Replace header-secret browser auth with server-managed session auth
- Prefer Clerk-backed authorization or an httpOnly session cookie
- Migrate admin APIs away from `X-Admin-Key`

#### Upload endpoint fails open when `ADMIN_SECRET` is missing

File: `src/app/api/upload-token/route.ts`

This route only rejects requests when `ADMIN_SECRET` exists and does not match. If the environment variable is missing, uploads are effectively unauthenticated.

Impact:

- Public arbitrary blob upload in misconfigured environments

Recommended fix:

- Fail closed when auth config is absent
- Reuse central admin auth helpers instead of inline secret comparison

#### Client activity endpoint can be queried by facility ID alone

File: `src/app/api/client-activity/route.ts`

The route accepts `facilityId` as a direct shortcut before access-code validation, so a caller who knows or guesses a facility UUID can read client-visible activity without authenticating.

Impact:

- Cross-tenant data exposure

Recommended fix:

- Require the same client auth path as the rest of the portal
- If `facilityId` access is needed, make it admin-only

#### Billing accepts replayed short codes for 24 hours

File: `src/app/api/client-billing/route.ts`

The client billing auth path treats 4-digit portal codes as valid for up to 24 hours and does not require `used: false`.

Impact:

- One-time login codes become replayable invoice credentials

Recommended fix:

- Require `used: false`
- Enforce real expiry
- Stop falling back from one-time codes to a long-lived access-code model for billing auth

#### Portal persists a one-time code as the session credential

File: `src/components/portal/portal-shell.tsx`

After login, the portal stores the OTP the user typed instead of a durable session credential. The OTP is marked `used=true` during login, while subsequent portal requests expect a reusable credential.

Impact:

- Session instability after login
- Reloads and downstream page requests can fail unexpectedly

Recommended fix:

- Persist the durable credential returned by the server, not the OTP input
- Prefer a true server-managed session over client-stored secrets

#### Access-code email and UI disagree on code length

Files:

- `src/app/api/resend-access-code/route.ts`
- `src/components/portal/portal-shell.tsx`

The resend flow generates a 6-digit code, while the portal UI only supports 4 digits and only auto-submits magic links matching 4 digits.

Impact:

- Broken customer login flow
- Magic link flow can silently fail

Recommended fix:

- Standardize on one code length everywhere
- Align generator, email copy, validation, UI entry, and magic-link parsing

#### Any valid client code can read another facility's PMS data

File: `src/app/api/facility-pms/route.ts`

`GET /api/facility-pms` accepts any bearer client access code but does not verify ownership of the requested `facilityId`.

Impact:

- Cross-tenant exposure of PMS snapshots, unit data, specials, and rate history

Recommended fix:

- Bind the authenticated client to its facility before serving data
- Consider removing this older route if `pms-data` is the intended replacement

#### Build step performs destructive schema push

File: `package.json`

The production build script runs `prisma db push --accept-data-loss` before `next build`.

Impact:

- Deploys mutate the database
- Schema drift bypasses migrations
- Destructive changes can happen during build

Recommended fix:

- Remove `db push --accept-data-loss` from build
- Use explicit migrations in deploy workflows

#### Unauthenticated LLM copy generation endpoint can burn paid API credits

File: `src/app/api/generate-copy/route.ts`

This route is callable without admin/session auth and forwards requests to Anthropic.

Impact:

- Abuse risk
- Spend amplification
- Potential prompt abuse against internal content generation workflows

Recommended fix:

- Require admin auth
- Add rate limiting and request validation

### P2

#### Clerk admin login path is incomplete

Files:

- `src/components/admin/admin-shell.tsx`
- `src/hooks/use-admin-fetch.ts`
- multiple admin API routes using `requireAdminKey()`

The admin shell treats Clerk admin/VA users as authenticated, but most admin data paths still require `X-Admin-Key`.

Impact:

- Misleading “logged in” state
- Users can appear authenticated while API requests still fail
- Pushes operators back to the browser-stored master key flow

Recommended fix:

- Pick one admin auth model
- If Clerk is the intended model, move admin APIs to server-side Clerk authorization

#### Rate limiting fails open when Redis is missing or errors

File: `src/lib/rate-limit.ts`

If Upstash is unavailable or misconfigured, rate limiting silently allows requests.

Impact:

- Signup/login/verification throttling disappears during outages or config drift

Recommended fix:

- Fail closed for sensitive flows
- At minimum emit strong logs/alerts when rate limiting is bypassed

#### Client message composer omits required sender field

Files:

- `src/app/portal/messages/page.tsx`
- `src/app/api/client-messages/route.ts`

The client portal posts `code`, `email`, and `text`, but the API requires `from`.

Impact:

- Portal inbox send flow is broken

Recommended fix:

- Send `from: "client"` from the portal UI
- Add a regression test for message send

#### Server-side Sentry init is incomplete for Next 16

Files:

- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `sentry.client.config.ts`

The repo has Sentry config files, but no Next instrumentation file. Build output warns that server and edge initialization is incomplete.

Impact:

- Server-side exceptions may never reach Sentry
- Observability appears configured but is not fully operational

Recommended fix:

- Migrate to Next 16-compatible instrumentation setup
- Add instrumentation files and remove deprecated config patterns

## Runtime and Build Issues

### ESLint failures

`npm run lint` failed with React `set-state-in-effect` issues in:

- `src/app/signup/page.tsx`
- `src/app/verify-email/page.tsx`
- `src/components/partner/onboarding-checklist.tsx`
- `src/components/ui/responsive-chart.tsx`
- `src/hooks/use-push-notifications.ts`

There were also a few unused-variable warnings.

### Build failures and warnings

`npx next build --webpack` failed because:

- `src/app/layout.tsx` uses `next/font/google` for `Poppins` and `Lora`, and the build could not fetch Google Fonts in the environment used for testing

Build-time warnings also showed:

- No Next instrumentation file for Sentry
- Deprecated middleware file convention in `src/middleware.ts`
- Workspace root detection confusion due to another `package-lock.json` higher in the directory tree

### Middleware / auth hygiene

File: `src/middleware.ts`

Current middleware:

- Skips Clerk entirely for API routes
- Treats `/portal(.*)`, `/partner(.*)`, and `/admin(.*)` as public routes in middleware
- Only enables Clerk middleware when live production keys are present

This may be intentional, but it increases reliance on route-level auth discipline.

## Dependency Audit

### Production dependency risk

`npm audit --omit=dev --json` reported one production vulnerability:

- `@clerk/backend@3.2.2`
- advisory: SSRF in the opt-in `clerkFrontendApiProxy` feature

Notes:

- I did not find local usage of `clerkFrontendApiProxy`
- Even so, `@clerk/nextjs@7.0.6` should be upgraded

### Dev dependency noise

The full audit also included dev-tooling issues in:

- `vitest`
- `vite`
- `vite-node`
- `@vitest/mocker`
- `brace-expansion`
- `picomatch`

These appear primarily tied to dev/test tooling rather than deployed runtime code.

## Additional Risks Worth Verifying

### Portal architecture still relies on long-lived access codes

Files across portal and portal APIs still pass access codes in URLs or client-side storage, including:

- `src/lib/portal-helpers.tsx`
- `src/components/portal/portal-shell.tsx`
- `src/app/portal/page.tsx`
- `src/app/portal/reports/page.tsx`
- `src/app/portal/messages/page.tsx`
- `src/app/portal/gbp/page.tsx`

Concerns:

- Secrets in query strings leak into logs, analytics, browser history, and referrers
- Login OTP and durable access-code models are mixed together
- Several routes authenticate via raw access code rather than a proper session

### Redis-backed client thread state may depend on out-of-band writers

Files:

- `src/app/api/client-messages/route.ts`
- `src/app/api/campaign-alerts/route.ts`

I found reads of Redis keys like `client:*` and `messages:*`, but I did not find an obvious in-repo writer for `client:*`.

That may be external by design, but if not, some portal features may silently fail on fresh environments.

## Recommended Remediation Order

1. Remove the legacy org token fallback in `src/lib/session-auth.ts`
2. Replace browser-stored admin secret auth with server-side sessions / Clerk-backed server auth
3. Fix portal auth correctness:
   - one-time code persistence bug
   - code-length mismatch
   - replayable billing code path
4. Lock down cross-tenant data exposure:
   - `src/app/api/client-activity/route.ts`
   - `src/app/api/facility-pms/route.ts`
5. Remove destructive database mutation from the build script
6. Repair observability and build hygiene:
   - Sentry instrumentation
   - font strategy
   - middleware/proxy migration
7. Upgrade Clerk and address remaining audit items

## Bottom Line

The codebase has good surface area coverage and the test suite passed, but there are still several high-risk SaaS issues in auth and tenancy boundaries. The top concerns are:

- legacy token-based auth bypass
- browser-held admin master secret
- portal credential/session model inconsistencies
- cross-tenant read exposure in client-facing API routes
- destructive database mutation during build

These should be treated as release-blocking until fixed.
