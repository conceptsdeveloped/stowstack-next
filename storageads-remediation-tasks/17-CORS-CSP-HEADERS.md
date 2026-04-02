# 17 — Fix CORS Fallback Behavior and Add Content Security Policy

## Severity: MEDIUM
## Estimated Hours: 2-3

---

## Context

CORS falls back to an allowed origin instead of rejecting unknown origins. No Content Security Policy exists (allows `unsafe-eval`).

---

## Step 1: Find CORS Configuration

```bash
grep -rn "cors\|CORS\|Access-Control\|allowedOrigins\|origin" src/ --include="*.ts" -l
grep -rn "cors\|CORS" next.config.* 2>/dev/null
```

---

## Step 2: Fix CORS to Reject Unknown Origins

Find the CORS handler. It should reject requests from unknown origins rather than falling back to a default allowed origin.

```typescript
const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_APP_URL,
  // Add any other legitimate origins
].filter(Boolean));

function getCorsOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  if (ALLOWED_ORIGINS.has(requestOrigin)) return requestOrigin;
  return null; // REJECT — do NOT fall back to a default
}

// In the response:
const origin = getCorsOrigin(req.headers.get('origin'));
if (origin) {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Vary', 'Origin');
} else if (req.headers.get('origin')) {
  // Origin was present but not allowed — block it
  return new NextResponse(null, { status: 403 });
}
```

---

## Step 3: Add Content Security Policy

Add CSP headers in `next.config.js` or middleware:

```typescript
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://connect.facebook.net https://cdnjs.cloudflare.com",
  // Remove 'unsafe-eval' — if something breaks, fix the source, don't weaken CSP
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.stripe.com https://*.googleapis.com https://*.gstatic.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://api.stripe.com https://*.sentry.io https://*.upstash.io https://*.clerk.com https://*.facebook.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

// In next.config.js headers():
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: cspHeader },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '0' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ];
}
```

Adjust the CSP directives based on which external services the app actually uses. Test thoroughly — CSP violations will break functionality if too restrictive.

---

## Step 4: Test CSP in Report-Only Mode First

Before enforcing, use report-only mode to catch violations without breaking the app:

```typescript
{ key: 'Content-Security-Policy-Report-Only', value: cspHeader }
```

Check browser console for CSP violation reports. Fix each violation by:
1. Adding the legitimate source to the CSP
2. OR refactoring the code to not need the blocked source

Once clean, switch to enforcing mode (`Content-Security-Policy`).

---

## Verification

```bash
# 1. CORS does not fall back to default origin
grep -rn "Access-Control-Allow-Origin" src/ --include="*.ts" | grep -v "node_modules"
# Expected: Origin is dynamically set from allowlist, not hardcoded fallback

# 2. CSP header is configured
grep -rn "Content-Security-Policy" src/ next.config.* --include="*.ts" --include="*.js" --include="*.mjs"
# Expected: At least one match

# 3. unsafe-eval is NOT in CSP
grep -rn "unsafe-eval" src/ next.config.* --include="*.ts" --include="*.js" --include="*.mjs"
# Expected: No matches (or only in comments)

# 4. Build passes
npm run build 2>&1 | tail -5
```

---

## Commit

```
fix: 17 fix CORS origin fallback, add Content Security Policy

CORS now rejects unknown origins instead of falling back to default.
Add CSP headers blocking unsafe-eval, restricting script/connect
sources to known services. Add security headers (X-Content-Type-Options,
X-Frame-Options, Referrer-Policy, Permissions-Policy).
```
