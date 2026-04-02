# 06 — Fix Cron Jobs: Unbounded Loops, Batching, and Timeouts

## Severity: CRITICAL
## Estimated Hours: 2-3

---

## Context

`send-client-reports` fetches ALL clients with no LIMIT. With 500+ clients at ~2 seconds each, it silently times out at the Vercel function limit (120s). Reports 61-500+ never send. No error is logged. This pattern may exist in other cron jobs too.

---

## Step 1: Inventory All Cron Jobs

```bash
find src/app/api -path "*cron*" -name "route.ts" | sort
# Also check for scheduled functions
grep -rn "export.*cron\|schedule\|CRON_SECRET\|vercel.*cron" src/app/api/ --include="route.ts" -l | sort
# And check vercel.json for cron config
cat vercel.json 2>/dev/null | grep -A5 "cron"
```

List every cron job endpoint and what it does.

---

## Step 2: Audit Each Cron Job for Unbounded Queries

For each cron job found, check:

```bash
# Does it fetch all records without LIMIT?
grep -n "findMany\|findAll\|\$queryRaw" [CRON_FILE_PATH]
```

Flag any query that:
- Uses `findMany()` without `take:` or pagination
- Uses raw SQL without `LIMIT`
- Iterates over results with `forEach`, `map`, or `for...of` doing async work per item
- Has no timeout/deadline awareness

---

## Step 3: Fix `send-client-reports` (Primary Offender)

Locate the file:

```bash
find src/app/api -path "*send-client-reports*" -o -path "*client-reports*" -o -path "*clientReports*" | grep route.ts
```

Refactor to use cursor-based pagination with batch processing:

```typescript
const BATCH_SIZE = 20;
const MAX_EXECUTION_TIME_MS = 90_000; // 90s (leave 30s buffer for 120s Vercel limit)
const startTime = Date.now();

let cursor: string | undefined = undefined;
let totalProcessed = 0;
let totalFailed = 0;
const errors: Array<{ clientId: string; error: string }> = [];

while (true) {
  // Check time budget
  if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
    console.warn(`[CRON:send-client-reports] Time limit reached. Processed: ${totalProcessed}, Remaining will be picked up next run.`);
    break;
  }

  // Fetch batch
  const clients = await prisma.client.findMany({
    take: BATCH_SIZE,
    ...(cursor ? {
      skip: 1, // Skip the cursor record itself
      cursor: { id: cursor },
    } : {}),
    orderBy: { id: 'asc' },
    where: {
      // Only clients due for reports
      status: 'active',
      // Add any existing filters
    },
  });

  if (clients.length === 0) break;

  // Process batch
  for (const client of clients) {
    try {
      await processClientReport(client);
      totalProcessed++;
    } catch (error) {
      totalFailed++;
      errors.push({
        clientId: client.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue processing other clients — don't fail the whole batch
    }
  }

  // Set cursor for next batch
  cursor = clients[clients.length - 1].id;

  // If we got fewer than BATCH_SIZE, we've reached the end
  if (clients.length < BATCH_SIZE) break;
}

// Log summary
console.log(`[CRON:send-client-reports] Complete. Processed: ${totalProcessed}, Failed: ${totalFailed}`);
if (errors.length > 0) {
  console.error(`[CRON:send-client-reports] Failures:`, JSON.stringify(errors));
}

return NextResponse.json({
  processed: totalProcessed,
  failed: totalFailed,
  errors: errors.length > 0 ? errors : undefined,
});
```

---

## Step 4: Apply the Same Pattern to All Other Cron Jobs

For every cron job found in Step 1, apply:

1. **LIMIT / batch size** — Never fetch all records. Use cursor-based pagination with `take: BATCH_SIZE`.
2. **Time budget** — Track elapsed time. Stop gracefully before the Vercel function timeout (typically 120s for pro, 60s for hobby). Leave a 30s buffer.
3. **Per-item error handling** — One failure must not kill the entire run. Catch per-item, log, continue.
4. **Summary logging** — At the end of each run, log total processed, total failed, and specific error details.
5. **Idempotency** — If a cron run is interrupted, the next run should safely pick up where it left off. Use a `last_processed_at` or `report_sent_at` timestamp to avoid re-processing.

---

## Step 5: Add Idempotency Guards

For each cron job, ensure re-running it doesn't duplicate work:

```typescript
// Example: Only process clients who haven't been reported this period
const clients = await prisma.client.findMany({
  take: BATCH_SIZE,
  where: {
    status: 'active',
    OR: [
      { lastReportSentAt: null },
      { lastReportSentAt: { lt: periodStartDate } },
    ],
  },
  orderBy: { id: 'asc' },
});

// After successful processing:
await prisma.client.update({
  where: { id: client.id },
  data: { lastReportSentAt: new Date() },
});
```

If `lastReportSentAt` or equivalent doesn't exist on the model, add it to the schema and create a migration.

---

## Step 6: Add Cron Auth Verification

Ensure every cron endpoint verifies the `CRON_SECRET`:

```bash
grep -rn "CRON_SECRET" src/app/api/ --include="route.ts"
```

Every cron route must check:

```typescript
const authHeader = req.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## Verification

```bash
# 1. No unbounded findMany in cron routes
find src/app/api -path "*cron*" -name "route.ts" | while read f; do
  if grep -q "findMany" "$f" && ! grep -q "take:" "$f"; then
    echo "UNBOUNDED QUERY: $f"
  fi
done
# Expected: No output

# 2. All cron routes have time budget awareness
find src/app/api -path "*cron*" -name "route.ts" | while read f; do
  if ! grep -q "Date.now\|startTime\|timeout\|MAX_EXECUTION" "$f"; then
    echo "NO TIME BUDGET: $f"
  fi
done
# Expected: No output

# 3. All cron routes have per-item error handling
find src/app/api -path "*cron*" -name "route.ts" | while read f; do
  if ! grep -q "try.*catch\|\.catch" "$f"; then
    echo "NO ERROR HANDLING: $f"
  fi
done
# Expected: No output

# 4. All cron routes verify CRON_SECRET
find src/app/api -path "*cron*" -name "route.ts" | while read f; do
  if ! grep -q "CRON_SECRET" "$f"; then
    echo "NO AUTH CHECK: $f"
  fi
done
# Expected: No output

# 5. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 06 fix unbounded cron loops with batching and time budgets

All cron jobs now use cursor-based pagination (BATCH_SIZE=20),
time budget awareness (90s max with 30s buffer), per-item error
handling, idempotency guards, and summary logging. Prevents
silent timeout failures on large client sets.
```
