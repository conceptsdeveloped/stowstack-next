# Task 26: Decide — keep or kill the partner/referral program

## Decision: KEEP

Per `CLAUDE.md`: *"Primary buyers: facility owners, operators, managers, and management companies (white-label for management cos)."*

Management companies are an explicit primary buyer. The white-label / partner program is part of the product strategy, not premature scaffolding.

### What stays

- 5 models: `referrals`, `referral_codes`, `referral_credits`, `rev_share_payouts`, `rev_share_referrals`
- `/partner/*` dashboard (8 pages)
- `org_sessions` + auth flow
- ~30 partner/org API routes

### Future cleanup (optional, post-launch)

- Audit which partner routes are actually called during alpha testing
- Trim any routes that don't get hit
- Consolidate partner billing flow if it diverged from main billing

## Status: closed — kept by decision
