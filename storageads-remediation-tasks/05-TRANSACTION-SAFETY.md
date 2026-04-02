# 05 — Wrap All Multi-Step Writes in Prisma Transactions

## Severity: HIGH
## Estimated Hours: 3-4

---

## Context

Multiple routes perform multi-step database writes without transaction management. If the server crashes between writes, data is left in an inconsistent state. Known examples: Stripe webhook creates org + user in separate queries (crash = orphaned org with no admin), report generation, and drip/nurture processing.

---

## Step 1: Find All Multi-Step Write Operations

Search for files that perform multiple sequential Prisma write operations:

```bash
# Find files with multiple create/update/delete/upsert calls
grep -rn "prisma\.\w\+\.\(create\|update\|delete\|upsert\|createMany\|updateMany\|deleteMany\)" src/app/api/ --include="*.ts" -l | while read f; do
  COUNT=$(grep -c "prisma\.\w\+\.\(create\|update\|delete\|upsert\|createMany\|updateMany\|deleteMany\)" "$f")
  if [ "$COUNT" -gt 1 ]; then
    echo "$COUNT writes: $f"
  fi
done
```

Also search for raw queries that are part of multi-step operations:

```bash
grep -rn "\$executeRaw\|\$queryRaw" src/app/api/ --include="*.ts" -l
```

---

## Step 2: Categorize Each File by Risk

For each file found in Step 1, categorize:

**CRITICAL — Must transact (data inconsistency = broken state):**
- Stripe webhook handlers (org + user creation, subscription + billing record)
- Any flow that creates a parent record then child records
- Any flow that modifies records across 2+ tables that must stay in sync
- Payment/billing flows
- Onboarding flows that create org + user + facility

**HIGH — Should transact (data inconsistency = confusion but recoverable):**
- Report generation (multi-table reads + write)
- Drip/nurture campaign processing
- Batch status updates
- Cron job multi-writes

**MEDIUM — Nice to transact (minor inconsistency risk):**
- Activity logging alongside primary operation
- Analytics recording alongside primary operation

---

## Step 3: Wrap CRITICAL Flows in `prisma.$transaction()`

For each CRITICAL file, refactor the multi-step writes into a Prisma interactive transaction:

**Before (dangerous):**
```typescript
const org = await prisma.organization.create({ data: orgData });
const user = await prisma.user.create({ data: { ...userData, orgId: org.id } });
const facility = await prisma.facility.create({ data: { ...facilityData, orgId: org.id } });
```

**After (safe):**
```typescript
const result = await prisma.$transaction(async (tx) => {
  const org = await tx.organization.create({ data: orgData });
  const user = await tx.user.create({ data: { ...userData, orgId: org.id } });
  const facility = await tx.facility.create({ data: { ...facilityData, orgId: org.id } });
  return { org, user, facility };
});
```

**Rules:**
- Use `tx` (the transaction client) for ALL operations inside the transaction, not `prisma`.
- Set an appropriate timeout for the transaction (default is 5s, which may be too short for complex flows):

```typescript
const result = await prisma.$transaction(async (tx) => {
  // ... operations
}, {
  maxWait: 5000,   // Max time to acquire a connection
  timeout: 10000,  // Max time for the entire transaction
});
```

---

## Step 4: Wrap HIGH Flows in Transactions

Apply the same pattern to all HIGH-priority flows. For cron jobs and background processors, use longer timeouts:

```typescript
const result = await prisma.$transaction(async (tx) => {
  // ... operations
}, {
  maxWait: 10000,
  timeout: 30000, // 30s for batch operations
});
```

---

## Step 5: Handle Transaction Errors Gracefully

Every `$transaction()` call must have proper error handling:

```typescript
try {
  const result = await prisma.$transaction(async (tx) => {
    // ... operations
  });
  // Success path
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle specific Prisma errors (unique constraint, etc.)
    console.error('[TRANSACTION_FAILED]', {
      code: error.code,
      meta: error.meta,
      route: '/api/...',
    });
  } else {
    console.error('[TRANSACTION_FAILED]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      route: '/api/...',
    });
  }
  // Return appropriate error response
  return NextResponse.json(
    { error: 'Operation failed. No changes were saved.' },
    { status: 500 }
  );
}
```

---

## Step 6: Special Case — Stripe Webhooks

Stripe webhook handlers are the highest-risk transaction target. Find them:

```bash
grep -rn "stripe.*webhook\|webhook.*stripe" src/app/api/ --include="route.ts" -l
find src/app/api -path "*webhook*stripe*" -o -path "*stripe*webhook*" | grep route.ts
```

For Stripe webhooks, the transaction must:
1. Validate the Stripe signature BEFORE entering the transaction
2. Perform all DB writes inside the transaction
3. Return 200 to Stripe AFTER the transaction succeeds
4. Return 500 to Stripe if the transaction fails (Stripe will retry)

```typescript
// Validate signature first (outside transaction)
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

// Then transact
try {
  await prisma.$transaction(async (tx) => {
    switch (event.type) {
      case 'checkout.session.completed':
        const org = await tx.organization.create({ ... });
        await tx.user.create({ ..., orgId: org.id });
        await tx.subscription.create({ ..., orgId: org.id });
        break;
      // ... other event types
    }
  });
  return NextResponse.json({ received: true }, { status: 200 });
} catch (error) {
  console.error('[STRIPE_WEBHOOK_TRANSACTION_FAILED]', error);
  return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
}
```

---

## Step 7: Audit for Orphan Cleanup

Check if any orphaned records already exist from past failures:

```bash
# Look for patterns that would indicate orphaned data
grep -rn "organization.*create\|user.*create\|facility.*create" src/app/api/ --include="route.ts" | grep -v "transaction\|\$transaction"
```

If orphans are found, create a one-time cleanup script (but this is separate from this task).

---

## Verification

```bash
# 1. All files with 2+ write operations use $transaction
grep -rn "prisma\.\w\+\.\(create\|update\|delete\|upsert\)" src/app/api/ --include="*.ts" -l | while read f; do
  COUNT=$(grep -c "prisma\.\w\+\.\(create\|update\|delete\|upsert\)" "$f")
  HAS_TX=$(grep -c "\$transaction" "$f")
  if [ "$COUNT" -gt 1 ] && [ "$HAS_TX" -eq 0 ]; then
    echo "MISSING TRANSACTION: $f ($COUNT writes, 0 transactions)"
  fi
done
# Expected: No output

# 2. Stripe webhook uses transaction
STRIPE_WEBHOOK=$(find src/app/api -path "*webhook*stripe*" -name "route.ts" -o -path "*stripe*webhook*" -name "route.ts" | head -1)
grep -n "\$transaction" "$STRIPE_WEBHOOK"
# Expected: At least one match

# 3. All transactions have error handling
grep -rn "\$transaction" src/app/api/ --include="*.ts" -l | while read f; do
  if ! grep -q "catch" "$f"; then
    echo "MISSING ERROR HANDLING: $f"
  fi
done
# Expected: No output

# 4. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 05 wrap all multi-step writes in Prisma transactions

All multi-table write operations now use prisma.$transaction() to
prevent orphaned/inconsistent data on partial failures. Stripe
webhooks, onboarding, report generation, and drip processing are
all covered. Transaction errors are logged with context.
```
