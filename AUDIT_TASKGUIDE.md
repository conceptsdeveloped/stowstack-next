# Audit Task Guide

Step-by-step playbook for resolving every issue in `AUDIT_RESULTS.md`. Work top-down — P0 first, then P1, then P2. Each section is self-contained.

---

## P0 — Fix Immediately

### Task 1: Conditional React Hooks (6 violations)

**Why it matters:** React tracks hooks by call order. Skipping a hook via early return corrupts state for every hook after it — causes wrong data, stale renders, or crashes.

**Files to fix:**

| # | File | Components |
|---|------|-----------|
| 1-4 | `src/app/portal/page.tsx` | `OnboardingProgress`, `CampaignGoalProgress`, `CampaignAlerts`, `RecentActivity` |
| 5 | `src/app/admin/billing/page.tsx` | `OverviewTab` |
| 6 | `src/components/admin/facility-tabs/tenant-management.tsx` | `TenantManagement` |

**Steps for each component:**

1. Open the file and find all `useState`, `useEffect`, `useMemo`, `useCallback`, and custom hook calls (like `useAdminFetch`)
2. Find all early `return` statements (`if (loading) return ...`, `if (!data) return ...`)
3. Move **every** hook call above the first early return. No exceptions — even if a hook's value isn't used in the loading path
4. Leave the early returns where they are (just below all hooks now)

**Pattern:**

```tsx
// BEFORE (broken)
function MyComponent() {
  const { data, loading } = useAdminFetch('/api/something');
  if (loading) return <Skeleton />;
  const [extra, setExtra] = useState('');   // <-- called conditionally
  useEffect(() => { /* ... */ }, []);        // <-- called conditionally
  return <div>...</div>;
}

// AFTER (correct)
function MyComponent() {
  const { data, loading } = useAdminFetch('/api/something');
  const [extra, setExtra] = useState('');
  useEffect(() => { /* ... */ }, []);
  if (loading) return <Skeleton />;
  return <div>...</div>;
}
```

**Verify:** `npm run lint 2>&1 | grep "rules-of-hooks"` should return 0 results.

---

### Task 2: SMS Phone Field Bug

**File:** `src/app/api/cron/process-drips/route.ts`

**Problem:** When `step.channel === 'sms'` but `step.customMessage` is falsy, the code falls through to the email branch. SMS steps without a custom message accidentally send emails.

**Steps:**

1. Open the file and find the SMS handling block (~line 184)
2. Check what fields are available on the `drip` query result — look at the Prisma query above it
3. Confirm `contact_phone` exists on the queried model. If not:
   - Check `prisma/schema.prisma` for a phone field on the relevant model (`partial_leads`, `clients`, etc.)
   - If the field exists but isn't in the SELECT, add it to the query
   - If no phone field exists on the model, add one to the schema and run `npx prisma db push`
4. Fix the fallthrough logic — the `else if` should not catch SMS steps:

```ts
// BEFORE
if (step.channel === 'sms' && step.customMessage) {
  const phone = drip.contact_phone;
  // ... send SMS
} else if (step.customMessage) {
  // This catches SMS steps without customMessage!
  await sendTemplateEmail(step.templateId, lead);
}

// AFTER
if (step.channel === 'sms') {
  const phone = drip.contact_phone;
  if (phone && phone.match(/^\+?\d/)) {
    const smsBody = (step.customMessage || step.defaultMessage || '')
      .replace(/\[Facility\]/g, drip.facility_name || '')
      .replace(/\[Name\]/g, drip.contact_name || '');
    await sendSms(phone, smsBody, drip.facility_id);
  }
} else if (step.customMessage) {
  await sendTemplateEmail(step.templateId, lead);
}
```

**Verify:** `npm run build` passes. Manually trace the logic for both SMS-with-message and SMS-without-message paths.

---

### Task 3: Raw SQL Query Safety

**Files:**
- `src/app/api/page-interactions/route.ts`
- `src/app/api/lead-capture/route.ts`
- `src/app/api/alert-history/route.ts`

**Context:** These routes use `$queryRawUnsafe` / `$executeRawUnsafe` with string-concatenated VALUES or WHERE clauses. Even if parameter indexes are correct today, the pattern is fragile and hard to audit.

**Steps for page-interactions and lead-capture (bulk inserts):**

1. Read the existing raw SQL to understand what columns are being inserted
2. Replace `$executeRawUnsafe` with Prisma's `createMany`:

```ts
// BEFORE
const values = records.map((r, i) => `($${i*5+1}, $${i*5+2}, ...)`);
await db.$executeRawUnsafe(
  `INSERT INTO page_interactions (...) VALUES ${values.join(", ")}`,
  ...params.flat()
);

// AFTER
await db.page_interactions.createMany({
  data: records.map(r => ({
    landing_page_id: r.landingPageId,
    facility_id: r.facilityId,
    session_id: r.sessionId,
    event_type: r.eventType,
    // ... map all fields
  })),
  skipDuplicates: true, // if applicable
});
```

3. If the route uses `ON CONFLICT` / upsert logic, use `createMany` for simple inserts or loop with `upsert` for conflict handling

**Steps for alert-history (dynamic WHERE):**

1. Read the route to understand what WHERE conditions are built dynamically
2. Replace with Prisma `findMany` using a typed `where` object:

```ts
// BEFORE
let whereClause = `facility_id = $1`;
const params = [facilityId];
if (severity) { whereClause += ` AND severity = $${params.length + 1}`; params.push(severity); }
await db.$queryRawUnsafe(`SELECT * FROM alert_history WHERE ${whereClause}`, ...params);

// AFTER
const where: Prisma.alert_historyWhereInput = { facility_id: facilityId };
if (severity) where.severity = severity;
const alerts = await db.alert_history.findMany({ where, orderBy: { created_at: 'desc' }, take: maxRows });
```

**Verify:** `npm run build` passes. Test the routes manually or with curl to confirm identical behavior.

---

## P1 — Fix This Week

### Task 4: setState Inside useEffect (28 violations)

**Find them:** `npm run lint 2>&1 | grep "set-state-in-effect"`

**Two patterns to look for:**

**Pattern A — Synchronous source (localStorage, window, etc.):** Replace with lazy initializer.

```tsx
// BEFORE
const [tz, setTz] = useState('');
useEffect(() => { setTz(detect()); }, []);

// AFTER
const [tz] = useState(() => detect());
```

**Pattern B — Async fetch then setState:** This is usually fine. The lint warning can be suppressed if the setState is inside an async callback, not the synchronous effect body. If the effect does both sync and async setState, split them.

**Steps:**
1. Run the lint command above and list all 28 files
2. For each, open the file and determine if the setState source is sync or async
3. Apply Pattern A for sync sources, leave Pattern B alone (or batch state updates with a single setState call)
4. Re-run lint after each batch of fixes to track progress

---

### Task 5: Rate Limiting on Public Endpoints

**Files to add rate limiting:**

| Route | Suggested Limit |
|-------|----------------|
| `src/app/api/lead-capture/route.ts` | 10 req/min per IP |
| `src/app/api/page-interactions/route.ts` | 30 req/min per IP (batched events) |
| `src/app/api/walkin-attribution/route.ts` | 10 req/min per IP |
| `src/app/api/audit-load/route.ts` | 20 req/min per IP |
| `src/app/api/organizations/route.ts` (POST) | 5 req/min per IP |

**Steps:**

1. Read `src/lib/rate-limit.ts` to understand the existing API
2. For each route, add the rate limit check at the top of the POST handler:

```ts
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { limit: 10, window: 60 });
  if (limited) return limited;
  // ... existing handler
}
```

3. For the login endpoint (`organizations`), consider also tracking failed attempts per email/slug and adding account lockout after 10 consecutive failures

**Verify:** `npm run build` passes. Test with rapid curl requests to confirm 429 responses.

---

### Task 6: Modal Accessibility (2 components)

**Files:**
- `src/components/ui/confirmation-modal.tsx`
- `src/components/marketing/exit-intent-popup.tsx`

**Steps for each:**

1. Add `role="dialog"` and `aria-modal="true"` to the modal container
2. Add an `id` to the modal title element, then add `aria-labelledby={titleId}` to the container
3. Add `onKeyDown` handler for Escape key on the container div
4. Add `aria-label="Close"` to any icon-only close button
5. Auto-focus the modal when it opens:

```tsx
const dialogRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (isOpen) dialogRef.current?.focus();
}, [isOpen]);

<div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title"
     onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
  <h2 id="modal-title">...</h2>
</div>
```

---

### Task 7: Form Inputs Without Labels

**Files:**
- `src/app/audit-tool/audit-client.tsx` (~line 636)
- `src/components/marketing/exit-intent-popup.tsx` (~line 118)
- `src/components/marketing/cta-section.tsx` (~line 66)
- `src/app/portal/onboarding/page.tsx`

**Steps:**

1. For each file, find every `<input>` or `<textarea>` element
2. If a visible `<label>` with `htmlFor` exists, no change needed
3. Otherwise, add `aria-label` matching the placeholder or intended purpose:

```tsx
<input type="email" placeholder="Your work email" aria-label="Your work email" />
```

---

## P2 — Fix This Sprint

### Task 8: Type Safety for Prisma JSON Columns (35 `as any` casts)

**Top files by cast count:**
- `src/app/api/facility-creatives/route.ts` — 10
- `src/app/api/audit-report/route.ts` — 4
- `src/app/api/marketing-plan/route.ts` — 4
- `src/app/api/style-references/route.ts` — 3
- Remaining spread across ~12 other files

**Steps:**

1. Install Zod if not present: `npm install zod`
2. Create `src/lib/schemas/` directory
3. For each JSON column type, create a Zod schema file:
   - `src/lib/schemas/audit.ts` — for `audit_json` columns
   - `src/lib/schemas/report.ts` — for `report_json` columns
   - `src/lib/schemas/creative.ts` — for creative JSON columns
   - `src/lib/schemas/plan.ts` — for `plan_json`, `steps` columns
4. Define the schema shape by reading the existing data structures in the routes that read/write these columns
5. Replace `as any` writes with `schema.parse(data)`:

```ts
import { AuditJsonSchema } from '@/lib/schemas/audit';

// Writing
await db.shared_audits.update({
  where: { id },
  data: { audit_json: AuditJsonSchema.parse(auditData) },
});

// Reading
const audit = AuditJsonSchema.parse(record.audit_json);
```

6. Work one column type at a time. Start with `audit_json` (used in the most files), verify build passes, then move to the next

---

### Task 9: Missing Loading / Error / Empty States

**Components missing loading states:**
- `src/app/portal/page.tsx` — `WelcomeBanner` (~line 67)
- `src/app/portal/page.tsx` — `CampaignGoalProgress` (~line 161)
- `src/app/audit-tool/audit-client.tsx` — facility lookup

**Components swallowing errors (`.catch(() => {})`):**
- Portal stats fetches in `src/app/portal/page.tsx`
- Partner auth in `src/app/partner/` pages
- `OccupancyIntelligence` scan errors

**Components returning `null` instead of empty state:**
- `src/app/portal/page.tsx` — `RecentActivity` (~line 280), `CampaignAlerts` (~line 223)
- `src/components/admin/facility-tabs/media-library.tsx`
- `src/components/admin/facility-tabs/pms-dashboard.tsx`

**Steps:**

1. For **loading**: Add a skeleton or spinner that renders while `loading` is true. Use existing `<SectionSkeleton />` or `<CardSkeleton />` components if available in the codebase
2. For **errors**: Replace `.catch(() => {})` with `.catch((err) => setError(err.message))` and render an error banner with a retry button
3. For **empty states**: Replace `return null` with a centered message using the design system:

```tsx
if (!items.length) return (
  <div className="text-center py-8 text-[var(--color-mid-gray)]">
    No recent activity yet
  </div>
);
```

---

### Task 10: Remove Debug Console Logs

**Files:**
- `src/app/admin/style-references/page.tsx` — lines 79, 92
- `src/app/api/style-references/route.ts` — lines 114, 131, 162

**Steps:** Delete all five `console.log` lines. No replacement needed.

**Verify:** `grep -rn "console.log" src/app/admin/style-references/ src/app/api/style-references/` returns nothing.

---

### Task 11: Input Validation on Public POST Endpoints

**Files:**
- `src/app/api/lead-capture/route.ts`
- `src/app/api/walkin-attribution/route.ts`
- `src/app/api/consumer-leads/route.ts`

**Steps:**

1. At the top of each POST handler, after parsing the body, add length and format checks:

```ts
const body = await req.json();
const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '';
const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 20) : '';

if (!email || !email.includes('@')) {
  return errorResponse('Invalid email', 400, origin);
}
```

2. For text fields like `note`, enforce a max length (e.g., 2000 chars)
3. For enum-like fields like `source`, validate against an allow-list

If Task 8 (Zod schemas) is done first, use Zod for validation here too.

---

### Task 12: Unescaped Entities in JSX (21 violations)

**Find them:** `npm run lint 2>&1 | grep "no-unescaped-entities"`

**Steps:**

1. Run the command above and collect all file:line pairs
2. For each, replace the raw character:
   - `"` becomes `&quot;` or wrap in `{"text with \"quotes\""}`
   - `'` becomes `&apos;` or wrap in `{"it's"}`
3. The simplest fix is usually wrapping the entire text node in curly braces

---

### Task 13: Unused Variables (4 warnings)

| File | Variable | Fix |
|------|----------|-----|
| `src/hooks/use-permissions.ts:14` | `clerkIsAdmin` | Remove or use |
| `src/hooks/use-permissions.ts:45` | `_facilityId` | Remove if truly unused |
| `src/lib/drip-sequences.ts:40` | `i` | Use `_` in the loop or remove |
| `src/lib/facility-context.tsx:7` | `useEffect` import | Remove the import |

---

### Task 14: Hardcoded Facility Name in Ad Studio

**File:** `src/components/admin/facility-tabs/ad-studio.tsx` (~line 857)

**Steps:**

1. Find the hardcoded line: `const facilityName = 'Storage Facility'`
2. Check the component's props — the parent (`facility-tabs`) already passes a `facility` object
3. Replace with: `const facilityName = facility.name;`
4. If `facility` is not in props, add it to the component's prop type and pass it from the parent

---

## Recommended Work Order

For maximum efficiency, batch related fixes together:

| Phase | Tasks | Time Estimate | Notes |
|-------|-------|--------------|-------|
| **1** | Task 1 (hooks) + Task 4 (setState) | ~2 hours | Both are React hook fixes, same mental model |
| **2** | Task 2 (SMS bug) + Task 14 (facility name) | ~30 min | Quick functional bug fixes |
| **3** | Task 3 (raw SQL) | ~1 hour | Requires careful query-by-query rewrite |
| **4** | Task 5 (rate limiting) | ~30 min | Mechanical — same pattern applied 5 times |
| **5** | Task 6 (modals) + Task 7 (labels) + Task 12 (entities) | ~1 hour | All accessibility/markup fixes |
| **6** | Task 10 (console.log) + Task 13 (unused vars) | ~15 min | Quick deletions |
| **7** | Task 11 (input validation) | ~1 hour | Best done after Task 5 (rate limiting) |
| **8** | Task 8 (Zod schemas) | ~3 hours | Largest task, creates schemas from scratch |
| **9** | Task 9 (UI states) | ~2 hours | Component-by-component, low risk |

**After each phase:** Run `npm run build && npm run lint` to confirm nothing is broken.

**Final check:** `npm run lint` should show 0 errors. Warnings are acceptable but should trend toward zero.
