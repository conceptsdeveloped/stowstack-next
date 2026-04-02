# 18 — Fix Race Conditions: Upserts on Non-Unique Fields

## Severity: HIGH
## Estimated Hours: 2-3

---

## Context

Upserts (`prisma.model.upsert`) require a unique field in the `where` clause. If the `where` clause uses a non-unique field, Prisma falls back to create-or-update logic that is not atomic — concurrent requests can create duplicates.

---

## Step 1: Find All Upserts

```bash
grep -rn "\.upsert(" src/ --include="*.ts" --include="*.tsx" -A5
```

For each upsert, check:
1. What field is used in the `where` clause?
2. Is that field marked `@unique` or `@id` in the schema?
3. If not — this is a race condition.

---

## Step 2: Fix Each Non-Unique Upsert

For each problematic upsert:

**Option A — Add `@unique` or `@@unique` to the schema (preferred):**

If the field SHOULD be unique (e.g., there should only be one audience_sync per facility+platform combo):

```prisma
model audience_syncs {
  facility_id String
  platform    String
  // ...
  @@unique([facility_id, platform])
}
```

Then the upsert becomes safe:

```typescript
await prisma.audience_syncs.upsert({
  where: {
    facility_id_platform: {
      facility_id: facilityId,
      platform: 'facebook',
    },
  },
  create: { ... },
  update: { ... },
});
```

**Option B — Replace upsert with find-then-create inside a transaction:**

If adding a unique constraint isn't appropriate:

```typescript
await prisma.$transaction(async (tx) => {
  const existing = await tx.model.findFirst({
    where: { field: value },
  });

  if (existing) {
    await tx.model.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    await tx.model.create({
      data: createData,
    });
  }
});
```

**Option C — Use database-level advisory locks for high-contention cases:**

```typescript
await prisma.$transaction(async (tx) => {
  // Acquire advisory lock based on a hash of the key
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
  // Now safe to do find + create/update
});
```

---

## Step 3: Create Migration for New Unique Constraints

```bash
npx prisma migrate dev --name add-unique-constraints-for-upserts
```

Before applying, check for existing duplicates:

```sql
SELECT facility_id, platform, COUNT(*)
FROM audience_syncs
GROUP BY facility_id, platform
HAVING COUNT(*) > 1;
```

If duplicates exist, deduplicate before adding the constraint.

---

## Verification

```bash
# 1. All upserts use unique/id fields in where clause
grep -rn "\.upsert(" src/ --include="*.ts" -B2 -A10 | grep "where:" -A5
# Manual check: every where clause should reference a @unique or @id field

# 2. No upserts on non-unique fields remain
npx prisma validate
# Expected: No errors

# 3. Build passes
npm run build 2>&1 | tail -5
```

---

## Commit

```
fix: 18 fix upsert race conditions on non-unique fields

Add @@unique constraints for upsert targets. Replace non-atomic
upserts with transactional find-then-create/update patterns.
Deduplicate existing data before applying constraints.
```
