# Customer Dashboard — Alpha Critical-Path Tickets

Ticket-ready breakdown of the critical path from [customer-dashboard-plan.md](./customer-dashboard-plan.md): **M0 → M1 → M2 → M7**. These are the milestones that make the dashboard's numbers *real*, which is the point of a results dashboard for the alpha portfolio.

Each ticket is sized to land in one focused session. File paths, schema columns, and current-code references are verified against the tree as of this writing. Every ticket ends with the standard gate:

```bash
npx prisma validate && npx tsc --noEmit && npm run test && npm run build
```

Mutation routes additionally require a prod check (CSRF exemption in `src/proxy.ts` + auth) after deploy.

---

## M0 — Foundation

### T-M0.1 — `resolvePortalClient()` shared auth helper
**Why:** Every portal route re-implements client resolution. `src/app/api/client-reports/route.ts:31-40` resolves `clients` by `access_code` + case-insensitive `email`; the same block is copy-pasted across `client-data`, `portal-gbp`, `client-messages`, `client-billing`, etc. One helper removes drift and gives later tickets a single auth surface.

**Files:**
- New: `src/lib/portal-auth.ts` — export `resolvePortalClient(req): Promise<{ client, facilityId } | null>`.
- Edit (adopt helper): `src/app/api/client-reports/route.ts`, `src/app/api/client-data/route.ts`, `src/app/api/portal-gbp/route.ts`, `src/app/api/client-activity/route.ts`. (Sweep `src/app/api/client-*` and `portal-*` with `grep -l 'access_code' src/app/api/**/route.ts`.)

**Behavior:**
- Accept the active patterns: query `?accessCode=&email=` and/or POST body `{ accessCode, email }`, plus the OTP path against `portal_login_codes` (mark used on verify, as `client-data` does today).
- Match `clients.access_code` exactly + `email` case-insensitive (`mode: "insensitive"`).
- Return `null` on no match; callers return `401`. Never throw to the route.
- Admin override: if `isAdminRequest(req)` and a `clientId` is supplied, resolve by id (preserve existing `client-reports:42` behavior).

**Acceptance criteria:**
- [ ] All four edited routes resolve identically through the helper; no behavior change observable from the client.
- [ ] Unit test: valid code+email resolves; wrong email rejects; expired/used OTP rejects; admin+clientId resolves.
- [ ] No remaining inline `clients.findFirst({ where: { access_code` blocks in the edited routes.

**Out of scope:** server-side session table (deferred per plan); touching partner `sessions` auth.

---

### T-M0.2 — Portal route error envelope + rate-limit consistency
**Why:** Routes return ad-hoc shapes. Standardize so the portal client can handle errors uniformly as new routes land.

**Files:** `src/lib/api-helpers.ts` (reuse `jsonResponse`/`errorResponse`), the routes from T-M0.1.

**Acceptance criteria:**
- [ ] Every portal route applies `applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "<name>")` (pattern already in `client-reports:18`).
- [ ] Error responses use `errorResponse(msg, status, origin)` consistently; success uses `jsonResponse`.
- [ ] `OPTIONS` CORS preflight present on each (via `corsResponse(getOrigin(req))`).

---

### T-M0.3 — CSRF exemption checklist for portal mutation routes
**Why:** `src/proxy.ts` 403s non-exempt mutating POSTs in prod (this already broke `/portal` login). Any new portal POST/PATCH must be exempted or it dies in prod.

**Files:** `src/proxy.ts` (CSRF allowlist / `requiresCsrf()` in `src/lib/csrf.ts`).

**Acceptance criteria:**
- [ ] Inline comment in `proxy.ts` documenting the rule: "new portal mutation route → add here."
- [ ] All existing portal mutation routes audited and present in the exemption set.
- [ ] Verified in prod after deploy that a portal PATCH (e.g. `client-data` monthly_goal) returns 200, not 403.

---

## M1 — Results dashboard accuracy + goal tracker

### T-M1.1 — Audit and fix move-in counting
**Why:** The dashboard's headline numbers must be correct. A move-in = `partial_leads.lead_status = 'moved_in'` with `monthly_revenue` set. There are two count paths (`/api/attribution` live query vs `client_campaigns` manual rollup) — confirm no double-count.

**Files:** `src/app/api/attribution/route.ts` (read; `campaign_spend` join is Angelo's domain — coordinate before editing the spend side), `src/app/portal/page.tsx` (WelcomeBanner 90-day numbers), `src/app/portal/campaigns/page.tsx`.

**Acceptance criteria:**
- [ ] A single move-in is counted once across the dashboard and campaigns page.
- [ ] 90-day window is computed off `partial_leads.created_at` (indexed `idx_partial_leads_facility_created`) or status-event date — document which and why.
- [ ] Test: seed leads in `moved_in`/`partial`/`lost`; assert counts match expected for a fixed facility + window.

**Out of scope:** CPL/ROAS spend math (Angelo).

---

### T-M1.2 — `client_goals` table for monthly goal history
**Why:** `clients.monthly_goal` is a single `Int?` scalar — no history, no trend. Add a lightweight per-month table so the tracker shows trajectory.

**Schema (additive — review + prod-safe push required):**
```prisma
model client_goals {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  client_id    String   @db.Uuid
  period_month DateTime @db.Date          // first of month
  target       Int      @default(0)
  actual       Int      @default(0)        // snapshot of move-ins for the month
  created_at   DateTime @default(now())   @db.Timestamptz(6)
  updated_at   DateTime @updatedAt        @db.Timestamptz(6)
  clients      clients  @relation(fields: [client_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([client_id, period_month], map: "uniq_client_goal_month")
  @@index([client_id, period_month(sort: Desc)], map: "idx_client_goals_client")
}
```
Add the back-relation `client_goals client_goals[]` to `model clients`.

**Files:** `prisma/schema.prisma`; new `src/app/api/client-goals/route.ts` (GET history via `resolvePortalClient`, admin PATCH to set target); `src/components/portal/*` goal card (`CampaignGoalProgress`).

**Acceptance criteria:**
- [ ] `monthly_goal` seeds the current month's `target` if no row exists (no breaking change to existing UI).
- [ ] Goal card shows current month + prior months' target vs actual.
- [ ] `client-goals` POST/PATCH added to CSRF exemption (T-M0.3).
- [ ] `npx prisma validate` passes; migration is additive only (no data loss — `lint:safety` clean).

---

### T-M1.3 — Pace-to-goal on the dashboard
**Files:** `src/app/portal/page.tsx`, goal card component.

**Acceptance criteria:**
- [ ] Card shows days left in month and on-pace/behind indicator computed from current month's `actual` vs `target`.
- [ ] Degrades gracefully when `target = 0` (no goal set) — shows a "set a goal" prompt, not a divide-by-zero.

---

## M2 — Reports & occupancy: compute the zeros

### T-M2.1 — Compute MTD move-ins / move-outs
**Why:** `src/app/api/client-reports/route.ts:84-86` hardcodes `move_ins_mtd: 0, move_outs_mtd: 0, delinquency_pct: 0`. Replace with real counts.

**Implementation:**
- Move-ins MTD: count `lead_status_events` where `to_status = 'moved_in'` and `changed_at >= start-of-month`, for leads whose `partial_leads.facility_id = client.facility_id` (join `status_events` → `partial_leads`).
- Move-outs MTD: from `facility_pms_aging.move_out_date` within the month, OR a `to_status` move-out event if one exists — confirm which signal the data carries before choosing; document the choice.

**Files:** `src/app/api/client-reports/route.ts` (the `occupancy` object construction, lines 80-87).

**Acceptance criteria:**
- [ ] `move_ins_mtd` / `move_outs_mtd` reflect real current-month data for a facility with seeded events.
- [ ] Month boundary correct (timezone-stable; use start-of-month in a fixed zone, test across a boundary date).
- [ ] Test covers a facility with events spanning two months — only current month counts.

---

### T-M2.2 — Delinquency from aging (data-gated)
**Why:** Delinquency needs `facility_pms_aging`, which is only populated once the M7 parser runs. Until then, show nothing rather than a fake `0`.

**Implementation:** delinquency_pct from `facility_pms_aging` (e.g. share of occupied units with any balance in `bucket_31_60`+ buckets, or dollar-weighted past-due ÷ total). Return `null` when no aging rows exist for the facility.

**Files:** `src/app/api/client-reports/route.ts`; `src/app/portal/reports/page.tsx` (hide the delinquency card when `null`).

**Acceptance criteria:**
- [ ] No aging data → field is `null` and the card is hidden (no `0%` shown).
- [ ] With seeded aging rows → percentage matches the documented formula.
- [ ] Depends on T-M7.1 for real data; ships behind the null-gate independently.

---

### T-M2.3 — Empty states for un-uploaded facilities
**Why:** The alpha portfolio starts with sparse data. Every reports surface must degrade.

**Files:** `src/app/portal/reports/page.tsx`.

**Acceptance criteria:**
- [ ] Facility with zero snapshots/units shows a clear "upload a report to see this" empty state, not blank charts or `NaN`.
- [ ] Occupancy trend, snapshot cards, unit mix each handle the empty case.

---

## M7 — PMS upload → parse pipeline (unblocks M2 fully)

### T-M7.1 — CSV parser → `facility_pms_*`
**Why:** `/api/portal-upload` stores files to Blob + a `pms_reports` row at status `uploaded`, but **nothing parses them**. The dashboard reads `facility_pms_snapshots` / `facility_pms_units` / `facility_pms_aging`, which are only filled manually today. Build the parser (CSV first — the format the admin `pms-upload-tab.tsx` already targets).

**Files:** new `src/lib/pms-parser.ts` (shared with admin upload — `src/components/admin/facility-tabs/pms-upload-tab.tsx`); `src/app/api/portal-upload/route.ts`.

**Implementation:**
- Reuse the existing smart column-matching approach (Section 8: "auto-detects spreadsheet columns across formats").
- Parse into `facility_pms_snapshots` (occupancy), `facility_pms_units` (unit mix), `facility_pms_aging` (delinquency). Rent roll / revenue tables optional in v1.
- Scope strictly to the uploading client's `facility_id` (tenant isolation — verify the facility belongs to the resolved client before writing).

**Acceptance criteria:**
- [ ] A sample CSV produces correct rows in the three `facility_pms_*` tables.
- [ ] Writes are scoped to the correct `facility_id`; a client cannot write another facility's data (test this explicitly).
- [ ] Malformed CSV fails gracefully → `pms_reports.status = 'failed'` with an error note, no partial writes.
- [ ] Parser is pure/unit-testable (no request object dependency) so both portal and admin call it.

**Out of scope:** PDF/XLSX parsing (later); API-based PMS sync (separate roadmap item — and per project notes, no live storEDGE API exists, so copy must not claim it).

---

### T-M7.2 — `processed` status transition + admin approval gate
**Why:** Section 8 requires "founder approval before data goes live." Parsed data must not hit the customer dashboard until an admin approves.

**Files:** `src/app/api/portal-upload/route.ts`, an admin review surface (existing upload review queue / facility tab).

**Acceptance criteria:**
- [ ] Successful parse moves `pms_reports` `uploaded` → `parsed` (staged), not directly customer-visible.
- [ ] Admin approval flips to `processed` and publishes to `facility_pms_*` (or marks staged rows live).
- [ ] Dashboard reads only approved/published data.

---

### T-M7.3 — Anomaly check before publish
**Why:** Don't let a bad upload nuke a customer's numbers (project note: data anomaly alerts).

**Acceptance criteria:**
- [ ] On parse, flag sudden occupancy/revenue swings vs the prior snapshot (configurable threshold) for admin attention before approval.
- [ ] Anomalies surface in the admin review queue; they don't auto-publish.

---

## Execution order & gating

```
T-M0.1 ─> T-M0.2 ─> T-M0.3        (foundation; do first)
   └─> T-M1.1 ─> T-M1.2 ─> T-M1.3 (results/goals; no Angelo dep)
   └─> T-M2.1 ─> T-M2.3           (reports MTD + empty states)
T-M7.1 ─> T-M7.2 ─> T-M7.3        (parser)  ──unblocks──>  T-M2.2 (delinquency)
```

- **T-M2.2** (delinquency) ships behind a null-gate before T-M7.1, then lights up once the parser runs.
- **Anything touching `campaign_spend` / CPL / ROAS** waits on Angelo coordination — not on this critical path.
- **All schema changes** (T-M1.2, and any staging columns in T-M7.2) are additive; still require schema review and a confirmed prod-safe push (`db push` hits prod directly — no staging DB).

## Definition of done for the alpha critical path
- [ ] `/portal` headline leads/move-ins counts are verified correct (T-M1.1).
- [ ] Goal tracker shows real target vs actual with history (T-M1.2/1.3).
- [ ] `/portal/reports` shows real MTD move-ins/outs and honest delinquency (T-M2.1/2.2), with empty states (T-M2.3).
- [ ] A customer can upload a CSV and, after admin approval, see their occupancy/unit-mix/delinquency update (T-M7.1/7.2/7.3).
- [ ] No surface anywhere shows a fabricated `0` for data that doesn't exist.
- [ ] Gate green on every ticket: `npx prisma validate && npx tsc --noEmit && npm run test && npm run build`.
