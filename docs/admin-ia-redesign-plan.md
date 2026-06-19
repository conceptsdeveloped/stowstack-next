# Admin IA Redesign — Complete Plan

**Status:** Plan only. No code changes until Phase 0 decisions are signed off.
**Scope:** `src/app/admin/**`, `src/components/admin/**`, the admin chrome, and the navigation/scope/keyboard primitives that feed them.
**Goal:** Replace two competing menus (24 global routes + 20 facility tabs = 44 destinations) with **one task-first spine, re-scoped by a global facility context switcher**, plus a ⌘K command palette. Every job gets exactly one home; duplicates collapse via scope, not deletion.

---

## Creative mandate (revised 2026-06-19): the menu is the product

The brief changed. The menu IS the product: build the most attractive and most performant navigation experience in B2B SaaS, in our editorial brand, **without touching the tools**. The IA in §1-§6 defines *what* the menu contains and the scope model it runs on; this mandate defines *how* it must feel and perform. The conservative, minimal-diff, preserve-everything framing is dropped.

**Only two hard rules survive:**
1. Never modify the tool pages/components — every page under `src/app/admin/**` and every component under `src/components/admin/facility-tabs/**` renders unchanged in the content pane. Relocate, re-route, lazy-load, and wrap freely; never edit internals or behavior.
2. Never touch ad-platform or AI visual-gen internals (Meta/Google/TikTok publishing, FAL/Runway). Relocate entry points only.

Everything else about the shell is open: sidebar, scope switcher, ⌘K palette, keyboard system, routing, motion, ambient live data, personalization, mobile. Replace the current chrome entirely. Optimize for "best admin nav I've ever used," not minimal diff.

**Attractive:** Manrope; charcoal (`#1A1A1A`) on cream (`#F1EAE0`); A24/Kubrick restraint where hierarchy and negative space carry the design, not color; tabular numerals wherever numbers appear; editorial `§` section markers; hairline rules. Brand tokens only (§6); fix the broken `--burgundy` active state; semantic green/blue/red only as tiny status signals; no sienna gold except the brand-locked logo. Tasteful, meaningful motion (View Transitions, spring drawer, full reduced-motion fallback).

**Performant (half the brief):** a persistent shell that never re-mounts; prefetch on hover/focus/intent; optimistic active state; zero layout shift; sub-100ms perceived navigation at a steady 60fps; a real fuzzy ⌘K palette over every tool, facility, and action with recents and pins; ambient counts/status dots/sparklines so the menu doubles as a pulse monitor (cheap, cached, non-blocking).

**Three directions to prototype:** *The Index* (editorial-minimal: typographic table-of-contents sidebar + palette), *The Deck* (ambient-instrument: nav alive with live data), *The Spotlight* (palette-primary: chrome melts away, keyboard is the nav). Hero = The Deck on an Index foundation with Spotlight speed.

---

## 0. Headline finding from the deep audit

The mechanisms this redesign needs **already exist in the codebase, unused or under-wired.** This is integration work, not greenfield:

| Primitive | File | State today | Role in new IA |
|---|---|---|---|
| `FacilityProvider` / `useFacility` | `src/lib/facility-context.tsx` | Exists; reads `?facility=`, exposes `current`/`currentId`/`setFacility`/`isMultiFacility`; auto-selects when 1 facility. **Not mounted on the admin shell.** Used by only campaigns, reports, onboarding. | The context switcher state. Mount globally. |
| `FacilityBadge` | `src/components/admin/facility-badge.tsx` | Read-only scope indicator; renders only for multi-facility. | Basis for the interactive switcher. |
| `useCommandPalette` | `src/hooks/use-command-palette.ts` | ⌘K / `/` / Esc open-close state. **No UI, no command registry.** | The ⌘K palette state. Build UI + registry on top. |
| `use-keyboard-shortcuts` + `SHORTCUTS` + `NAV_SHORTCUT_ROUTES` | `src/hooks/use-keyboard-shortcuts.ts`, `src/types/shortcuts.ts` | G+key nav combos (G+D/C/R/F/S), `?` help, `C` create. Routes hardcoded to current paths. | Extend route map + add the `?` help overlay. |
| Canonical scope pattern | `src/app/admin/campaigns/page.tsx:36-41` | `const { currentId } = useFacility(); if (currentId !== "all") params.facilityId = currentId;` | The exact "scope, don't duplicate" idiom. Roll out to all pages. |
| `useAdminFetch` | `src/hooks/use-admin-fetch.ts` | Stringifies a `params` dict into query string; attaches `X-Admin-Key`. Not cache-keyed. | Extend to auto-inject `facilityId` from context (one change scopes everything). |

**Implication:** the risky/novel part (a global scope model) is mostly built. The work is (a) mounting the provider, (b) building two UI pieces (switcher dropdown, palette), (c) re-spining the sidebar, (d) promoting 20 tabs to scope-aware routes, (e) token cleanup.

---

## 1. Current-state diagnosis

### 1.1 Two competing taxonomies
- **Global sidebar** (`src/components/admin/admin-shell.tsx:48`, `NAV_GROUPS`): 6 groups, 24 routes, portfolio scope.
- **Facility Manager tab rail** (`src/app/admin/facilities/page.tsx:148`, `TAB_GROUPS`): 5 groups, 20 tools, single-facility scope, all behind `?facility=X&tab=Y`.

44 destinations under two overlapping vocabularies → "where do I do X?" has two answers.

### 1.2 The Facility Manager is a 20-tool junk drawer
All ad creation, publishing, intelligence, tenants, PMS, and calls live under one facility page. The overload forced **nine hand-rolled ways to open the mobile drawer** (documented at `facilities/page.tsx:335`). This is the exact reorg CLAUDE.md lists as a build priority ("separate ad creator, manager, publisher from facility overview").

### 1.3 The 20 tools are undiscoverable and un-deep-linkable
They never appear in the global nav and can only be reached by entering a facility first. No way to bookmark "Riverside → Publisher."

### 1.4 Naming collisions at the root
`/admin` is the **Leads** pipeline (`interface Lead`, `/api/admin-leads`) but the header titles it **"Dashboard"** (`admin-header.tsx:17`); the sidebar labels it **"Pipeline."** `/admin/pipeline` is a **different** thing — facility-acquisition pipeline (`interface Facility`, also `/api/admin-leads` grouped by facility status) — yet also labeled "Pipeline." Three names, two pages, one overloaded root.

### 1.5 Design-token drift (fix during the re-spine)
- The facility rail's active-tab accent references **`var(--burgundy)` 18× but `--burgundy` is defined nowhere** (confirmed repo-wide). The "active tab" highlight resolves to an empty/inherited value — the nav can't reliably show you where you are.
- `StatusBadge` (`facilities/page.tsx`) uses Tailwind defaults (`emerald/yellow/red-500`), not brand tokens.
- The global sidebar + header hardcode hex (`#1A1A1A`, `#A3A3A3`, `#737373`, `#FFFFFF`, `#F1EAE0`) — 26 instances — instead of the existing tokens (`--ink`, `--ink2`, `--ink3`, `--sidebar-text`, `--bg`, `--bdr`).
- **All the right tokens already exist** under `.admin-theme` (see §6). The fix is mechanical substitution.

### 1.6 The real overlaps (corrected by the audit)
Same endpoint, two scopes → **true duplicates, collapse via scope:**

| Job | Global page | Facility tab | Shared endpoint |
|---|---|---|---|
| Ad creatives | Campaigns | Creative Studio | `/api/facility-creatives` |
| Funnels | Funnels | Facility Funnels | `/api/funnels` |
| Calls | Calls | Call Tracking | `/api/call-logs` |
| PMS | PMS Queue | PMS Data | `/api/pms-queue` (portfolio) + `/api/pms-data` (facility) |

Different endpoints, same user job → **consolidate workspaces:**
- `/admin` (leads) + `/admin/kanban` — same `/api/admin-leads`, two views.
- `/admin/billing` Clients tab + `/admin/partners` — same `/api/organizations`.
- `/admin/sequences` (`/api/drip-sequences`) + Lead Nurture tab (`/api/nurture-sequences`) — *different models; flag for decision.*

Complementary, **NOT duplicates (keep both, scoped):**
- Insights (`/api/lead-analytics`, lead funnel) vs Revenue Analytics (`/api/revenue-intelligence`, unit revenue).
- Style References / Creative Library (brand inspiration, portfolio) vs Creative Studio (per-facility creatives).
- Reports (export layer) vs the live dashboards.

### 1.7 Infrastructure facts that shape the plan
- **Admin layout** `src/app/admin/layout.tsx` mounts `<AdminShell>` → the place to mount `FacilityProvider`.
- **Roles:** `VA_RESTRICTED_PATHS` = `/admin/billing`, `/admin/settings`, `/admin/partners` (`clerk-roles.ts`). VA gating must move with the routes.
- **CSRF:** `src/proxy.ts` exempts any request carrying `X-Admin-Key`. `useAdminFetch`/`adminFetch` already attach it → palette and switcher mutations are safe **as long as they use those wrappers**.
- **Next 16:** `FacilityProvider` uses `useSearchParams` → needs a Suspense boundary at the layout. Read `node_modules/next/dist/docs/` before the layout/router change (per AGENTS.md).

---

## 2. Target model — scope-aware single spine

One sidebar. At the top, a **Facility Switcher** (`[ All facilities ▾ ]`, or the single facility's name when the user has one). Selecting a facility writes `?facility=` (FacilityProvider already does this) and re-scopes every page that reads `useFacility().currentId`. Tools live **once**; "all facilities" vs a specific facility changes the data, not the menu.

### 2.1 The spine (task-first groups → path prefixes)

```
[ All facilities ▾ ]            ← Facility Switcher (sidebar top)

OVERVIEW        /admin/portfolio           portfolio KPI dashboard (all-scope landing)

LEADS           /admin                     Leads pipeline   (unchanged route; relabel header to "Leads")
                /admin/kanban              board view        (unchanged route)
                /admin/consumer-leads      (unchanged route)
                /admin/recovery            (unchanged route)
                /admin/pipeline            facility-acquisition pipeline (unchanged route)

STUDIO          /admin/studio/creative     manage ad variations        (Campaigns = all-scope of this)
 (create)       /admin/studio/ad-generator the 3-step wizard           (was campaigns/create)
                /admin/studio/publisher    push to platforms           [Angelo — relocate only]
                /admin/studio/google-ads
                /admin/studio/tiktok
                /admin/studio/video        [Angelo — relocate only]
                /admin/studio/media        [Angelo stock — relocate only]
                /admin/studio/library      brand/style references (portfolio-only)

CHANNELS        /admin/channels/funnels    (global Funnels = all-scope of this)
 (distribute)   /admin/channels/landing-pages
                /admin/channels/gbp        Google Business
                /admin/channels/social
                /admin/channels/automations  Sequences + Lead Nurture [merge deferred]
                /admin/channels/utm

INTELLIGENCE    /admin/intelligence/insights    lead/pipeline analytics
 (understand)   /admin/intelligence/occupancy   [facility]
                /admin/intelligence/market      [facility]
                /admin/intelligence/revenue     [facility]
                /admin/intelligence/reports     export layer (scope-aware)

FACILITIES      /admin/facilities          scope-aware: chooser grid (all) · facility overview (one)
 (manage)       /admin/facilities/tenants  Tenant CRM            [facility]
                /admin/pms                 PMS (queue at all · data at facility)
                /admin/facilities/calls    Calls (all-scope of Call Tracking)
                /admin/facilities/diagnostics  audits

REVENUE         /admin/revenue/billing
                /admin/revenue/accounts    Billing-Clients + Partners merged

SYSTEM          /admin/system/settings
                /admin/system/changelog
                /admin/system/activity
                /admin/system/setup        onboarding wizard

⌘K  command palette · "/" focus search · G+key nav · "?" shortcuts help
```

### 2.2 How "Facility Manager" dissolves
- `/admin/facilities` becomes **scope-aware**: the chooser grid at "all", and the selected facility's overview (profile + marketing-plan generator) at a specific `?facility=`. Clicking a facility sets context and shows its overview — no `/[id]/` path (locked route shape).
- The 20 tab components are **not deleted** — each becomes the body of a scope-aware route above, rendered with the facility from context. Facility-only tools (occupancy, revenue, market, tenants, GBP) show a portfolio roll-up or a "pick a facility" empty state when scope is `all` (most already have empty states).
- The 1,067-line `facilities/page.tsx` mega-host and its 9 drawer hacks are retired.

### 2.3 Why this is both innovative and effective
- **Innovative:** the Linear/Vercel "workspace scope" pattern, new to this app — one menu whose contents re-scope, plus a palette-and-keyboard layer for two power users (the founders).
- **Effective:** every job has exactly one home; zero duplicate destinations; every tool deep-linkable (`/admin/studio/creative?facility=X`) and ⌘K-reachable; top tasks in ≤2 clicks; the broken active-state and token drift fixed.

---

## 3. Full migration map (44 → new)

### Global routes (24)
| Today | New | Note |
|---|---|---|
| `/admin` (Leads) | `/admin` (unchanged) | LOCKED: leads stay; relabel header "Dashboard"→"Leads" |
| `/admin/kanban` | `/admin/kanban` (unchanged) | regroup under LEADS only |
| `/admin/consumer-leads` | `/admin/consumer-leads` (unchanged) | regroup only |
| `/admin/recovery` | `/admin/recovery` (unchanged) | regroup only |
| `/admin/pipeline` | `/admin/pipeline` (unchanged) | facility-acquisition; regroup under LEADS |
| `/admin/portfolio` | `/admin/portfolio` (unchanged) | becomes the "Overview" all-scope landing |
| `/admin/facilities` | `/admin/facilities` | now scope-aware: chooser grid + facility overview |
| `/admin/pms-queue` | `/admin/pms` (all-scope) | merge w/ PMS Data |
| `/admin/funnels` | `/admin/channels/funnels` (all-scope) | merge w/ facility Funnels |
| `/admin/funnels/[id]` | `/admin/channels/funnels/[id]` | |
| `/admin/campaigns` | `/admin/studio/creative` (all-scope) | same `/api/facility-creatives` |
| `/admin/campaigns/create` | `/admin/studio/ad-generator` | the wizard |
| `/admin/style-references` | `/admin/studio/library` | |
| `/admin/sequences` | `/admin/channels/automations` | merge decision w/ Lead Nurture |
| `/admin/insights` | `/admin/intelligence/insights` | |
| `/admin/reports` | `/admin/intelligence/reports` | scope-aware |
| `/admin/calls` | `/admin/facilities/calls` (all-scope) | merge w/ Call Tracking |
| `/admin/audits` | `/admin/facilities/diagnostics` | |
| `/admin/billing` | `/admin/revenue/billing` | VA-restricted |
| `/admin/partners` | `/admin/revenue/accounts` | merge w/ Billing-Clients; VA-restricted |
| `/admin/activity` | `/admin/system/activity` | |
| `/admin/onboarding` | `/admin/system/setup` | |
| `/admin/settings` | `/admin/system/settings` | VA-restricted |
| `/admin/changelog` | `/admin/system/changelog` | |

### Facility tabs (20) → scope-aware routes
| Tab key | New route | Angelo | Coupling |
|---|---|---|---|
| overview | `/admin/facilities` (scope-aware) | no | tight |
| creative-studio | `/admin/studio/creative` | no | tight |
| ad-studio | `/admin/studio/ad-generator` | partial (image step) | tight |
| ad-publisher | `/admin/studio/publisher` | **yes** | tight |
| media-library | `/admin/studio/media` | partial (stock) | tight |
| google-ads | `/admin/studio/google-ads` | no | tight |
| tiktok | `/admin/studio/tiktok` | no | loose |
| video | `/admin/studio/video` | **yes** | loose |
| funnels | `/admin/channels/funnels` | no | tight |
| landing-pages | `/admin/channels/landing-pages` | no | tight |
| utm-links | `/admin/channels/utm` | no | loose |
| gbp | `/admin/channels/gbp` | no | tight |
| social | `/admin/channels/social` | no | tight |
| lead-nurture | `/admin/channels/automations` | no | tight |
| occupancy | `/admin/intelligence/occupancy` | no | tight |
| market-intel | `/admin/intelligence/market` | no | tight |
| revenue | `/admin/intelligence/revenue` | no | tight |
| tenants | `/admin/facilities/tenants` | no | tight |
| pms | `/admin/pms` | no | tight |
| call-tracking | `/admin/facilities/calls` | no | tight |

**Deep-link redirects:** old `?facility=X&tab=Y` must map to the new route + `?facility=X`. Build a small redirect table keyed by `tab`.

---

## 4. Core mechanism — global facility context

1. **Mount the provider.** In `src/app/admin/layout.tsx`, wrap `<AdminShell>` (or its children) in `<FacilityProvider facilities={…}>`. Facilities list comes from `/api/admin-facilities` (already returns `{ facilities }`). Because `FacilityProvider` uses `useSearchParams`, add a `<Suspense>` boundary (Next 16).
2. **Switcher UI.** Build `FacilitySwitcher` (interactive sibling of `FacilityBadge`): a dropdown of facilities + "All facilities", calls `setFacility(id)`. Hidden when `!isMultiFacility` (single-facility users are auto-scoped). Place at sidebar top.
3. **Scope the fetches.** Two options:
   - **Per-page (low-magic):** each page adopts the campaigns idiom (`currentId !== 'all' → params.facilityId`). Explicit, ~1 line per page.
   - **Central (recommended):** extend `useAdminFetch` to read `useFacility().currentId` and auto-inject `facilityId` unless the caller opts out. One change scopes everything; add an `ignoreFacilityScope` flag for portfolio-only endpoints.
4. **Facility-only "all" state.** Tools that require a facility render a portfolio roll-up or a "Select a facility" prompt (with the switcher) when `currentId === 'all'`.

---

## 5. Phased rollout

Each phase is independently shippable and must end green (`npm run build`) and commit to main.

**Phase 0 — Decisions & sign-off (no code).** Lock §8 decisions; freeze the final route map. *Gate.*

**Phase 1 — Global facility context (foundation).**
- Mount `FacilityProvider` in `admin/layout.tsx` (+ Suspense; fetch facilities).
- Build `FacilitySwitcher`; place in sidebar top. Keep current nav untouched.
- (Recommended) extend `useAdminFetch` for auto-scope with opt-out.
- *Ships:* switcher visible; pages can read scope. No routes moved. Lowest risk.

**Phase 2 — Re-spine the sidebar + token cleanup.**
- Replace `NAV_GROUPS` with the §2.1 spine (labels + icons + new hrefs).
- Swap 26 hardcoded hex → tokens; fix `--burgundy` → `--ink` active state; replace Tailwind status colors with `--t-*` tokens.
- Update `VA_RESTRICTED_PATHS` to the new billing/settings/accounts routes.
- Add redirects for every old route (Next.js `redirects()` or route handlers).
- *Ships:* new menu, correct tokens, old links 301 to new homes (some still alias until Phase 3).

**Phase 3 — Promote facility tools to scope-aware routes (largest; do group-by-group).**
- For each tool group (Studio → Channels → Intelligence → Facilities ops), create `src/app/admin/<group>/<tool>/page.tsx` that renders the existing tab component with `facility` from context; add the `all`-scope state.
- Collapse the four true duplicates (Campaigns→Creative all-scope; Funnels; Calls; PMS).
- `/admin/facilities` → chooser; `/admin/facilities/[id]` → redirect to Home with `?facility=`.
- Map old `?tab=` deep links.
- Retire `facilities/page.tsx` mega-host + the 9 drawer hacks.
- Coordinate with Angelo before moving Publisher / Video / Media-stock entry points (logic untouched).
- *Ships per group:* each tool group goes live independently.

**Phase 4 — Consolidate the Accounts workspace.**
- `/admin/revenue/accounts` = Billing-Clients + Partners over `/api/organizations`.
- Leads stay as separate routes (LOCKED) — no Leads/Kanban/Pipeline merge; they are only re-grouped under LEADS in Phase 2.
- (Optional) `/admin/channels/automations` unifies Sequences + Lead Nurture *if* the data models reconcile.

**Phase 5 — ⌘K palette + shortcuts.**
- Build the palette UI on `useCommandPalette`: registry of all routes + facilities ("Switch to Riverside") + actions ("New ad", "Generate funnel", "Upload PMS"). Use `adminFetch` for any mutation (CSRF-safe).
- Build the `?` shortcuts-help overlay (handler already fires).
- Extend `NAV_SHORTCUT_ROUTES` + `SHORTCUTS` for the new routes.
- *Ships:* keyboard-driven nav.

---

## 6. Design-token reference (already defined under `.admin-theme`)

Surfaces (all pinned to one cream): `--bg`, `--card`, `--sidebar-bg`, `--bg-elevated`, `--bg-surface` = `#F1EAE0`.
Ink: `--ink` `#1A1A1A` (primary), `--ink2` `#737373` (secondary), `--ink3` `#A3A3A3` (muted).
Sidebar: `--sidebar-text` `#737373`, `--sidebar-text-active` `#1A1A1A`, `--sidebar-muted` `#A3A3A3`.
Lines/states: `--bdr` `rgba(0,0,0,.08)`, `--bdr-strong` `rgba(0,0,0,.15)`, `--hover-bg` `rgba(0,0,0,.04)`, `--active-bg` `rgba(0,0,0,.06)`, `--r` `4px`.
Semantic accents (sparingly): `--t-red/green/yellow/blue/magenta/cyan` (+ `-light`). Gold is overridden to `--ink` inside admin (monochrome). **No `--burgundy`; no sienna gold; no Tailwind grays.**

Active nav item = `--sidebar-text-active` + a `--ink` left-border. Status badges = `--t-*` tokens.

---

## 7. Risks & gotchas
- **Suspense:** `FacilityProvider` (`useSearchParams`) needs a boundary at the layout (Next 16).
- **Facility-only "all" state:** occupancy/revenue/market/tenants/GBP need a roll-up or chooser at `all`.
- **Sequences vs Lead Nurture:** different endpoints/models — may stay separate; don't force-merge.
- **Deep-link redirects:** cover old `?facility=&tab=` and all 24 old routes; verify no broken bookmarks.
- **VA gating moves with routes:** update `VA_RESTRICTED_PATHS` or VAs lose/gain access.
- **CSRF:** palette/switcher mutations must use `adminFetch`/`useAdminFetch` (carry `X-Admin-Key`).
- **Angelo's domains:** Publisher, Video, Media-stock — relocate entry points only; never touch integration logic.
- **`FacilityBadge`** uses `--color-gold` (→ `--ink` in admin; fine, but verify it never renders outside admin scope as gold).
- **v2 rewrite exists** (`/Users/blake/Documents/storageads-v2`) — confirm this IA targets v1 (this repo) vs. is designed for v2.

---

## 8. Decisions
**Locked (2026-06-19):**
1. **Route shape:** one scoped route per tool (`/admin/studio/creative?facility=X`). No per-facility `/[id]/` paths.
2. **Leads:** leave `/admin`, `/admin/kanban`, `/admin/pipeline`, `/admin/consumer-leads`, `/admin/recovery` as separate routes — re-group under LEADS in the sidebar only. No Leads-workspace merge.
3. **Scope of work:** retrofit v1 (this repo, stowstack-next). Not the v2 rewrite.

**Still open:**
4. **Automations:** unify Sequences + Lead Nurture — **deferred** until the `/api/drip-sequences` vs `/api/nurture-sequences` data models are compared.
5. **Fetch scoping:** central `useAdminFetch` auto-injection (**recommended**) vs. per-page `currentId` idiom.

---

## 9. Success criteria
- Every job has exactly one home; zero duplicate destinations.
- Any tool is deep-linkable AND ⌘K-reachable.
- Top 5 daily tasks in ≤2 clicks.
- Brand tokens only; no undefined tokens; no hardcoded hex; no off-palette accent; active state visibly correct.
- All old routes + `?tab=` deep links redirect.
- `npm run build` green at every phase.

## 10. Anti-goals
No feature additions, no copy rewrites beyond nav labels, no new colors, no touching ad-platform/video integration logic, no "while I'm here" refactors.

---

## 11. Handoff prompt — conservative/phased variant (kept for reference; §12 is the active brief)

> You are executing an admin information-architecture redesign for the StorageAds admin app (Next.js 16 App Router). The full plan is in `docs/admin-ia-redesign-plan.md` — read it first. Work **phase by phase** per §5; do not skip ahead. Before starting, re-verify the plan's claims against the code (it may have drifted) and confirm the §8 decisions are locked.
>
> Reuse the existing primitives — do NOT rebuild them: `FacilityProvider`/`useFacility` (`src/lib/facility-context.tsx`), `FacilityBadge`, `useCommandPalette`, `use-keyboard-shortcuts` + `SHORTCUTS`/`NAV_SHORTCUT_ROUTES`, and the `currentId !== 'all' → params.facilityId` idiom (`campaigns/page.tsx`). Mount `FacilityProvider` at `src/app/admin/layout.tsx` behind a Suspense boundary.
>
> Hard constraints: This is Next.js 16 — read `node_modules/next/dist/docs/` before any router/layout change (AGENTS.md). Brand tokens only (§6) — no sienna gold, no `--burgundy`, no Tailwind grays, light theme, Manrope. Do NOT modify ad-platform or AI video/image logic (Publisher, Video, Media-stock — Angelo's) — relocate their entry points only. Preserve all functionality; add redirects for every old route and old `?facility=&tab=` deep link. Keep VA gating correct (`VA_RESTRICTED_PATHS`). Use `adminFetch`/`useAdminFetch` for mutations (CSRF-safe via `X-Admin-Key`).
>
> Each phase must end with `npm run build` green and a commit to main. After each phase, stop and report what shipped before starting the next.

---

## 12. Unleashed prompt — dream-big build (ACTIVE)

```text
You are building the navigation shell for the StorageAds admin (/admin, Next.js 16
App Router). Read docs/admin-ia-redesign-plan.md for the destination inventory and the
scope model, then go far beyond it. This is a design-led, MAX-EFFORT build: make the
most attractive and most performant navigation menu in B2B SaaS, in our editorial
brand. Dream big. Optimize for "this is the best admin nav I've ever used," not for a
small diff.

TWO HARD RULES. Nothing else is off-limits.
1. Do NOT modify the tools. Every page under src/app/admin/** and every component under
   src/components/admin/facility-tabs/** renders unchanged in the content pane. You may
   relocate, re-route, lazy-load, and wrap them, but never edit their internals/behavior.
2. Do NOT touch ad-platform or AI visual-generation internals (Meta/Google/TikTok
   publishing, FAL/Runway video+image). Relocate their entry points only.

Everything else is yours to invent: sidebar, scope switcher, command palette, keyboard
system, routing, the shell, motion, ambient data, personalization, mobile. Replace the
current chrome entirely.

MAKE IT ATTRACTIVE (our design language):
- Manrope only; charcoal #1A1A1A on cream #F1EAE0; A24/Kubrick restraint where hierarchy
  and negative space do the work, not color. Tabular numerals everywhere numbers appear.
  Editorial section markers (§ 01 STUDIO). Hairline rules.
- Brand tokens only (plan §6). Fix the broken --burgundy active state. No sienna gold
  except the brand-locked logo. Semantic green/blue/red only as tiny status signals.
- Tasteful, meaningful motion: route transitions (View Transitions API), spring-eased
  drawer, hover/intent affordances, full reduced-motion fallback. Never decoration.

MAKE IT PERFORMANT (half the brief):
- Instant navigation: a persistent shell that never re-mounts; prefetch on hover/focus/
  intent; optimistic active state; zero layout shift. Target sub-100ms perceived nav, 60fps.
- A real ⌘K command palette as the fastest path: fuzzy search over every tool, every
  facility, and key actions ("New ad for Riverside", "Publish to Meta", "Jump to PMS").
  Virtualized results, recents, pinned items. Build the UI on the existing useCommandPalette.
- Ambient intelligence in the chrome: live counts, status dots, sparklines on nav items so
  the menu doubles as a pulse monitor. Cheap, cached, non-blocking.
- Keyboard-first: extend the existing SHORTCUTS / NAV_SHORTCUT_ROUTES system; add the "?"
  shortcuts overlay; make every destination mouse-free.

REUSE, DON'T REBUILD, THE PRIMITIVES: FacilityProvider/useFacility (mount at
src/app/admin/layout.tsx behind Suspense), FacilityBadge, useCommandPalette,
use-keyboard-shortcuts, and the `currentId !== 'all' -> params.facilityId` scope idiom.
Use adminFetch/useAdminFetch for data so mutations stay CSRF-safe.

NOT RESTRICTIONS, JUST "DON'T BREAK THE MENU": every tool must stay reachable (add
redirects for old routes and old ?facility=&tab= deep links); keep VA role gating correct;
light theme; Next 16 (read node_modules/next/dist/docs/ before router/layout work).

PROCESS: dream first. Prototype 2-3 distinct directions (editorial-minimal, ambient-
instrument, palette-primary) with a recommended hero before committing. Then build the hero
shell and wire the untouched tools into it, iterating on feel. Keep npm run build green;
commit to main as you go.
```

