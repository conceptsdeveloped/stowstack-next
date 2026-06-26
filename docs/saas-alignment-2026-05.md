# SaaS Alignment: Standard SaaS Practice vs StorageAds

**Date:** 2026-05-29
**Status:** Active plan. Phase 0 in progress.
**Owner:** Blake
**Related:** `docs/security-audit.md`, `docs/raw-query-audit.md`, `tasks/27-decide-tenant-lifecycle.md`, `tasks/28-claude-md-audit.md`

---

## TL;DR verdict

StorageAds is built like a deep **vertical** product (75 Prisma models, attribution, churn prediction, NOI snapshots, white-label) but is missing the **horizontal SaaS platform layer** that successful SaaS standardizes: one identity system, enforced entitlements, a tenant-lifecycle control plane, product instrumentation, and a safe delivery pipeline.

The vertical depth is the moat. The horizontal gaps are what we refactor. Almost all of this work sits **outside Angelo's ad/video domain**, so it does not collide with his.

This analysis is grounded in a read of the actual code (auth, billing, schema, delivery), not just CLAUDE.md.

## CLAUDE.md drift to fix (folds into task 28)

The code is ahead of the docs in three places:
- Tests **do** exist (Vitest + 8 files, ~1,472 LOC) but there is **no `test` script**, so they never run.
- Sentry **is** wired (server/edge config, global error boundary) but only ~8 of 184 API routes capture errors.
- There are **21** Vercel crons, not 9.

## The scorecard

| Layer | Successful-SaaS standard | StorageAds today | Gap |
|---|---|---|---|
| Identity & access | One identity system, one session model, RBAC, SSO for enterprise | Four parallel systems (Clerk non-enforcing, shared `ADMIN_SECRET` god-key, client access-codes in localStorage, org sessions). Binary roles. No SSO. Scoping hand-rolled across 130+ routes, no central isolation primitive | High |
| Monetization & entitlements | One pricing source of truth, server-enforced entitlements, metered usage synced to billing, automated dunning, self-serve plan change | Two conflicting tier definitions (`src/types/billing.ts` vs `src/lib/stripe.ts`). Feature gates reported to UI but **not enforced server-side**. Facility count set at checkout and **never re-synced** to Stripe. 14-day trial works; dunning is a status flip only | High |
| Tenant model & data integrity | One clean tenant root, required FKs, referential integrity | Clean hierarchy conceptually (org to facilities to clients), but `facilities.organization_id` is **nullable** plus 11+ nullable `facility_id` FKs, and denormalized `facility_name` copied into `activity_log`/`clients`. `activity_log` is not org-scoped | Med-High |
| Lifecycle / control plane | Explicit lifecycle stages, activation milestones, time-to-value, health/churn signals as data | Onboarding wizard captures rich data + a `completed_at`, but no activation milestone timestamps, no lifecycle-stage enum on the tenant, no health/churn-risk model | High |
| Product instrumentation | Event stream (PostHog/Segment/Amplitude), funnel + activation + adoption measurement | Zero product analytics. Meta/GA pixels track ad conversions only. Funnel exists only as an admin KPI snapshot off `pipeline_status`. `activity_log` is ad-hoc fire-and-forget | High |
| Delivery & reliability | Tests run in CI, staging/preview, gated migrations, error tracking | Vitest + 8 files but no `test` script, never run. No CI. Direct-to-prod. `prisma migrate deploy` runs **during the production build**. Sentry wired but ~8 of 184 routes capture errors | Critical |

Already good and worth protecting: sound conceptual tenant model, real rate limiting (Upstash sliding-window, ~40 routes), a `/api/health` probe, Sentry boilerplate ready to switch on, and deep domain modeling.

## Refactor plan

### Phase 0 — Harden before the first paying customer (trust-breakers)

- [ ] **1. One pricing source of truth.** Collapse `src/types/billing.ts` and `src/lib/stripe.ts` into one canonical `PLANS` module (tiers, prices, limits, entitlement flags). Everything reads from it. **Blocked on a product decision: which taxonomy is canonical (packaging vs volume).** See Open Decisions.
- [ ] **2. Enforce entitlements server-side.** The `video`/`abTesting`/`callTracking`/`whiteLabel` flags in `/api/subscription-usage` inform the UI but gate nothing. Gate the write endpoints (402 on over-plan), not just the buttons.
- [ ] **3. One tenant-scoping primitive.** A Prisma client extension or `scopedDb(orgId)` helper every data route flows through, so isolation lives in one place instead of being re-decided across 130+ routes. Backfill highest-traffic routes first.
- [ ] **4. Make `facilities.organization_id` required + backfill orphans,** then the other nullable FKs that should be required (`assets`, `audits`, etc.). Overlaps tasks 07/14.
- [ ] **5. Delivery safety net.** Add the missing `test` script, run Vitest + `tsc` in CI on PR, and move `prisma migrate deploy` out of the build into a gated step. Expand money-path tests (stripe-webhook already 319 LOC; add audit-generation, lead-capture, portal-login).
- [ ] **6. Turn Sentry on** (set DSN) and add `captureException` to the money path: checkout, webhook, signup, lead capture, audit generation.
- [ ] **7. Sync facility count to Stripe.** Update subscription quantity when a facility is added/removed (or nightly reconcile cron). Today we bill the signup quantity forever: revenue leak + support risk.

### Phase 1 — Build the SaaS control plane (self-serve + lifecycle)

- [ ] **8. Unify identity.** Make org-sessions canonical; finish migrating shared `ADMIN_SECRET` to scoped `sa_adm_*` keys; model client access-codes as a scoped capability, not a parallel auth universe. Add a real role enum.
- [ ] **9. Complete the billing lifecycle.** Dunning emails on `payment_failed` with a grace window (Resend), trial-ending reminders (`invoice.upcoming` or trial cron), in-app upgrade/downgrade.
- [ ] **10. Add an activation model.** Stamp `first_campaign_launched_at`, `first_lead_at`, `first_move_in_attributed_at`, and a tenant `lifecycle_stage` enum (onboarding to live to activated to at_risk to churned). **Coordinate with `tasks/27-decide-tenant-lifecycle.md`.**

### Phase 2 — Instrument for growth

- [ ] **11. Product analytics layer.** One `track(event, props)` emitter (PostHog or Segment) at funnel-critical moments: audit started/completed, call booked, signup, onboarding step, first campaign, first move-in. Keep `activity_log` as the audit trail.
- [ ] **12. Per-tenant health score** from those signals, surfaced as at-risk orgs in admin. This turns attribution data into a renewal-defense system.
- [ ] **13. SaaS metrics, once revenue exists:** MRR/ARR, NRR, logo + revenue churn, CAC payback, Rule of 40. Not before.

## Boundary

None of this touches Angelo's ad-platform integrations or video/image generation. It is all platform-layer work: identity, billing, data integrity, instrumentation, delivery.

## Open decisions

1. **Pricing taxonomy (blocks Phase 0 item 1).** `src/types/billing.ts` uses packaging tiers (`demand_engine` $1000, `conversion_layer` $750, `bundle` $2000). `src/lib/stripe.ts` uses volume tiers (`launch` $750/1 facility, `growth` $1500/3, `portfolio` custom/unlimited). These are different axes. Need Blake's call on which is canonical, or whether the real model is a packaging x volume matrix. Canonical reference: `docs/operator-os-pricing-one-pager.md`.
2. **Tenant lifecycle stages (informs Phase 1 item 10).** Already queued as `tasks/27-decide-tenant-lifecycle.md`.

## Execution log

- 2026-05-29: Doc created. Phase 0 item 1 investigation started.
