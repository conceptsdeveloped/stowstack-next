# Task 26: Decide — keep or kill the partner/referral program

## Decision required

The partner/referral program is fully built but pre-launch:

- 5 models: `referrals`, `referral_codes`, `referral_credits`, `rev_share_payouts`, `rev_share_referrals`
- Full partner dashboard at `/partner/*` (8 pages: api-keys, audit-log, changelog, facilities, revenue, settings, team, webhooks)
- Session/auth system via `org_sessions`
- ~30 API routes for partner/org workflows

## Two paths

### Path A: Keep (delay cleanup)

If you intend to launch with partner program from day one (white-label for management cos), leave it alone. No work needed.

### Path B: Kill until product-market fit

If first 10 customers are direct (single-facility owners, not management cos), the partner program is dead weight:

1. Delete 5 referral/rev-share models from schema.
2. Delete `/partner/*` pages and `/api/partner*`, `/api/org-*`, `/api/referrals/*` routes (~30 routes).
3. Strip partner nav from `admin-shell.tsx`.
4. Keep `organizations` + `org_users` + `org_sessions` (still useful for multi-user admin access later).
5. Verify build + admin flow still works.

**Estimated savings (Path B):** ~10 models, ~30 routes, ~5,000 LOC.

## Recommendation

**Path B** unless you have signed LOIs from management cos. The partner UI is one of the most polished surfaces in the codebase — easy to rebuild in a week when actually needed, expensive to maintain monthly until then.

## If Path B is chosen, follow steps in this task. If Path A, close this task as "kept by decision."

## Commit message (Path B)

```
refactor: remove partner/referral program (defer until validated demand)

Kept organizations + org_users + org_sessions for future multi-user admin.
Removed 5 partner models, ~30 routes, /partner/* dashboard.
```
