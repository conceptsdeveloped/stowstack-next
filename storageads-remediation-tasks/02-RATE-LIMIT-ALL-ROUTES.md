# 02 — Rate Limit All Unprotected API Routes

## Severity: CRITICAL
## Estimated Hours: 4-5

---

## Context

The codebase has a solid Upstash Redis sliding window rate limiter (`rate-limit.ts`), but it is only applied to ~40% of sensitive endpoints. ~32 routes — including ones that call Anthropic API and create Stripe customers — are unprotected. An attacker can rack up thousands in API costs overnight.

---

## Step 1: Inventory All API Routes

Run a full inventory of every API route in the project:

```bash
find src/app/api -name "route.ts" -o -name "route.js" | sort
```

For each route, record:
- HTTP methods exported (GET, POST, PUT, DELETE, PATCH)
- Whether it calls an external paid service (Anthropic, Stripe, SendGrid, Twilio, etc.)
- Whether it currently has rate limiting applied
- Whether it requires authentication

---

## Step 2: Locate the Existing Rate Limiter

Find the rate limiting utility:

```bash
grep -rn "rate-limit\|rateLimit\|rateLimiter\|sliding.window\|upstash" src/lib/ src/utils/ src/middleware/ --include="*.ts"
```

Understand the existing implementation. It should be an Upstash Redis sliding window. Note:
- The function signature (what arguments it takes)
- How it identifies callers (IP? User ID? API key?)
- What response it returns when rate limited (should be 429)

---

## Step 3: Define Rate Limit Tiers

Create or update `src/lib/rate-limit-tiers.ts`:

```typescript
export const RATE_LIMIT_TIERS = {
  // Routes calling expensive external APIs (Anthropic, OpenAI, etc.)
  EXPENSIVE_API: {
    requests: 10,
    window: '1m',   // 10 requests per minute
  },
  // Routes creating billable resources (Stripe checkout, subscriptions)
  BILLING: {
    requests: 5,
    window: '1m',   // 5 requests per minute
  },
  // Standard authenticated routes
  AUTHENTICATED: {
    requests: 60,
    window: '1m',   // 60 requests per minute
  },
  // Public routes (contact form, lead capture)
  PUBLIC_WRITE: {
    requests: 10,
    window: '1m',   // 10 requests per minute
  },
  // Public read routes (blog, pricing page data)
  PUBLIC_READ: {
    requests: 120,
    window: '1m',   // 120 requests per minute
  },
  // Webhook routes (Stripe, Meta, etc.) — higher limit, keyed by source
  WEBHOOK: {
    requests: 200,
    window: '1m',   // 200 requests per minute
  },
} as const;
```

---

## Step 4: Create a Rate Limit Middleware Wrapper

Create `src/lib/with-rate-limit.ts` (or update existing):

```typescript
import { NextRequest, NextResponse } from 'next/server';
// Import your existing rate limiter
// Adapt this import to match your actual file structure

type RateLimitTier = {
  requests: number;
  window: string;
};

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  tier: RateLimitTier,
  keyExtractor?: (req: NextRequest) => string
) {
  return async (req: NextRequest) => {
    const key = keyExtractor
      ? keyExtractor(req)
      : req.headers.get('x-forwarded-for') ?? req.ip ?? 'anonymous';

    // Call your existing rate limiter here
    // If rate limited, return 429:
    // return NextResponse.json(
    //   { error: 'Too many requests. Please try again later.' },
    //   { status: 429, headers: { 'Retry-After': '60' } }
    // );

    return handler(req);
  };
}
```

**Important:** Adapt this wrapper to use whatever rate limiting implementation already exists in the codebase. Do not create a duplicate. Wire into the existing Upstash setup.

---

## Step 5: Apply Rate Limiting to Every Unprotected Route

For each route found in Step 1, apply the appropriate rate limit tier.

### Priority 1 — Expensive API Routes (MUST DO FIRST)

Search for routes calling external paid services:

```bash
grep -rn "anthropic\|openai\|claude\|gpt\|sendgrid\|twilio\|stripe" src/app/api/ --include="route.ts" -l
```

For each of these routes:
1. Import the rate limit wrapper
2. Wrap the handler with the `EXPENSIVE_API` or `BILLING` tier
3. Ensure the rate limit key includes user identification (not just IP) when auth is available

Specific routes to find and protect (non-exhaustive — search for ALL):
- `POST /api/diagnostic-analyze` → `EXPENSIVE_API` tier
- `POST /api/create-checkout-session` → `BILLING` tier
- Any route calling Anthropic API → `EXPENSIVE_API` tier
- Any route creating Stripe resources → `BILLING` tier
- Any route sending emails via SendGrid → `PUBLIC_WRITE` tier
- Any route sending SMS via Twilio → `PUBLIC_WRITE` tier

### Priority 2 — All Remaining POST/PUT/DELETE/PATCH Routes

Every state-changing endpoint must have rate limiting. Apply `AUTHENTICATED` tier to authenticated routes, `PUBLIC_WRITE` tier to unauthenticated write routes.

### Priority 3 — Public GET Routes

Apply `PUBLIC_READ` tier to all public GET endpoints.

### Priority 4 — Webhook Routes

Apply `WEBHOOK` tier to all webhook handlers (Stripe, Meta CAPI, etc.), keyed by source IP or webhook signature header rather than end-user IP.

---

## Step 6: Add Rate Limit Headers to All Responses

Ensure every rate-limited response includes standard headers:

```
X-RateLimit-Limit: [max requests]
X-RateLimit-Remaining: [requests left]
X-RateLimit-Reset: [unix timestamp]
Retry-After: [seconds] (only on 429 responses)
```

---

## Step 7: Test Rate Limit Behavior

For each protected route, verify:
1. Normal requests succeed
2. Exceeding the limit returns 429 with `Retry-After` header
3. After the window expires, requests succeed again

---

## Verification

```bash
# 1. Every API route file must import or reference rate limiting
TOTAL_ROUTES=$(find src/app/api -name "route.ts" | wc -l)
RATE_LIMITED=$(grep -rl "rateLimit\|withRateLimit\|rate-limit\|rateLimiter" src/app/api/ --include="route.ts" | wc -l)
echo "Routes: $TOTAL_ROUTES, Rate limited: $RATE_LIMITED"
# Expected: Numbers should be equal or very close

# 2. No unprotected expensive API calls
grep -rn "anthropic\|openai\|stripe" src/app/api/ --include="route.ts" -l | while read f; do
  if ! grep -q "rateLimit\|withRateLimit\|rate-limit" "$f"; then
    echo "UNPROTECTED: $f"
  fi
done
# Expected: No output

# 3. Rate limit tiers file exists
test -f src/lib/rate-limit-tiers.ts && echo "OK" || echo "MISSING"
# Expected: OK

# 4. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 02 apply rate limiting to all API routes

Wire existing Upstash rate limiter to all 172 API routes with
tiered limits: EXPENSIVE_API (10/min), BILLING (5/min),
AUTHENTICATED (60/min), PUBLIC_WRITE (10/min), PUBLIC_READ (120/min).
Prevents API cost abuse on Anthropic/Stripe endpoints.
```
