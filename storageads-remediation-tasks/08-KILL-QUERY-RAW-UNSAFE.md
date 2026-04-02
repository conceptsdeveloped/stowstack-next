# 08 — Replace `$queryRawUnsafe` with Safe Alternatives

## Severity: CRITICAL (SQL Injection Surface)
## Estimated Hours: 6-8

---

## Context

30 files use `$queryRawUnsafe`, which accepts raw SQL strings without parameterization. If any user input reaches these queries — even indirectly — it's a SQL injection vulnerability. Even if inputs are currently sanitized upstream, this is a ticking bomb as the codebase evolves.

---

## Step 1: Inventory Every Instance

```bash
grep -rn "\$queryRawUnsafe\|\$executeRawUnsafe" src/ --include="*.ts" --include="*.tsx" -c
grep -rn "\$queryRawUnsafe\|\$executeRawUnsafe" src/ --include="*.ts" --include="*.tsx"
```

For each instance, record:
- File path and line number
- The full SQL query being constructed
- Whether any variables are interpolated into the query string
- Whether those variables come from user input (URL params, request body, headers)

---

## Step 2: Classify Each Instance

**Category A — Direct user input interpolation (CRITICAL):**
Any query where URL params, request body fields, or headers are concatenated/interpolated into the SQL string.

```typescript
// DANGEROUS — user input in SQL string
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM facilities WHERE name = '${req.query.name}'`
);
```

**Category B — Indirect/computed values (HIGH):**
Variables from DB lookups or computed values interpolated into SQL. Not directly user-controlled but still risky.

**Category C — Static/hardcoded queries (MEDIUM):**
The SQL string is fully static with no interpolation. Using `$queryRawUnsafe` is unnecessary but not immediately dangerous.

---

## Step 3: Replace Category A Instances (FIRST PRIORITY)

For each Category A instance, replace with one of:

### Option 1: `$queryRaw` with tagged template (PREFERRED)

```typescript
// SAFE — parameterized via tagged template
const results = await prisma.$queryRaw`
  SELECT * FROM facilities WHERE name = ${facilityName}
`;
```

Prisma's `$queryRaw` tagged template automatically parameterizes values. This is the simplest fix for most cases.

### Option 2: Prisma Client methods (BEST when possible)

```typescript
// SAFEST — no raw SQL at all
const results = await prisma.facilities.findMany({
  where: { name: facilityName },
});
```

If the query can be expressed with Prisma Client methods, use them instead of raw SQL entirely.

### Option 3: `Prisma.sql` for dynamic queries

For queries that need dynamic table names, column names, or conditional clauses:

```typescript
import { Prisma } from '@prisma/client';

// Build query with Prisma.sql for safe parameterization
const query = Prisma.sql`
  SELECT * FROM facilities
  WHERE org_id = ${orgId}
  AND status = ${status}
  ORDER BY created_at DESC
  LIMIT ${limit}
`;

const results = await prisma.$queryRaw(query);
```

**Note:** `Prisma.sql` cannot parameterize table names, column names, or SQL keywords. For those cases, use an allowlist:

```typescript
const ALLOWED_SORT_COLUMNS = ['created_at', 'name', 'revenue'] as const;
const sortCol = ALLOWED_SORT_COLUMNS.includes(userInput) ? userInput : 'created_at';

// Safe: sortCol is from a known allowlist, not user input
const query = Prisma.sql`
  SELECT * FROM facilities
  ORDER BY ${Prisma.raw(sortCol)} DESC
`;
```

---

## Step 4: Replace Category B Instances

Apply the same replacement strategies as Step 3. Even though the risk is lower, the fix is the same effort.

---

## Step 5: Replace Category C Instances

For static queries with no interpolation, simply change `$queryRawUnsafe` to `$queryRaw`:

```typescript
// Before (unnecessary unsafe)
const results = await prisma.$queryRawUnsafe('SELECT COUNT(*) FROM facilities');

// After (safe)
const results = await prisma.$queryRaw`SELECT COUNT(*) FROM facilities`;
```

---

## Step 6: Handle Complex Dynamic Queries

Some queries in the occupancy-intelligence, revenue-intelligence, and revenue-loss routes may build SQL dynamically based on filters. For these:

1. **Extract the filter logic** into a builder function
2. **Use `Prisma.sql` join** to safely compose query fragments:

```typescript
import { Prisma } from '@prisma/client';

function buildFacilityFilter(filters: {
  orgId: string;
  status?: string;
  minRevenue?: number;
}): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`org_id = ${filters.orgId}`,
  ];

  if (filters.status) {
    conditions.push(Prisma.sql`status = ${filters.status}`);
  }
  if (filters.minRevenue !== undefined) {
    conditions.push(Prisma.sql`revenue >= ${filters.minRevenue}`);
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

// Usage:
const whereClause = buildFacilityFilter({ orgId, status, minRevenue });
const results = await prisma.$queryRaw`
  SELECT * FROM facilities
  ${whereClause}
  ORDER BY created_at DESC
`;
```

---

## Step 7: Also Fix `$executeRawUnsafe`

The same patterns apply. Search and replace:

```bash
grep -rn "\$executeRawUnsafe" src/ --include="*.ts"
```

Replace with `$executeRaw` using tagged templates.

---

## Step 8: Add a Lint Rule to Prevent Reintroduction

Create or update `.eslintrc.js` / `eslint.config.js` with a custom rule:

```javascript
// In the rules section:
'no-restricted-syntax': [
  'error',
  {
    selector: 'CallExpression[callee.property.name=/queryRawUnsafe|executeRawUnsafe/]',
    message: '$queryRawUnsafe and $executeRawUnsafe are banned. Use $queryRaw with tagged templates or Prisma.sql instead.',
  },
],
```

If ESLint is not configured, add a grep-based guard script:

```bash
#!/bin/bash
# scripts/check-no-raw-unsafe.sh
if grep -rn "RawUnsafe" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".eslint"; then
  echo "ERROR: \$queryRawUnsafe or \$executeRawUnsafe found. Use \$queryRaw with tagged templates instead."
  exit 1
fi
echo "OK: No unsafe raw queries found."
```

---

## Verification

```bash
# 1. Zero instances of $queryRawUnsafe or $executeRawUnsafe
grep -rn "RawUnsafe" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
# Expected: No output

# 2. All $queryRaw calls use tagged template syntax (backticks, not parentheses with string)
grep -rn "\$queryRaw(" src/ --include="*.ts" | grep -v "RawUnsafe\|Prisma.sql\|node_modules"
# Expected: No output (all should use tagged template $queryRaw`...`)

# 3. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors

# 4. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5
# Expected: No errors

# 5. Guard script passes (if created)
bash scripts/check-no-raw-unsafe.sh 2>/dev/null || echo "Guard script not created yet"
# Expected: OK
```

---

## Commit

```
fix: 08 replace all $queryRawUnsafe with parameterized queries

Eliminate SQL injection surface by replacing all 30 files using
$queryRawUnsafe with $queryRaw tagged templates and Prisma.sql.
Dynamic filter builders use Prisma.join for safe composition.
Lint rule added to prevent reintroduction.
```
