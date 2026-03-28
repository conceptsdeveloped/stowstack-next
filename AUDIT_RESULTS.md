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
