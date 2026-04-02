# 20 — Add Soft Delete Pattern Across All Models

## Severity: HIGH
## Estimated Hours: 3-4

---

## Context

All deletes are hard deletes — permanent data loss with no recovery option. If a customer accidentally deletes a facility, or if a bug triggers a cascade delete, the data is gone forever.

---

## Step 1: Add Soft Delete Fields to All Deletable Models

Identify which models need soft delete. At minimum, any model representing a business entity that a user or system can delete:

```bash
# Find all models
grep -n "^model " prisma/schema.prisma
```

Add to each deletable model in `prisma/schema.prisma`:

```prisma
model facilities {
  // ... existing fields
  deleted_at DateTime?
  deleted_by String?    // User ID who deleted (for audit)

  @@index([deleted_at])
}
```

**Models that DO need soft delete (business entities):**
- `facilities`, `organizations`, `users`, `social_posts`, `nurture_sequences`, `nurture_enrollments`, `audience_syncs`, `ad_campaigns`, `ad_creatives`, `landing_pages`, `reports`
- Any model representing customer data or configuration

**Models that do NOT need soft delete (ephemeral/log data):**
- `activity_log`, `api_usage_log`, `sessions`, `cron_runs`
- Any model that is purely a log or temporary state

---

## Step 2: Create Soft Delete Middleware

Prisma middleware can automatically filter out soft-deleted records on all queries and convert `delete` operations to `update` operations.

Create `src/lib/prisma-soft-delete.ts`:

```typescript
import { Prisma } from '@prisma/client';

// Models that use soft delete
const SOFT_DELETE_MODELS = new Set([
  'facilities',
  'organizations',
  'users',
  'social_posts',
  'nurture_sequences',
  'nurture_enrollments',
  'nurture_messages',
  'audience_syncs',
  // Add all models from Step 1
]);

export function applySoftDeleteMiddleware(prisma: any) {
  // Intercept delete → convert to soft delete
  prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    if (!SOFT_DELETE_MODELS.has(params.model ?? '')) {
      return next(params);
    }

    // Convert delete to update with deleted_at
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deleted_at: new Date() };
    }

    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      if (params.args.data) {
        params.args.data.deleted_at = new Date();
      } else {
        params.args.data = { deleted_at: new Date() };
      }
    }

    // Auto-filter soft-deleted records on reads
    if (['findFirst', 'findMany', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};

      // Don't override if caller explicitly queries deleted records
      if (params.args.where.deleted_at === undefined) {
        params.args.where.deleted_at = null;
      }
    }

    return next(params);
  });
}
```

**Alternative (Prisma 5+ client extensions — preferred if on Prisma 5):**

```typescript
import { Prisma, PrismaClient } from '@prisma/client';

export const prismaWithSoftDelete = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          args.where = { ...args.where, deleted_at: null };
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          args.where = { ...args.where, deleted_at: null };
        }
        return query(args);
      },
      async delete({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          return (prismaWithSoftDelete as any)[model].update({
            where: args.where,
            data: { deleted_at: new Date() },
          });
        }
        return query(args);
      },
    },
  },
});
```

---

## Step 3: Wire Middleware into Prisma Client

In your Prisma client initialization file:

```typescript
import { applySoftDeleteMiddleware } from './prisma-soft-delete';

const prisma = new PrismaClient();
applySoftDeleteMiddleware(prisma);

export { prisma };
```

---

## Step 4: Add `includeDeleted` Escape Hatch

For admin tools and data recovery, you need a way to query deleted records:

```typescript
// To include soft-deleted records, explicitly pass deleted_at filter:
const allFacilities = await prisma.facilities.findMany({
  where: { deleted_at: { not: null } }, // Only deleted
});

const everything = await prisma.facilities.findMany({
  where: { OR: [{ deleted_at: null }, { deleted_at: { not: null } }] },
});
```

Consider creating a helper:

```typescript
export function includeDeleted() {
  return { OR: [{ deleted_at: null }, { deleted_at: { not: null } }] };
}

export function onlyDeleted() {
  return { deleted_at: { not: null } };
}
```

---

## Step 5: Add Restore Functionality

Create a utility to restore soft-deleted records:

```typescript
export async function restoreRecord(model: string, id: string) {
  return (prisma as any)[model].update({
    where: { id },
    data: { deleted_at: null, deleted_by: null },
  });
}
```

---

## Step 6: Add Permanent Delete for Data Retention Compliance

For GDPR/data deletion requests, create a hard delete that bypasses soft delete:

```typescript
export async function permanentlyDelete(model: string, id: string) {
  // Use $executeRaw to bypass middleware
  return prisma.$executeRaw`DELETE FROM ${Prisma.raw(model)} WHERE id = ${id}`;
}
```

---

## Step 7: Create and Apply Migration

```bash
npx prisma migrate dev --name add-soft-delete-fields
```

---

## Verification

```bash
# 1. deleted_at field exists on all target models
grep -c "deleted_at" prisma/schema.prisma
# Expected: Number matching count of soft-delete models

# 2. Soft delete middleware is applied
grep -rn "softDelete\|soft.delete\|deleted_at.*null" src/lib/ --include="*.ts"
# Expected: Middleware file and Prisma client setup

# 3. No hard deletes on soft-delete models in application code
grep -rn "\.delete(\|\.deleteMany(" src/app/api/ --include="*.ts" | grep -v "node_modules"
# Expected: These should all go through middleware (which converts to update)

# 4. Schema validates
npx prisma validate

# 5. Build passes
npm run build 2>&1 | tail -5
```

---

## Commit

```
fix: 20 add soft delete pattern across all business entity models

Add deleted_at/deleted_by fields to all deletable models. Prisma
middleware auto-converts delete to soft delete and filters deleted
records from queries. Includes restore utility and permanent delete
escape hatch for compliance.
```
