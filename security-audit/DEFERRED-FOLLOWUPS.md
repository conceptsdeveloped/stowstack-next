# Security — Deferred Follow-ups

Items from the auth/authz audit (and the prior `security-audit/` pass) that were
**intentionally not fixed** in PR #6 (`security/auth-remediation`), with the
reason. Convert to GitHub issues when ready — they were left out of code because
they need coordination or a design decision, not because they're unimportant.

Everything CRITICAL/HIGH and the actionable MEDIUM/INFO items (SEC-001..004,
M1, M2, M4, M5, M6, M7, I2, I3) are fixed in PR #6.

---

## M3 / I4 — Angelo's domain (needs coordination)

> CLAUDE.md: ad platform integrations and video/image generation are Angelo's;
> "do not modify without coordination." Left untouched on purpose.

- **M3 — `generate-video` POST has no rate limit** (`src/app/api/generate-video/route.ts`).
  Admin-gated via `isAdminRequest`, but it is the only AI generator missing
  `applyRateLimit`; multi-clip FAL/Runway jobs → uncapped spend by any holder of
  the shared `ADMIN_SECRET`.
  Suggested fix: `applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API_HOURLY, "generate-video")`.
- **I4 — FAL image gen sets `enable_safety_checker: false`**
  (`src/app/api/generate-image/route.ts`). Content-safety, admin-only. Decide
  whether to re-enable.

## I1 — CSP hardening (design pass)

- The enforcing CSP in `next.config.ts` allows `'unsafe-inline'` in `script-src`,
  weakening XSS defense.
- Two policies ship: `src/proxy.ts` sends `Content-Security-Policy-Report-Only`,
  `next.config.ts` sends an enforcing `Content-Security-Policy` (with
  `img-src … https: http:`). Reconcile to one strict, nonce-based policy.
- Current XSS sinks are limited to JSON-LD `dangerouslySetInnerHTML`
  (`JSON.stringify`'d structured data — low risk), so this is hardening, not an
  open hole. Deferred from PR #6 because a nonce migration risks breaking inline
  scripts and needs its own pass.

## I5 — per-admin API keys (already tracked)

Shared `ADMIN_SECRET` is god-mode across all tenants; per-admin `sa_adm_` scoped
keys exist as the migration path. Tracked in
`storageads-remediation-tasks/10-PER-ADMIN-API-KEYS.md` — no new ticket needed.

## I6 — not a bug

`requireAdminAuth` Clerk fallback is inert for `/api/*` (middleware skips Clerk),
so those routes are admin-key-only in practice. Lockout risk, not a bypass. No
action required beyond awareness.
