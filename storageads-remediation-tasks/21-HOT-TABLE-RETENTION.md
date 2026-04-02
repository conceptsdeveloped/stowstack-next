# 21 — Add Retention Policies and Archival for Unbounded Log Tables

## Severity: MEDIUM
## Estimated Hours: 2-3

---

## Context

`activity_log` and `api_usage_log` tables grow unbounded. With no retention or archival policy, these tables will degrade query performance over time and eventually consume significant storage.

---

## Step 1: Identify All Unbounded Log Tables

```bash
grep -n "^model.*log\|^model.*audit\|^model.*history\|^model.*event" prisma/schema.prisma
```

Common candidates:
- `activity_log`
- `api_usage_log`
- `email_log` / `notification_log`
- `webhook_log`
- `login_history`
- Any table that receives write-only append data

---

## Step 2: Define Retention Policies

| Table | Hot Retention | Archive/Delete |
|-------|--------------|----------------|
| `activity_log` | 90 days | Delete after 90 days |
| `api_usage_log` | 30 days | Archive to cold storage or delete |
| `email_log` | 90 days | Delete |
| `webhook_log` | 30 days | Delete |
| `cron_runs` | 30 days | Delete |

Adjust based on compliance requirements. If you need long-term audit trails, archive to a separate table or export to S3/cloud storage before deleting.

---

## Step 3: Create a Retention Cron Job

Create `src/app/api/cron/data-retention/route.ts`:

```typescript
import { createCronHandler } from '@/lib/cron-runner';
import { prisma } from '@/lib/prisma';

const RETENTION_POLICIES = [
  {
    model: 'activity_log',
    retentionDays: 90,
    dateField: 'created_at',
  },
  {
    model: 'api_usage_log',
    retentionDays: 30,
    dateField: 'created_at',
  },
  // Add all log tables from Step 1
] as const;

export const GET = createCronHandler(
  { name: 'data-retention' },
  async () => {
    let totalProcessed = 0;
    let totalFailed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const policy of RETENTION_POLICIES) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      try {
        // Delete in batches to avoid long-running transactions
        let deletedInBatch = 0;
        const BATCH_SIZE = 1000;

        do {
          const result = await prisma.$executeRaw`
            DELETE FROM ${Prisma.raw(policy.model)}
            WHERE ${Prisma.raw(policy.dateField)} < ${cutoffDate}
            LIMIT ${BATCH_SIZE}
          `;
          // Note: Prisma $executeRaw returns affected row count
          deletedInBatch = Number(result);
          totalProcessed += deletedInBatch;
        } while (deletedInBatch === BATCH_SIZE);

        console.log(`[RETENTION] ${policy.model}: deleted records older than ${policy.retentionDays} days`);
      } catch (error) {
        totalFailed++;
        errors.push({
          id: policy.model,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { processed: totalProcessed, failed: totalFailed, errors, durationMs: 0 };
  }
);
```

**Note:** PostgreSQL doesn't support `LIMIT` in `DELETE` directly. Use a subquery:

```sql
DELETE FROM activity_log
WHERE id IN (
  SELECT id FROM activity_log
  WHERE created_at < $1
  LIMIT 1000
)
```

---

## Step 4: Add Indexes for Retention Queries

Ensure all log tables have indexes on their date field:

```prisma
model activity_log {
  // ...
  @@index([created_at])
}

model api_usage_log {
  // ...
  @@index([created_at])
}
```

---

## Step 5: Schedule the Cron Job

Add to `vercel.json` (or your cron scheduler):

```json
{
  "crons": [
    {
      "path": "/api/cron/data-retention",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Runs daily at 3 AM UTC.

---

## Step 6: Add Table Size Monitoring (Optional)

Create a query to monitor table sizes:

```typescript
const tableSizes = await prisma.$queryRaw`
  SELECT
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_total_relation_size(relid) AS size_bytes,
    n_live_tup AS row_count
  FROM pg_catalog.pg_statio_user_tables
  ORDER BY pg_total_relation_size(relid) DESC
  LIMIT 20;
`;
```

Add this to the admin health check endpoint.

---

## Verification

```bash
# 1. Retention cron job exists
test -f src/app/api/cron/data-retention/route.ts && echo "OK" || echo "MISSING"

# 2. All log tables have created_at indexes
grep -B5 "model.*log\|model.*audit" prisma/schema.prisma | grep "@@index.*created_at"
# Expected: Index for each log table

# 3. Cron schedule is configured
grep -r "data-retention" vercel.json 2>/dev/null
# Expected: Match

# 4. Build passes
npm run build 2>&1 | tail -5
```

---

## Commit

```
fix: 21 add retention policies for unbounded log tables

Create daily data-retention cron job that batch-deletes expired
records from activity_log (90d), api_usage_log (30d), and other
log tables. Prevents unbounded table growth and query degradation.
```
