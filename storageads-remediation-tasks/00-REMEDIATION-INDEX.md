# StorageAds Platform Remediation — Task Index

## Execution Order

These files are ordered by priority. Execute them sequentially. Each file is a self-contained task spec. Do not skip any file. Do not omit any step within a file.

### Week 1 — Critical Infrastructure (MUST-DO)

| # | File | Summary | Est. Hours |
|---|------|---------|------------|
| 01 | `01-KILL-ACCEPT-DATA-LOSS.md` | Remove `--accept-data-loss` from build, switch to `prisma migrate deploy` | 3-4 |
| 02 | `02-RATE-LIMIT-ALL-ROUTES.md` | Wire Upstash rate limiting to all unprotected API routes | 4-5 |
| 03 | `03-KILL-LEGACY-SESSION-TOKENS.md` | Remove base64 `orgId:email` session token acceptance | 2-3 |
| 04 | `04-CSRF-PROTECTION.md` | Add CSRF token validation to all state-changing endpoints | 3-4 |
| 05 | `05-TRANSACTION-SAFETY.md` | Wrap all multi-step writes in Prisma transactions | 3-4 |
| 06 | `06-CRON-UNBOUNDED-LOOP.md` | Fix `send-client-reports` and all cron jobs with LIMIT + batching | 2-3 |

### Week 2 — Data Integrity + Security Hardening

| # | File | Summary | Est. Hours |
|---|------|---------|------------|
| 07 | `07-MISSING-RELATIONS-CASCADE.md` | Add `@relation` + cascade deletes to 5+ orphan models | 3-4 |
| 08 | `08-KILL-QUERY-RAW-UNSAFE.md` | Replace `$queryRawUnsafe` with Prisma methods or parameterized `$queryRaw` | 6-8 |
| 09 | `09-MISSING-DB-INDEXES.md` | Add indexes to sessions, organizations, partial_leads, and audit all hot paths | 2-3 |
| 10 | `10-PER-ADMIN-API-KEYS.md` | Replace shared admin secret with per-admin key system | 3-4 |
| 11 | `11-ERROR-LOGGING-FIRE-FORGET.md` | Add structured error logging to all `.catch(() => {})` patterns | 2-3 |

### Week 3 — Polish + Monitoring

| # | File | Summary | Est. Hours |
|---|------|---------|------------|
| 12 | `12-SENTRY-ENRICHMENT.md` | Add user context, custom tags, and breadcrumbs to Sentry | 2-3 |
| 13 | `13-ENV-VAR-VALIDATION.md` | Add startup validation for all required env vars with fail-fast | 2-3 |
| 14 | `14-NULLABLE-FK-CLEANUP.md` | Fix 37 nullable FK fields + ~105 nullable `created_at` fields | 4-5 |
| 15 | `15-MEGA-COMPONENT-SPLIT.md` | Split 16 mega-components starting with `gbp-full.tsx` (2,364 LOC) | 8-12 |
| 16 | `16-CRON-FAILURE-NOTIFICATIONS.md` | Add retry logic + failure alerting to all cron jobs | 2-3 |

### Bonus — Additional Hardening

| # | File | Summary | Est. Hours |
|---|------|---------|------------|
| 17 | `17-CORS-CSP-HEADERS.md` | Fix CORS fallback behavior + add Content Security Policy | 2-3 |
| 18 | `18-UPSERT-RACE-CONDITIONS.md` | Fix upserts on non-unique fields | 2-3 |
| 19 | `19-PRISMA-CONNECTION-POOL.md` | Configure connection pool for 172 routes + crons | 1-2 |
| 20 | `20-SOFT-DELETE-PATTERN.md` | Add soft delete across all models | 3-4 |
| 21 | `21-HOT-TABLE-RETENTION.md` | Add retention policies and archival for unbounded log tables | 2-3 |
| 22 | `22-ENUM-VALIDATION.md` | Replace string-based enum fields with Prisma enums | 2-3 |
| 23 | `23-SQL-QUERY-DEDUPLICATION.md` | Extract shared SQL from occupancy/revenue intelligence routes | 2-3 |

---

## Rules for Claude Code Execution

1. Read the entire `.md` file before writing any code.
2. Follow every step in order. Do not skip steps.
3. Run the verification commands at the end of each file. Do not mark complete until all pass.
4. If a step requires information you don't have (e.g., specific file paths), search the codebase first.
5. Commit after each file is fully complete with message format: `fix: [file-number] [summary]`
6. Do not refactor unrelated code while working on a task.
