# CHANGELOG — Production Readiness Audit

**Date:** 2026-03-28
**Scope:** Full codebase QA and hardening audit per CODEX_QA_PROMPT.md

---

## Phase 2: Bug Fixes & Logic Errors

### StorEdge Embed — Stale Closure Fix
- **File:** `src/components/storedge/storedge-embed.tsx`
- **Fix:** Added `stateRef` to prevent stale `state` closure inside `setTimeout` callback. Previously, the timeout could read an outdated `state` value due to React's closure behavior, causing the timeout to never trigger the error state.

### Partial Lead API — Timing-Safe Auth
- **File:** `src/app/api/partial-lead/route.ts`
- **Fix:** Replaced direct string comparison (`adminKey !== process.env.ADMIN_SECRET`) with `requireAdminKey()` from `api-helpers.ts`, which uses `crypto.timingSafeEqual()` to prevent timing attacks on the admin key.

### Tracking Hook — Misleading Comment
- **File:** `src/hooks/use-tracking-params.ts`
- **Fix:** Corrected comment that said "first-touch attribution" when the implementation is actually last-touch (new URL params always overwrite stored values). The behavior was correct; only the documentation was wrong.

---

## Phase 3: Tracking Integrity (Revenue-Critical)

### Client-Side Analytics Scripts (NEW)
- **File:** `src/components/analytics.tsx` (new)
- **File:** `src/app/layout.tsx` (modified)
- **Fix:** Created `<Analytics />` component that loads Meta Pixel (`fbq`) and Google gtag.js (GA4 + Google Ads) on every page. Fires `PageView` and `page_view` events on every SPA route change. Wrapped in `<Suspense>` since it uses `useSearchParams`. Scripts only load when `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, or `NEXT_PUBLIC_GOOGLE_ADS_ID` env vars are set.
- **Impact:** Previously there was ZERO client-side pixel/analytics tracking. All tracking was server-side CAPI only. Now the standard Meta Pixel and gtag.js load on every page, enabling standard retargeting audiences, GA4 analytics, and event deduplication with CAPI.

### Meta CAPI — API Version Upgrade
- **File:** `src/app/api/meta-capi/route.ts`
- **Fix:** Updated Graph API endpoint from v19.0 to v21.0. v19.0 is deprecated.

### Meta CAPI — fbc/fbp Pass-Through
- **File:** `src/app/api/meta-capi/route.ts`
- **Fix:** Added explicit pass-through of `fbc` and `fbp` values from `user_data` into the CAPI event payload. These were being received from the client but dropped during `normalizeUserData()` (which only hashes PII fields). `fbc` and `fbp` must be sent as-is per Meta's CAPI spec.

### URL-Decode Tracking Params
- **File:** `src/lib/tracking-params.ts`
- **Fix:** Added `decodeURIComponent()` to handle double-encoded URL parameters. While `URLSearchParams.get()` already decodes once, some ad platforms double-encode click IDs and UTM values.

### fbc Fallback Construction
- **File:** `src/lib/tracking-params.ts`
- **Fix:** Enhanced `readFbc()` to fall back to constructing the `fbc` cookie value from a stored `fbclid` in localStorage if the `_fbc` cookie is not present. This ensures CAPI events can include `fbc` even when the Meta Pixel hasn't set the cookie yet (e.g., first-party cookie blocked).

### Environment Variables for Client-Side Tracking
- **File:** `.env.local` (modified)
- **Fix:** Added `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, and `NEXT_PUBLIC_GOOGLE_ADS_ID` env var placeholders. These must be set in production for client-side tracking to activate.

---

## Phase 4: UI/UX Completeness

### Error Page — Brand Token Fix
- **File:** `src/app/error.tsx`
- **Fix:** Replaced Tailwind `text-red-500` with brand token `var(--color-red)` per design system rules.

### Error Page — No Client Error Leakage
- **File:** `src/app/error.tsx`
- **Fix:** Removed `error.message` from the user-facing error page. Error messages can contain stack traces, file paths, or internal state. Now shows a generic message.

### Blog Loading Skeletons (NEW)
- **File:** `src/app/blog/loading.tsx` (new)
- **File:** `src/app/blog/[slug]/loading.tsx` (new)
- **Fix:** Added skeleton loading states for both the blog index and individual blog post pages. Previously, these showed blank screens during server-side rendering. Now users see shimmer placeholders matching the final layout.

### Blog Pillar Type Mismatch
- **File:** `src/types/blog.ts`
- **Fix:** Changed `BlogPillar` union type from underscore format (`operator_math`) to hyphen format (`operator-math`) to match actual frontmatter values in markdown files and the `PILLARS` record in `src/lib/blog.ts`. Also updated `PILLAR_CONFIG` keys to match.

---

## Phase 5: Blog Engine

Blog engine audit found it in good shape overall:
- All 6 published posts parse correctly with valid frontmatter
- Sorting works (newest first)
- TOC generation works with IntersectionObserver for scroll tracking
- JSON-LD Article schema present on every post
- RSS feed complete
- Sitemap includes all blog posts
- 404 handling works via `notFound()`
- Skeleton loaders added (see Phase 4)
- Pillar type mismatch fixed (see Phase 4)

---

## Phase 6: Security & Production Hardening

### Content-Security-Policy Header
- **File:** `next.config.ts`
- **Fix:** Added CSP header allowing only necessary domains: Facebook Connect (pixel), Google Tag Manager (gtag), Google Ads, Google Analytics, Stripe (iframes), Clerk (auth), Sentry (error tracking), Cal.com (booking embeds), StorEdge (reservation iframes), Resend (email API), and Upstash (Redis). Blocks all other script/connect/frame sources.

### API Error Response Sanitization
- **File:** `src/app/api/meta-capi/route.ts`
- **File:** `src/app/api/google-conversion/route.ts`
- **Fix:** Both routes were returning `err.message` directly to the client in error responses. Meta CAPI errors can contain access token fragments and internal API details. Now logs the full error server-side via `console.error()` and returns a generic message to the client.

### .env.example Documentation
- **File:** `.env.example` (new)
- **Fix:** Created comprehensive `.env.example` documenting every required environment variable with clear section grouping. Previously there was no `.env.example`, making it impossible for new developers to know what env vars to configure.

---

## Phase 7: Cross-Reference Against Spec

### Verified Working
- UTM capture and persistence (localStorage, last-touch) ✅
- Click ID capture (fbclid, gclid, ttclid) ✅
- StorEdge embed with tracking param injection ✅
- StorEdge postMessage event capture ✅
- StorEdge webhook with HMAC verification ✅
- Partial lead capture with lead scoring ✅
- Full lead capture with email notification ✅
- Activity log tracking for full-funnel attribution ✅
- Call tracking integration (Twilio) ✅
- Walk-in attribution ✅
- 4 independent auth systems working correctly ✅
- CORS properly restricted to allowed origins ✅
- Rate limiting on public endpoints ✅
- Cron jobs with fail-closed auth ✅
- V1 external API with key auth + rate limiting + scope enforcement ✅

### Gaps Identified (Not Fixed — Require Product Decision)
- **No client-side search on blog** — `fuse.js` mentioned in spec but not implemented. Blog has only pillar filtering.
- **No tag archive pages** — Tags display on posts but are not linked/filterable.
- **Blog posts don't have individual OG images** — Fall back to root `/og-image.png`.
- **No reading progress bar on blog posts** — `ScrollProgress` exists globally but blog post page doesn't highlight it.
- **Homepage (`page.tsx`) doesn't export its own metadata** — Relies on layout.tsx defaults. Should have explicit metadata.

---

## Files Changed

| File | Action | Phase |
|------|--------|-------|
| `src/components/analytics.tsx` | Created | 3 |
| `src/app/layout.tsx` | Modified (added Analytics + Suspense) | 3 |
| `src/components/storedge/storedge-embed.tsx` | Modified (stale closure fix) | 2 |
| `src/lib/tracking-params.ts` | Modified (URL decode, fbc fallback) | 3 |
| `src/hooks/use-tracking-params.ts` | Modified (comment fix) | 2 |
| `src/app/api/meta-capi/route.ts` | Modified (v21.0, fbc/fbp, error sanitization) | 3, 6 |
| `src/app/api/google-conversion/route.ts` | Modified (error sanitization) | 6 |
| `src/app/api/partial-lead/route.ts` | Modified (timing-safe auth) | 2 |
| `src/app/error.tsx` | Modified (brand token, no error leak) | 4 |
| `src/types/blog.ts` | Modified (pillar type fix) | 5 |
| `src/app/blog/loading.tsx` | Created | 4 |
| `src/app/blog/[slug]/loading.tsx` | Created | 4 |
| `next.config.ts` | Modified (CSP header) | 6 |
| `.env.local` | Modified (NEXT_PUBLIC analytics vars) | 3 |
| `.env.example` | Created | 6 |
| `CHANGELOG.md` | Created | — |
