# Task 27: Decide — premature tenant lifecycle features

## Decision: KEEP

The predictive features (`churn_predictions`, `upsell_opportunities`, `delinquency_escalations`, `moveout_remarketing`, `retention_campaigns`) are scaffolded correctly and activate when tenant data exists.

This is your moat: PMS upload → revenue intelligence → marketing execution. The tenant lifecycle features are the "intelligence" half. They don't cost much to maintain (5 models, ~3 routes, ~500 LOC) and the rebuild cost when you have data would be high.

### What stays

- 5 lifecycle models above
- API routes: `churn-predictions`, `upsell`, `moveout-remarketing`
- UI panels in `tenant-detail.tsx`, `tenant-management.tsx`, `tenant-helpers.tsx`, `tenant-management-types.ts`

### Future improvement (post-data)

- Once you have 90 days of tenant data from real PMS imports, validate the predictions and refine the heuristics
- Wire alerts from these models to the operator dashboard ("3 tenants at high churn risk this month")

## Status: closed — kept by decision
