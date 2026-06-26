# 09 · Tenant Retention / Churn / Revenue-Intelligence Engine

> **The headline:** This is the *tenant-side* machine, entirely separate from the lead/marketing funnel. It's keyed off `tenants` (not `partial_leads`), admin-key gated, and **all scoring is heuristic — no LLM**. Four weekly crons score risk and roll up NOI. Crucially, escalation and move-out sequences have timers but **no cron fires them** — they advance via admin actions.

---

## 1. The tenant lifecycle state machine

```mermaid
stateDiagram-v2
    direction LR
    [*] --> active : PMS import / move-in
    active --> delinquent : days_delinquent > 0 & threshold met
    delinquent --> active : caught up
    active --> moved_out : move_out_reason set
    delinquent --> moved_out : auction_complete
    moved_out --> re_rented : win-back converts
    re_rented --> [*]

    note right of active
      Mon cron scores churn_predictions (1/tenant)
      Tue cron scores sensitivity (dated snapshots)
      Mon+30m: high-risk + 60d still active
      → retention_status = retained (a "save")
    end note
    note right of delinquent
      delinquency_escalations (append history):
      late_notice → second_notice → pre_lien
      → lien_filed → auction_scheduled → auction_complete
      thresholds: 1 / 8 / 15 / 31 / 46 / 61 days
    end note
    note right of moved_out
      enrollIfMovedOut() + markTenantChurned()
      5-step moveout_remarketing win-back
    end note
```

---

## 2. The weekly scoring cascade

```mermaid
gantt
    title Weekly tenant-side crons (UTC)
    dateFormat HH:mm
    axisFormat %a %H:%M
    section Monday
    score-churn-risk            :11:00, 30m
    update-retention-outcomes   :11:30, 30m
    section Tuesday
    score-ecri-sensitivity      :11:00, 30m
    section Friday
    generate-noi-reports        :12:00, 30m
```

> The Monday ordering is deliberate: churn scoring writes `churn_predictions` at 11:00, then the retention-outcome sweep reads those predictions 30 min later (11:30) to mark realized "saves."

| Cron | Calls | Lib | Writes |
|------|-------|-----|--------|
| `score-churn-risk` (Mon 11:00) | `scoreActiveTenants` | `src/lib/churn-scoring.ts` | `churn_predictions` (1/tenant, upsert) |
| `update-retention-outcomes` (Mon 11:30) | `sweepRetainedTenants` | `src/lib/retention-outcomes.ts` | `churn_predictions.retention_status` |
| `score-ecri-sensitivity` (Tue 11:00) | `scoreAllActiveTenantsSensitivity` | `src/lib/ecri-sensitivity.ts` | `tenant_sensitivity_features` (dated snapshots) |
| `generate-noi-reports` (Fri 12:00) | `generateWeeklyNOISnapshots` | `src/lib/noi-report.ts` | `noi_report_snapshots` (per-facility weekly) |

---

## 3. Churn scoring model (heuristic, 0-100)

```mermaid
graph LR
    subgraph Inputs["computeChurnScore inputs → weight"]
        I1["days_delinquent → up to +30 (dominant)"]
        I2["no autopay → +10"]
        I3["late payments (12mo) → up to +20"]
        I4["short tenure < 3mo → up to +15"]
        I5["lease expiring/expired/M2M → up to +15"]
        I6["no insurance → +5"]
    end
    SCORE["risk_score 0-100"]
    I1 & I2 & I3 & I4 & I5 & I6 --> SCORE
    SCORE --> LVL["≥75 critical · ≥50 high<br/>≥25 medium · else low"]

    classDef i fill:#e8e6dc,stroke:#141413,color:#141413
    classDef s fill:#1e1d1b,stroke:#141413,color:#faf9f5
    class I1,I2,I3,I4,I5,I6 i
    class SCORE,LVL s
```

`churn_predictions` is **one row per tenant** (`tenant_id @unique`), upserted, with `recommended_actions` (personal_call, autopay_incentive, renewal_offer, payment_reminder) and `retention_status` (none → enrolled → retained / churned). Also drivable on-demand via `/api/churn-predictions`.

**ECRI sensitivity** (`tenant_sensitivity_features`, dated daily snapshots) is a weighted 0-1 score: tenure (30%), payment health (20%), rate gap vs facility-median market rate (20%), no-autopay (15%), small unit ≤5x10 (15%). Buckets very_low/low/medium/high.

---

## 4. Delinquency escalation (admin-driven, NOT cron)

```mermaid
flowchart LR
    D["days_delinquent > 0"] --> BULK["POST /api/tenants (bulk auto-escalate)<br/>picks highest stage whose threshold is met"]
    BULK --> STAGE["delinquency_escalations row (automated=true)<br/>next_stage_at = +7d · status → delinquent"]
    STAGE -.->|"⚠️ next_stage_at set but<br/>NO cron fires it"| WAIT["advances only on next<br/>admin POST/PATCH"]

    classDef warn fill:#faf9f5,stroke:#B04A3A,color:#B04A3A
    class WAIT warn
```

Stages: `late_notice → second_notice → pre_lien → lien_filed → auction_scheduled → auction_complete` at thresholds `1/8/15/31/46/61` days. `delinquency_escalations` is append-history. **No cron auto-advances it** — the `next_stage_at` timer is informational; advancement requires an admin call to `/api/tenants`.

---

## 5. Move-out remarketing (the win-back loop)

```mermaid
sequenceDiagram
    autonumber
    participant T as tenant → moved_out
    participant Trig as enrollIfMovedOut()
    participant MR as moveout_remarketing
    participant Admin as Admin PATCH (manual)
    participant New as new tenant (re-rented)

    T->>Trig: status=moved_out + moved_out_date
    Trig->>MR: INSERT sequence_status=active<br/>next_send_at = +3d (ON CONFLICT DO NOTHING)
    Note over MR: 5-step win-back, offer_type/value
    Admin->>MR: advance / batch_advance (step+1, +7d)<br/>logs tenant_communications type=remarketing
    Admin->>MR: convert → converted=true
    MR->>New: new_tenant_id links re-rented record
    Note over New: counts as NOI "retention save"
```

`moveout_remarketing` has **two named relations to `tenants`**: `tenant_id` (the moved-out tenant, `@unique`) and `new_tenant_id` (the re-rented record). **No cron drives advancement** — it's manual/batch PATCH (the `process-drips`/`process-nurture` crons operate on the *lead-side* tables).

---

## 6. NOI report — the keystone weekly rollup

`noi_report_snapshots` stitches every subsystem into one weekly NOI-lift report card:

```mermaid
graph TB
    NOI["noi_report_snapshots<br/>(weekly per facility, Mon-Sun)"]
    REV["Revenue:<br/>facility_pms_snapshots.actual_revenue<br/>→ fallback revenue_history"] --> NOI
    ECRI["ECRI realized lift:<br/>Σ facility_pms_tenant_rates.ecri_revenue_lift"] --> NOI
    SAVE["Retention saves:<br/>moveout_remarketing converted=true<br/>× new tenant annual rate"] --> NOI
    MKT["Marketing attribution:<br/>client_campaigns by month"] --> NOI
    NOI --> CALC["estimated_noi_lift = dynamic_pricing(0, not live)<br/>+ ecri_realized + retention_saves<br/>net_value = lift − platform_fee − marketing_spend"]

    classDef hub fill:#1e1d1b,stroke:#141413,color:#faf9f5
    classDef src fill:#e8e6dc,stroke:#141413,color:#141413
    class NOI,CALC hub
    class REV,ECRI,SAVE,MKT src
```

---

## 7. Revenue-intelligence read APIs (analytics, no writes)

| Route | Produces |
|-------|----------|
| `revenue-intelligence` | Gross-vs-actual-vs-lost, revenue capture %, ECRI lift, weighted **health score** (occupancy 30% + capture 25% + ECRI 15% + delinquency 15% + trend 15%), a revenue **waterfall** |
| `revenue-loss` | Lost revenue with severity tiers (critical ≥$24k, high ≥$12k, warning ≥$4k annual) |
| `occupancy-forecast` | 12-month **with-ads vs without-ads** projection (the sales-pitch artifact) — seasonal index, 6% monthly churn |
| `occupancy-intelligence` | Current-state occupancy detail (90-day window) |

---

## Data-shape cheat sheet (important asymmetry)

```mermaid
graph LR
    A["churn_predictions<br/>1 row / tenant (upsert)"]
    B["tenant_sensitivity_features<br/>dated daily snapshots"]
    C["delinquency_escalations<br/>append history"]
    D["moveout_remarketing<br/>sequence + 2 tenant FKs"]
    E["noi_report_snapshots<br/>weekly per-facility rollup"]

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    class A,B,C,D,E c
```

---

## Key files

| Concern | File |
|---------|------|
| Churn scoring | `src/lib/churn-scoring.ts`, `cron/score-churn-risk` |
| Retention outcomes | `src/lib/retention-outcomes.ts`, `cron/update-retention-outcomes` |
| ECRI sensitivity | `src/lib/ecri-sensitivity.ts`, `cron/score-ecri-sensitivity` |
| Escalation + move-out triggers | `src/app/api/tenants/route.ts`, `src/lib/moveout-trigger.ts` |
| Move-out remarketing | `src/app/api/moveout-remarketing/route.ts` |
| Upsell | `src/app/api/upsell/route.ts` |
| NOI rollup | `src/lib/noi-report.ts`, `cron/generate-noi-reports` |
| Revenue analytics | `revenue-intelligence`, `revenue-loss`, `occupancy-forecast`, `occupancy-intelligence` routes |
| Shared queries | `src/lib/queries/facility-analytics.ts` |
