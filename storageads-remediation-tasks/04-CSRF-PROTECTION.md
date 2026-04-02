# 04 — Add CSRF Protection to All State-Changing Endpoints

## Severity: CRITICAL
## Estimated Hours: 3-4

---

## Context

The platform uses cookie/header-based sessions for partner/portal authentication. No CSRF tokens exist anywhere in the codebase. A malicious site can craft a form or fetch request that triggers state-changing API calls on behalf of a logged-in user — creating facilities, changing settings, modifying billing, etc.

---

## Step 1: Choose a CSRF Strategy

For a Next.js App Router application with Clerk auth, the recommended approach is the **Double Submit Cookie + Custom Header** pattern:

1. Server generates a random CSRF token and sets it as a cookie (`__csrf`, `SameSite=Strict`, `HttpOnly=false` so JS can read it).
2. Client reads the cookie and sends it as a custom header (`X-CSRF-Token`) with every state-changing request.
3. Server compares cookie value to header value. If they don't match → 403.

This works because an attacker on a different origin cannot read the cookie to include it as a header.

---

## Step 2: Create the CSRF Utility

Create `src/lib/csrf.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = '__csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

// Generate a new CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// Set CSRF cookie on a response
export function setCsrfCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by client JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return response;
}

// Validate CSRF token from request
export function validateCsrf(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== CSRF_TOKEN_LENGTH * 2) return false;

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  } catch {
    return false;
  }
}

// Methods that require CSRF validation
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function requiresCsrf(method: string): boolean {
  return STATE_CHANGING_METHODS.has(method.toUpperCase());
}
```

---

## Step 3: Add CSRF Validation to Middleware

Locate the existing Next.js middleware file:

```bash
find src -name "middleware.ts" -o -name "middleware.js" | head -5
```

Add CSRF validation to the middleware. Insert it AFTER authentication checks but BEFORE route handling:

```typescript
import { validateCsrf, requiresCsrf, generateCsrfToken, setCsrfCookie } from '@/lib/csrf';

// Inside the middleware function:

// Skip CSRF for:
// 1. Webhook routes (they use their own signature verification)
// 2. Public GET/HEAD/OPTIONS requests
// 3. Routes that use API key auth (not cookie-based)
const isWebhook = req.nextUrl.pathname.startsWith('/api/webhooks/');
const isApiKeyAuth = req.headers.get('authorization')?.startsWith('Bearer ');

if (requiresCsrf(req.method) && !isWebhook && !isApiKeyAuth) {
  if (!validateCsrf(req)) {
    return NextResponse.json(
      { error: 'Invalid or missing CSRF token' },
      { status: 403 }
    );
  }
}

// Ensure CSRF cookie exists on every response
// (set on GET requests so the client has a token for subsequent POSTs)
const response = NextResponse.next();
if (!req.cookies.get('__csrf_token')) {
  setCsrfCookie(response, generateCsrfToken());
}
```

---

## Step 4: Update the Client-Side Fetch Wrapper

Find the existing fetch wrapper or API client utility:

```bash
grep -rn "fetch(\|axios\|apiClient\|fetchApi\|useFetch" src/lib/ src/utils/ src/hooks/ --include="*.ts" --include="*.tsx" -l
```

Update it to automatically include the CSRF header on all state-changing requests:

```typescript
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(^|;)\s*__csrf_token=([^;]+)/);
  return match ? match[2] : null;
}

// In your fetch wrapper, add to headers:
const csrfToken = getCsrfToken();
if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
  headers['X-CSRF-Token'] = csrfToken;
}
```

If there is no centralized fetch wrapper and components call `fetch()` directly, create one:

```typescript
// src/lib/api-client.ts
export async function apiRequest(url: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  return fetch(url, { ...options, headers });
}
```

Then search the entire codebase for direct `fetch('/api/` calls and replace them with the wrapper:

```bash
grep -rn "fetch('/api/\|fetch(\"/api/\|fetch(\`/api/" src/ --include="*.ts" --include="*.tsx" -l
```

---

## Step 5: Exempt Webhook Routes from CSRF

Webhook routes (Stripe, Meta, etc.) use signature verification, not cookies. They must be excluded from CSRF checks.

Verify that the middleware exemption from Step 3 covers all webhook paths:

```bash
find src/app/api -path "*/webhook*" -name "route.ts" | sort
```

Every path listed must be covered by the `isWebhook` check.

---

## Step 6: Exempt Server-to-Server API Key Routes

If any routes accept Bearer token authentication (API keys, cron job secrets), they should also be exempt from CSRF since they don't use cookie-based auth:

```bash
grep -rn "authorization.*Bearer\|x-api-key\|CRON_SECRET" src/app/api/ --include="route.ts" -l
```

Ensure these are covered by the `isApiKeyAuth` check.

---

## Step 7: Handle CSRF Token Refresh

The CSRF token cookie has a 24-hour TTL. If a user's token expires mid-session, their next POST will fail with 403. Handle this gracefully:

In the API client wrapper, if a request returns 403 with a CSRF error:
1. Make a GET request to any page to get a fresh CSRF cookie
2. Retry the original request once with the new token
3. If it fails again, surface the error to the user

---

## Verification

```bash
# 1. CSRF utility exists
test -f src/lib/csrf.ts && echo "OK" || echo "MISSING"
# Expected: OK

# 2. Middleware references CSRF
grep -n "csrf\|CSRF" src/middleware.ts
# Expected: Multiple matches

# 3. All state-changing fetch calls use the wrapper or include CSRF header
# Count direct fetch POST calls that don't include csrf
grep -rn "fetch('/api/\|fetch(\"/api/" src/ --include="*.tsx" --include="*.ts" | grep -i "post\|put\|patch\|delete" | grep -v "csrf\|apiRequest\|apiClient" | grep -v node_modules
# Expected: No output (all calls should go through the wrapper)

# 4. Webhook routes are exempt
grep -n "webhook\|isWebhook" src/middleware.ts
# Expected: At least one match showing webhook exemption

# 5. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 04 add CSRF protection to all state-changing endpoints

Implement double-submit cookie CSRF protection. All POST/PUT/PATCH/DELETE
requests must include X-CSRF-Token header matching __csrf_token cookie.
Webhook and API-key-authenticated routes are exempt. Client fetch wrapper
auto-includes CSRF token on state-changing requests.
```
