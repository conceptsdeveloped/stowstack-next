# Admin IA Redesign — Execution Plan (current-state → done)

**Companion to** [admin-ia-redesign-plan.md](admin-ia-redesign-plan.md) (the design). This doc is the *build* plan: what is already shipped, what remains, and the exact sequence to finish. Generated from a four-agent audit of the live code on 2026-06-20. Section refs (§) point at the design doc.

## The two hard rules (unchanged)
1. **Never modify the tool pages/components.** Every page under `src/app/admin/**` and every component under `src/components/admin/facility-tabs/**` renders unchanged in the content pane. Relocate, re-route, lazy-load, wrap — never edit internals.
2. **Never touch ad-platform or AI visual-gen internals** (Meta/Google/TikTok publishing, FAL/Runway). Relocate entry points only.

**Prod safety:** `main` auto-deploys to production and there is no staging. Land each phase behind `npm run typecheck && npm test` (build is the heavier gate) and **commit to main; do not push unattended** without Blake's go.

---

## 1. Current state — what is already DONE

The foundation is further along than the design doc's §0 implies. Verified shipped:

| Area | Status | Evidence |
|---|---|---|
| `FacilityProvider` mounted globally under Suspense | ✅ done | `admin-shell.tsx:65-85,578-579` (`FacilityScope` fetches `/api/admin-facilities`, keyed remount) |
| **FacilitySwitcher** built + mounted | ✅ done (placement off-spec) | `facility-switcher.tsx` (searchable dropdown + "All facilities", calls `setFacility`, hidden when single-facility); mounted in **header** `admin-header.tsx:16,135` — plan wanted sidebar top |
| 19 / 20 facility tabs have scope-aware homes | ✅ done | All route through one wrapper `facility-tool-page.tsx` — reads `useFacility()`+`useAdmin()`, shows "Select a facility" at `all`, passes `{facilityId, facilityName, adminKey}` to the tool |
| Content-pane integration (tools receive facility) | ✅ done | Spot-checked creative / occupancy / tenants / funnels / call-tracking — every tab component's prop signature matches what the wrapper passes; no blank-tool risk |
| Sidebar re-spined to the task-first groups | ✅ done | `admin-shell.tsx:116-197` `NAV_GROUPS` (OVERVIEW/LEADS/STUDIO/CHANNELS/INTELLIGENCE/FACILITIES/REVENUE/SYSTEM) |
| Active-state token fix in the new sidebar | ✅ done | `admin-shell.tsx:449` uses `var(--sidebar-text-active)` left-border (no `--burgundy`) |
| Mega-host retired | ✅ done | `facilities/page.tsx` slimmed **1067 → 522 lines**; all 9 drawer hacks gone (0 matches); now a `FacilityCard` chooser grid + lazy `FacilityOverview` + `TAB_REDIRECTS` |
| Operator's Console + data layer | ✅ done (React untested) | `console/page.tsx` (scope-aware Portfolio/Facility workbench) + pure `src/lib/console.ts` (686 ln) with 22 unit tests `src/lib/__tests__/console.test.ts` |
| Command palette (registry + facilities + recents) | ✅ partial | `command-palette.tsx` ~43 destinations, facility "switch to X" via `setFacility`, 3 actions, localStorage recents, keyboard nav, ARIA |
| All 40 sidebar hrefs resolve (no 404s) | ✅ done | Cross-referenced `NAV_GROUPS` hrefs against the 43 `page.tsx` under `src/app/admin` |

**Net:** the scope model and the tool relocation (the risky parts) are effectively built. What's left is **IA hygiene (redirects + duplicate collapse), three missing pages, the keyboard layer, and token/ambient polish.**

---

## 2. Remaining work — BLOCKERS (correctness / IA integrity)

These fail the design doc's §9 success criteria ("every job one home; zero duplicates; all old routes + `?tab=` redirect").

### B1. Redirects are almost entirely absent
`next.config.ts redirects()` has **one** entry (`/changelog → /admin/changelog`). `proxy.ts` has none. Seven old top-level routes do **not** redirect:

| Old | New | Target exists? |
|---|---|---|
| `/admin/campaigns` | `/admin/studio/creative` | yes |
| `/admin/funnels` | `/admin/channels/funnels` | yes |
| `/admin/calls` | `/admin/facilities/call-tracking` | yes |
| `/admin/pms-queue` | `/admin/facilities/pms` | yes |
| `/admin/sequences` | `/admin/channels/automations` | yes |
| `/admin/style-references` | `/admin/studio/library` | **no — build first (B3)** |
| `/admin/partners` | `/admin/revenue/accounts` | **no — build first (B4)** |

`?facility=&tab=` deep links are handled, but only by client-side `router.replace` inside `facilities/page.tsx:62-83,386` (the `TAB_REDIRECTS` table) — fine for `/admin/facilities?tab=`, but it is not a real HTTP redirect. **Work:** add `redirects()` entries (permanent) for the five whose targets exist now; defer the two gated on B3/B4. Add `style-references` to `TAB_REDIRECTS` (it's the one tab missing from that table).

### B2. Five live duplicate pages, several double-linked in the sidebar
Both old and new pages exist on disk; the sidebar links both for three jobs:

- **Campaigns** (`/admin/campaigns`, 258 ln) **and** Creative Studio — both in sidebar (CHANNELS + STUDIO).
- **PMS Queue** (`/admin/pms-queue`, 303 ln) **and** PMS — both in FACILITIES group.
- **Sequences** (`/admin/sequences`, 538 ln) **and** Automations — both in CHANNELS group.
- **Funnels** (`/admin/funnels`, 291 ln) — old page still live, now unlinked.
- **Calls** (`/admin/calls`, 235 ln) — old page still live, now unlinked.

**Work:** remove the duplicate sidebar entries (Campaigns, PMS Queue, Sequences) so each job has one home; convert the five old pages to redirects (B1) once their new homes are confirmed. Do **not** delete the tab *components* — only the old route pages.

### B3. Missing route: `/admin/studio/library` (the 20th tab)
`style-references` is the only one of the 20 tabs with no scope-aware home. Sidebar "Creative Library" still points at the old `/admin/style-references`. The component `facility-tabs/style-references.tsx` exists and supports a portfolio/global scope (`isGlobal`). **Work:** create `src/app/admin/studio/library/page.tsx`. Because the plan marks this **portfolio-only** (§2.1:119), it likely needs a thin host that renders `style-references` in global mode rather than the standard `FacilityToolPage` "pick a facility" gate. Then repoint the sidebar + add the redirect.

### B4. Missing routes: `/admin/revenue/accounts` + `/admin/revenue/billing` (Phase 4)
No `/admin/revenue` directory exists. REVENUE group points at old `/admin/billing` + `/admin/partners`. **Work (Phase 4):** build `/admin/revenue/accounts` merging Billing-Clients + Partners over `/api/organizations`; relocate billing to `/admin/revenue/billing`; repoint sidebar; add redirects. (`/admin/intelligence/revenue` is unrelated — that's the Revenue Intelligence *tool*.)

### B5. Missing `/admin/channels/funnels/[id]`
Only `/admin/funnels/[id]` exists, so funnel-detail deep links break under the new route. **Work:** add the `[id]` route under `channels/funnels` (or redirect old → new including the id).

### B6. Console attention links point at old routes
`console.ts:318,354` emit `AttentionItem.href` of `/admin/campaigns` and `/admin/pms-queue`. Once those redirect, the Console double-hops. **Work:** update those two hrefs to the new routes. (This edits the Console's own data layer, not a tool component — allowed.)

### B7. VA gating will silently open when hrefs migrate
`VA_RESTRICTED_PATHS` (`clerk-roles.ts:13-17`) lists old `/admin/billing`, `/admin/settings`, `/admin/partners`. It matches the sidebar **today** (old hrefs), but the moment B4 / System routes migrate, VAs regain billing/settings/partners access. The match is also exact-only (no prefix). **Work:** update `VA_RESTRICTED_PATHS` in lockstep with each href migration; add `/admin/revenue/accounts` + `/admin/revenue/billing` + `/admin/system/settings`.

---

## 3. Remaining work — KEYBOARD layer (per §12 "keyboard-first")

### K1. `useKeyboardShortcuts` is dead code
The hook is **mounted nowhere** (only self-referenced). The entire G+key nav system, the `/` and `C` handlers, and the `?` handler never run. (⌘K / `/` / Esc work only because the separate `useCommandPalette` hook lives inside `CommandPalette`.) **Work:** mount `useKeyboardShortcuts` in `AdminShell`, wiring `onOpenPalette` → dispatch `admin:open-palette` and `onOpenShortcutsHelp` → the new overlay (K2).

### K2. No `?` shortcuts-help overlay
The handler fires but there is no overlay component. `SHORTCUT_CATEGORIES` (`shortcuts.ts:42-46`) is built for one and unused. **Work:** build a `ShortcutsHelp` modal rendering `SHORTCUT_CATEGORIES`, brand-tokened.

### K3. Stale shortcut routes
`NAV_SHORTCUT_ROUTES` + `SHORTCUTS` (`shortcuts.ts:25-56`) and the hardcoded `C → /admin/campaigns/create` (`use-keyboard-shortcuts.ts:95`) point at old routes/labels. **Work:** extend to the new spine (Studio/Channels/Intelligence/Console), fix labels.

---

## 4. Remaining work — POLISH (tokens, palette depth, ambient)

### P1. Token hygiene
- **FacilityBadge** uses banned `var(--color-gold)`/`--color-gold-light` (`facility-badge.tsx:24-25`). Renders monochrome inside `.admin-theme` (gold→`--ink` override) but is non-compliant and risky outside admin scope. → `var(--ink)` / `var(--active-bg)`.
- **`--burgundy` × 2** in `facilities/page.tsx:~99,434` (undefined token) + Tailwind status colors (`emerald/yellow/red-500`) instead of `--t-*`. → sweep to `--t-*` / `--ink`.
- **14 hardcoded hex** in `admin-shell.tsx` (LoginGate / access-denied / spinner fallbacks): `#1A1A1A→--ink`, `#737373→--ink2`, `#A3A3A3→--ink3`, `#FFFFFF→--bg/--card`, `#B04A3A→--t-red`. (`admin-header.tsx` is already clean.)

### P2. Command palette depth (vs §12)
Real registry exists, but: **no fuzzy search** (plain substring `matches()` `:116-119`), **no pins** (recents only), **no virtualization**, **only 3 actions**, and the **route registry is duplicated** from the sidebar (two sources of truth — already drifting, e.g. it lists `/admin/funnels`, `/admin/calls`). **Work:** add fuzzy ranking + pins; extract a single shared route/command registry consumed by both sidebar and palette; broaden actions (facility-scoped: "New ad for {facility}", "Publish to Meta", "Jump to PMS").

### P3. Ambient signals (the "menu as pulse monitor")
Only `/admin` shows a count (`navCounts["/admin"] = totalLeads`, `admin-shell.tsx:359-365`). No status dots, sparklines, or other counts — the largest unbuilt piece of the §12 "ambient instrument" brief. **Work:** widen `navCounts` to a `{count, status, series}` model fed by cheap cached endpoints (pending PMS, active campaigns, GBP reviews/notifications), render dots/sparklines on Studio/Channels/Facilities/Revenue items.

### P4. Open decisions to lock before building
- **Switcher placement:** accept header, or relocate/duplicate to sidebar top per §2.1/§4.2.
- **Central fetch scoping (§8 decision 5):** today resolved *per-page* — `useAdminFetch` was **not** extended; only `campaigns` + `reports` apply the `currentId !== 'all'` idiom (tool routes scope via the wrapper prop instead). Decide whether to add central auto-injection (`ignoreFacilityScope` opt-out) as the choke-point, or ratify per-page and document the idiom for new pages.
- **Path-string divergence:** built `/admin/facilities/pms` (plan §2.1 said `/admin/pms`) and `/admin/facilities/call-tracking` (plan said `/admin/facilities/calls`). Redirects/nav are internally consistent — reconcile plan vs routes so §2.1/§3 match reality.
- **`/admin/facilities` chooser** drives selection via its own `useAdminFetch` + `?facility=` param, not `useFacility()`/`setFacility()` — reconcile so the grid and the global switcher share one scope source.
- **Portfolio roll-ups at `all` scope:** facility-only tools (occupancy/revenue/market/tenants/GBP) show a generic "Select a facility" instead of the §2.3 roll-up. Acceptable v1; flag as deferred.
- **Console React tests:** `page.tsx` + `components/admin/console/*` are untested (data layer is well-covered). Add render/scope-switch tests.

---

## 5. Recommended sequence (each phase ends green; commit to main, don't push unattended)

**Phase A — IA integrity (highest leverage, low risk).** B1 redirects (the 5 ready) + B2 duplicate-sidebar removal + B6 Console hrefs + B5 funnel `[id]`. Ships: one home per job, old links forward. Verify: `typecheck && test`, manually hit each old URL.

**Phase B — the two missing pages.** B3 `/admin/studio/library` (+ repoint sidebar + redirect) and B4 `/admin/revenue/{accounts,billing}` (+ B7 VA paths + redirects). Ships: all 20 tabs homed; Phase-4 merge done.

**Phase C — keyboard layer.** K1 mount + K3 routes + K2 `?` overlay. Ships: keyboard-first nav per §12.

**Phase D — token sweep.** P1 (FacilityBadge, `--burgundy`, hardcoded hex). Mechanical, §6 map. Ships: brand-clean chrome.

**Phase E — palette + ambient depth.** P2 (fuzzy/pins/shared registry/actions) then P3 (ambient signals). Ships: the "best admin nav" §12 ceiling.

Lock the P4 decisions before Phase B (they change route strings and the switcher).

---

## 6. One-line status

Scope model, tool relocation, switcher, console, and mega-host retirement are **done**. The unfinished half is **IA hygiene** (redirects + duplicate collapse + 3 missing pages), the **keyboard layer** (built but unmounted), and **token/ambient polish** — none of it blocked, all of it additive to a working shell.
