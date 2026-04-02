# 09 — Add Missing Database Indexes

## Severity: HIGH
## Estimated Hours: 2-3

---

## Context

Critical query paths are missing indexes on `sessions.token_hash`, `organizations.slug`, and `partial_leads.session_id`. As data grows, these queries will become progressively slower and eventually cause timeouts.

---

## Step 1: Audit Current Indexes

```bash
grep -n "@@index\|@@unique\|@unique" prisma/schema.prisma
```

Record every existing index.

---

## Step 2: Identify Missing Indexes

The audit flagged these as missing. Verify each one:

### Confirmed Missing:
1. `sessions.token_hash` — Used for session lookup on every authenticated request
2. `organizations.slug` — Used for org lookup by slug (URL routing)
3. `partial_leads.session_id` — Used to look up partial leads by session

### Likely Missing (audit all FK fields and common query patterns):

```bash
# Find all fields used in WHERE clauses in raw queries
grep -rn "WHERE.*=" src/app/api/ --include="*.ts" | grep -oP '(?:WHERE|AND|OR)\s+\w+\.\w+\s*=' | sort | uniq -c | sort -rn | head -30

# Find all fields used in Prisma where clauses
grep -rn "where:.*{" src/app/api/ --include="*.ts" -A5 | grep -oP '\w+:' | sort | uniq -c | sort -rn | head -30
```

Common fields that need indexes:
- Any `_id` / `Id` FK field that doesn't have `@relation` (those get auto-indexed by FK constraint)
- `email` fields used for lookups
- `status` fields used for filtering
- `created_at` fields used for sorting/filtering
- `slug` fields used for URL routing
- `token` / `token_hash` fields used for auth lookups
- Any field used in `findFirst`/`findUnique` without being `@id` or `@unique`

---

## Step 3: Add Indexes to Schema

In `prisma/schema.prisma`, add `@@index` directives to each model:

```prisma
model sessions {
  // ... existing fields
  @@index([token_hash])
}

model organizations {
  // ... existing fields
  @@index([slug])
}

model partial_leads {
  // ... existing fields
  @@index([session_id])
}
```

For composite indexes (queries that filter on multiple columns together):

```prisma
model activity_log {
  // ... existing fields
  @@index([facility_id, created_at])   // Facility activity timeline
}

model api_usage_log {
  // ... existing fields
  @@index([org_id, created_at])        // Org usage timeline
}
```

**Add ALL indexes identified in Step 2, not just the three confirmed ones.**

---

## Step 4: Consider Unique Indexes

If a field should be unique but isn't marked as such:

```prisma
model organizations {
  slug String @unique   // If slugs must be unique, use @unique instead of @@index
}
```

`@unique` creates an index AND enforces uniqueness at the DB level.

---

## Step 5: Create and Apply Migration

```bash
npx prisma migrate dev --name add-missing-indexes
```

Review the generated SQL. It should contain `CREATE INDEX` statements. Indexes are non-destructive — they don't modify data, only add lookup structures.

---

## Step 6: Verify Index Usage

After applying, verify the indexes exist:

```bash
npx prisma db execute --stdin <<EOF
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
EOF
```

---

## Verification

```bash
# 1. sessions.token_hash has an index
grep -A5 "model sessions" prisma/schema.prisma | grep -i "index.*token_hash\|token_hash.*unique"
# Expected: Match

# 2. organizations.slug has an index or unique constraint
grep -A10 "model organizations" prisma/schema.prisma | grep -i "index.*slug\|slug.*unique\|@unique"
# Expected: Match

# 3. partial_leads.session_id has an index
grep -A10 "model partial_leads" prisma/schema.prisma | grep -i "index.*session_id"
# Expected: Match

# 4. Migration exists
ls prisma/migrations/ | grep "add-missing-indexes"
# Expected: Match

# 5. Schema validates
npx prisma validate
# Expected: No errors

# 6. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 09 add missing database indexes for sessions, organizations, partial_leads

Add indexes on sessions.token_hash, organizations.slug,
partial_leads.session_id, and all other high-traffic query paths.
Prevents query degradation as data volume grows.
```
