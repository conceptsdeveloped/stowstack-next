# 16 — Add Retry Logic and Failure Notifications to All Cron Jobs

## Severity: HIGH
## Estimated Hours: 2-3

---

## Context

Cron jobs have no retry logic and no failure notification. If a cron job fails silently, no one knows until a customer complains that their report never arrived.

---

## Step 1: Inventory All Cron Jobs

```bash
find src/app/api -path "*cron*" -name "route.ts" | sort
grep -rn "CRON_SECRET" src/app/api/ --include="route.ts" -l | sort
```

---

## Step 2: Create a Cron Wrapper with Retry and Notification

Create `src/lib/cron-runner.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

type CronConfig = {
  name: string;                    // Human-readable name for logs/alerts
  maxRetries?: number;             // Per-item retries (default: 2)
  notifyOnFailure?: boolean;       // Send notification on failure (default: true)
  notifyOnPartialFailure?: boolean; // Notify if some items failed (default: true)
};

type CronResult = {
  processed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  durationMs: number;
};

export function createCronHandler(
  config: CronConfig,
  handler: () => Promise<CronResult>
) {
  return async (req: NextRequest) => {
    // Auth check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const { name, notifyOnFailure = true, notifyOnPartialFailure = true } = config;

    try {
      const result = await handler();
      result.durationMs = Date.now() - startTime;

      // Log summary
      console.log(`[CRON:${name}] Complete`, {
        processed: result.processed,
        failed: result.failed,
        durationMs: result.durationMs,
      });

      // Notify on partial failure
      if (result.failed > 0 && notifyOnPartialFailure) {
        await sendCronAlert({
          cronName: name,
          type: 'partial_failure',
          processed: result.processed,
          failed: result.failed,
          errors: result.errors.slice(0, 10), // Cap at 10 errors
          durationMs: result.durationMs,
        });
      }

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[CRON:${name}] Fatal error`, { error: errorMessage, durationMs });
      Sentry.captureException(error, { tags: { cron: name } });

      if (notifyOnFailure) {
        await sendCronAlert({
          cronName: name,
          type: 'fatal_error',
          error: errorMessage,
          durationMs,
        });
      }

      return NextResponse.json(
        { error: errorMessage, durationMs },
        { status: 500 }
      );
    }
  };
}

// Per-item retry helper
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// Alert notification
async function sendCronAlert(alert: {
  cronName: string;
  type: 'partial_failure' | 'fatal_error';
  processed?: number;
  failed?: number;
  errors?: Array<{ id: string; error: string }>;
  error?: string;
  durationMs: number;
}) {
  // Option 1: Send via email (SendGrid/Resend)
  // Option 2: Send via Slack webhook
  // Option 3: Log to a dedicated alerts table

  // Slack webhook example (if SLACK_WEBHOOK_URL is set):
  const webhookUrl = process.env.SLACK_CRON_ALERT_WEBHOOK;
  if (!webhookUrl) {
    console.warn('[CRON_ALERT] No SLACK_CRON_ALERT_WEBHOOK configured, alert logged only');
    console.error('[CRON_ALERT]', JSON.stringify(alert));
    return;
  }

  const emoji = alert.type === 'fatal_error' ? '🔴' : '🟡';
  const text = alert.type === 'fatal_error'
    ? `${emoji} *CRON FATAL: ${alert.cronName}*\nError: ${alert.error}\nDuration: ${alert.durationMs}ms`
    : `${emoji} *CRON PARTIAL FAILURE: ${alert.cronName}*\nProcessed: ${alert.processed}, Failed: ${alert.failed}\nDuration: ${alert.durationMs}ms\nErrors: ${JSON.stringify(alert.errors?.slice(0, 5))}`;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error('[CRON_ALERT] Failed to send Slack notification', e);
  }
}
```

---

## Step 3: Wrap Every Cron Job with the Runner

For each cron job found in Step 1, refactor to use `createCronHandler`:

**Before:**
```typescript
export async function GET(req: NextRequest) {
  // auth check
  // fetch all clients
  // process each
  // return response
}
```

**After:**
```typescript
import { createCronHandler, withRetry } from '@/lib/cron-runner';

export const GET = createCronHandler(
  { name: 'send-client-reports' },
  async () => {
    let processed = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Batched processing (from task 06)
    // ...

    for (const client of batch) {
      try {
        await withRetry(() => processClientReport(client), 2);
        processed++;
      } catch (error) {
        failed++;
        errors.push({
          id: client.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { processed, failed, errors, durationMs: 0 };
  }
);
```

---

## Step 4: Set Up Notification Channel

Choose and configure at least one notification channel:

**Option A — Slack (recommended):**
1. Create a Slack webhook URL for a `#cron-alerts` channel
2. Add `SLACK_CRON_ALERT_WEBHOOK` to env vars

**Option B — Email:**
1. Use existing SendGrid/email setup
2. Send to a team email address

**Option C — Database alert table:**
1. Create a `cron_alerts` table
2. Build a simple admin page to view recent alerts

At minimum, configure Slack. Add the env var to `.env.example`.

---

## Step 5: Add Cron Health Check Endpoint

Create `src/app/api/admin/cron-health/route.ts`:

```typescript
// GET — Returns the last run status of each cron job
// Uses a cron_runs table or simply queries logs

export async function GET(req: NextRequest) {
  // Auth check (admin key)
  
  const cronJobs = await prisma.cron_runs.findMany({
    orderBy: { started_at: 'desc' },
    take: 20,
    distinct: ['cron_name'],
  });

  return NextResponse.json(cronJobs);
}
```

If a `cron_runs` table doesn't exist, add one to track execution history:

```prisma
model cron_runs {
  id         String   @id @default(cuid())
  cron_name  String
  status     String   // 'success' | 'partial_failure' | 'fatal_error'
  processed  Int      @default(0)
  failed     Int      @default(0)
  duration   Int      // milliseconds
  error      String?
  started_at DateTime @default(now())

  @@index([cron_name, started_at])
}
```

---

## Verification

```bash
# 1. Cron runner utility exists
test -f src/lib/cron-runner.ts && echo "OK" || echo "MISSING"
# Expected: OK

# 2. All cron routes use createCronHandler or equivalent
find src/app/api -path "*cron*" -name "route.ts" | while read f; do
  if ! grep -q "createCronHandler\|cronRunner\|withRetry" "$f"; then
    echo "NOT WRAPPED: $f"
  fi
done
# Expected: No output

# 3. Alert function exists
grep -n "sendCronAlert\|SLACK_CRON_ALERT" src/lib/cron-runner.ts
# Expected: Multiple matches

# 4. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 16 add retry logic and failure notifications to all cron jobs

Create cron runner wrapper with per-item retry (2 attempts),
Slack/email failure notifications, execution time tracking, and
structured result logging. All cron endpoints migrated to use
the wrapper.
```
