# Contradiction Log

A running log of disagreements between docs and code, between two code paths, between earlier and later analytical findings. Each entry cites both sides.

## Documentation vs. Code

| # | Topic | CLAUDE.md says | Code observation | Status |
|---|-------|----------------|------------------|--------|
| C1 | Total Prisma models | "~75 models" (CLAUDE.md:75 of CLAUDE.md project context) | 89 models counted in `prisma/schema.prisma:1-1815` | OBSERVED — schema has grown since doc last updated |
| C2 | Schema line count | "1485 lines" | 1815 lines (`wc -l prisma/schema.prisma`) | OBSERVED |
| C3 | Cron jobs | "9 Vercel cron jobs" | 13 cron jobs in `vercel.json:4-18` | OBSERVED |
| C4 | API route directories | "118+ route directories" | 190 directories under `src/app/api`; 178 `route.ts` files | OBSERVED |
| C5 | Test framework | "No test framework is configured" | `vitest.config.ts:1-16` exists; `src/test/setup.ts` exists; `@testing-library/react`, `@testing-library/jest-dom`, `vitest`, `happy-dom` in `package.json:43-56` | OBSERVED — tests are configured, though count not yet verified |
| C6 | Twilio | "Not set up yet" | `call_logs.twilio_call_sid` (`prisma/schema.prisma:202`), `call_tracking_numbers.twilio_sid` (`prisma/schema.prisma:231`), `twilio` package in `package.json:38` | OBSERVED — schema and SDK both present; not yet verified whether handlers actually call Twilio |
| C7 | Supabase | Not mentioned | `@supabase/ssr@^0.9.0` and `@supabase/supabase-js@^2.99.3` in `package.json:24-25` | OBSERVED — purpose unknown until lib code is read |
| C8 | PDF rendering | Not mentioned | `@react-pdf/renderer@^4.3.2` in `package.json:21`; `src/lib/pdf-report.tsx` exists | OBSERVED |
| C9 | FAL.ai integration | "FAL_KEY for AI video + image generation" | `.env.example` has `RUNWAY_API_KEY` and `REPLICATE_API_TOKEN` but no `FAL_KEY` | OBSERVED — FAL.ai documented as integrated; not present in env example |
| C10 | OTP/2FA | Not mentioned | `otpauth@^9.5.0` in `package.json:31`; `org_users.totp_secret`, `totp_enabled`, `totp_backup_codes` in `prisma/schema.prisma:1122-1124` | OBSERVED |
| C11 | Push notifications | Not mentioned | `web-push@^3.6.7` in `package.json:39`; `push_subscriptions` model in `prisma/schema.prisma:1322-1335`; VAPID keys in `.env.example:26-28` | OBSERVED |
| C12 | Webhooks (outbound) | Not mentioned | `webhooks` and `webhook_deliveries` models in `prisma/schema.prisma:1609-1641` — organizations can register outbound webhook subscribers | OBSERVED |
| C13 | External v1 API | "V1 external API routes at `src/app/api/v1/`" — brief mention | Full infrastructure: `api_keys`, `api_usage_log` models with `rate_limit`, `scopes`, `key_hash`/`key_prefix` pattern, `revoked` flag (`prisma/schema.prisma:103-141`) | OBSERVED — external API system is more developed than the brief mention suggests |
| C14 | Migration history | "Migrations in `prisma/migrations/`" | Only one migration: `0_init` — no historical migrations preserved. Schema-as-code is the only history | OBSERVED — migration archaeology (Phase 2) cannot be performed from migrations alone; git log on `schema.prisma` is the only history |
| C15 | Tenants / PMS data | "Phase 1 (current): Manual upload... No API integrations yet" | `tenants` table is the structured tenant entity (`prisma/schema.prisma:1517-1559`) with `external_id` field; full ecosystem of `tenant_payments`, `tenant_communications`, `delinquency_escalations`, `churn_predictions`, `upsell_opportunities`, `moveout_remarketing` exists | OBSERVED — schema is built as if for API-driven PMS ingest; current ingest path uses `pms_reports` upload model |
| C16 | Internal dev tooling | Not mentioned in CLAUDE.md | Six models for internal process tracking: `commit_comments`, `commit_enrichments`, `commit_flags`, `commit_reviews`, `deployment_tags`, `dev_handoffs` (`prisma/schema.prisma:370-475`) | OBSERVED — a layer of internal-only tooling exists in production schema |

## Internal Code Inconsistencies

| # | Topic | Side A | Side B | Status |
|---|-------|--------|--------|--------|
| C17 | CSP — middleware vs next.config | Middleware uses `Content-Security-Policy-Report-Only` (`src/middleware.ts:31`) | `next.config.ts:18-29` sets a different CSP enforced in response headers | OBSERVED — both are applied; middleware sets report-only, next.config sets enforcing. Effective CSP is the more permissive of the two unless the response is replaced. Needs deeper trace. |
| C18 | Storage provider | `@supabase/ssr` and `@supabase/supabase-js` in deps | DATABASE_URL points to Neon Postgres per CLAUDE.md; Prisma is the ORM | UNKNOWN — Supabase may be used for storage (files), auth fallback, or vestigial. Lib code TBD. |

## Drift Vector Triggers

| # | Vector | Trigger condition | Fired? |
|---|--------|-------------------|--------|
| D-A | "Self-storage marketing automation SaaS" framing | Low vocabulary density in Phase 6 would weaken | Not yet — Phase 6 pending |
| D-B | Audit funnel as spine | Phase 4 must compute candidate weights | Not yet — Phase 4 pending |
| D-C | "Pre-launch" claim | Production analytics evidence would falsify | Not yet — Phase 9 pending |
| D-D | Operator-built thesis (T3) | Phase 6 density results | Not yet — Phase 6 pending |
| D-E | Move-in attribution thesis | Phase 4 must trace identifier through to move-in | Not yet — Phase 4 pending |
| D-F | Server-side attribution (CAPI/Enhanced Conversions/GA4 MP) | Phase 3 must enumerate routes touching these APIs | Not yet — Phase 3 pending |
