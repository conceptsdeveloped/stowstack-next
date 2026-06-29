# COVERAGE.md — Pre-Alpha Audit Completeness Proof

Total `src/**/*.{ts,tsx}` files: **862**

Mapped to exactly one exclusive partition: **862**

Unmapped (UNAUDITED): **0**

Double-mapped (overlap defect): **0**

## Files per exclusive partition

| Partition | Files |
|---|---|
| api-audit-funnel | 23 |
| api-portal-client | 29 |
| api-admin-misc | 49 |
| api-partner-org | 18 |
| api-v1-external | 15 |
| api-angelo-adgen | 12 |
| api-campaigns-landing | 17 |
| api-attribution-tracking | 20 |
| api-cron | 27 |
| api-billing-stripe | 9 |
| api-pms-intel | 26 |
| lib-core | 134 |
| ui-admin | 197 |
| ui-marketing | 151 |
| ui-portal | 32 |
| ui-partner | 18 |
| infra-shared | 34 |
| ui-misc-shared | 51 |

✅ **Zero unmapped files — union of partition sets == full source list.**

✅ **Zero double-mapped files — exclusive partitions are disjoint.**

> Trace partitions (golden-path, tenancy, contract) intentionally span `**` and are excluded from the exclusivity proof (distinct finding namespace).
