# 12 — Enrich Sentry with User Context, Custom Tags, and Breadcrumbs

## Severity: HIGH
## Estimated Hours: 2-3

---

## Context

Sentry is configured but has no user context, no custom tags, and no breadcrumbs. When errors occur in production, you get a stack trace but no idea which user, organization, or facility was involved — making debugging nearly impossible.

---

## Step 1: Locate Sentry Configuration

```bash
grep -rn "sentry\|Sentry\|@sentry" src/ --include="*.ts" --include="*.tsx" -l | sort
find src -name "sentry*" -o -name "*sentry*" | sort
cat next.config.js 2>/dev/null | grep -i sentry
cat next.config.mjs 2>/dev/null | grep -i sentry
```

Identify:
- `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts`
- Any `instrumentation.ts` files
- The `@sentry/nextjs` import locations

---

## Step 2: Add User Context to Server-Side Sentry

In the server-side Sentry config or in a middleware/wrapper, set user context after authentication:

Create or update `src/lib/sentry-context.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

export function setSentryUser(user: {
  id: string;
  email?: string;
  orgId?: string;
  orgName?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });

  if (user.orgId) {
    Sentry.setTag('org_id', user.orgId);
    Sentry.setTag('org_name', user.orgName || 'unknown');
  }
}

export function setSentryFacility(facilityId: string, facilityName?: string) {
  Sentry.setTag('facility_id', facilityId);
  if (facilityName) {
    Sentry.setTag('facility_name', facilityName);
  }
}

export function clearSentryUser() {
  Sentry.setUser(null);
}
```

---

## Step 3: Wire User Context into Auth Flow

Find where authentication/session validation happens:

```bash
grep -rn "getAuth\|currentUser\|validateSession\|requireAuth" src/ --include="*.ts" -l
```

After each successful authentication, call `setSentryUser`:

```typescript
import { setSentryUser } from '@/lib/sentry-context';

// After Clerk auth resolves:
const { userId, orgId } = auth();
if (userId) {
  setSentryUser({ id: userId, orgId: orgId ?? undefined });
}
```

---

## Step 4: Add Custom Tags for Every API Route

Create a middleware or wrapper that sets route-level tags:

```typescript
import * as Sentry from '@sentry/nextjs';

export function setSentryRouteContext(req: NextRequest) {
  Sentry.setTag('route', req.nextUrl.pathname);
  Sentry.setTag('method', req.method);

  // Add request ID for correlation
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  Sentry.setTag('request_id', requestId);
}
```

Call this at the top of every API route handler, or add it to the Next.js middleware.

---

## Step 5: Add Breadcrumbs for Key Operations

Add breadcrumbs before important operations so the trail is visible in Sentry when an error occurs:

```typescript
import * as Sentry from '@sentry/nextjs';

// Before database operations
Sentry.addBreadcrumb({
  category: 'db',
  message: `Query: ${modelName}.${operation}`,
  level: 'info',
  data: { model: modelName, operation, filters: JSON.stringify(where) },
});

// Before external API calls
Sentry.addBreadcrumb({
  category: 'http',
  message: `External API: ${service}`,
  level: 'info',
  data: { service, endpoint, method },
});

// Before Stripe operations
Sentry.addBreadcrumb({
  category: 'payment',
  message: `Stripe: ${operation}`,
  level: 'info',
  data: { operation, customerId },
});
```

---

## Step 6: Configure Sentry Performance Monitoring

In `sentry.server.config.ts` (or equivalent):

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% of transactions (adjust based on volume)
  profilesSampleRate: 0.1,

  // Tag every transaction with environment
  environment: process.env.NODE_ENV,

  // Filter out noisy errors
  ignoreErrors: [
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],

  // Before sending, enrich with additional context
  beforeSend(event) {
    // Scrub sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
});
```

---

## Step 7: Add Error Boundary Context (Client-Side)

If using React error boundaries, enrich them with component context:

```bash
grep -rn "ErrorBoundary\|error.boundary\|componentDidCatch" src/ --include="*.tsx" -l
```

For each error boundary, add Sentry reporting:

```typescript
import * as Sentry from '@sentry/nextjs';

// In the error boundary's componentDidCatch or equivalent:
Sentry.captureException(error, {
  tags: {
    component: 'FacilityDashboard', // Name of the component tree
    tab: activeTab,                  // Which tab was active
  },
  extra: {
    facilityId,
    componentStack: errorInfo?.componentStack,
  },
});
```

---

## Verification

```bash
# 1. Sentry user context is set after auth
grep -rn "setSentryUser\|Sentry.setUser" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules\|sentry-context"
# Expected: At least one match in auth flow

# 2. Custom tags are set
grep -rn "Sentry.setTag" src/ --include="*.ts" --include="*.tsx" | wc -l
# Expected: > 5

# 3. Breadcrumbs are added
grep -rn "Sentry.addBreadcrumb" src/ --include="*.ts" --include="*.tsx" | wc -l
# Expected: > 0

# 4. Sensitive headers are scrubbed
grep -rn "beforeSend" src/ --include="*.ts" | grep -i sentry
# Expected: At least one match

# 5. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 12 enrich Sentry with user context, tags, and breadcrumbs

Set user ID, org ID, facility ID, route, and request ID on all
Sentry events. Add breadcrumbs for DB operations, external API
calls, and Stripe operations. Scrub auth headers from reports.
```
