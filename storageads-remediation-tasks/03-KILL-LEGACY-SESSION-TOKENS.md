# 03 — Kill Legacy Base64 Session Tokens

## Severity: CRITICAL
## Estimated Hours: 2-3

---

## Context

The file `session-auth.ts` (approximately line 140) accepts a legacy session token format: a base64-encoded `orgId:email` string. Both values are guessable and enumerable. Any attacker who knows (or guesses) an organization ID and a user email can forge a valid session. This backdoor is reportedly intended to remain until June 2026. That timeline is unacceptable — kill it now.

---

## Step 1: Locate the Legacy Token Logic

```bash
grep -rn "base64\|Buffer.from\|atob\|btoa\|legacy.*session\|legacy.*token\|orgId.*email\|session-auth" src/ --include="*.ts" --include="*.tsx"
```

Find the exact file and function that:
1. Accepts a session token
2. Decodes it from base64
3. Splits it into `orgId` and `email`
4. Treats that as a valid authenticated session

Record the exact file path, function name, and line numbers.

---

## Step 2: Understand All Token Validation Paths

Map every code path that validates sessions. Search for:

```bash
grep -rn "validateSession\|verifySession\|getSession\|checkAuth\|authenticate\|currentUser\|requireAuth" src/ --include="*.ts" --include="*.tsx" -l
```

For each file found, identify:
- Does it call the legacy token path?
- Does it fall through to legacy validation if Clerk auth fails?
- Is the legacy path a fallback or a separate entry point?

Draw a clear picture of: Clerk auth → [fallback?] → legacy base64 auth → [return user]

---

## Step 3: Remove the Legacy Token Path Entirely

In the session validation function:

1. **Delete** the entire code block that handles base64 token decoding.
2. **Delete** any conditional like `if (isLegacyToken(token))` or `if (!clerkSession) { /* try legacy */ }`.
3. **Delete** any helper functions that only exist to support the legacy path (e.g., `decodeLegacyToken`, `isLegacyFormat`, etc.).
4. If the legacy path returns a differently-shaped user object, ensure the Clerk-only path returns the same shape so downstream code doesn't break.

**Do not** leave the code commented out. Delete it completely.

---

## Step 4: Remove Any Legacy Token Generation

Search for any code that creates or issues legacy tokens:

```bash
grep -rn "base64\|Buffer.from.*orgId\|btoa.*orgId\|createLegacyToken\|generateLegacySession" src/ --include="*.ts" --include="*.tsx"
```

Delete all token generation code for the legacy format.

---

## Step 5: Invalidate Any Stored Legacy Tokens

If legacy tokens are stored in a database table (e.g., `sessions` table):

1. Identify the table and column that stores session tokens.
2. Write a migration or script that deletes all rows where the token matches the legacy base64 format.
3. If there's a `token_type` or `auth_method` column, delete all rows with the legacy type.

If legacy tokens are only stored client-side (cookies/localStorage), they will naturally fail on the next request since the server no longer accepts them. This is fine — users will be redirected to re-authenticate via Clerk.

---

## Step 6: Update Any Documentation or Comments

Search for comments referencing the legacy system:

```bash
grep -rn "legacy\|June 2026\|backward.compat\|old.*session\|deprecated.*token" src/ --include="*.ts" --include="*.tsx"
```

Remove or update any comments that reference the legacy token system, the June 2026 deprecation timeline, or backward compatibility for old sessions.

---

## Step 7: Ensure Clerk Is the Only Auth Path

After removal, verify that every authentication check flows exclusively through Clerk:

```bash
# All auth-related files should only reference Clerk
grep -rn "getAuth\|currentUser\|auth()\|clerkClient\|@clerk" src/ --include="*.ts" --include="*.tsx" -l | sort
```

There should be no remaining auth path that doesn't go through Clerk.

---

## Verification

```bash
# 1. No base64 session decoding anywhere
grep -rn "atob\|btoa\|Buffer.from.*split.*:\|decodeLegacy\|legacyToken\|legacy.*session" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."
# Expected: No output (or only test mocks, no production code)

# 2. No references to the June 2026 deprecation
grep -rn "June 2026\|2026.*legacy\|legacy.*deprecat" src/ --include="*.ts" --include="*.tsx"
# Expected: No output

# 3. session-auth.ts (or equivalent) only uses Clerk
grep -n "base64\|Buffer.from\|atob" src/**/session-auth.ts
# Expected: No output

# 4. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors

# 5. TypeScript compiles clean
npx tsc --noEmit 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 03 remove legacy base64 session tokens

Remove forgeable orgId:email base64 session token path from
session-auth.ts. All authentication now flows exclusively through
Clerk. Legacy tokens in client storage will fail and redirect to
Clerk login. Eliminates session forgery attack vector.
```
