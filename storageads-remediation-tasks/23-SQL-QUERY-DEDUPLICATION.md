# 23 — Extract and Deduplicate Shared SQL Queries

## Severity: MEDIUM (Code Quality / Maintenance)
## Estimated Hours: 2-3

---

## Context

Near-identical complex SQL queries are copy-pasted across `occupancy-intelligence`, `revenue-intelligence`, and `revenue-loss` routes. This means bug fixes must be applied in 3+ places, and divergence between copies creates subtle inconsistencies.

---

## Step 1: Identify All Duplicated Queries

```bash
# Find the intelligence/analytics route files
find src/app/api -path "*occupancy*" -o -path "*revenue*" -o -path "*intelligence*" -o -path "*revenue-loss*" | grep route.ts | sort
```

For each pair of files, compare their SQL queries:

```bash
# Extract raw SQL strings from each file
grep -A20 "\$queryRaw\|\$queryRawUnsafe\|SELECT\|WITH " [FILE_PATH] | head -60
```

Identify:
- Queries that are 90%+ identical across files
- Queries that differ only in the SELECT columns or a single WHERE clause
- Common CTEs (WITH clauses) used in multiple queries

---

## Step 2: Create a Shared Query Module

Create `src/lib/queries/facility-analytics.ts`:

```typescript
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Common types
export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type FacilityFilter = {
  facilityId: string;
  orgId: string;
  dateRange?: DateRange;
};

// Shared base query builder for facility metrics
function buildFacilityMetricsBase(filter: FacilityFilter) {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`f.id = ${filter.facilityId}`,
    Prisma.sql`f.org_id = ${filter.orgId}`,
  ];

  if (filter.dateRange) {
    conditions.push(
      Prisma.sql`m.date >= ${filter.dateRange.startDate}`,
      Prisma.sql`m.date <= ${filter.dateRange.endDate}`
    );
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

// Occupancy metrics
export async function getOccupancyMetrics(filter: FacilityFilter) {
  const where = buildFacilityMetricsBase(filter);

  return prisma.$queryRaw`
    SELECT
      -- Occupancy-specific columns
      m.date,
      m.total_units,
      m.occupied_units,
      ROUND(m.occupied_units::numeric / NULLIF(m.total_units, 0) * 100, 1) as occupancy_rate
    FROM facilities f
    JOIN facility_metrics m ON m.facility_id = f.id
    ${where}
    ORDER BY m.date DESC
  `;
}

// Revenue metrics
export async function getRevenueMetrics(filter: FacilityFilter) {
  const where = buildFacilityMetricsBase(filter);

  return prisma.$queryRaw`
    SELECT
      -- Revenue-specific columns
      m.date,
      m.gross_revenue,
      m.net_revenue,
      m.delinquency_amount,
      ROUND(m.net_revenue::numeric / NULLIF(m.gross_revenue, 0) * 100, 1) as collection_rate
    FROM facilities f
    JOIN facility_metrics m ON m.facility_id = f.id
    ${where}
    ORDER BY m.date DESC
  `;
}

// Revenue loss analysis
export async function getRevenueLossMetrics(filter: FacilityFilter) {
  const where = buildFacilityMetricsBase(filter);

  return prisma.$queryRaw`
    SELECT
      -- Revenue loss-specific columns
      m.date,
      m.vacant_units,
      m.avg_unit_rate,
      (m.vacant_units * m.avg_unit_rate) as potential_revenue_loss,
      m.delinquency_amount as delinquency_loss
    FROM facilities f
    JOIN facility_metrics m ON m.facility_id = f.id
    ${where}
    ORDER BY m.date DESC
  `;
}

// Shared aggregation helpers
export async function getFacilityTotals(filter: FacilityFilter) {
  const where = buildFacilityMetricsBase(filter);

  return prisma.$queryRaw`
    SELECT
      COUNT(DISTINCT m.date) as data_points,
      AVG(m.occupied_units::numeric / NULLIF(m.total_units, 0) * 100) as avg_occupancy,
      SUM(m.net_revenue) as total_revenue,
      SUM(m.delinquency_amount) as total_delinquency
    FROM facilities f
    JOIN facility_metrics m ON m.facility_id = f.id
    ${where}
  `;
}
```

---

## Step 3: Refactor Route Handlers to Use Shared Module

For each route that had duplicated queries:

**Before (in each route):**
```typescript
// 30+ lines of duplicated SQL
const results = await prisma.$queryRawUnsafe(`
  SELECT ... FROM facilities f
  JOIN facility_metrics m ON m.facility_id = f.id
  WHERE f.id = '${facilityId}' AND ...
  ORDER BY ...
`);
```

**After (in each route):**
```typescript
import { getOccupancyMetrics } from '@/lib/queries/facility-analytics';

const results = await getOccupancyMetrics({
  facilityId,
  orgId,
  dateRange: { startDate, endDate },
});
```

---

## Step 4: Also Deduplicate Other Common Patterns

Search for other duplicated query patterns beyond the intelligence routes:

```bash
# Find files with similar SQL patterns
grep -rn "SELECT.*FROM.*facilities.*JOIN" src/app/api/ --include="*.ts" -l | sort
```

Common candidates:
- Facility summary queries used in multiple dashboard tabs
- Organization-level aggregation queries
- Report generation queries

Create additional shared modules as needed:
- `src/lib/queries/organization-analytics.ts`
- `src/lib/queries/report-queries.ts`

---

## Step 5: Add TypeScript Return Types

Type the return values of shared queries:

```typescript
export type OccupancyMetric = {
  date: Date;
  total_units: number;
  occupied_units: number;
  occupancy_rate: number;
};

export async function getOccupancyMetrics(
  filter: FacilityFilter
): Promise<OccupancyMetric[]> {
  // ...
}
```

This ensures consumers of the shared queries get type safety.

---

## Step 6: Delete the Old Duplicated Code

After all routes are migrated to shared queries, delete the inline SQL from each route handler. Ensure no dead query code remains:

```bash
# Lines of SQL in route files should decrease significantly
find src/app/api -name "route.ts" -exec grep -c "SELECT\|FROM\|JOIN\|WHERE" {} + | sort -t: -k2 -rn | head -20
```

---

## Verification

```bash
# 1. Shared query module exists
test -f src/lib/queries/facility-analytics.ts && echo "OK" || echo "MISSING"

# 2. Intelligence routes import from shared module
grep -rn "facility-analytics\|getOccupancyMetrics\|getRevenueMetrics" src/app/api/ --include="*.ts"
# Expected: Imports in occupancy, revenue, and revenue-loss routes

# 3. No more duplicated SQL across intelligence routes
# Compare SQL line counts — they should be minimal now
for f in $(find src/app/api -path "*intelligence*" -o -path "*revenue-loss*" | grep route.ts); do
  SQL_LINES=$(grep -c "SELECT\|FROM\|JOIN\|WHERE\|GROUP BY\|ORDER BY" "$f" 2>/dev/null || echo 0)
  echo "$SQL_LINES SQL lines: $f"
done
# Expected: Low numbers (queries are in shared module, not inline)

# 4. No $queryRawUnsafe in refactored files
grep -rn "queryRawUnsafe" src/app/api/*intelligence* src/app/api/*revenue-loss* --include="*.ts" 2>/dev/null
# Expected: No output

# 5. Build passes
npm run build 2>&1 | tail -5

# 6. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5
```

---

## Commit

```
fix: 23 extract shared SQL queries into facility-analytics module

Deduplicate near-identical SQL from occupancy-intelligence,
revenue-intelligence, and revenue-loss routes into shared typed
query functions. Single source of truth for facility metric queries.
All queries use parameterized $queryRaw (no $queryRawUnsafe).
```
