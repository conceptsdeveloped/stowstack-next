# 13 — Add Startup Validation for All Required Environment Variables

## Severity: LOW (but prevents cryptic runtime errors)
## Estimated Hours: 2-3

---

## Context

No env var validation exists at startup. If a required variable is missing, the app boots and then crashes with cryptic errors deep in business logic (e.g., "Cannot read property of undefined" when Stripe key is missing).

---

## Step 1: Inventory All Environment Variables

```bash
# Find every process.env reference
grep -rn "process\.env\.\w\+" src/ --include="*.ts" --include="*.tsx" -oh | sort | uniq

# Also check config files
grep -rn "process\.env\.\w\+" next.config.* --include="*.js" --include="*.mjs" --include="*.ts" -oh 2>/dev/null | sort | uniq

# Check .env.example if it exists
cat .env.example 2>/dev/null
```

Build a complete list of every env var used.

---

## Step 2: Classify Each Variable

For each env var, classify:

**REQUIRED (app cannot function without it):**
- Database URL (`DATABASE_URL`)
- Clerk keys (`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`)
- Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- Sentry DSN (`SENTRY_DSN`)
- Upstash Redis (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
- App URL (`NEXT_PUBLIC_APP_URL`)

**REQUIRED for specific features:**
- Anthropic API key (diagnostic tool)
- SendGrid / email keys
- Twilio keys
- Meta/Facebook keys (CAPI)
- Cron secret (`CRON_SECRET`)

**OPTIONAL (app works without it, feature degrades gracefully):**
- Analytics keys
- Feature flags

---

## Step 3: Create the Validation Module

Create `src/lib/env.ts`:

```typescript
import { z } from 'zod';

// If zod is not installed, install it: npm install zod

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Clerk Auth
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Cron
  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),

  // Optional — add all other env vars found in Step 1
  // Use .optional() for non-critical vars
  SENTRY_DSN: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Add ALL remaining env vars here, classified as required or optional
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');

    console.error(`\n❌ Environment validation failed:\n${errors}\n`);

    // In production, crash immediately — don't serve requests with broken config
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing or invalid environment variables:\n${errors}`);
    }

    // In development, warn loudly but don't crash
    console.warn('⚠️  Continuing with missing env vars in development mode.\n');
  }

  validatedEnv = (result.success ? result.data : process.env) as Env;
  return validatedEnv;
}

// Export validated env for type-safe access
export const env = validateEnv();
```

---

## Step 4: Call Validation at Startup

Add validation to the app's entry point. In Next.js App Router:

**Option A — `instrumentation.ts` (preferred for Next.js 14+):**

```typescript
// src/instrumentation.ts
export async function register() {
  const { validateEnv } = await import('@/lib/env');
  validateEnv();
}
```

Make sure `next.config` has instrumentation enabled:
```javascript
// next.config.js / next.config.mjs
experimental: {
  instrumentationHook: true,
}
```

**Option B — Import in layout.tsx (simpler):**

```typescript
// src/app/layout.tsx — add at the top
import '@/lib/env'; // Side effect: validates env on first import
```

---

## Step 5: Replace Direct `process.env` Access

Throughout the codebase, replace `process.env.STRIPE_SECRET_KEY` with `env.STRIPE_SECRET_KEY` from the validated module. This provides type safety and compile-time checking.

This is a large refactor and can be done incrementally. At minimum, update the most critical files:

```bash
# Files that use Stripe
grep -rn "process.env.STRIPE" src/ --include="*.ts" -l

# Files that use Clerk
grep -rn "process.env.CLERK" src/ --include="*.ts" -l

# Files that use database
grep -rn "process.env.DATABASE" src/ --include="*.ts" -l
```

---

## Step 6: Update `.env.example`

Create or update `.env.example` with every required variable and helpful comments:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Clerk Authentication
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# ... etc for every variable
```

---

## Verification

```bash
# 1. Env validation module exists
test -f src/lib/env.ts && echo "OK" || echo "MISSING"
# Expected: OK

# 2. Validation runs at startup
grep -rn "validateEnv\|import.*env" src/instrumentation.ts src/app/layout.tsx 2>/dev/null
# Expected: At least one match

# 3. .env.example is comprehensive
ENV_COUNT=$(grep -c "process\.env\.\w\+" src/ -r --include="*.ts" --include="*.tsx" -oh 2>/dev/null | sort -u | wc -l)
EXAMPLE_COUNT=$(grep -c "=" .env.example 2>/dev/null || echo "0")
echo "Env vars used: $ENV_COUNT, Documented in .env.example: $EXAMPLE_COUNT"
# Expected: Numbers should be close

# 4. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 13 add startup env var validation with zod schema

Validate all required environment variables at startup with clear
error messages. App crashes immediately in production if critical
vars are missing. Development mode warns but continues.
```
