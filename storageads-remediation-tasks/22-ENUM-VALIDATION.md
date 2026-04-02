# 22 — Replace String-Based Enum Fields with Prisma Enums

## Severity: MEDIUM
## Estimated Hours: 2-3

---

## Context

Enum-like values (status, type, role, etc.) are stored as plain strings with no database-level validation. A typo or malformed API request can insert invalid values like `"actvie"` instead of `"active"`, causing silent data corruption and broken filtering.

---

## Step 1: Identify All String Fields That Should Be Enums

```bash
# Find fields with names suggesting enum values
grep -n "status\|type\|role\|plan\|tier\|category\|priority\|frequency\|channel\|platform\|method" prisma/schema.prisma | grep "String"
```

For each field, search the codebase for all values it can take:

```bash
# Example: find all values assigned to a 'status' field
grep -rn "status.*=.*['\"]" src/ --include="*.ts" --include="*.tsx" | grep -oP "(?<=['\"])\w+(?=['\"])" | sort | uniq
```

---

## Step 2: Define Prisma Enums

For each identified field, create a Prisma enum in `schema.prisma`:

```prisma
enum FacilityStatus {
  active
  inactive
  pending
  suspended
}

enum SubscriptionPlan {
  launch
  growth
  full_stack
  enterprise
}

enum CampaignStatus {
  draft
  active
  paused
  completed
  archived
}

enum AdPlatform {
  meta
  google
  tiktok
}

enum ReportFrequency {
  daily
  weekly
  biweekly
  monthly
}

enum UserRole {
  owner
  admin
  manager
  viewer
}

// Add all enums identified in Step 1
```

---

## Step 3: Update Model Fields to Use Enums

Before:
```prisma
model facilities {
  status String @default("active")
}
```

After:
```prisma
model facilities {
  status FacilityStatus @default(active)
}
```

Repeat for every field identified in Step 1.

---

## Step 4: Create Migration with Data Backfill

```bash
npx prisma migrate dev --name convert-strings-to-enums --create-only
```

Edit the migration to:
1. Create the enum types
2. Clean up any invalid existing values BEFORE converting the column
3. Convert the column from `text` to the enum type

```sql
-- Create enum
CREATE TYPE "FacilityStatus" AS ENUM ('active', 'inactive', 'pending', 'suspended');

-- Fix any invalid values first
UPDATE facilities SET status = 'active' WHERE status NOT IN ('active', 'inactive', 'pending', 'suspended');

-- Convert column
ALTER TABLE facilities
  ALTER COLUMN status TYPE "FacilityStatus"
  USING status::"FacilityStatus";

-- Set default
ALTER TABLE facilities
  ALTER COLUMN status SET DEFAULT 'active'::"FacilityStatus";
```

Then apply:
```bash
npx prisma migrate dev
```

---

## Step 5: Update TypeScript Code

After changing schema fields to enums, TypeScript types change from `string` to the enum type. Fix all compilation errors:

```bash
npx tsc --noEmit 2>&1 | grep "error TS"
```

Common fixes:
- `where: { status: 'active' }` → `where: { status: 'active' }` (usually works as-is with Prisma)
- String comparisons like `if (facility.status === 'active')` still work
- API input validation should now check against enum values:

```typescript
import { FacilityStatus } from '@prisma/client';

const validStatuses = Object.values(FacilityStatus);
if (!validStatuses.includes(input.status)) {
  return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
}
```

---

## Step 6: Add Input Validation on API Routes

For every API route that accepts enum-like values in request bodies:

```typescript
import { FacilityStatus } from '@prisma/client';

// Validate enum input
const { status } = await req.json();
if (status && !Object.values(FacilityStatus).includes(status)) {
  return NextResponse.json(
    { error: `Invalid status. Must be one of: ${Object.values(FacilityStatus).join(', ')}` },
    { status: 400 }
  );
}
```

---

## Verification

```bash
# 1. Enum definitions exist in schema
grep -c "^enum " prisma/schema.prisma
# Expected: Multiple enums defined

# 2. No string-typed fields that should be enums (spot check)
grep -n "status.*String\|role.*String\|plan.*String\|tier.*String" prisma/schema.prisma
# Expected: No matches (all converted to enum types)

# 3. Schema validates
npx prisma validate

# 4. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5

# 5. Build passes
npm run build 2>&1 | tail -5
```

---

## Commit

```
fix: 22 convert string-based enum fields to Prisma enums

Define Prisma enums for status, role, plan, platform, and other
categorical fields. Database now rejects invalid values at the
schema level. API routes validate enum inputs before writing.
```
