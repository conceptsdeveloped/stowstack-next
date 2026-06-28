# Customer Dashboard — Phased Implementation Plan

Source of truth for scope: **Section 9 of the feature list** ("The customer's own dashboard"), rendered from `src/lib/ideas-doc.ts`. This plan turns that nine-item feature list into shippable milestones.

## Starting reality (do not re-build what exists)

The portal at `/portal` is already scaffolded end-to-end. Almost every Section 9 surface has a finished UI; the gap is **backend depth, real data pipelines, and a couple of ephemeral stores that must move to Postgres**. This plan is therefore mostly *hardening and wiring*, not greenfield construction.

| Section 9 feature | Route | Current state | Real remaining work |
|---|---|---|---|
| Results dashboard (90-day leads/move-ins + monthly goal) | `/portal` | UI complete; reads `/api/attribution`, goal = `clients.monthly_goal` scalar | Goal model depth; verify move-in counting |
| Campaign performance (spend/leads/CPL/ROAS) | `/portal/campaigns` | UI complete; `/api/attribution` over `campaign_spend` + `partial_leads` | Attribution accuracy (Angelo's domain — coordinate) |
| Reports & occupancy | `/portal/reports` | UI complete; MTD move-in/move-out/delinquency hardcoded `0` | Compute those fields; PMS upload→parse pipeline |
| Reputation view | `/portal/gbp` | UI complete, gated on `gbp_connections` | GBP connection/sync depth (partly Angelo) |
| Upload reports | `/portal/upload` | Upload to Blob + `pms_reports` works; **no parser** | Parse uploads into `facility_pms_*` |
| Two-way messaging | `/portal/messages` | UI complete; **Redis-only, ephemeral** | Rebuild on a Postgres model |
| Billing & invoices | `/portal/billing` | UI complete; **invoices in Redis**, two parallel systems | Consolidate to Stripe + Postgres |
| Setup wizard (6-step, save/resume) | `/portal/onboarding` | **Complete** (`client_onboarding` table) | None — maintenance only |
| Mobile app feel (installable/offline/push) | global | PWA shell + SW + web-push infra exist | Wire portal push subscription (admin-gated today) |

### Cross-cutting facts that shape sequencing
- **Auth is OTP + query-param `?code=&email=`**, not `Authorization: Bearer`. Session lives in `localStorage` (`storageads_portal_session`); there is no server session table for the portal. Every new portal route must re-resolve the client from `clients.access_code` + email and apply `applyRateLimit`. (Correct the CLAUDE.md drift in passing, don't fight it.)
- **`partial_leads` is the de-facto leads table** (no `leads` model). A move-in = `lead_status = 'moved_in'` with `monthly_revenue` set.
- **Spend/attribution (`campaign_spend`) is Angelo's domain.** Anything touching CPL/ROAS accuracy must be coordinated, not edited unilaterally.
- **CSRF gate (`proxy.ts`) 403s non-exempt mutating POSTs.** Any new portal mutation route must be added to the CSRF exemption/allowlist or it breaks in prod (this already bit `/portal` login once). Verify in prod after each mutation route ships.
- **Prod safety:** `db push` and `git push` to `main` both hit prod (no staging, no dev DB). Schema changes go through review; confirm before pushing.
- **Design pass owed:** portal UI leans on `--color-gold`, banned outside the logo. Fold a token cleanup into the visual milestone.

---

## Phasing principle

Each milestone ships independently and is demoable on its own. Order is by **data dependency** and **user-visible payoff for alpha** (Blake's own portfolio is the first audience). Milestones M1–M3 harden what customers already see; M4–M6 fix the thin backends; M7–M8 are the data pipeline and polish.

---

## M0 — Foundation: portal data contract + auth hardening
**Goal:** one trustworthy way for any portal route to authenticate and resolve the active client/facility, so every later milestone builds on it.

- Extract a single `resolvePortalClient(req)` helper (email + access_code/OTP → client + facility), replacing the per-route re-resolution copy-paste in `client-data`, `client-reports`, `portal-gbp`, etc.
- Standardize rate limiting and error shape across portal routes.
- Add new mutation routes to the `proxy.ts` CSRF exemption list as they land; document the rule inline.
- Decide and document: keep `localStorage` session (yes for alpha) vs. server session table (defer).

**Dependencies:** none. **Unblocks:** every other milestone.
**Risk:** low. Pure refactor; cover with the existing portal-route test pattern.
**Ticketable as:** `portal: resolvePortalClient helper`, `portal: standardize rate-limit + error envelope`, `portal: CSRF exemption checklist for mutation routes`.

---

## M1 — Results dashboard accuracy + goal tracker depth
**Goal:** the landing dashboard numbers are provably correct and the goal tracker is real.

- Audit the 90-day leads/move-ins math on `/portal` and `/api/attribution`: confirm a move-in is counted exactly once (`lead_status = 'moved_in'`), no double-count across `partial_leads`/`client_campaigns`.
- Goal tracker: `clients.monthly_goal` is a single scalar. Decide whether alpha needs per-month history. **Recommended:** add a lightweight `client_goals` table (`client_id`, `period_month`, `target`, `actual_snapshot`) so the tracker shows trend, not just current month. Keep `monthly_goal` as the default seed.
- Surface "days left in month" + pace-to-goal (already partially in `CampaignGoalProgress`).

**Dependencies:** M0. Reads `partial_leads` (owned), not spend (Angelo) — so shippable without Angelo coordination.
**Schema:** new `client_goals` (additive, low-risk). Goes through schema review.
**Ticketable as:** `dashboard: audit move-in counting`, `schema: client_goals table`, `dashboard: monthly goal trend`.

---

## M2 — Reports & occupancy: compute the missing fields
**Goal:** `/portal/reports` stops showing hardcoded zeros.

- Compute `move_ins_mtd`, `move_outs_mtd`, `delinquency_pct` in `/api/client-reports` from real data:
  - move-ins/outs from `partial_leads` status events (`lead_status_events`) within the month.
  - delinquency from `facility_pms_aging` once the upload parser (M7) populates it; until then, expose it only when data exists (no fake zeros — hide the card).
- Occupancy trend, snapshot cards, unit mix already read `facility_pms_snapshots` / `facility_pms_units` — verify they degrade gracefully when a facility has no uploaded data yet.
- Downloadable report: confirm the JSON export matches what's on screen; consider PDF later (M8).

**Dependencies:** M0. Full delinquency depends on **M7** (parser); ship the move-in/out parts first, gate delinquency behind data presence.
**Risk:** medium — touches the month-boundary logic; cover with tests.
**Ticketable as:** `reports: compute MTD move-ins/outs`, `reports: delinquency from aging (data-gated)`, `reports: empty-state for un-uploaded facilities`.

---

## M3 — Reputation view hardening
**Goal:** `/portal/gbp` is reliable for connected facilities and honest for unconnected ones.

- Verify `/api/portal-gbp` returns rating, review count, response rate, recent reviews from `gbp_reviews` / `gbp_connections`.
- Confirm the "Not Connected" empty state is accurate and gives the customer a clear next step (request connection via messaging or contact card).
- Coordinate with Angelo on GBP sync freshness (the live sync is partial per project notes) — **do not claim live sync** in copy if it isn't real.

**Dependencies:** M0. Coordinate with Angelo for sync depth; the read-only view ships independently.
**Risk:** low (read-only).
**Ticketable as:** `gbp: verify portal read path`, `gbp: honest unconnected state + CTA`.

---

## M4 — Two-way messaging: move off Redis to Postgres  ✅ DONE (commits 5451cae, feebaa6)
**Goal:** messages are durable, threaded, and admin-visible — the current Redis list (capped 200, ephemeral) is not acceptable for a paying customer.

**Shipped:** `client_messages` table; `/api/client-messages` rewritten onto Postgres (wire contract unchanged, reading a thread marks the other party's messages read); admin inbox at `/admin/messages` + `/api/admin-message-threads` (thread list, unread counts) with a REVENUE nav entry. Notification-on-new-message reuses the M6 push/email layer (follow-on). **Requires the prod DDL apply** (see end of doc).

- New schema: `client_messages` (`id`, `client_id`, `sender` enum `client|team`, `body`, `read_at`, `created_at`) and optional `message_threads` if multi-topic is wanted (defer; single thread per client is fine for alpha).
- Rewrite `/api/client-messages` to read/write Postgres; migrate any existing Redis content (or accept a clean cutover for alpha).
- Admin side: a place for Blake/Angelo to read and reply (admin facility tab or a simple inbox). Without this, "two-way" is one-way.
- Wire push/email notification on new message in each direction (reuses M6 push + existing email layer in `src/lib/email.ts`).

**Dependencies:** M0; notification step depends on M6 (can ship messaging first, notifications follow).
**Schema:** new tables (additive). Schema review + prod-safe push.
**Risk:** medium — it's a backend swap behind a finished UI; the UI contract shouldn't change.
**Ticketable as:** `schema: client_messages`, `messages: Postgres backend`, `admin: client message inbox`, `messages: new-message notifications`.

---

## M5 — Billing & invoices: consolidate on Stripe + Postgres  ✅ DONE (commit 6677189)
**Goal:** one invoice system of record; kill the Redis/`activity_log` split.

**Shipped:** `client_invoices` table is the single source of record. `/api/client-billing` rewritten off Redis (GET client/admin, POST author, PATCH mark-paid with auto `paid_at`); the `client-invoices` emailer now also persists each emailed invoice. Portal UI contract unchanged. **Stripe-webhook auto-sync left as an explicit follow-on** (touches the shared webhook handler); admins mark paid via PATCH today. **Requires the prod DDL apply** (see end of doc).

- Today there are **two** competing sources: `client-billing` (invoices in Redis) and `client-invoices` (derived from `activity_log`). Pick one model.
- **Recommended:** persist invoices in Postgres (`client_invoices` table: `id`, `client_id`, `amount`, `ad_spend`, `fee`, `status`, `stripe_invoice_id?`, `issued_at`, `paid_at`), authored by admin, optionally synced from Stripe invoices/webhooks.
- Keep "Manage Payment Method" → `create-billing-portal` (already works via Stripe billing portal).
- Decide the billing model explicitly: founder-issued invoices (ad spend + fee) per CLAUDE.md, vs. Stripe subscription. Section 11 says both exist (subscription tiers + founder-issued invoices) — the portal should show **both** the subscription status and the issued invoices.
- Reconcile `paid/outstanding/ad spend` summary cards against the new single source.

**Dependencies:** M0. Stripe webhook plumbing already exists elsewhere — reuse it. Coordinate with whoever owns the Stripe webhook handler.
**Schema:** new `client_invoices` table; deprecate Redis `billing:<code>`.
**Risk:** medium-high — money. Test the Stripe webhook path; never run destructive migrations against prod without approval.
**Ticketable as:** `schema: client_invoices`, `billing: migrate Redis→Postgres`, `billing: Stripe invoice sync`, `billing: show subscription status + issued invoices`, `billing: retire client-invoices/activity_log path`.

---

## M6 — Mobile app feel: wire portal push + install polish
**Goal:** the PWA infra that already exists (manifest, SW, web-push, offline page) actually works for customers.

- Push is currently **admin-only**: `use-push-notifications` defaults `userType: "admin"` and `/api/push-subscribe` is `requireAdminKey`-gated. Add a portal-authenticated path so a logged-in client can subscribe (`userType: "client"`, validated via `resolvePortalClient` from M0).
- Call `subscribe()` from the portal (settings or a prompt after onboarding) and store with the client association.
- Verify `icon-192.png` / `icon-512.png` exist in `public/` (manifest references them) — install is broken without them.
- Confirm offline fallback (`/offline`) and pull-to-refresh behave on the portal routes.
- Tie push to events from M2/M4/M5 (new report ready, new message, invoice issued).

**Dependencies:** M0 (auth for subscribe). Notification *content* depends on M2/M4/M5 events but the subscription plumbing ships independently.
**Risk:** low-medium. Test on a real installed PWA (iOS Safari is the strict case).
**Ticketable as:** `push: client-authenticated subscribe path`, `push: portal subscribe UX`, `pwa: verify icons + offline`, `push: event wiring (reports/messages/billing)`.

---

## M7 — PMS upload → parse pipeline  ✅ DONE (commit 71b1cf7)
**Goal:** uploaded reports actually populate the data the dashboard reads, instead of sitting in Blob with status `uploaded`.

**Shipped:** one shared importer `src/lib/pms-import.ts` (detect → map → anomaly-gate → write to `facility_pms_*`, including unit-mix derivation), used by all three surfaces — `/api/portal-upload` (sync auto-import on clean CSV; `needs_review` staging otherwise), `/api/pms-data` (admin import + `process_report` approval action + tab "Approve & Import" button), and `/api/cron/process-pms-uploads` (batch backstop, now delegating to the lib instead of its own copy). No schema change needed (`pms_reports.report_data/status/notes/processed_*` already existed). This unblocks M2's delinquency field. 16 new tests; full suite + build green.

- Today `/api/portal-upload` stores files (CSV/PDF/Excel) to Vercel Blob + a `pms_reports` row, status `uploaded`. **No parser runs.** The `facility_pms_*` tables are populated manually by admin.
- Build a parser (start CSV-only, the format Section 8 / admin upload already targets) that reads rent roll, occupancy, aging, unit mix into `facility_pms_snapshots`, `facility_pms_units`, `facility_pms_aging`, etc., using the existing smart column-matching approach.
- Move `pms_reports` from `uploaded` → `processed` on success; keep the admin review queue (Section 8: "founder approval before data goes live") as the gate before customer-visible data updates.
- This unblocks the delinquency field (M2) and makes reports/occupancy self-serve.

**Dependencies:** M0; **unblocks the data-gated parts of M2**. Coordinate with the admin PMS upload tab (`pms-upload-tab.tsx`) to share parsing logic.
**Risk:** high — format variability. Phase it: CSV first, behind admin approval, with anomaly checks before anything goes customer-visible. PDF/XLSX later.
**Ticketable as:** `pms: CSV parser → facility_pms_*`, `pms: processed-status transition`, `pms: admin approval gate`, `pms: anomaly check before publish`.

---

## M8 — Polish, design compliance, downloadable PDF  ◑ MOSTLY DONE (commit 7d95b6e)
**Goal:** the dashboard looks and feels finished for alpha.

**Shipped:** PDF report download (`/api/client-report-pdf` + `src/lib/occupancy-pdf.tsx`, "Download PDF" on /portal/reports). Gold-token cleanup: portal is already token-clean (no `--color-gold`/amber). Empty/loading/error states: covered by the portal UI kit. **Remaining:** the operator-voice copy pass (subjective, no functional defect) — the one open polish item.

- Design-system pass: remove `--color-gold` usage outside the logo across all portal components; replace with charcoal/light tokens (see `.claude/design-system.md`).
- Downloadable report as PDF (reuses `@react-pdf/renderer` already in the stack) in addition to the JSON export.
- Empty/loading/error states audited across every portal route for facilities with no data yet (the alpha portfolio will have sparse data on day one).
- Copy pass on all customer-facing portal strings via the `operator-copy` skill — no slop, no em-dashes, honest about what's connected.

**Dependencies:** all prior milestones (polishes their surfaces).
**Risk:** low.
**Ticketable as:** `portal: gold token cleanup`, `reports: PDF export`, `portal: empty/loading/error audit`, `portal: operator-voice copy pass`.

---

## Suggested sequencing

```
M0 (foundation) ──┬─> M1 (results/goals)      ── shippable, no Angelo dep
                  ├─> M3 (reputation read)     ── shippable, coordinate Angelo
                  ├─> M4 (messaging→Postgres)
                  ├─> M5 (billing→Stripe/PG)
                  └─> M6 (push wiring)
M7 (PMS parser) ──> completes M2 (reports MTD + delinquency)
M8 (polish) ──────> last, across everything
```

**Critical path for alpha (Blake's portfolio):** M0 → M1 → M2(partial) → M7 → M2(complete). These make the *numbers real*, which is the whole point of a results dashboard.

**Parallelizable once M0 lands:** M3, M4, M5, M6 are independent of each other and of the data pipeline. They can be picked up in any order based on what alpha feedback demands (messaging and billing are the most likely customer asks).

**Defer past alpha:** per-thread messaging, BNPL/payments depth, PDF beyond reports, server-side portal sessions.

---

## Dependency callouts (for tickets)

- **Stripe (M5):** reuse existing webhook handler; do not stand up a second one. Money path — test thoroughly, no destructive prod migrations without approval.
- **Reporting inputs (M2, M7):** the dashboard's honesty depends entirely on the PMS parser. Until M7 ships, gate any field that would otherwise show a fake `0`.
- **Attribution/spend (M1 campaigns, CPL/ROAS):** `campaign_spend` is Angelo's domain — coordinate, don't edit.
- **GBP sync (M3):** partial live sync per project notes; copy must not over-claim.
- **CSRF gate (all mutation routes):** add each new POST to the `proxy.ts` exemption list or it 403s in prod.
- **Schema changes (M1, M4, M5):** all additive; still go through schema review and prod-safe push — `db push` hits prod directly.

## Verification per milestone

After each milestone: `npx prisma validate && npm run typecheck && npm run test && npm run build`. For mutation routes, manually verify in prod after deploy (CSRF + auth). For PWA (M6), test on a real installed instance including iOS Safari.

## ⚠️ Required prod step (M4 + M5)

The `client_messages` and `client_invoices` tables (M4/M5) are defined in the schema and generated client, but the **tables must be created in prod** before those features work live. The migration is additive and idempotent (no data-loss ops). Run from a shell that has `DATABASE_URL`:

```bash
npx prisma db execute --file prisma/manual/2026-06-28-customer-dashboard-tables.sql --schema prisma/schema.prisma
```

Then deploy (the build runs `prisma generate`). Until this runs, `/api/client-messages` and `/api/client-billing` will error against the missing tables. `client_goals` (M1) is owned by the client-goals feature and is intentionally not in this file.
