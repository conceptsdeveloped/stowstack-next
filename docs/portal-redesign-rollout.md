# Customer Portal — Redesign & Incremental Rollout Plan

Companion to [customer-dashboard-plan.md](customer-dashboard-plan.md). That doc
sequences **backend hardening** (M0–M8: real data, durable stores). This doc
sequences the **visual/IA redesign and its safe rollout** so we never ship a
one-shot rewrite and never break a live customer.

The two plans share two seams: the auth-resolution cleanup (this doc's R1 ==
backend M0) and the design-system token pass (this doc's R2/R3 == backend M8).
Do that shared work once; both plans benefit.

---

## Why a rewrite is unnecessary

The portal is already shaped for incremental reskinning:

- **One shell, pure pages.** `src/app/portal/layout.tsx` wraps every route in
  `PortalShell` (`src/components/portal/portal-shell.tsx`). Each page is just
  content rendered into `children`, pulling `{ session, client, authFetch }` from
  the `usePortal()` context. The chrome (sidebar, header, bottom tabs, login
  gate) lives entirely in the shell. **Re-theming the shell re-themes every page
  without touching page logic**, and each page body can be redesigned one at a
  time behind the same gate.
- **Single-tenant per session.** One portal session = one client/facility
  (localStorage `storageads_portal_session`, email + 4-digit access code,
  validated against `/api/client-data`). No facility switcher to design around.

So the migration is: gate at the shell → reskin the shell → redesign page bodies
one at a time → cut cohorts over → retire v1. No parallel `(v2)` route tree, no
middleware rewrite.

---

## Current-state findings (2026-06-27)

### Architecture
- Shared shell + `usePortal()` context; pages are pure content. **Good.**
- Nav was defined in **three disagreeing places** (sidebar `NAV_ITEMS`, header
  `titles`, bottom-tabs `TABS`) with conflicting labels (GBP vs "Reviews",
  Dashboard vs "Home") and item sets (bottom tabs omit Billing + Onboarding).
  **FIXED in R1a** — unified into `src/components/portal/portal-nav.ts`.
- Data-fetch auth is hand-rolled per component and inconsistent (`code=` vs
  `accessCode=`, with/without `email`), bypassing the `authFetch` helper that
  already exists in context. **R1b target.**
- Gold tokens (`--color-gold`) are pervasive in the portal — off-spec per the
  design system (gold is banned outside the logo lockup). **R2/R3 target.**
- No theme/flag/variant system is mounted. The live `data-palette` token cascade
  (`src/app/layout.tsx`, `src/components/mono/`) is the one reusable visual
  primitive a reskin can drive.

### Data reality vs. the dashboard plan (some claims are stale)
- `client-goals` is **now Postgres-backed** (`client_goals` + `lead_status_events`),
  not the Redis/scalar the dashboard plan describes. Only the default *target*
  still comes from the `clients.monthly_goal` scalar.
- `portal-push-subscribe` route now exists (client push path partly built).

### High-risk surfaces (broken regardless of v1/v2 — fix during redesign, not before)
| Surface | Issue | Severity | Status |
|---|---|---|---|
| Messaging (`/api/client-messages`) | Redis-only; `verifyClient` reads a Redis `client:*` key the Postgres app never populates → 401s, or silently fake-succeeds when Upstash is unset | High | **FIXED** (`77caf2e`) — now uses canonical Postgres `authenticatePortalRequest`; Redis is storage-only |
| Billing "Manage Payment Method" (`/api/create-billing-portal`) | Gated by partner/org `getSession` (`ss_` token) a portal client never has → **always 401s**. Dead button. | High | **FIXED** (`77caf2e`) — portal-client auth; Stripe customer resolved via client → facility → org |
| Invoices | Two unrelated systems: Redis `billing:*` (shown) vs Postgres `activity_log` (`/api/client-invoices`, unused). No shared data. | Medium | Open — `client-billing` works on its own auth helper; consolidation deferred (peer's active lane) |
| Reports | `move_ins_mtd`, `move_outs_mtd`, `delinquency_pct` hardcoded `0`, rendered as KPI cards | Medium | **FIXED** (`23c9db1`) — move-ins/outs from facility-scoped `lead_status_events` MTD (same source as goal tracker); delinquency from latest PMS snapshot |
| Campaigns | Page only calls `attribution`; `client-campaigns` is `requireAdminKey`-gated, unreachable from the portal | Low | Open — attribution is **Angelo's domain**; do not touch without coordination |

### Rollout infrastructure: none exists yet
No feature-flag lib, no parallel routes, no route groups, no cohort column on
`clients`, no cohort cookie/rewrite in `proxy.ts`. Precedent for a per-tenant
boolean exists (`organizations.white_label`), but `organizations` is the
partner auth surface, not the client portal. The portal cohort flag must live on
`clients`.

---

## Rollout strategy

**Gate at the shell, not in `proxy.ts`.** The CSRF gate in `proxy.ts` already
403'd portal login in prod once; keep cohorting off that path. A flag read inside
`PortalShell` is reversible with a single flip and never touches middleware.

### R0 — Gating primitive *(foundation)*
- Add `clients.portal_version Int @default(1)` (mirrors the `white_label`
  boolean precedent). **Additive; schema-reviewed; prod push needs Blake's
  explicit OK — `db push` hits prod directly.**
- Resolve `portalVersion` once in `PortalShell` (already the single auth point);
  source order: `?portal=N` query / `storageads_portal_override` localStorage
  (dev + alpha opt-in) → `client.portalVersion` from `/api/client-data` → `1`.
- Expose `portalVersion` on the `usePortal()` context.
- **Checkpoint:** flag flips chrome with zero page changes; default cohort sees
  v1 untouched. The override path works before the schema field ships, so v2 can
  be built and demoed without any prod DDL.

### R1 — Unify the seams *(prereq cleanup; ships under v1, no behavior change)*
- **R1a — DONE.** Three nav definitions collapsed into
  `src/components/portal/portal-nav.ts` (`PORTAL_NAV`, `PORTAL_BOTTOM_TABS`,
  `PORTAL_TITLES`, `isNavItemActive`), consumed by the sidebar, header, and
  bottom tabs. Behavior preserved exactly (bottom tabs still omit
  Billing/Onboarding; GBP→"Reviews"; Dashboard→"Home"). Locked by
  `src/components/portal/__tests__/portal-nav.test.ts`.
- **R1b — TODO.** Route every page's data fetch through one helper. Make
  `authFetch` send `code`, `accessCode`, and `email` together so every endpoint
  finds its expected param (attribution wants `accessCode`; onboarding wants
  `code`), then migrate the hand-rolled query strings in the 8 pages onto it.
  Behavior-preserving (GET, not CSRF-gated). This is also backend M0.

### R2 — Reskin the shell behind the flag
- Branch the shell on `portalVersion` (or build `PortalShellV2`): new chrome +
  design-system-compliant tokens (kills the gold). Pages render unchanged.
- **Checkpoint:** v2 cohort = Blake + 1 facility; walk every route; v1 unaffected.

### R3 — Redesign page bodies incrementally
- Each page reads `portalVersion` and renders v1/v2 layout. Ship dashboard first
  (highest payoff), then campaigns/reports/etc.
- **Co-sequence with the backend plan:** don't ship a v2 card around a hardcoded
  `0`. Gate the v2 reports MTD/delinquency cards on backend M2/M7 (real data) or
  on data-presence.

### R4 — Fix the broken-in-both surfaces *(during the relevant page's redesign)*
- Messaging (Redis→Postgres), billing portal auth mismatch, invoice
  consolidation. These are broken in v1 too, so fix as you redesign those pages
  rather than reskinning a broken backend. Mirrors backend M4/M5.
- **DONE so far:**
  - Messaging auth (`77caf2e`) — `client-messages` now authenticates with the
    canonical `authenticatePortalRequest` (Postgres); Redis is storage-only.
    Credentials moved to the query string; route + page updated together.
  - Billing-portal auth (`77caf2e`) — `create-billing-portal` now authenticates
    the portal client and resolves the Stripe customer through
    client → facility → `organizations.stripe_customer_id`. The dead "Manage
    Payment Method" button works whenever the org has a Stripe customer.
  - Reports KPIs (`23c9db1`) — `client-reports` move-in/out MTD now come from
    facility-scoped `lead_status_events` (consistent with the goal tracker) and
    delinquency from the latest PMS snapshot. No more hardcoded `0` cards.
  - All three landed on the peer's shared `authenticatePortalRequest` helper
    rather than a competing one, with route-level tests (16 new).
  - Auth consolidation finished (`b70440a`) — `client-billing`, the last portal
    route on a private `verifyClientAuth` copy, migrated onto the shared helper;
    the helper now accepts the legacy `code` query param as an alias for
    `accessCode`. Every query-based portal data route now shares one auth
    surface (client-data is intentionally separate — it consumes single-use
    login codes). +5 tests; the peer's 7 helper tests still pass.
- **REMAINING:**
  - Invoice **storage** consolidation (Redis `billing:*` via `client-billing`
    vs Postgres `activity_log` via `client-invoices`) — needs a product decision
    on the canonical store, and the Postgres path would need a prod migration.
    Each system is internally consistent today, so this is cleanup, not a broken
    user path. Deferred pending that decision.
  - ~~`client-onboarding` + `portal-upload` auth~~ — **DONE** (`faaaec8`, task 29).
    Both migrated onto the shared helper; PATCH creds moved to the query. Every
    portal-client route is now on `authenticatePortalRequest` except the
    intentional exceptions (client-data, client-campaigns). Manual portal walk
    still recommended before alpha.
  - Messaging **durability** (Redis→Postgres, backend M4/M5) — needs a new table
    → prod DDL approval. Auth is fixed; persistence is the remaining half.
  - Campaigns reachability — **Angelo's domain** (attribution); coordinate first.

### R5 — Cohort cutover & retire v1
- Migrate clients to `portal_version=2` in waves (Blake → alpha portfolio → all).
- Once stable, delete the v1 shell branch and dead code.

```
R0 (gate) → R1 (unify: R1a done, R1b next) ─┬─> R2 (shell reskin)
                                            └─> R3 (page-by-page, co-seq backend M2/M7)
R4 (fix broken backends, = backend M4/M5) runs alongside R3 per-page
R5 (cohort cutover → retire v1)
```

### Rejected alternatives
- **`(v2)` route group / parallel routes** — duplicates all page logic and the
  auth surface. The shell+context design makes branch-in-place strictly cheaper.
- **`proxy.ts` rewrite cohorting** — unnecessary and steps on the CSRF footgun.

---

## Verification per step
After each step: `npx prisma validate && npm run typecheck && npm run test && npm run build`.
Mutation routes: manually verify in prod after deploy (CSRF + auth). PWA reskin:
test on a real installed instance incl. iOS Safari.

## Prod-safety callouts
- `db push` and `git push` to `main` both hit prod (no staging, no dev DB).
  Confirm before either. The R0 schema field needs explicit approval to push.
- Any new mutating portal POST must be added to the `proxy.ts` CSRF exemption
  list or it 403s in prod.
