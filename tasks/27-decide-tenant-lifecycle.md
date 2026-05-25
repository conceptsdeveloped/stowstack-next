# Task 27: Decide — premature tenant lifecycle features

## Decision required

The tenant management UI wires together features that need real tenant data to validate:

| Model | Wired to | Why "premature" |
|---|---|---|
| `churn_predictions` | tenant-detail.tsx, tenant-helpers.tsx | ML predictions need historical data |
| `upsell_opportunities` | tenant-detail.tsx, tenant-management-types.ts | Needs tenant history |
| `delinquency_escalations` | tenant-detail.tsx, tenant-management.tsx | Needs payment behavior data |
| `moveout_remarketing` | tenants/route.ts | Needs moveout patterns |
| `retention_campaigns` | churn-predictions/route.ts | Depends on churn data |

These all assume the operator has loaded tenant data via PMS upload and run the system for 3-6 months.

## Two paths

### Path A: Keep (operators load PMS reports and these work)

Operators who upload PMS reports get tenant data; these features then have something to chew on. Recommendation if **PMS upload is the main entry point** of the product.

### Path B: Stub or remove

Strip the predictive features back to "we'll add these once you have 90 days of data." Keep:

- `tenants` (raw tenant data from PMS imports)
- `tenant_payments` (raw payment history)
- `tenant_communications` (logged outreach)

Remove:

- `churn_predictions`, `upsell_opportunities`, `delinquency_escalations`, `moveout_remarketing`, `retention_campaigns`
- Their corresponding API routes (`churn-predictions`, `upsell`, `moveout-remarketing`)
- The dependent UI panels in `tenant-detail.tsx`, `tenant-management.tsx`

**Estimated savings (Path B):** 5 models, 3 routes, ~500 LOC.

## Recommendation

**Path A** if PMS upload is core to the product story (it is — it's your moat). The features are scaffolded correctly; they activate when data exists. The bloat cost is small, the rebuild cost is high.

If you choose Path B, follow this task. If Path A, close as "kept by decision."

## Commit message (Path B)

```
refactor: remove premature tenant lifecycle features (churn/upsell/delinquency/retention/moveout)

Kept raw tenant data models (tenants, tenant_payments, tenant_communications).
Will rebuild predictive features when we have 90 days of production data.
```
