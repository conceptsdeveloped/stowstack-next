# 19 — Configure Prisma Connection Pool for 172 Routes + Crons

## Severity: MEDIUM
## Estimated Hours: 1-2

---

## Context

Default Prisma connection pool is 2 connections. With 172 API routes and multiple cron jobs, this is insufficient and will cause connection timeouts under load.

---

## Step 1: Locate Prisma Client Instantiation

```bash
grep -rn "new PrismaClient\|PrismaClient(" src/ --include="*.ts" -l
```

---

## Step 2: Configure Connection Pool

Update the Prisma client instantiation:

```typescript
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
};

// Prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

---

## Step 3: Configure Pool via DATABASE_URL

Prisma's connection pool is configured via the database URL parameters:

```
DATABASE_URL="postgresql://user:pass@host:5432/dbname?connection_limit=10&pool_timeout=10"
```

For Vercel serverless:
- `connection_limit=10` — Each serverless function instance gets up to 10 connections
- `pool_timeout=10` — Wait up to 10 seconds for an available connection

If using Prisma Accelerate or PgBouncer (recommended for serverless), configure accordingly.

---

## Step 4: Consider Prisma Accelerate or PgBouncer

For Vercel serverless deployments, each function invocation creates a new Prisma client with its own pool. At scale, this exhausts database connections.

**Option A — Prisma Accelerate (easiest):**
- Managed connection pooler from Prisma
- Change `DATABASE_URL` to Accelerate URL
- Add `DIRECT_URL` for migrations

**Option B — PgBouncer (if using Supabase/Neon):**
- Use the pooled connection string for queries
- Use the direct connection string for migrations

Update `schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooled connection
  directUrl = env("DIRECT_URL")        // Direct connection (migrations)
}
```

---

## Step 5: Add Connection Monitoring

Add a health check that reports connection pool status:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: 'ok',
      db: { connected: true, latencyMs },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      db: { connected: false, error: String(error) },
    }, { status: 503 });
  }
}
```

---

## Verification

```bash
# 1. Connection limit is configured
grep -rn "connection_limit\|pool_timeout\|PrismaClient" src/lib/ --include="*.ts"
# Expected: Configuration visible

# 2. Singleton pattern prevents multiple clients
grep -rn "globalForPrisma\|globalThis.*prisma" src/ --include="*.ts"
# Expected: Match

# 3. Health endpoint works
grep -rn "SELECT 1\|health" src/app/api/ --include="route.ts"
# Expected: Health check route exists

# 4. Build passes
npm run build 2>&1 | tail -5
```

---

## Commit

```
fix: 19 configure Prisma connection pool for serverless deployment

Set connection_limit=10, pool_timeout=10. Add singleton pattern to
prevent multiple PrismaClient instances. Add /api/health endpoint
for connection monitoring.
```
