# 10 — Replace Shared Admin Secret with Per-Admin API Keys

## Severity: CRITICAL
## Estimated Hours: 3-4

---

## Context

A single shared admin secret is used for all admin authentication. No per-admin keys, no key rotation, no audit trail of which admin performed which action. If the secret leaks, all admin access is compromised with no way to revoke a single admin's access.

---

## Step 1: Find the Shared Secret

```bash
grep -rn "ADMIN_SECRET\|ADMIN_API_KEY\|ADMIN_TOKEN\|adminSecret\|admin.*auth\|isAdmin" src/ --include="*.ts" --include="*.tsx"
grep -rn "ADMIN" .env .env.local .env.example 2>/dev/null
```

Record:
- The environment variable name
- Every file that checks it
- How it's compared (exact match? header? query param?)

---

## Step 2: Create an Admin Keys Model

Add to `prisma/schema.prisma`:

```prisma
model admin_api_keys {
  id          String    @id @default(cuid())
  key_hash    String    @unique        // SHA-256 hash of the key (never store plaintext)
  key_prefix  String                    // First 8 chars for identification (e.g., "sa_adm_1a2b3c4d")
  admin_email String                   // Which admin this key belongs to
  label       String?                  // Optional label (e.g., "Blake's laptop", "CI/CD")
  permissions String[]  @default([])   // Optional: granular permissions
  last_used   DateTime?
  expires_at  DateTime?                // Optional expiration
  revoked_at  DateTime?                // Soft revoke (null = active)
  created_at  DateTime  @default(now())

  @@index([key_hash])
  @@index([admin_email])
}
```

Create the migration:

```bash
npx prisma migrate dev --name add-admin-api-keys
npx prisma generate
```

---

## Step 3: Create Admin Key Utilities

Create `src/lib/admin-keys.ts`:

```typescript
import crypto from 'crypto';
import { prisma } from '@/lib/prisma'; // Adjust import path

const KEY_PREFIX = 'sa_adm_';

// Generate a new admin API key (returns plaintext key — only shown once)
export async function createAdminKey(adminEmail: string, label?: string): Promise<string> {
  const rawKey = crypto.randomBytes(32).toString('hex');
  const fullKey = `${KEY_PREFIX}${rawKey}`;
  const keyHash = hashKey(fullKey);
  const keyPrefix = fullKey.substring(0, KEY_PREFIX.length + 8);

  await prisma.admin_api_keys.create({
    data: {
      key_hash: keyHash,
      key_prefix: keyPrefix,
      admin_email: adminEmail,
      label,
    },
  });

  return fullKey; // Return plaintext — caller must display it once and never store it
}

// Validate an admin API key
export async function validateAdminKey(key: string): Promise<{
  valid: boolean;
  adminEmail?: string;
  keyId?: string;
}> {
  if (!key.startsWith(KEY_PREFIX)) {
    return { valid: false };
  }

  const keyHash = hashKey(key);
  const record = await prisma.admin_api_keys.findUnique({
    where: { key_hash: keyHash },
  });

  if (!record || record.revoked_at) {
    return { valid: false };
  }

  if (record.expires_at && record.expires_at < new Date()) {
    return { valid: false };
  }

  // Update last_used timestamp (fire-and-forget is OK here)
  prisma.admin_api_keys.update({
    where: { id: record.id },
    data: { last_used: new Date() },
  }).catch(() => {}); // Non-critical

  return {
    valid: true,
    adminEmail: record.admin_email,
    keyId: record.id,
  };
}

// Revoke a key
export async function revokeAdminKey(keyId: string): Promise<void> {
  await prisma.admin_api_keys.update({
    where: { id: keyId },
    data: { revoked_at: new Date() },
  });
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
```

---

## Step 4: Replace All Shared Secret Checks

For every file found in Step 1, replace the shared secret check with the per-admin key validation:

**Before:**
```typescript
const secret = req.headers.get('x-admin-secret');
if (secret !== process.env.ADMIN_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**After:**
```typescript
import { validateAdminKey } from '@/lib/admin-keys';

const authHeader = req.headers.get('authorization');
const key = authHeader?.replace('Bearer ', '');
if (!key) {
  return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
}

const { valid, adminEmail } = await validateAdminKey(key);
if (!valid) {
  return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 });
}

// adminEmail is now available for audit logging
```

Create a reusable middleware wrapper:

```typescript
// src/lib/require-admin.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminKey } from '@/lib/admin-keys';

export async function requireAdmin(req: NextRequest): Promise<{
  authorized: boolean;
  adminEmail?: string;
  response?: NextResponse;
}> {
  const authHeader = req.headers.get('authorization');
  const key = authHeader?.replace('Bearer ', '');

  if (!key) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Missing API key' }, { status: 401 }),
    };
  }

  const { valid, adminEmail } = await validateAdminKey(key);
  if (!valid) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 }),
    };
  }

  return { authorized: true, adminEmail };
}
```

---

## Step 5: Create a Key Management Admin Route

Create `src/app/api/admin/keys/route.ts` (protected by an existing admin key):

```typescript
// POST — Create a new admin key
// GET — List all keys (showing prefix and email only, never the full key)
// DELETE — Revoke a key by ID
```

This route itself must be protected by admin key auth.

---

## Step 6: Generate Initial Admin Keys

Create a one-time script `scripts/generate-admin-key.ts`:

```typescript
import { createAdminKey } from '../src/lib/admin-keys';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx scripts/generate-admin-key.ts admin@example.com');
    process.exit(1);
  }

  const key = await createAdminKey(email, 'Initial key');
  console.log(`\nAdmin key created for ${email}:`);
  console.log(`\n  ${key}\n`);
  console.log('⚠️  Save this key now. It cannot be retrieved again.\n');
}

main().catch(console.error);
```

---

## Step 7: Remove the Shared Secret

After all admin routes are migrated to per-admin keys:

1. Remove `ADMIN_SECRET` from `.env`, `.env.local`, `.env.example`
2. Remove any reference to `ADMIN_SECRET` from `process.env`
3. Remove it from Vercel environment variables

**Do not remove `CRON_SECRET`** — that's separate and used for Vercel cron job auth.

---

## Verification

```bash
# 1. No references to shared admin secret in route handlers
grep -rn "ADMIN_SECRET" src/app/api/ --include="*.ts" | grep -v "node_modules\|.env"
# Expected: No output

# 2. Admin key model exists
grep -n "model admin_api_keys" prisma/schema.prisma
# Expected: Match

# 3. Key utilities exist
test -f src/lib/admin-keys.ts && echo "OK" || echo "MISSING"
# Expected: OK

# 4. All admin routes use validateAdminKey or requireAdmin
grep -rn "admin" src/app/api/ --include="route.ts" -l | while read f; do
  if grep -q "ADMIN_SECRET\|adminSecret" "$f"; then
    echo "STILL USING SHARED SECRET: $f"
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
fix: 10 replace shared admin secret with per-admin API keys

Implement per-admin API key system with SHA-256 hashed storage,
key rotation, revocation, and last-used tracking. All admin routes
now use individual keys with audit trail. Shared ADMIN_SECRET removed.
```
