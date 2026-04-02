# 07 — Add Missing `@relation` and Cascade Deletes to Orphan Models

## Severity: CRITICAL
## Estimated Hours: 3-4

---

## Context

5+ models (`social_posts`, `nurture_sequences`, `nurture_enrollments`, `nurture_messages`, `audience_syncs`) have `facility_id` fields but no `@relation` defined. Deleting a facility leaves orphaned records with no cascade. This causes broken references, phantom data, and potential errors when querying.

---

## Step 1: Audit the Entire Schema for Missing Relations

Open the Prisma schema:

```bash
cat prisma/schema.prisma
```

For every model in the schema, check:

1. Does it have a field ending in `_id` or `Id` (e.g., `facility_id`, `orgId`, `userId`)?
2. Does that field have a corresponding `@relation` directive?
3. If `@relation` exists, does it specify `onDelete` behavior?

Build a complete list of every FK field missing `@relation`. The audit identified at minimum:
- `social_posts.facility_id` — missing `@relation`
- `nurture_sequences.facility_id` — missing `@relation`
- `nurture_enrollments.facility_id` — missing `@relation`
- `nurture_messages.facility_id` — missing `@relation`
- `audience_syncs.facility_id` — missing `@relation`

But search for ALL missing relations, not just these five:

```bash
# Find all _id/Id fields
grep -n "_id\|Id " prisma/schema.prisma | grep -v "@relation\|@@\|//\|model\|enum"
```

---

## Step 2: Determine Correct `onDelete` Behavior for Each Relation

For each missing relation, decide the correct cascade behavior:

| onDelete Value | When to Use |
|---|---|
| `Cascade` | Child data is meaningless without parent. Deleting facility should delete its social_posts. |
| `SetNull` | Child data has independent value. Deleting a user should null out `assignedTo` but keep the record. |
| `Restrict` | Deletion should be prevented if children exist. Deleting an org with active subscriptions should fail. |

For the identified models:
- `social_posts` → `onDelete: Cascade` (posts belong to facility)
- `nurture_sequences` → `onDelete: Cascade` (sequences belong to facility)
- `nurture_enrollments` → `onDelete: Cascade` (enrollments belong to facility)
- `nurture_messages` → `onDelete: Cascade` (messages belong to sequence/facility)
- `audience_syncs` → `onDelete: Cascade` (syncs belong to facility)

Apply your judgment for any additional missing relations found in the audit.

---

## Step 3: Add Relations to the Schema

For each missing relation, add the proper Prisma relation fields.

**Example — Adding relation to `social_posts`:**

Before:
```prisma
model social_posts {
  id          String   @id @default(cuid())
  facility_id String
  content     String
  // ... other fields
}
```

After:
```prisma
model social_posts {
  id          String   @id @default(cuid())
  facility_id String
  facility    facilities @relation(fields: [facility_id], references: [id], onDelete: Cascade)
  content     String
  // ... other fields
}
```

And on the parent model (`facilities`), add the reverse relation:
```prisma
model facilities {
  // ... existing fields
  social_posts        social_posts[]
  nurture_sequences   nurture_sequences[]
  nurture_enrollments nurture_enrollments[]
  nurture_messages    nurture_messages[]
  audience_syncs      audience_syncs[]
}
```

**Repeat for every missing relation found in Step 1.**

---

## Step 4: Handle Naming Conflicts

If a model has multiple FK fields pointing to the same parent (e.g., `created_by_id` and `updated_by_id` both pointing to `users`), you must name the relations:

```prisma
model some_model {
  created_by_id String
  updated_by_id String
  created_by    users @relation("CreatedBy", fields: [created_by_id], references: [id])
  updated_by    users @relation("UpdatedBy", fields: [updated_by_id], references: [id])
}

model users {
  // ... existing fields
  created_some_models some_model[] @relation("CreatedBy")
  updated_some_models some_model[] @relation("UpdatedBy")
}
```

---

## Step 5: Create and Apply Migration

```bash
npx prisma migrate dev --name add-missing-relations-cascade
```

Review the generated migration SQL. It should contain:
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES ...`
- `ON DELETE CASCADE` (or SET NULL / RESTRICT as appropriate)

If Prisma warns about existing data that violates the new constraints:
1. First, clean up orphaned records (records whose FK points to a non-existent parent)
2. Then re-run the migration

To find orphaned records:
```sql
-- Example: Find social_posts with no matching facility
SELECT sp.id, sp.facility_id
FROM social_posts sp
LEFT JOIN facilities f ON sp.facility_id = f.id
WHERE f.id IS NULL;
```

Create a cleanup migration or script to delete orphaned records before applying FK constraints.

---

## Step 6: Update Application Code

After adding relations, update any application code that:

1. **Manually handles cascading deletes** — If there's code like `await prisma.social_posts.deleteMany({ where: { facility_id } })` before `await prisma.facility.delete()`, the manual delete is now redundant (but harmless). Leave it for safety or remove it — your choice.

2. **Uses `include` or `select` on the new relations** — The new relation fields are available for eager loading:
```typescript
const facility = await prisma.facilities.findUnique({
  where: { id },
  include: { social_posts: true },
});
```

3. **References the raw `facility_id` field** — Code that reads `post.facility_id` still works. No changes needed.

---

## Step 7: Regenerate Prisma Client

```bash
npx prisma generate
```

---

## Verification

```bash
# 1. No FK fields without @relation in the schema
# This counts _id/Id fields without @relation on the same or next line
python3 -c "
import re
with open('prisma/schema.prisma') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    stripped = line.strip()
    if re.search(r'(_id|Id)\s+String', stripped) and '@relation' not in stripped:
        # Check if @relation is on the line itself
        if '@@' not in stripped and '//' not in stripped and 'model ' not in stripped and 'enum ' not in stripped and '@id' not in stripped:
            print(f'Line {i+1}: {stripped}')
" 2>/dev/null || echo "Run manual check on schema"
# Expected: No output (all FK fields have relations)

# 2. Migration was created
ls -la prisma/migrations/ | tail -5
# Expected: Recent migration directory with add-missing-relations

# 3. Prisma validates the schema
npx prisma validate
# Expected: No errors

# 4. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 07 add missing @relation and cascade deletes to orphan models

Add Prisma @relation with onDelete: Cascade to social_posts,
nurture_sequences, nurture_enrollments, nurture_messages,
audience_syncs, and all other models with unlinked FK fields.
Prevents orphaned data when parent records are deleted.
```
