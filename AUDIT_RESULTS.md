# Codebase Audit Results

**Date:** 2026-03-27
**Build status:** `npm run build` passes, `npm run lint` has 254 problems (106 errors, 148 warnings)

---

## P0 — Fix Immediately

### 1. React Hooks Called Conditionally (6 violations)

**What's wrong:** Six components call `useState`, `useEffect`, or `useCallback` after an early `return` statement. React requires hooks to be called in the exact same order on every render. When a hook is skipped because of an early return, React's internal state slots get misaligned — this causes wrong data to render, state to leak between hooks, or a full crash.

**Where:**
- Find all files flagged by `react-hooks/rules-of-hooks` in `npm run lint` output — there are 6 violations across components that have patterns like:

```tsx
// BROKEN — hook is skipped when condition is true
if (!data) return <Loading />;
const [value, setValue] = useState(''); // called conditionally
```

**How to fix:** Move all `useState`, `useEffect`, `useCallback`, `useMemo` calls to the TOP of the component, before any early returns. Move the early-return loading/error checks below the hooks:

```tsx
// CORRECT
const [value, setValue] = useState('');
if (!data) return <Loading />;
```

---

### 2. SMS Sending Uses Email Field Instead of Phone

**What's wrong:** `src/app/api/cron/process-drips/route.ts` line 185 has:

```ts
const phone = drip.contact_email; // TODO: use actual phone field when available
```

Every SMS step in a drip sequence sends to the contact's email address instead of their phone number. SMS delivery will either fail silently or go nowhere.

**How to fix:** Add a `contact_phone` field to the drip query's SELECT, or pull the phone from the related `clients` or `leads` record. Replace the line with the actual phone field. If no phone field exists on the model, add one to the Prisma schema first.

---

### 3. SQL Injection Surface in Raw Queries

**What's wrong:** Two public-facing routes use `$queryRawUnsafe` / `$executeRawUnsafe` with string-interpolated VALUES clauses:

- `src/app/api/page-interactions/route.ts` (lines 45-48, 89-93) — bulk INSERT with `VALUES ${values.join(", ")}`
- `src/app/api/lead-capture/route.ts` (lines 43-72) — similar pattern

While the actual values are passed as parameters (`$1`, `$2`...), the VALUES template string itself is built by concatenation. The parameter index math is fragile and the pattern is hard to audit for safety.

A third route, `src/app/api/alert-history/route.ts` (lines 60-69), builds a dynamic WHERE clause the same way.

**How to fix:** Replace `$queryRawUnsafe` bulk inserts with Prisma's `createMany()`:

```ts
// BEFORE (fragile)
await db.$executeRawUnsafe(
  `INSERT INTO page_interactions (...) VALUES ${values.join(", ")}`,
  ...params
);

// AFTER (safe)
await db.page_interactions.createMany({ data: records });
```

For `alert-history`, use Prisma's `findMany` with a `where` object instead of raw SQL.

---

## P1 — Fix This Week

### 4. setState Called Synchronously Inside useEffect (28 violations)

**What's wrong:** 28 components call `setState` directly in the body of a `useEffect`, which triggers cascading re-renders. React's lint rule `react-hooks/set-state-in-effect` flags these. The worst offender is `src/hooks/use-timezone.ts` which sets two state variables synchronously inside an effect.

**How to fix:** For effects that initialize state from localStorage or similar sync sources, use lazy initializer instead:

```tsx
// BEFORE (cascading render)
const [tz, setTz] = useState('');
useEffect(() => { setTz(localStorage.getItem('tz') || detect()); }, []);

// AFTER (single render)
const [tz, setTz] = useState(() => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('tz') || detect();
});
```

For effects that fetch async data then setState, that pattern is fine — the lint rule is about synchronous setState. Review each of the 28 violations and apply the lazy-initializer pattern where the data source is synchronous.

---

### 5. No Rate Limiting on Public Endpoints

**What's wrong:** These public POST endpoints have zero rate limiting. An attacker can spam them to fill the database, burn Resend email credits, or enumerate data:

| Route | Risk |
|-------|------|
| `src/app/api/lead-capture/route.ts` | Spam lead records, trigger emails |
| `src/app/api/page-interactions/route.ts` | Flood analytics table (accepts batches of 50) |
| `src/app/api/walkin-attribution/route.ts` | Spam attribution records |
| `src/app/api/audit-load/route.ts` | Inflate view counts, trigger notification emails |
| `src/app/api/organizations/route.ts` (POST login) | Credential stuffing — no lockout after failed attempts |

**How to fix:** The rate-limit infrastructure already exists at `src/lib/rate-limit.ts` and is used on V1 API routes. Apply it to each of these routes:

```ts
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { limit: 10, window: 60 });
  if (limited) return limited;
  // ... rest of handler
}
```

For the login endpoint, use a tighter limit (5 attempts per minute per IP) and consider adding account lockout after 10 consecutive failures.

---

### 6. Modal Accessibility (2 components)

**What's wrong:** Both modal components lack basic ARIA attributes and keyboard support. Screen reader users cannot identify them as dialogs, and keyboard users cannot escape them:

- `src/components/ui/confirmation-modal.tsx` — missing `role="dialog"`, `aria-modal="true"`, `aria-label`, Escape key handler, and focus trap
- `src/components/marketing/exit-intent-popup.tsx` — same issues

**How to fix for each modal:**

1. Add `role="dialog"` and `aria-modal="true"` to the modal container div
2. Add `aria-labelledby` pointing to the modal title's `id`
3. Add an `onKeyDown` handler that closes on Escape:
   ```tsx
   onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
   ```
4. Auto-focus the first focusable element when the modal opens (use a `ref` + `useEffect`)
5. Add `aria-label="Close"` to the close button if it only contains an icon

---

### 7. Form Inputs Without Labels (5+ inputs)

**What's wrong:** Several form inputs across the marketing site and audit tool have no associated `<label>` or `aria-label`. Screen readers announce these as unlabeled inputs:

- `src/app/audit-tool/audit-client.tsx` — email input (around line 636)
- `src/components/marketing/exit-intent-popup.tsx` — email input (around line 118)
- `src/components/marketing/cta-section.tsx` — form inputs (around line 66)
- `src/app/portal/onboarding/page.tsx` — multiple inputs using helper components

**How to fix:** Add `aria-label` to every input that doesn't have a visible `<label>`:

```tsx
<input
  type="email"
  placeholder="Your work email"
  aria-label="Your work email"
/>
```

Or pair each input with a `<label htmlFor="...">` element.

---

## P2 — Fix This Sprint

### 8. Type Safety for Prisma JSON Columns

**What's wrong:** 35 `as any` casts exist almost entirely because Prisma's `Json` column type returns `unknown`. Every read from or write to columns like `audit_json`, `report_json`, `content_json`, `plan_json`, `steps`, `sync_config`, `compliance_flags` requires a cast.

**Top offenders:**
- `src/app/api/facility-creatives/route.ts` — 10 casts
- `src/app/api/audit-report/route.ts` — 4 casts
- `src/app/api/marketing-plan/route.ts` — 4 casts
- `src/app/api/style-references/route.ts` — 3 casts

**How to fix:** Create Zod schemas for each JSON structure, then use typed helpers:

```ts
// src/lib/schemas/audit.ts
import { z } from 'zod';

export const AuditJsonSchema = z.object({
  overallScore: z.number(),
  sections: z.array(z.object({ ... })),
  // ... full shape
});

export type AuditJson = z.infer<typeof AuditJsonSchema>;
```

Then validate at the boundary:

```ts
// Writing
const validated = AuditJsonSchema.parse(auditData);
await db.shared_audits.update({ data: { audit_json: validated } });

// Reading
const raw = record.audit_json;
const audit = AuditJsonSchema.parse(raw);
```

This eliminates every `as any` for that column and catches malformed data at runtime.

---

### 9. Missing Loading / Error / Empty States

**What's wrong:** About 60% of components that fetch data are missing one or more of: loading skeleton, error message with retry, or empty-state message.

**Missing loading states:**
- `src/app/portal/page.tsx` — WelcomeBanner (line 67): fetches 90-day stats with no loading indicator
- `src/app/portal/page.tsx` — CampaignGoalProgress (line 161): fetches monthly data, returns `null` while loading
- `src/app/audit-tool/audit-client.tsx` — facility lookup has no skeleton

**Missing error states:**
- Portal stats fetches use `.catch(() => {})` and silently fail
- Partner page auth failures not displayed
- OccupancyIntelligence scan errors swallowed

**Missing empty states (return `null` instead of messaging):**
- `src/app/portal/page.tsx` — RecentActivity (line 280): returns `null` when no items
- `src/app/portal/page.tsx` — CampaignAlerts (line 223): returns `null` when empty
- `src/components/admin/facility-tabs/media-library.tsx` — no "no images" state
- `src/components/admin/facility-tabs/pms-dashboard.tsx` — tabs lack "no data" states

**How to fix:** For each component:

1. **Loading**: Add a loading state variable and render a skeleton or spinner while data is being fetched
2. **Error**: Replace `.catch(() => {})` with `.catch((err) => setError(err.message))` and render an error message with a retry button
3. **Empty**: Replace `if (!items.length) return null` with a descriptive empty state:
   ```tsx
   if (!items.length) return (
     <div className="text-center py-8 text-[var(--color-mid-gray)]">
       No recent activity yet
     </div>
   );
   ```

---

### 10. Remove Debug Console Logs

**What's wrong:** Five `console.log` statements used during development are still in production code:

- `src/app/admin/style-references/page.tsx` lines 79, 92 — file upload debugging
- `src/app/api/style-references/route.ts` lines 114, 131, 162 — Gemini video analysis upload debugging

**How to fix:** Delete all five `console.log` lines. They leak internal implementation details (file sizes, API response bodies) to anyone who opens browser dev tools or reads server logs.

---

### 11. Input Validation on Public POST Endpoints

**What's wrong:** Public endpoints accept user input without validating string lengths, formats, or allowed values:

- `src/app/api/lead-capture/route.ts` — `name`, `email`, `phone` have no length limits
- `src/app/api/walkin-attribution/route.ts` — `source` field accepts any string
- `src/app/api/consumer-leads/route.ts` — `note` text in `add_note` action has no length limit

**How to fix:** Validate at the top of each handler. A lightweight approach:

```ts
const body = await req.json();
const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '';

if (!email || !email.includes('@')) {
  return errorResponse('Invalid email', 400, origin);
}
```

For a more robust approach, use Zod schemas to validate the full request body.

---

### 12. Unescaped Entities in JSX (21 violations)

**What's wrong:** 21 instances of raw `"` and `'` characters in JSX text content. ESLint flags these under `react/no-unescaped-entities`. They can cause rendering issues in some edge cases.

**How to fix:** Replace:
- `"` with `&quot;` or use curly braces: `{"Don't"}`
- `'` with `&apos;` or use curly braces: `{"it's"}`

Run `npm run lint 2>&1 | grep "no-unescaped-entities"` to get the full list of files and line numbers.

---

### 13. Unused Variables (4 warnings)

- `src/hooks/use-permissions.ts:14` — `clerkIsAdmin` assigned but never used
- `src/hooks/use-permissions.ts:45` — `_facilityId` defined but never used
- `src/lib/drip-sequences.ts:40` — `i` defined but never used
- `src/lib/facility-context.tsx:7` — `useEffect` imported but never used

**How to fix:** Remove or prefix with `_` if intentionally unused. Delete unused imports.

---

### 14. Hardcoded Placeholder in Ad Studio

**What's wrong:** `src/components/admin/facility-tabs/ad-studio.tsx` line 857:

```ts
const facilityName = 'Storage Facility' // TODO: pass from parent
```

Every ad preview shows "Storage Facility" instead of the actual facility name.

**How to fix:** The facility data is available in the parent component. Pass it as a prop:

```tsx
// Parent
<AdStudio facility={facility} />

// AdStudio
const facilityName = facility.name;
```

---

## Summary Counts

| Category | P0 | P1 | P2 |
|----------|----|----|-----|
| React hooks violations | 6 | 28 | — |
| Security (SQL / rate limiting) | 3 routes | 5 routes | 3 routes |
| TypeScript `as any` | — | — | 35 |
| Accessibility | — | 7+ elements | — |
| Missing UI states | — | — | 10+ components |
| Lint errors total | — | — | 254 |
| Silent error swallowing | — | — | 23 |
| Functional bugs | 1 (SMS) | — | 1 (facility name) |

---
---

# Codebase Debloat Audit

**Date:** 2026-03-28
**Scope:** AI slop, copy-paste duplication, dead code, over-engineering, unused dependencies
**Codebase size:** 108,437 lines across 414 source files — excessive for a pre-launch product

---

## D0 — Quick Wins (Do First, Lowest Risk)

### 15. Remove 3 Unused Dependencies

**What's wrong:** Three npm packages are listed in `package.json` but imported nowhere in the codebase.

| Dependency | Line in package.json | Why it's dead |
|-----------|---------------------|---------------|
| `@supabase/ssr` | line 18 | Project uses Prisma+Neon for DB. Zero imports across entire src/. |
| `@supabase/supabase-js` | line 19 | Same — zero imports anywhere. |
| `@clerk/themes` | line 14 | Clerk is middleware-only, no UI theming used. Zero imports. |

**How to fix:**

```bash
npm uninstall @supabase/ssr @supabase/supabase-js @clerk/themes
```

**Verify:** `npm run build` passes. `grep -r "supabase" src/` and `grep -r "@clerk/themes" src/` return nothing.

---

### 16. Delete Unused Function Exports in lib/

**What's wrong:** 5 exported functions have zero imports anywhere in the codebase. They were likely generated speculatively and never wired up.

| Function | File | Line | Grep result |
|----------|------|------|-------------|
| `constructFbc()` | `src/lib/tracking-params.ts` | ~141 | 0 imports |
| `readFbp()` | `src/lib/tracking-params.ts` | ~146 | 0 imports |
| `readFbc()` | `src/lib/tracking-params.ts` | ~153 | 0 imports |
| `scrapeSparefoot()` | `src/lib/aggregator-scrape.ts` | ~32 | 0 imports |
| `scrapeSelfStorage()` | `src/lib/aggregator-scrape.ts` | ~126 | 0 imports |

**How to fix:**

1. Open `src/lib/tracking-params.ts`. Delete the `constructFbc`, `readFbp`, and `readFbc` functions entirely.
2. Open `src/lib/aggregator-scrape.ts`. Delete the `scrapeSparefoot` and `scrapeSelfStorage` functions entirely. If the file is empty after deletion, delete the file.
3. Run `npm run build` to confirm nothing breaks.

---

### 17. Delete Unused Prisma Model `social_posts`

**What's wrong:** `social_posts` (lines ~1584-1590 in `prisma/schema.prisma`) is a duplicate of `gbp_posts`. `db.social_posts` is never referenced in any API route, lib file, or component. The `gbp_posts` model IS actively used.

**How to fix:**

1. Open `prisma/schema.prisma` and find the `social_posts` model block
2. Delete the entire model block
3. Run `npx prisma db push` to sync the schema (this will drop the table — confirm it's truly empty first with a raw query or Prisma Studio)
4. Run `npm run build` to confirm nothing breaks

---

### 18. Delete Dead API Routes

**What's wrong:** 3 API route directories have no frontend consumers and serve no product purpose.

| Route | Why it's dead |
|-------|--------------|
| `src/app/api/r/route.ts` | Incomplete redirect handler. No references in codebase. |
| `src/app/api/betapad-notes/route.ts` | Internal note-taking experiment. No frontend consumer. Related `betapad_notes` Prisma model is also unused. |
| `src/app/api/deployment-tags/route.ts` | Developer-only deployment metadata. Not product-related. Related `deployment_tags` Prisma model is unused. |

**How to fix:**

1. Delete the directories: `src/app/api/r/`, `src/app/api/betapad-notes/`, `src/app/api/deployment-tags/`
2. Check if the related Prisma models (`betapad_notes`, `deployment_tags`) are used elsewhere. If not, delete them from `prisma/schema.prisma` too.
3. Also check: `commit_comments`, `commit_flags`, `commit_reviews`, `commit_enrichments`, `dev_handoffs` — these are developer-tool tables, not product tables. If they have no product consumers, delete the models and their routes.
4. Run `npm run build` to confirm.

---

### 19. Extract Shared Style Constants

**What's wrong:** Identical Tailwind class strings are redefined as `const` variables at the top of every facility tab file. At least 4 files have copy-pasted versions of the same constants:

**Files with duplicates:**
- `src/components/admin/facility-tabs/gbp-full.tsx` (lines ~145-156)
- `src/components/admin/facility-tabs/social-command-center.tsx` (lines ~238-244)
- `src/components/admin/facility-tabs/landing-page-builder.tsx`
- `src/components/admin/facility-tabs/utm-links.tsx`

**Duplicated constants (identical in each file):**
```typescript
const card = "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl"
const textPrimary = "text-[var(--color-dark)]"
const textSecondary = "text-[var(--color-body-text)]"
const textTertiary = "text-[var(--color-mid-gray)]"
const inputCls = "w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] ..."
```

**How to fix:**

1. Create `src/lib/tw-styles.ts`:

```typescript
/** Shared Tailwind class constants for admin UI. */
export const card = "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl";
export const textPrimary = "text-[var(--color-dark)]";
export const textSecondary = "text-[var(--color-body-text)]";
export const textTertiary = "text-[var(--color-mid-gray)]";
export const inputCls = "w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/30";
// Add any other constants that appear in 2+ files
```

2. In each facility tab file, delete the local `const card = ...`, `const textPrimary = ...`, etc. declarations and replace with:

```typescript
import { card, textPrimary, textSecondary, textTertiary, inputCls } from "@/lib/tw-styles";
```

3. Search for any other files that define the same constants: `grep -rn "const card = " src/components/admin/` and update those too.

---

## D1 — Component Splits (Biggest Line Reduction)

### 20. Split `gbp-full.tsx` (2,362 lines → ~6 files, ~400 lines each)

**What's wrong:** This single file handles 6 major features: GBP posts, reviews, Q&A, insights, profile sync, and automation settings. It has **38 useState calls** at the root level (lines ~197-260). This is the single worst AI slop artifact in the codebase.

**Target structure:**

```
src/components/admin/facility-tabs/gbp/
  index.tsx          — Tab switcher + shared state (facility, connection). ~100 lines
  gbp-posts.tsx      — Post creation, listing, scheduling, AI generation. ~400 lines
  gbp-reviews.tsx    — Review listing, AI response generation, bulk reply. ~350 lines
  gbp-qa.tsx         — Q&A listing, answer generation, stats. ~250 lines
  gbp-insights.tsx   — Insights charts, summary, date filtering. ~300 lines
  gbp-sync.tsx       — Connection status, profile sync, sync log. ~200 lines
  gbp-settings.tsx   — Automation preferences, auto-reply config. ~150 lines
```

**Steps:**

1. Read `src/components/admin/facility-tabs/gbp-full.tsx` fully
2. Identify the `section` state variable that controls which tab is shown (likely a string like `"posts"`, `"reviews"`, etc.)
3. For each section/tab value, identify:
   - Which useState variables belong to that section
   - Which useEffect calls fetch data for that section
   - Which JSX block renders that section
4. Create the `src/components/admin/facility-tabs/gbp/` directory
5. Create `index.tsx` that:
   - Keeps only the shared state: `facilityId`, `connection`, `section` (tab selector), and `loading`
   - Renders a tab bar and lazy-loads the active sub-component
   - Passes `facilityId` and `connection` as props to each sub-component
6. For each sub-component (e.g., `gbp-posts.tsx`):
   - Move ALL relevant useState calls into the sub-component
   - Move ALL relevant useEffect calls into the sub-component
   - Move ALL relevant handler functions into the sub-component
   - Move the JSX block into the sub-component's return
   - Accept `facilityId` and `connection` as props
7. **Consolidate form state** — in `gbp-posts.tsx`, replace the 10 individual useState calls for the post form:

```tsx
// BEFORE (10 useState calls)
const [postType, setPostType] = useState("update");
const [postTitle, setPostTitle] = useState("");
const [postBody, setPostBody] = useState("");
const [postCta, setPostCta] = useState("");
const [postCtaUrl, setPostCtaUrl] = useState("");
const [postImageUrl, setPostImageUrl] = useState("");
const [postOfferCode, setPostOfferCode] = useState("");
const [postScheduledAt, setPostScheduledAt] = useState("");
const [postAIPrompt, setPostAIPrompt] = useState("");

// AFTER (1 useState call)
const [postForm, setPostForm] = useState({
  type: "update", title: "", body: "", cta: "", ctaUrl: "",
  imageUrl: "", offerCode: "", scheduledAt: "", aiPrompt: "",
});
const updateField = (field: string, value: string) =>
  setPostForm(prev => ({ ...prev, [field]: value }));

// In JSX: onChange={(e) => updateField("title", e.target.value)}
```

8. Update the parent that currently imports `gbp-full` to import from `gbp/index` instead (check `src/app/admin/facilities/page.tsx` lazy import)
9. Delete the original `gbp-full.tsx`
10. Run `npm run build` after each sub-component extraction.

---

### 21. Split `social-command-center.tsx` (1,917 lines → ~4 files)

**What's wrong:** Same monolith pattern as gbp-full. Handles content calendar, post creation, bulk generation, and analytics in one file. Also duplicates UI patterns from gbp-full (post cards, status badges, scheduling UI).

**Target structure:**

```
src/components/admin/facility-tabs/social/
  index.tsx              — Tab switcher. ~80 lines
  social-calendar.tsx    — Content calendar view + scheduling. ~400 lines
  social-composer.tsx    — Post creation form + AI generation. ~350 lines
  social-analytics.tsx   — Performance metrics + charts. ~300 lines
```

**Steps:**

1. Read the file fully. Identify the tab/view state variable.
2. Follow the same extraction pattern as Task 20.
3. **Share components with GBP:** If `social-composer.tsx` and `gbp-posts.tsx` have near-identical post creation forms, extract a shared `PostForm` component to `src/components/admin/shared/post-form.tsx` that accepts platform-specific props.
4. Look for inline sub-components (e.g., `PostCard` defined inside the file at ~line 294). Extract these to their own files.
5. Update the lazy import in `src/app/admin/facilities/page.tsx`.
6. Delete the original file.

---

### 22. Split `landing-page-builder.tsx` (1,834 lines → ~4 files)

**Target structure:**

```
src/components/admin/facility-tabs/lp-builder/
  index.tsx              — Page list + section management. ~200 lines
  section-editor.tsx     — Edit individual LP sections. ~400 lines
  section-preview.tsx    — Live preview rendering. ~350 lines
  section-types.ts       — Section type definitions + defaults. ~100 lines
```

**Steps:** Same pattern as Tasks 20-21. The deeply nested state mutations for section management (lines ~1800-1830) should become simpler once section editing is isolated in its own component with its own local state.

---

### 23. Split `tenant-management.tsx` (1,796 lines → ~4 files)

**What's wrong:** 11 interfaces defined for a single component. Handles tenant CRM, churn prediction, upsell opportunities, and delinquency escalations.

**Target structure:**

```
src/components/admin/facility-tabs/tenants/
  index.tsx                — Tab switcher + shared tenant data fetch. ~150 lines
  tenant-list.tsx          — Tenant table + search/filter. ~350 lines
  churn-predictions.tsx    — Churn risk list + factors. ~300 lines
  upsell-opportunities.tsx — Upsell suggestions + actions. ~250 lines
  delinquency.tsx          — Escalation workflows. ~250 lines
```

**Steps:** Same pattern. Move each interface to the sub-component that uses it. If an interface is shared across multiple sub-components, put it in a `tenants/types.ts` file.

---

### 24. Split `pms-dashboard.tsx` (1,798 lines → ~4 files)

**Target structure:**

```
src/components/admin/facility-tabs/pms/
  index.tsx          — Dashboard header + upload + tab switcher. ~200 lines
  rent-roll.tsx      — Rent roll table. ~400 lines
  aging-report.tsx   — Aging buckets + delinquency. ~350 lines
  revenue-summary.tsx — Revenue charts + trends. ~300 lines
```

---

### 25. Split Oversized Page Files

**What's wrong:** Several page.tsx files are 1000+ lines with section renderers, form state, and helper components all defined inline.

**Files and target splits:**

**`src/app/lp/[slug]/page.tsx` (1,572 lines):**
- Extract section renderers (HeroSection, TextSection, CTASection, etc.) to `src/components/lp/sections/`. Each section renderer becomes its own file (~80-150 lines each).
- The page file should import and render them based on section config. Target: ~200 lines for the page.

**`src/app/portal/onboarding/page.tsx` (1,413 lines):**
- Extract each wizard step to `src/components/portal/onboarding/step-{n}.tsx`.
- The page file keeps wizard navigation state and renders the active step. Target: ~150 lines for the page.

**`src/app/audit/[slug]/page.tsx` (1,377 lines):**
- Extract audit category sections to `src/components/audit/`. Each scoring category (SEO, GBP, Ads, etc.) becomes its own component.
- The page file fetches the audit data and renders the category components. Target: ~200 lines for the page.

**`src/app/admin/page.tsx` (969 lines):**
- Extract dashboard widgets (lead funnel, recent activity, quick stats) to `src/components/admin/dashboard/`.
- Inline constants (status color maps, filter configs) move to the widget that uses them.

**`src/app/guide/page.tsx` (567 lines):**
- Has 51 inline `style={{...}}` declarations. Replace with Tailwind classes or CSS module.
- Extract inline helper components (`Step`, `Section`, `SubSection`, `InfoBox`) to `src/components/guide/`.

**Steps for each page split:**

1. Read the full page file
2. Identify self-contained JSX blocks that could be components (look for section dividers, conditional renders, or repeated patterns)
3. Create the target component directory
4. Extract each block into its own component file, passing required data as props
5. Replace the inline block in the page with the component import
6. Run `npm run build` after each extraction

---

## D2 — API Route Cleanup

### 26. Extract Shared CORS/OPTIONS Handler (Eliminates ~320 Lines)

**What's wrong:** Every one of the 160+ API routes has an identical OPTIONS export:

```typescript
export function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}
```

This is 2 lines × 160 files = 320 lines of pure copy-paste.

**How to fix:**

Next.js App Router doesn't have native API middleware, but you can reduce the duplication:

**Option A — Shared export (simplest):** Create `src/lib/api-options.ts`:

```typescript
import { NextRequest } from "next/server";
import { corsResponse, getOrigin } from "@/lib/api-helpers";

export function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}
```

Then in each route file, replace the inline OPTIONS function with a re-export:

```typescript
// BEFORE (in every route)
export function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

// AFTER
export { OPTIONS } from "@/lib/api-options";
```

This is a mechanical find-and-replace. Each route saves 3-4 lines and the logic is centralized.

**Option B — Route wrapper (more aggressive):** Create a `withCors()` wrapper that handles OPTIONS and adds CORS headers to all responses automatically. This eliminates both the OPTIONS export AND the `getOrigin(req)` calls scattered through handler bodies. More invasive but bigger payoff.

---

### 27. Deduplicate `esc()` HTML Escape Function (5 Copies → 1)

**What's wrong:** The same HTML escape function is implemented identically in 5+ route files:

```typescript
function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
```

**Where:** Search with `grep -rn "function esc(" src/app/api/` to find all copies.

**How to fix:**

1. Add to `src/lib/api-helpers.ts`:

```typescript
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
```

2. In each route file that defines a local `esc()`:
   - Delete the local function definition
   - Add `import { escapeHtml } from "@/lib/api-helpers";`
   - Replace all calls from `esc(...)` to `escapeHtml(...)` (or alias: `import { escapeHtml as esc } from ...`)

---

### 28. Consolidate Redundant Error Handling (~150 Lines)

**What's wrong:** 30+ routes have identical generic try-catch blocks:

```typescript
} catch (err) {
  console.error("SomeRoute error:", err);
  return errorResponse("Failed to do something", 500, origin);
}
```

Some files have 3-4 of these identical blocks (e.g., `churn-predictions/route.ts` has THREE, `drip-sequences/route.ts` has FOUR).

**How to fix:**

1. Add a `withErrorHandling()` wrapper to `src/lib/api-helpers.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

type RouteHandler = (req: NextRequest) => Promise<NextResponse>;

export function withErrorHandling(handler: RouteHandler, label: string): RouteHandler {
  return async (req) => {
    try {
      return await handler(req);
    } catch (err) {
      console.error(`${label} error:`, err);
      const origin = getOrigin(req);
      return errorResponse(`Failed to process request`, 500, origin);
    }
  };
}
```

2. In routes with generic catch blocks, wrap the handler:

```typescript
// BEFORE
export async function GET(req: NextRequest) {
  try {
    // ... 50 lines of logic
  } catch (err) {
    console.error("Churn predictions error:", err);
    return errorResponse("Failed to fetch predictions", 500, origin);
  }
}

// AFTER
export const GET = withErrorHandling(async (req) => {
  const origin = getOrigin(req);
  // ... 50 lines of logic (no try-catch needed)
  return jsonResponse(data, 200, origin);
}, "Churn predictions");
```

3. **Priority targets** (files with multiple redundant catch blocks):
   - `src/app/api/churn-predictions/route.ts` — 3 identical blocks
   - `src/app/api/drip-sequences/route.ts` — 4 identical blocks
   - `src/app/api/publish-ad/route.ts` — nested try-catch (lines ~707-723)
   - `src/app/api/cron/send-client-reports/route.ts` — 3 identical blocks
   - `src/app/api/occupancy-intelligence/route.ts` — 2 identical blocks

4. **DO NOT** remove catch blocks that handle specific error types differently (e.g., catching Prisma errors vs. API errors separately). Only consolidate generic "catch everything and return 500" blocks.

---

### 29. Deduplicate Anthropic API Fetch Boilerplate

**What's wrong:** The same Anthropic SDK call pattern appears in 4+ routes with nearly identical setup:

- `src/app/api/audit-generate/route.ts` (lines ~257-269)
- `src/app/api/generate-copy/route.ts` (lines ~118-130)
- `src/app/api/cron/send-client-reports/route.ts` (lines ~310-325)
- `src/app/api/facility-creatives/route.ts`

Each repeats the same client instantiation, message structure, and error handling.

**How to fix:**

1. Create `src/lib/claude.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var

export async function generateText(prompt: string, options?: {
  system?: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const response = await client.messages.create({
    model: options?.model ?? "claude-sonnet-4-20250514",
    max_tokens: options?.maxTokens ?? 4096,
    system: options?.system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}
```

2. Replace each route's inline Anthropic call with the shared function.

---

## D3 — Bloated Utility Files

### 30. Modularize `scrape-website.ts` (810 Lines → ~300)

**What's wrong:** This file has the same image-extraction pattern copy-pasted 5 times (img tags, data-src, srcset, picture, CSS backgrounds). Each handler does: resolve URL → check dedup set → check `isUsefulImage()` → push to array. The scraping logic itself (`extractUnits()` at 108 lines, `scrapePage()` at 326 lines) should be separate modules.

**How to fix:**

1. Extract a shared `collectImage()` helper at the top of the file:

```typescript
function collectImage(
  url: string | undefined,
  baseUrl: string,
  imageSet: Set<string>,
  images: ScrapedImage[],
  alt?: string
) {
  if (!url) return;
  const resolved = resolveUrl(baseUrl, url);
  if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
    imageSet.add(resolved);
    images.push({ url: resolved, alt: alt || "" });
  }
}
```

2. Replace each of the 5 image extraction blocks with calls to `collectImage()`.

3. If the file is still over 400 lines, extract `extractUnits()` into `src/lib/scrape-units.ts` and the image extraction into `src/lib/scrape-images.ts`.

---

### 31. Split `portal-helpers.tsx` (228 Lines — Mixed Concerns)

**What's wrong:** This file incorrectly mixes 4 unrelated concerns: session management, type definitions, number formatting utilities, and React components (Skeleton, ErrorState).

**How to fix:**

1. Move the type definitions (lines ~1-81) to `src/types/portal.ts` (or merge into the existing types file if one exists)
2. Move the formatting utilities (`fmt()`, `fmtCurrency()`, `pctChange()` at lines ~116-133) to `src/lib/format.ts` (create if needed — these are also useful outside the portal)
3. Keep session logic and React components in `portal-helpers.tsx`
4. Update all imports across the codebase

---

### 32. Consolidate Date Formatting (11 Functions → 1 Parameterized Function)

**What's wrong:** `src/lib/dates.ts` (147 lines) has 11 separate date formatting functions that all use `Intl.DateTimeFormat` with slightly different options. Several also duplicate formatting patterns in `portal-helpers.tsx`.

**How to fix:**

Replace the 11 individual functions with one parameterized function plus the few that have unique logic:

```typescript
type DateFormat = "full" | "short" | "datetime" | "datetime-tz" | "chart" | "time" | "iso";

const FORMAT_OPTIONS: Record<DateFormat, Intl.DateTimeFormatOptions> = {
  full: { year: "numeric", month: "long", day: "numeric" },
  short: { month: "short", day: "numeric" },
  datetime: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  "datetime-tz": { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" },
  chart: { month: "short", day: "numeric" },
  time: { hour: "numeric", minute: "2-digit" },
  iso: { year: "numeric", month: "2-digit", day: "2-digit" },
};

export function formatDate(date: Date, format: DateFormat, tz?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    ...FORMAT_OPTIONS[format],
    timeZone: tz,
  }).format(date);
}

// Keep standalone: isSameDay, isToday, daysBetween (not formatting)
```

Keep the old function names as thin wrappers during migration, then remove them once all call sites are updated:

```typescript
/** @deprecated Use formatDate(date, "full", tz) */
export const formatFullDate = (d: Date, tz: string) => formatDate(d, "full", tz);
```

---

## D4 — Prisma Schema Cleanup

### 33. Split the `facilities` Table (68 Fields)

**What's wrong:** The `facilities` model has 68 fields spanning audit data, GBP data, PMS data, drip sequence config, tenant settings, and payment info. This is a monolithic table that makes every query pull unnecessary data and makes the schema hard to reason about.

**How to fix (incremental, non-breaking):**

This is a larger migration. Do NOT attempt all at once. Phase it:

**Phase 1 — Identify field groups:** Read `prisma/schema.prisma` and categorize each field on `facilities` into groups:
- Core: `id`, `name`, `address`, `city`, `state`, `zip`, `phone`, `website`, `created_at`, `updated_at`, `organization_id`
- Audit: `biggest_issue`, `google_rating`, `baseline_occupancy`, any `audit_*` fields
- GBP: `gbp_*` fields, `google_place_id`, review-related fields
- PMS: `pms_*` fields, upload-related fields
- Settings: feature flags, automation preferences, notification prefs

**Phase 2 — Create satellite tables:** For the largest group (likely PMS or GBP), create a new model:

```prisma
model facility_settings {
  id          String    @id @default(uuid())
  facility_id String    @unique
  facility    facilities @relation(fields: [facility_id], references: [id], onDelete: Cascade)
  // ... move settings fields here
}
```

**Phase 3 — Migrate data:** Write a one-time migration script that copies field values from `facilities` to the new table.

**Phase 4 — Update queries:** Find all routes that read/write the moved fields (use `grep -rn "field_name" src/`) and update them to query the satellite table via the relation.

**Phase 5 — Drop old columns:** Once all queries are migrated, remove the fields from `facilities`.

**Do one group at a time.** Start with whichever group has the fewest query consumers.

---

### 34. Remove Developer-Only Prisma Models

**What's wrong:** 6 models exist purely for internal developer tooling and add noise to the schema:

| Model | Purpose | Product consumer? |
|-------|---------|-------------------|
| `commit_comments` | Code review comments | No |
| `commit_flags` | Code review flags | No |
| `commit_reviews` | Code review tracking | No |
| `commit_enrichments` | Commit metadata | No |
| `deployment_tags` | Deployment tracking | No |
| `dev_handoffs` | Developer handoff notes | No |

**How to fix:**

1. Grep each model name across `src/` to confirm no product code references them
2. Delete the model blocks from `prisma/schema.prisma`
3. Delete any API routes that serve them (`/api/deployment-tags/`, `/api/dev-handoffs/`, any `/api/commit-*` routes)
4. Run `npx prisma db push` and `npm run build`

---

### 35. Fix Schema Inconsistencies

**Naming inconsistencies (pick one convention and apply everywhere):**
- `created_at` vs `created` — standardize to `created_at`
- `facility_id` vs `facilityId` — standardize to `facility_id` (matches existing majority)
- `is_superadmin` vs `superadmin` — standardize to `is_superadmin`

**Missing cascade deletes:** Many child models don't specify `onDelete: Cascade`. If a facility is deleted, orphaned records linger in child tables. Audit all relations that reference `facilities` and add `onDelete: Cascade` where appropriate.

**Overlapping models to consolidate:**
- `gbp_connections` vs `platform_connections` — make GBP a type of platform connection, or keep separate but document why
- `audits` vs `audit_report_cache` — document when each is used and whether the cache can be derived from `audits`
- `client_campaigns` vs `campaign_spend` — clarify the relationship; consider if one can replace the other

---

## D5 — Large File Targets (By Line Count)

Reference table for prioritizing which files to refactor first:

### Components (files over 1,000 lines)

| File | Lines | Recommended action |
|------|-------|--------------------|
| `components/admin/facility-tabs/gbp-full.tsx` | 2,362 | Task 20 — split into 6 files |
| `components/admin/facility-tabs/social-command-center.tsx` | 1,917 | Task 21 — split into 4 files |
| `components/admin/facility-tabs/landing-page-builder.tsx` | 1,834 | Task 22 — split into 4 files |
| `components/admin/facility-tabs/pms-dashboard.tsx` | 1,798 | Task 24 — split into 4 files |
| `components/admin/facility-tabs/tenant-management.tsx` | 1,796 | Task 23 — split into 4 files |
| `components/admin/facility-tabs/creative-studio.tsx` | 1,575 | Same pattern — split into sub-components |
| `components/admin/facility-tabs/facility-overview.tsx` | 1,573 | Same pattern — split into dashboard widgets |
| `components/admin/facility-tabs/ad-studio.tsx` | 1,307 | Same pattern — split by workflow stage |
| `components/marketing/hero.tsx` | 1,172 | Extract 4 custom hooks (useCountUp, useTypewriter, useAutoTab, useMouseTilt) to `src/hooks/` |
| `components/admin/facility-tabs/revenue-analytics.tsx` | 1,161 | Same pattern — split by chart/analysis type |

### Pages (files over 500 lines)

| File | Lines | Recommended action |
|------|-------|--------------------|
| `app/lp/[slug]/page.tsx` | 1,572 | Task 25 — extract section renderers |
| `app/portal/onboarding/page.tsx` | 1,413 | Task 25 — extract wizard steps |
| `app/audit/[slug]/page.tsx` | 1,377 | Task 25 — extract audit sections |
| `app/admin/facilities/page.tsx` | 1,055 | Already uses lazy loading — could be trimmed but lower priority |
| `app/admin/changelog/page.tsx` | 1,013 | Extract changelog entry rendering |
| `app/admin/page.tsx` | 969 | Task 25 — extract dashboard widgets |
| `app/admin/style-references/page.tsx` | 690 | Extract gallery grid component |
| `app/admin/audits/page.tsx` | 678 | Extract audit table component |
| `app/pricing/page.tsx` | 674 | Extract plan card components |
| `app/admin/portfolio/page.tsx` | 648 | Extract chart components |
| `app/admin/billing/page.tsx` | 620 | Extract billing widgets |
| `app/guide/page.tsx` | 567 | Task 25 — replace inline styles, extract helpers |

### API Routes (files over 400 lines)

| File | Lines | Recommended action |
|------|-------|--------------------|
| `api/scrape-website.ts` (lib) | 810 | Task 30 — deduplicate image extraction |
| `api/publish-ad/route.ts` | 725 | Extract platform API wrappers to `src/lib/ad-platforms.ts` |
| `api/occupancy-intelligence/route.ts` | 539 | Extract math utilities, consolidate repeated normalization |
| `api/cron/send-client-reports/route.ts` | 465 | Extract email HTML rendering to template file |
| `api/churn-predictions/route.ts` | ~450 | Remove 3 identical catch blocks (Task 28), remove void statements for dead variables |

---

## Recommended Work Order

| Phase | Tasks | What it does | Risk |
|-------|-------|-------------|------|
| **1** | 15-18 | Remove dead deps, dead code, dead routes | Near-zero — deleting unused things |
| **2** | 19, 27 | Extract shared constants, deduplicate `esc()` | Low — mechanical refactors |
| **3** | 26, 28, 29 | Centralize CORS, error handling, Claude calls | Low-medium — touches many files but each change is small |
| **4** | 20-24 | Split the 5 monster facility tab components | Medium — largest changes, highest line reduction |
| **5** | 25 | Split oversized page files | Medium — same pattern as Phase 4 |
| **6** | 30-32 | Clean up lib utilities | Low — isolated changes |
| **7** | 33-35 | Prisma schema cleanup | Higher — requires data migration for table splits |

**After each phase:** Run `npm run build && npm run lint` to confirm nothing is broken.

**Estimated total reduction:** 15,000-20,000 lines (~15-20% of codebase) with zero functionality loss.
