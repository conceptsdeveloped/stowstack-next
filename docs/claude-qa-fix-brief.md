# Claude Code Fix Brief

Date: 2026-03-24
Source: Codex review only. No application code was changed.

## Purpose

Use this file as the implementation brief for Claude Code. The goal is to fix the production blockers identified in the QA audit without changing product messaging or redesigning the UI.

## Operating Rules

1. Do not rewrite marketing copy or change the visual design unless the current UI is functionally broken.
2. Read the relevant Next.js 16 docs under `node_modules/next/dist/docs/` before changing route handlers, metadata, or middleware/proxy behavior.
3. Fix P0 and P1 issues first. Do not move on to lower-priority cleanup until the revenue-critical paths are working.
4. When an API contract is broken, pick one canonical schema and update all callers and handlers together.
5. Add or update tests for every contract fix and security fix.
6. Finish by running lint/build and a manual smoke test of the landing-page funnel.

## Priority Order

1. Landing page public render failure
2. Landing page builder CRUD contract mismatch
3. Meta CAPI contract and deduplication gaps
4. Visit and page-interaction tracking gaps
5. storEDGE webhook authentication
6. Client portal auth/code hardening
7. Stripe onboarding temp-password exposure
8. Attribution persistence semantics
9. Blog renderer and SEO completeness

## Required Fixes

### P0-1: Published landing pages fail to render

Affected files:
- `src/app/lp/[slug]/page.tsx`
- `src/app/api/landing-pages/route.ts`

Current problem:
- The public landing-page client reads `data.data`.
- The API returns `{ page: { ... } }`.
- Result: `setPage(data.data)` stores `undefined`, the page stays null, and real published landing pages fall into the "Page Not Found" fallback.

Required changes:
1. Standardize the GET-by-slug response shape for `/api/landing-pages`.
2. Update the landing-page client to read the canonical shape.
3. Update the tracking-phone fetch and SEO field reads to use the same canonical page object.
4. Prefer server metadata if practical, but the minimum requirement is to stop reading non-existent keys.

Acceptance criteria:
- Visiting `/lp/:slug` for a published page renders sections instead of the fallback screen.
- The page id is available after load and downstream tracking/call-tracking fetches use the real id.

### P0-2: Landing page builder CRUD is using the wrong API contract

Affected files:
- `src/components/admin/facility-tabs/landing-page-builder.tsx`
- `src/app/api/landing-pages/route.ts`

Current problem:
- The builder sends `facilityId`, `title`, `metaTitle`, `metaDescription`, `storedgeWidgetUrl`, `sectionType`, and `sortOrder`.
- The route expects `facility_id` for filtering, `name` on create, `meta_title`, `meta_description`, `storedge_url`, `section_type`, and `sort_order`.
- The builder also expects `data.data` responses while the route returns `{ page }` / `{ pages }`.
- Clone currently posts only `{ cloneFrom }`, but the route rejects create requests without `facilityId`, `name`, and `slug`.

Required changes:
1. Choose one contract style between client and server and enforce it everywhere for landing pages.
2. Make filtering consistent: `facility_id` vs `facilityId`.
3. Make create/save/edit use the same field names the route actually persists.
4. Fix section serialization so section type/order keys are accepted by the route.
5. Fix clone so it either sends all required create fields or the server explicitly supports a clone-only path.
6. Fix response handling so the builder reads `{ page }` / `{ pages }` consistently.

Acceptance criteria:
- Page list filters correctly to the selected facility.
- Opening an existing page loads real data into the editor.
- Create, clone, save, and publish all succeed from the admin UI.

### P1-3: Meta CAPI page-view attribution is broken

Affected files:
- `src/app/lp/[slug]/page.tsx`
- `src/app/api/meta-capi/route.ts`
- `src/lib/tracking-params.ts`

Current problem:
- The client posts `{ eventName, sourceUrl, fbclid, userAgent }`.
- The route requires `event_name`, `event_time`, and `user_data`.
- The current route design also does not include `fbc`, `fbp`, or reliable `event_id` handling for browser/server deduplication.
- The current validation is too strict for `PageView` if only technical match keys are available.

Required changes:
1. Standardize the request body between the landing page and `/api/meta-capi`.
2. Support `PageView` without requiring email/phone/name when Meta technical identifiers are present.
3. Include `event_name`, `event_time`, `event_id`, `event_source_url`, and `action_source`.
4. Capture and forward `fbc` and `fbp`.
5. Ensure the browser pixel event and server CAPI event share the same `event_id`.
6. Keep personally identifiable data normalized and hashed when available.

Acceptance criteria:
- A normal paid landing-page visit does not 400 against `/api/meta-capi`.
- Browser Pixel and server CAPI use the same `event_id`.
- `fbc` and `fbp` are present when available.

### P1-4: Visit tracking and page-interaction tracking are effectively dark

Affected files:
- `src/hooks/use-tracking-params.ts`
- `src/app/lp/[slug]/page.tsx`
- `src/app/api/tracking/visit/route.ts`
- `src/app/api/page-interactions/route.ts`

Current problem:
- The visit-tracking hook exists, but it is not used by the landing-page route.
- The landing page posts a heartbeat payload with `scrollDepth` and `timeOnPage`.
- The API route only accepts an `events[]` batch and rejects missing `events`.
- Result: visit/session/interaction data is incomplete or absent.

Required changes:
1. Wire the landing-page flow into visit tracking.
2. Decide whether `page-interactions` should accept heartbeat summaries or event batches.
3. Update either the client payload or the route contract so they match.
4. Preserve the existing session id across the funnel and send it everywhere needed.
5. Add tests around the accepted interaction payload.

Acceptance criteria:
- A landing-page visit records a visit row/log entry.
- Scroll/time interaction data is accepted and stored instead of rejected.

### P1-5: storEDGE webhook has no authentication or signature verification

Affected files:
- `src/app/api/webhooks/storedge/route.ts`

Current problem:
- The webhook parses arbitrary JSON immediately.
- There is no shared-secret, signature, or source verification before writing activity log records.
- A forged request can create fake reservations or move-ins and poison attribution/revenue reporting.

Required changes:
1. Add webhook authentication before processing the payload.
2. Reject unauthorized requests with a non-2xx status.
3. Keep idempotency checks after auth.
4. Add tests for valid and invalid webhook requests.

Acceptance criteria:
- Unsigned or bad-signature requests are rejected.
- Valid signed requests still create the expected records.

### P1-6: Client portal auth codes are weak and reusable

Affected files:
- `src/app/api/resend-access-code/route.ts`
- `src/app/api/client-data/route.ts`
- `src/lib/portal-helpers.tsx`

Current problem:
- Login codes are only 4 digits and generated with `Math.random()`.
- There is no visible rate limiting on verify attempts.
- The PATCH path accepts codes from the past 24 hours even if they were already used.
- The browser stores the access credential directly in localStorage.

Required changes:
1. Replace the 4-digit code flow with a cryptographically secure token or a stronger one-time code.
2. Add rate limiting and attempt throttling for both code issuance and code verification.
3. Enforce single-use semantics everywhere, including PATCH/update flows.
4. Consider exchanging the one-time code for a short-lived session token instead of storing the login code itself in localStorage.
5. Add tests for replay, brute-force protection, and expired/used-token rejection.

Acceptance criteria:
- Used one-time codes cannot update client settings.
- Repeated bad attempts are throttled.
- The browser does not need to store a reusable permanent credential.

### P2-7: Stripe onboarding leaks a plaintext temporary password

Affected files:
- `src/app/api/stripe-webhook/route.ts`

Current problem:
- The webhook generates a temp password with `Math.random()`.
- That plaintext password is then stored in Stripe customer metadata.
- Anyone with Stripe metadata access can recover onboarding credentials.

Required changes:
1. Remove plaintext credential storage from Stripe metadata.
2. Use cryptographic randomness if a temporary secret is still required.
3. Prefer an invite token or reset-link flow over generating a human password in the webhook.
4. Add/update tests for the onboarding flow so no secret leaks into Stripe metadata.

Acceptance criteria:
- No plaintext password is written to Stripe metadata.
- The onboarding path still completes successfully.

### P2-8: Attribution persistence is session-only and does not satisfy last-touch requirements

Affected files:
- `src/lib/tracking-params.ts`
- `src/app/lp/[slug]/page.tsx`
- `src/app/api/consumer-lead/route.ts`

Current problem:
- Tracking params are stored only in `sessionStorage`.
- The helper explicitly does first-touch-within-session and never overwrites.
- Exit-intent lead capture sends only `fbclid` and `gclid`, dropping UTM fields entirely.
- This does not match the stated last-touch requirement and loses attribution outside the current session.

Required changes:
1. Move tracking persistence to a durable mechanism for attribution-critical keys.
2. Define and implement last-touch rules explicitly.
3. Pass the persisted UTM fields into the exit-intent lead flow.
4. Construct `fbc` from `fbclid` where applicable and read `_fbp`.
5. Add tests for return visits and changed UTM sets.

Acceptance criteria:
- Returning with a new UTM set updates attribution according to the agreed last-touch rule.
- Exit-intent leads preserve the same attribution context as form leads.

### P2-9: Blog SEO and rendering are incomplete for production use

Affected files:
- `src/app/blog/[slug]/page.tsx`
- `src/lib/markdown.tsx`
- `src/components/blog/table-of-contents.tsx`
- `src/components/blog/author-bio.tsx`
- `src/components/blog/callout-block.tsx`

Current problem:
- Blog post metadata only sets title and description.
- There is no post-level OG/Twitter/canonical/Article JSON-LD.
- The renderer only supports headings, paragraphs, blockquotes, and lists.
- Existing TOC/author/callout components are not wired into the post page.

Required changes:
1. Add full metadata for blog posts.
2. Add Article JSON-LD per post.
3. Replace or extend the markdown pipeline to support richer markdown safely.
4. Wire in TOC/author/callout behavior if those features are intended to ship.
5. Add tests for frontmatter parsing and post rendering.

Acceptance criteria:
- Blog posts emit full SEO metadata.
- Rich markdown renders correctly.
- Non-existent blog slugs still return the proper 404 behavior.

## Validation Checklist

Run these after fixes:

1. `npm run lint`
2. `npm run build`
3. Add and run automated tests for:
   - landing-page API contract
   - landing-page builder create/edit/clone/save flows
   - Meta CAPI payload building and validation
   - storEDGE webhook auth rejection/acceptance
   - client portal code single-use behavior
4. Manual smoke test:
   - open a published landing page
   - submit the lead form
   - trigger exit-intent capture
   - verify page interaction logging
   - simulate a storEDGE event
   - hit the webhook without auth and confirm rejection

## Notes From Codex Review

- `npm run lint` currently reports 103 errors and 140 warnings. Shared hooks/utilities need cleanup as part of this pass.
- `npx vitest run` could not run during review because `vitest` is not installed locally.
- `npm run build` in the review sandbox failed because `next/font/google` tried to fetch Google Fonts. If CI can run in a restricted network environment, either self-host fonts or document the outbound network requirement.
