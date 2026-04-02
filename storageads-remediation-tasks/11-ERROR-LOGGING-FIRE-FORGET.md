# 11 — Add Structured Error Logging to Fire-and-Forget Operations

## Severity: HIGH
## Estimated Hours: 2-3

---

## Context

Multiple operations use `.catch(() => {})` to silently swallow errors. When these operations fail, nothing is logged, no alert is sent, and the failure is invisible. This makes debugging production issues nearly impossible.

---

## Step 1: Find All Silent Error Swallowing

```bash
# Empty catch blocks
grep -rn "\.catch\s*(\s*(\s*)\s*=>\s*{\s*}\s*)\|\.catch\s*(\s*(\s*)\s*=>\s*{})" src/ --include="*.ts" --include="*.tsx"

# Catch with no body
grep -rn "\.catch\s*(\s*\(\s*\)\s*=>\s*{\s*})" src/ --include="*.ts" --include="*.tsx"

# Also search for catch blocks that only have comments
grep -rn "\.catch" src/ --include="*.ts" --include="*.tsx" -A2 | grep -B1 "// \|/\*"

# And try-catch with empty catch
grep -rn "catch\s*(\w*)\s*{\s*}" src/ --include="*.ts" --include="*.tsx"

# Broader search for any silent catches
grep -rn "catch.*{}" src/ --include="*.ts" --include="*.tsx"
```

Record every file and line number.

---

## Step 2: Create a Structured Logger

Create `src/lib/logger.ts`:

```typescript
type LogContext = {
  operation: string;       // What was being attempted
  route?: string;          // API route path
  userId?: string;         // User who triggered it
  orgId?: string;          // Organization context
  facilityId?: string;     // Facility context
  metadata?: Record<string, unknown>;  // Additional context
};

export function logError(error: unknown, context: LogContext): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const logEntry = {
    level: 'error',
    timestamp: new Date().toISOString(),
    message: errorMessage,
    stack: errorStack,
    ...context,
  };

  console.error(JSON.stringify(logEntry));

  // If Sentry is configured, also report there
  if (typeof globalThis !== 'undefined') {
    try {
      const Sentry = require('@sentry/nextjs');
      Sentry.captureException(error, {
        tags: {
          operation: context.operation,
          route: context.route,
        },
        extra: context.metadata,
      });
    } catch {
      // Sentry not available, console.error is sufficient
    }
  }
}

export function logWarning(message: string, context: LogContext): void {
  const logEntry = {
    level: 'warn',
    timestamp: new Date().toISOString(),
    message,
    ...context,
  };

  console.warn(JSON.stringify(logEntry));
}

// For fire-and-forget operations that are non-critical
export function fireAndForget(
  promise: Promise<unknown>,
  context: LogContext
): void {
  promise.catch((error) => logError(error, context));
}
```

---

## Step 3: Replace Every Silent Catch

For each instance found in Step 1, replace the empty catch with proper logging.

**Pattern 1: `.catch(() => {})` on a fire-and-forget Promise**

Before:
```typescript
prisma.activity_log.create({ data: logEntry }).catch(() => {});
```

After:
```typescript
import { fireAndForget } from '@/lib/logger';

fireAndForget(
  prisma.activity_log.create({ data: logEntry }),
  { operation: 'activity_log.create', route: '/api/some-route' }
);
```

**Pattern 2: try-catch with empty catch block**

Before:
```typescript
try {
  await sendEmail(to, subject, body);
} catch (e) {
  // ignore
}
```

After:
```typescript
import { logError } from '@/lib/logger';

try {
  await sendEmail(to, subject, body);
} catch (error) {
  logError(error, {
    operation: 'sendEmail',
    route: '/api/some-route',
    metadata: { to, subject },
  });
}
```

**Pattern 3: `.catch(() => {})` where the error matters**

If the operation's failure should affect the response (not truly fire-and-forget), convert it to a proper await with error handling:

Before:
```typescript
updateAnalytics(userId).catch(() => {});
return NextResponse.json({ success: true });
```

After (if analytics failure is OK):
```typescript
fireAndForget(
  updateAnalytics(userId),
  { operation: 'updateAnalytics', userId }
);
return NextResponse.json({ success: true });
```

After (if analytics failure should be logged but not block response):
```typescript
try {
  await updateAnalytics(userId);
} catch (error) {
  logError(error, { operation: 'updateAnalytics', userId });
  // Continue — don't fail the request
}
return NextResponse.json({ success: true });
```

---

## Step 4: Verify No Silent Catches Remain

After all replacements:

```bash
# No empty catch blocks
grep -rn "catch\s*(\s*)\s*=>\s*{\s*}" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v logger.ts
grep -rn "catch\s*(\w*)\s*{\s*}" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v logger.ts

# No .catch(() => {}) or .catch(()=>{})
grep -rn "\.catch\s*(\s*(\s*)\s*=>\s*{\s*})" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v logger.ts
```

---

## Verification

```bash
# 1. Logger utility exists
test -f src/lib/logger.ts && echo "OK" || echo "MISSING"
# Expected: OK

# 2. No silent catches remain
grep -rn "catch.*=>\s*{\s*}" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v logger | grep -v "logError\|logWarning\|fireAndForget\|console\.\|Sentry"
# Expected: No output

# 3. Logger is imported where needed
grep -rn "from.*logger\|fireAndForget\|logError" src/app/api/ --include="*.ts" | wc -l
# Expected: > 0

# 4. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 11 replace all silent .catch(() => {}) with structured error logging

Create centralized logger with Sentry integration. All fire-and-forget
operations now log errors with operation context, route, and user info.
Zero silent error swallowing remains in codebase.
```
