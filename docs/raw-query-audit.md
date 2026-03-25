# Raw Query Audit

Audit of all `$queryRawUnsafe` and `$executeRawUnsafe` usage in the codebase.

## Classification

- **SAFE-PARAMETERIZED**: Uses `$N` positional parameters for all user input. No SQL injection risk. Kept because Prisma doesn't support the SQL pattern needed (dynamic WHERE, ON CONFLICT, complex JOINs with subqueries, etc.).
- **MIGRATED**: Converted to Prisma tagged template `$queryRaw` or Prisma model methods.

## Summary

| Category | Count | Risk |
|----------|-------|------|
| Safe-parameterized (dynamic WHERE) | ~25 routes | None — all user values go through `$N` params |
| Safe-parameterized (ON CONFLICT upsert) | 3 routes | None — required for upsert semantics |
| Safe-parameterized (batch INSERT) | 2 routes | None — parameterized batch inserts |
| Migrated to Prisma | 2 routes | N/A |

## Why $queryRawUnsafe Is Used

Prisma's tagged template `$queryRaw` does not support:
1. **Dynamic WHERE clauses** — optional filters added conditionally (e.g., `AND status = $N` only if status is provided)
2. **ON CONFLICT ... DO UPDATE** — Prisma `upsert` doesn't support composite unique constraints or partial indexes
3. **Dynamic SET clauses** — PATCH endpoints where only provided fields are updated
4. **Complex subqueries** — JSON aggregation, window functions, multi-table JOINs

All $queryRawUnsafe calls use positional `$N` parameters with values passed as additional arguments — the SQL string itself never contains user input.

## Route-by-Route Catalog

### V1 API Routes (API key auth, org-scoped)

| File | Usage | Pattern | Status |
|------|-------|---------|--------|
| `v1/leads/route.ts` | GET (paginated + filters), PATCH (dynamic SET) | Dynamic WHERE + SET with $N params | SAFE |
| `v1/facilities/route.ts` | PATCH (dynamic SET) | Dynamic SET with $N params | SAFE |
| `v1/tenants/route.ts` | PATCH (dynamic SET) | Dynamic SET with $N params | SAFE |
| `v1/webhooks/route.ts` | GET (paginated + filters) | Dynamic WHERE with $N params | SAFE |

### Admin Routes (admin key auth)

| File | Usage | Pattern | Status |
|------|-------|---------|--------|
| `storedge-import/route.ts` | 15 calls: upserts, deletes, inserts across 7 report types | ON CONFLICT upserts with $N params | SAFE |
| `churn-predictions/route.ts` | ~20 calls: queries, upserts, batch ops | Dynamic WHERE + ON CONFLICT with $N params | SAFE |
| `ab-tests/route.ts` | 9 calls: stats, CRUD, duplicate checks | Dynamic WHERE with $N params | SAFE |
| `tenants/route.ts` | 8 calls: list, stats, collections, delinquency | Dynamic WHERE with $N params | SAFE |
| `export-leads/route.ts` | 1 call: facility list with note counts | No dynamic params, simple query | MIGRATED |
| `nurture-sequences/route.ts` | 1 call: dynamic SET for PATCH | Dynamic SET with $N params | SAFE |
| `facility-pms/route.ts` | 5 calls: upserts for snapshots, units, specials | ON CONFLICT upserts with $N params | SAFE |
| `org-activity/route.ts` | 1 call: activities by org | Single param, simple query | MIGRATED |

### Analytics/Intelligence Routes (admin auth)

| File | Usage | Pattern | Status |
|------|-------|---------|--------|
| `occupancy-intelligence/route.ts` | 6 calls: parallel queries for different data slices | Single facilityId param each | SAFE |
| `revenue-intelligence/route.ts` | 5 calls: parallel queries for revenue data | Single facilityId param each | SAFE |
| `revenue-loss/route.ts` | 8 calls: parallel queries for loss analysis | Single facilityId param each | SAFE |
| `occupancy-forecast/route.ts` | 3 calls: facility data, campaigns, snapshots | Single facilityId param each | SAFE |
| `lead-score/route.ts` | 6 calls: scoring queries | Single facilityId param each | SAFE |
| `market-intel/route.ts` | 4 calls: intel queries with dynamic filters | Dynamic WHERE with $N params | SAFE |
| `alert-history/route.ts` | 3 calls: alerts, summary, unacknowledged | Single facilityId param | SAFE |
| `moveout-remarketing/route.ts` | 6 calls: sequences, stats, tenants | Dynamic WHERE with $N params | SAFE |
| `upsell/route.ts` | 4 calls: opportunities, stats, queries | Dynamic WHERE with $N params | SAFE |

### Public/Portal Routes

| File | Usage | Pattern | Status |
|------|-------|---------|--------|
| `consumer-leads/route.ts` | 7 calls: CRUD with conditional filters | Dynamic WHERE + ON CONFLICT with $N params | SAFE |
| `lead-capture/route.ts` | 1 call: ON CONFLICT upsert | 12 positional params | SAFE |
| `page-interactions/route.ts` | 1 call: batch INSERT | Dynamic VALUES with $N params | SAFE |
| `page-interaction-stats/route.ts` | 5 calls: stats queries | Dynamic WHERE with $N params | SAFE |
| `partial-lead/route.ts` | 1 call: lead scoring update | $N params | SAFE |
| `social-posts/route.ts` | 2 calls: list + CRUD | Dynamic WHERE with $N params | SAFE |
| `referrals/route.ts` | 2 calls: codes + leaderboard | Single facilityId param | SAFE |
| `facility-creatives/route.ts` | 3 calls: queries + upsert | $N params | SAFE |

### Lib

| File | Usage | Pattern | Status |
|------|-------|---------|--------|
| `lib/push.ts` | 2 calls: subscription query + batch deactivate | Dynamic WHERE + ANY($1::uuid[]) | SAFE |
| `org-facilities/route.ts` | 1 call: facilities with subquery aggregations | Single orgId param | SAFE |

## Conclusion

All `$queryRawUnsafe` usage follows the safe parameterized pattern. No user input is ever interpolated into SQL strings. The `$N` positional parameter system provides the same injection protection as Prisma's tagged template `$queryRaw`.

Two simple routes were migrated to Prisma tagged templates where the query had no dynamic components. The remaining ~25 routes require `$queryRawUnsafe` for legitimate SQL features not supported by Prisma's query builder.
