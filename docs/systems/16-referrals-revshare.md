# 16 · Referrals & Revenue Share

> **The headline:** Two systems that share naming but never touch. **Customer/facility referrals** (`/api/referrals`) is fully wired — codes, invites, credits, milestone bonuses. **Partner org rev-share** (`rev_share_*` tables) is now also wired: `GET /api/partner/revenue` reads the tables and computes the tier/earnings, and the monthly `generate-rev-share-payouts` cron produces the payout + per-facility rows. Math lives in the pure, tested `src/lib/rev-share.ts`. (Historically this was schema + UI only with a dead endpoint — see §3.)

---

## 1. Two distinct systems

```mermaid
graph TB
    subgraph S1["① Customer / Facility referrals — FULLY WIRED"]
        A["referral_codes (per facility)"]
        B["referrals (per invited prospect)"]
        C["referral_credits (immutable ledger)"]
        R["/api/referrals (admin-gated)"]
        A --> B --> C
        R --- A
    end
    subgraph S2["② Partner / Org rev-share — SCHEMA + UI ONLY ⚠️"]
        D["organizations.rev_share_*"]
        E["rev_share_referrals"]
        F["rev_share_payouts"]
        UI["/partner/revenue (hardcoded tiers)"]
        D --> E
        D --> F
        UI -.->|"fetches /api/referrals<br/>which can't serve it"| BROKEN["always-empty tables"]
    end

    S1 -.->|"no shared FK, route, or status vocab"| S2

    classDef wired fill:#faf9f5,stroke:#788c5d,color:#141413
    classDef unwired fill:#faf9f5,stroke:#B04A3A,color:#B04A3A
    class A,B,C,R wired
    class D,E,F,UI,BROKEN unwired
```

| | ① Customer referrals | ② Partner rev-share |
|---|---|---|
| Anchor | `facilities` | `organizations` |
| Route | `/api/referrals` (admin-key) | `/api/partner/revenue` (org-session) |
| Earn model | flat $99/signup + milestone bonuses | tiered % of facility MRR ($99 basis) |
| Output | internal `credit_balance` (manual redeem) | monthly `payout_amount` via cron (status `pending`→`paid`) |
| Stripe | none | intended, absent (payout marking still manual) |
| State | ✅ functional | ✅ wired (read API + monthly cron) |

---

## 2. System ① — Customer/facility referrals (wired)

```mermaid
stateDiagram-v2
    direction LR
    [*] --> invited : POST ?action=refer
    invited --> signed_up : PATCH ?action=status
    signed_up --> active : PATCH ?action=status
    note right of signed_up
      credit_issued=false → issue $99 (CREDIT_TIERS)
      txn: credit_balance += , total_earned += ,
      referral_credits row type=earned
    end note
    note right of active
      milestone bonuses on count of active:
      3→$200 · 5→$500 · 10→$1000 · 25→$2500
      referral_credits row type=bonus
    end note
```

```mermaid
flowchart LR
    CODE["referral_codes<br/>code XXXX-YYYY (unique)<br/>credit_balance · total_earned · referral_count"] --> LEDGER["referral_credits (immutable)<br/>type: earned / bonus / redeemed<br/>amount (neg for redeem) · balance_after"]
    REDEEM["PATCH ?action=redeem<br/>checks balance, decrements credit_balance<br/>(NOT total_earned)"] --> LEDGER

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    class CODE,LEDGER,REDEEM c
```

**Flow:** create code (one per facility) → `?action=refer` invites a prospect (`invited`) → `?action=status` advances to `signed_up`/`active`, issuing a one-time $99 credit and any milestone bonus in a single transaction → `?action=redeem` spends balance. All credit math lives in `src/app/api/referrals/route.ts` (`CREDIT_TIERS`). **No Stripe** — credits are an internal balance redeemed manually by admin.

GET reads: codes list, per-code referrals, per-code ledger, and a top-20 leaderboard.

---

## 3. System ② — Partner org rev-share (wired)

```mermaid
flowchart TD
    ORG["organizations.rev_share_*<br/>rev_share_enabled · rev_share_pct<br/>lifetime_earnings · payout_method"]
    RR["rev_share_referrals<br/>unique org+facility<br/>total_earned · status"]
    RP["rev_share_payouts<br/>unique org+month<br/>gross_mrr · payout_amount · status pending/processing/paid"]

    LIB["src/lib/rev-share.ts (pure, tested)<br/>REV_SHARE_TIERS · resolvePct · summarize · monthKey<br/>Bronze 1-10→20% · Silver 11-25→25%<br/>Gold 26-50→30% · Platinum 51+→35%<br/>REV_SHARE_FACILITY_MRR = $99"]

    CRON["cron generate-rev-share-payouts (monthly)<br/>idempotent per org+month"] -->|"writes"| RP
    CRON -->|"upserts"| RR
    CRON -->|"recomputes"| ORG
    CRON --> LIB

    API["GET /api/partner/revenue (org-session)"] -->|"reads"| ORG
    API -->|"reads"| RR
    API -->|"reads"| RP
    API --> LIB
    UI["/partner/revenue/page.tsx"] -->|"fetches"| API

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    classDef ok fill:#faf9f5,stroke:#788c5d,color:#141413
    class ORG,RR,RP,UI c
    class LIB,CRON,API ok
```

The partner revenue page now fetches `GET /api/partner/revenue`, which computes the
tier and earnings server-side from the org's **active** facility count (with an
`organizations.rev_share_pct` override when `rev_share_tier ≠ "auto"`). The monthly
`generate-rev-share-payouts` cron snapshots each enabled org's payout into
`rev_share_payouts` (idempotent on the unique `org+month`; never downgrades a
`paid`/`processing` row), maintains the per-facility `rev_share_referrals` registry,
and recomputes `organizations.lifetime_earnings` from the payout ledger. All tier
and money math is centralized in the pure, unit-tested `src/lib/rev-share.ts` so the
API and cron can't drift. **Remaining seam:** gross MRR uses the
`REV_SHARE_FACILITY_MRR = $99` constant rather than the org's real billed MRR, and
marking a payout `paid` is still manual (no Stripe payout integration).

→ Was logged as a 🔴 gap in [13 · Gaps & Seams](13-gaps-and-seams.md); now resolved there.

---

## Key files

| Concern | File |
|---------|------|
| Customer referrals (wired) | `src/app/api/referrals/route.ts` |
| Customer models | `referral_codes`, `referrals`, `referral_credits` in `prisma/schema.prisma` |
| Partner rev-share math (pure) | `src/lib/rev-share.ts` (+ `src/lib/__tests__/rev-share.test.ts`) |
| Partner rev-share read API | `src/app/api/partner/revenue/route.ts` |
| Partner payout cron | `src/app/api/cron/generate-rev-share-payouts/route.ts` |
| Partner rev-share UI | `src/app/partner/revenue/page.tsx` (reads the API) |
| Partner models | `organizations.rev_share_*`, `rev_share_referrals`, `rev_share_payouts` |
