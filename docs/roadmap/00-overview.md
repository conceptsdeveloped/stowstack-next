# StorageAds Roadmap — Demand Generation Engine + Revenue Intelligence

**Date:** 2026-05-24
**Owner:** Blake
**Status:** Draft — sequencing and scope subject to revision

---

## ⚠️ READ FIRST: [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md)

This roadmap was drafted as if the codebase were greenfield. It is not. `prisma/schema.prisma` already contains 80+ models, many of which directly overlap with what individual feature files propose creating.

**Before starting any Phase 1, open [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md) and verify which models in that file already exist.** Major overlaps:

- **File 05** (reactivation/referral) — `moveout_remarketing`, `nurture_sequences`, `referral_codes`, `referrals`, `referral_credits` all exist. Schema is 70–90% done; the work is wiring + UI.
- **File 08** (ECRI) — `tenants`, `tenant_payments`, and `facility_pms_tenant_rates` (with `ecri_flag`, `ecri_suggested`, `ecri_revenue_lift` columns already present) cover most of the spec.
- **File 11** (move-out + auctions) — `churn_predictions`, `retention_campaigns`, `delinquency_escalations` already exist.
- **File 07** (dynamic pricing) — `facility_pms_rate_history`, `facility_pms_tenant_rates`, `facility_pms_snapshots` cover the rate snapshot layer.
- **File 10** (attribution) — `partial_leads` is the leads table; `nurture_enrollments` already links `lead_id` to `tenant_id`.
- **File 06** (reputation funnel) — `gbp_reviews.ai_draft` field already exists.

Building the duplicate models specced in those files would make the codebase worse. Use the reconciliation doc to identify what to actually build.

---

## The Strategic Frame

Self-storage is a local commodity business with three structural inefficiencies:

1. **The middleman tax.** SpareFoot, Yardi, and other aggregators take 50% of the first month plus monthly fees. Most operators accept this because they have no demand-gen infrastructure of their own.
2. **The pricing freeze.** Most facilities set street rates once a quarter and leave them. Existing customer rate increases are sporadic and arbitrary. Revenue management is a spreadsheet at best.
3. **The black-box ad spend.** Operators who do run ads can't attribute spend to move-ins, so they default to "we tried Facebook once, didn't work."

StorageAds eliminates all three. The product is a closed-loop system that finds demand before competitors do, captures it 24/7, prices it dynamically, and proves every dollar of return back to ad spend.

## The Two Pillars

### Demand Generation
Get to the prospect before SpareFoot does, capture them when they call, convert them into a move-in. Files 01–06.

### Revenue Intelligence
Price every unit right, raise existing rates on the right tenants, predict churn, optimize auctions, surface acquisition targets. Files 07–12.

### Closed Loop
The moat. File 10 connects the two pillars by attributing every move-in back to the originating creative, then feeding the data forward into pricing decisions.

File 13 is the wrapper — the weekly NOI report that proves the platform's value to the facility owner.

---

## Feature Map

| # | Pillar | Feature | Strategic Priority | Sessions |
|---|--------|---------|--------------------|----------|
| 01 | Demand | Life-Event Trigger Detection | Defensible moat | 5 |
| 02 | Demand | AI Voice + Chat Receptionist | Critical path | 5 |
| 03 | Demand | Competitor Displacement Engine | High leverage | 5 |
| 04 | Demand | Programmatic Local Landing Pages | High leverage | 5 |
| 05 | Demand | Reactivation + Referral Loop | High leverage | 5 |
| 06 | Demand | Reputation Funnel | Critical path | 5 |
| 07 | Revenue | Dynamic Street Rate Engine | Margin lift | 5 |
| 08 | Revenue | ECRI Optimizer | Margin lift | 5 |
| 09 | Revenue | Competitor Occupancy Grid | Defensible moat | 5 |
| 10 | Closed Loop | Channel-True CAC + LTV Attribution | Defensible moat | 5 |
| 11 | Revenue | Move-Out Prediction + Auction Optimization | High leverage | 5 |
| 12 | Revenue | Acquisition Target Intelligence | Strategic | 5 |
| 13 | Wrapper | Owner NOI Report | Retention | 5 |

**Total estimated build:** ~65 sessions across 13 features, assuming one phase per session.

---

## Execution Rules

These mirror the existing `tasks/` rules in CLAUDE.md and apply to every roadmap file in this directory.

1. **One phase per session.** When told "run roadmap 02 phase 1", work ONLY on Phase 1 of file `02-ai-voice-receptionist.md`. Do not start Phase 2 in the same session, even if Phase 1 finishes quickly.
2. **Read the entire feature spec first.** Understand phases, dependencies, anti-goals, and open questions before writing any code.
3. **Phases build sequentially.** Phase N may depend on Phase N-1 being merged. Do not skip ahead.
4. **Verification per phase, not per feature.** Each phase has its own verification checklist. Run it. Show output. Fix breakage before commit.
5. **One commit per phase.** Use the commit message format at the end of each phase block.
6. **Stop and report at phase boundary.** State: which feature, which phase, files modified, verification results. Do NOT auto-advance to the next phase.
7. **If a phase is ambiguous, ask.** Open questions are explicit at the bottom of each file. If the answer isn't there, stop.
8. **No improvisation across features.** While building feature 03 phase 2, do not "while I'm here" touch feature 07 code.

---

## Dependency Graph

```
01 (Life-event triggers) ──┐
02 (AI receptionist) ──────┼──► 10 (Closed-loop attribution)
03 (Competitor displace) ──┤
04 (Programmatic LPs) ─────┤
05 (Reactivation/referral)─┤
06 (Reputation funnel) ────┘

07 (Dynamic street rate) ──► 13 (Owner NOI report)
08 (ECRI optimizer) ───────► 13
09 (Competitor occupancy) ─► 07, 12
11 (Move-out prediction) ──► 13
12 (Acquisition intel) ────► standalone

10 (Attribution) ──────────► everything downstream
```

**Hard dependencies:**
- 10 (attribution) Phase 1 should ship before 01–06 reach Phase 5, otherwise demand-gen features have nowhere to report results.
- 09 (competitor occupancy) Phase 2 should ship before 07 (dynamic pricing) Phase 3 — pricing model needs competitor data.
- 13 (NOI report) Phase 1 can start as soon as 07, 08, or 11 has any usable output.

**Soft dependencies (nice to have):**
- 04 (programmatic LPs) Phase 4 wants call tracking from existing `call_tracking_numbers` table (already built).
- 06 (reputation funnel) Phase 4 wants the existing GBP OAuth flow (currently incomplete per `feature-audit-08-gbp-management.md`).

---

## Suggested Sequencing

Don't build in numerical order. Build in revenue-impact order, gated by dependencies.

### Sprint 1 — Prove the Loop (highest urgency)
- 02 Phase 1 (basic AI receptionist) — immediate ROI demo for sales
- 10 Phase 1 (lead unification) — needed for everything else
- 13 Phase 1 (NOI report skeleton) — needed for retention

### Sprint 2 — Margin Lift
- 07 Phase 1–2 (street rate baseline + competitor ingest)
- 08 Phase 1–2 (tenant data + tenure features)
- 09 Phase 1 (competitor discovery)

### Sprint 3 — Defensible Demand
- 01 Phase 1–2 (USPS + MLS triggers)
- 03 Phase 1 (competitor rate scraper)
- 04 Phase 1 (LP template engine)

### Sprint 4 — Capture + Retain
- 06 Phase 1–3 (reputation funnel)
- 05 Phase 1–3 (reactivation + referrals)
- 02 Phase 2–4 (receptionist booking + chat)

### Sprint 5 — Scale + Differentiate
- 10 Phase 2–5 (full attribution)
- 11 (move-out prediction)
- 12 (acquisition intel)

---

## Anti-Goals

Things this roadmap is explicitly NOT trying to do:

- **Not building a PMS.** StorageAds reads PMS data; it does not run the facility's operations. Manual upload of PDF/CSV/Excel reports remains the input mechanism in Phase 1 of every feature that needs it.
- **Not touching Angelo's domains.** Ad platform integrations (Meta/Google/TikTok) and video/image generation are off-limits for this roadmap. Where a feature needs to launch an ad, it queues a task for Angelo's pipeline.
- **Not building generic SaaS features.** No "team collaboration", no "custom dashboards builder", no "white-label theming" beyond what already exists.
- **Not chasing every operator.** ICP for these features is the operator with 1–25 facilities who wants to fire SpareFoot. Larger REITs are a separate conversation.

---

## How to Use This Directory

- Files are numbered `01` through `13`. Each is self-contained.
- The file at `NN-feature-name.md` defines the feature, the strategic case, the phased build, and the verification.
- Phases inside a file are numbered Phase 1, Phase 2, etc. Each phase is sized for one Claude Code session.
- Treat each phase like a `tasks/` file: one session, one commit, stop and report.

When told "run roadmap NN" without a phase, start with Phase 1.
