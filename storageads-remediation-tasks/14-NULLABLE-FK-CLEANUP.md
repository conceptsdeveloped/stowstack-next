# 14 — Fix Nullable FK Fields and `created_at` Fields

## Severity: HIGH (37 nullable FKs) + MEDIUM (~105 nullable created_at)
## Estimated Hours: 4-5

---

## Context

37 FK fields that should be required are nullable, allowing records to exist without a parent reference. ~105 models have nullable `created_at` fields, meaning records can exist with no creation timestamp.

---

## Step 1: Audit All Nullable FK Fields

```bash
# Find all nullable FK fields (fields ending in _id or Id that are String? not String)
grep -n "_id\s\+String?\|Id\s\+String?" prisma/schema.prisma
```

For each nullable FK, determine: **Should this be required?**

**Make required (String, not String?) if:**
- The record cannot logically exist without the parent (e.g., a `social_post` without a `facility_id`)
- The parent is set at creation time and never cleared
- There's no legitimate use case for a null value

**Keep nullable (String?) if:**
- The FK is optional by design (e.g., `assigned_to_user_id` on a task — may be unassigned)
- The parent might be deleted while the child persists (with `onDelete: SetNull`)
- The field is set after creation (e.g., `approved_by_id` on a pending record)

---

## Step 2: Fix Nullable FKs That Should Be Required

For each FK that should be required, update the schema:

Before:
```prisma
model social_posts {
  facility_id String?
}
```

After:
```prisma
model social_posts {
  facility_id String
}
```

**Before changing, verify no null values exist in the database:**

Create a pre-migration check script `scripts/check-nullable-fks.sql`:

```sql
-- For each FK being changed from nullable to required, check for nulls:
SELECT 'social_posts.facility_id' as field, COUNT(*) as null_count
FROM social_posts WHERE facility_id IS NULL
UNION ALL
SELECT 'nurture_sequences.facility_id', COUNT(*)
FROM nurture_sequences WHERE facility_id IS NULL
-- ... repeat for every FK being changed
;
```

If null values exist:
1. **Option A:** Delete the orphaned records (if they're garbage data)
2. **Option B:** Set them to a default value (if there's a logical default)
3. **Option C:** Keep the FK nullable (if nulls are legitimate)

---

## Step 3: Fix Nullable `created_at` Fields

```bash
grep -n "created_at\s\+DateTime?" prisma/schema.prisma
```

Change every nullable `created_at` to required with a default:

Before:
```prisma
model some_model {
  created_at DateTime?
}
```

After:
```prisma
model some_model {
  created_at DateTime @default(now())
}
```

**Pre-migration:** Check for null `created_at` values and backfill:

```sql
-- Backfill null created_at with a reasonable default (e.g., current time)
UPDATE some_model SET created_at = NOW() WHERE created_at IS NULL;
```

Create a migration script that backfills BEFORE altering the column.

---

## Step 4: Also Fix `updated_at` Fields

While you're at it, check `updated_at` fields:

```bash
grep -n "updated_at\s\+DateTime?" prisma/schema.prisma
```

These should also be required with a default and auto-update:

```prisma
model some_model {
  updated_at DateTime @default(now()) @updatedAt
}
```

---

## Step 5: Create the Migration

This is a data migration, so do it in two steps:

**Step 5a — Create a SQL migration to backfill nulls:**

```bash
npx prisma migrate dev --name backfill-nullable-fields --create-only
```

Edit the generated migration SQL to add backfill statements BEFORE the ALTER TABLE statements:

```sql
-- Backfill null created_at
UPDATE social_posts SET created_at = NOW() WHERE created_at IS NULL;
UPDATE nurture_sequences SET created_at = NOW() WHERE created_at IS NULL;
-- ... repeat for all models

-- Backfill null FKs (delete orphaned records)
DELETE FROM social_posts WHERE facility_id IS NULL;
-- ... repeat for all FKs being made required

-- Then alter columns
ALTER TABLE social_posts ALTER COLUMN facility_id SET NOT NULL;
ALTER TABLE social_posts ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE social_posts ALTER COLUMN created_at SET DEFAULT NOW();
-- ... repeat for all changes
```

**Step 5b — Apply the migration:**

```bash
npx prisma migrate dev
```

---

## Step 6: Regenerate Prisma Client

```bash
npx prisma generate
```

---

## Step 7: Fix TypeScript Errors

Changing fields from nullable to required will cause TypeScript errors wherever the code handles `null` for these fields:

```bash
npx tsc --noEmit 2>&1 | grep "error TS"
```

For each error:
- If the code has `if (record.facility_id)` null checks, they may be redundant now — remove them or keep for safety
- If the code passes `null` when creating records, change to pass the required value
- If the code uses `!` non-null assertion, it's now safe to remove

---

## Verification

```bash
# 1. No nullable created_at fields
grep -c "created_at\s\+DateTime?" prisma/schema.prisma
# Expected: 0

# 2. Count of remaining nullable FKs (should be only intentionally nullable ones)
grep -c "_id\s\+String?\|Id\s\+String?" prisma/schema.prisma
# Expected: Significantly fewer than 37 (only intentionally nullable ones)

# 3. Schema validates
npx prisma validate
# Expected: No errors

# 4. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5
# Expected: No errors

# 5. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 14 make FK fields and created_at non-nullable where required

Change 37 nullable FK fields to required where parent reference is
mandatory. Change ~105 nullable created_at fields to required with
@default(now()). Backfill existing null values. Delete orphaned
records with no parent reference.
```
