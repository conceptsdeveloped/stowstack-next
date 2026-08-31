# MISSION.md — the gated build sequence

**This is the gate document.** `next.md`, `continue.md` and `.claude/commands/continue.md` all
resolve priority from this file: *"Current gate = lowest unchecked step. At/below it is in scope;
above it is forbidden."* Until now it did not exist, and every agent workflow in the repo was
pointing at nothing.

**Interactive version, with comment threads:**
https://claude.ai/code/artifact/cdac036d-c074-4d32-ad8d-88d878025cbf
Same content, plus per-capability comments and filters. **This file is canonical for gates**; the
artifact is where Angelo and Blake argue about them. Capability ids (`s1`, `r4`, `m6` …) are shared
between the two — keep them in sync.

**Relationship to the other docs.** `OVERVIEW.md` is what the company is. `STRATEGY.md` is marketing
doctrine. `.claude/positioning.md` wins on message hierarchy. `COMPLIANCE.md` is the legal surface.
`BLOCKERS.md` is what got abandoned after three attempts. `PROGRESS.md` and `CHANGELOG.md` are
history. **This file is the only forward-looking status doc** — if it disagrees with a stale note
elsewhere, this wins, and the disagreement gets logged in §7.

---

## 0 — How to read a step

- `- [ ]` unchecked = not done. **The lowest unchecked step in §3 is the current gate.**
- A step is DONE only when every acceptance criterion under it is true end to end. Code that
  compiles but is not wired is not done.
- State markers describe **what exists in the code today**, not what is planned:
  `SHIPPED` · `PARTIAL` (data layer or near-miss exists) · `SPEC` (designed, unbuilt) ·
  `NONE` · `BLOCKED` (stopped by something outside the code).
- `⚡SCALE` marks a capability that breaks at a twenty-facility account.

> **Provenance.** The states in §2 and §3 were derived on 2026-08-30 by reading
> `prisma/schema.prisma` (101 models), the route tree, and the PostcardRobot mail system —
> **not by running the app.** Anything marked PARTIAL is an inference from the schema and should be
> confirmed the first time someone opens it. Correct this file rather than working around it.

---

## 1 — The goal

Six modules — **RESPOND · REACH · MAIL · CONVERT · RETAIN · PROVE** — sold as one platform to
self-storage owners, at $497 / $1,497 / $2,497 per facility per month. Storage first, to cut teeth
and learn the pain points. Other verticals later, off the same spine.

**The one number underneath all of it: cost per move-in, by channel.** Every module exists to move
it or to prove it.

**The load target: a twenty-facility portfolio account.** Some owners have 20+ facilities, and the
platform must absorb one without degrading every other customer. That constraint, not feature
count, sets the build order below.

---

## 2 — Where the code actually is

Modules v2 reads like a greenfield plan. It is not. **101 Prisma models already exist**, and roughly
half of REACH, CONVERT, RETAIN and PROVE has a data layer today.

| Already substantial | Tables |
|---|---|
| PMS ingestion | `facility_pms_units · rent_roll · aging · length_of_stay · rate_history · revenue_history · snapshots · specials · tenant_rates` |
| Google Business Profile | `gbp_connections · posts · insights · profile_sync_log · questions · reviews` |
| Call tracking | `call_tracking_numbers · call_logs` (tracking, **not** answering) |
| Paid media | `client_campaigns · campaign_spend · ad_variations · creative_briefs · platform_connections · assets` |
| Landing pages | `landing_pages · landing_page_sections` |
| Lifecycle | `drip_sequences · drip_sequence_templates · delinquency_escalations · moveout_remarketing · churn_predictions` |
| Referral | `referral_codes · referral_credits` |
| Reporting | `client_reports · pms_reports · marketing_plans · facility_market_intel · places_data` |
| Tenancy & partners | `organizations · org_users · sessions · api_keys · audit_log` |

**MAIL is not a module to build — it is a working system to connect.** PostcardRobot
(`~/Desktop/robopostcards`) already has guarded ingest, an append-only money ledger with replay
protection, debit-before-submit ordering, fail-closed vendor gates, a global do-not-mail registry,
signed approval links, idempotent sends, a production render pipeline and Stripe billing.

### The six findings that set the build order

1. **There is no job queue.** Zero of 101 models is a work queue. Everything runs on cron inside
   serverless functions capped at **300 seconds**. A portfolio mail drop, a twenty-facility PMS sync
   or a review sweep across 12,000 units cannot finish in one invocation. *Largest single scale risk.*
2. **`facilities.organization_id` is nullable** (`prisma/schema.prisma:444`). 64 tables scope by
   `facility_id`, but a facility can exist with no owner — so every portfolio roll-up and org authz
   check has a null path through it.
3. **`organizations.facility_limit` defaults to 10.** A twenty-facility owner trips the plan ceiling
   on signing day.
4. **Mail throughput leaves ~100× unclaimed.** Thanks.io's send endpoint takes a `recipients[]`
   array — one call, N recipients, one order. We send **one recipient per call**, throttled to
   50/min against an account-wide 60/min. See §4.
5. **Four of the ten MAIL triggers do not exist**, and the distress ones that do are gated. See §5.
6. **White-label is already half-modelled** — `organizations.white_label`, `rev_share_enabled`,
   `rev_share_pct`, `rev_share_tier`, `lifetime_earnings`, `payout_method`, `custom_domain`.
   Finish it; do not design it again.

---

## 3 — The gated build sequence

### Phase A — the spine  ⟵ **CURRENT GATE**

Nothing above this line ships to a portfolio account. These are the pieces every module leans on.

- [ ] `s1` **Durable job queue with resumable workers** — NONE — ⚡SCALE
  *Acceptance:* a job survives a 300s function boundary; a crash mid-run resumes without repeating
  completed work; per-job progress is inspectable in `/admin`; at-least-once delivery with
  idempotent handlers.
- [ ] `s2` **Per-tenant fair-share budgets on every shared resource** — NONE — ⚡SCALE
  *Acceptance:* mail throughput, SMS TPS, voice lines and PMS calls each carry a per-tenant floor;
  one tenant cannot consume another's floor; bursting into idle capacity is allowed; **no shared
  vendor limit is served FIFO.**
- [ ] `s3` **`facilities.organization_id` → NOT NULL, with backfill** — NONE — ⚡SCALE
  *Acceptance:* migration applied; zero orphan facilities; every org-scoped query provably reaches
  an org; `boundaries.test.ts` covers the cross-org case.
- [ ] `s4` **Portfolio plan tier — raise `facility_limit` past 10** — NONE — ⚡SCALE
  *Acceptance:* a 20+ facility org can be created and billed; the tier has a price in
  `src/app/pricing/page.tsx`; limit enforcement has a test.
- [ ] `s-mail-batch` **Batch `recipients[]` on the mail provider** — NONE — ⚡SCALE
  *Acceptance:* one order carries N recipients; `custom1` still carries the mailing id per piece;
  the idempotency guard still holds per piece; throughput measured before/after. **Highest-leverage
  single change in the platform** — see §4.
- [ ] `s7` **Event bus / outbox for lifecycle events** — NONE — ⚡SCALE
  *Acceptance:* move-in, move-out, delinquent, rate-change and unit-vacated are emitted once,
  durably, and consumable by more than one subscriber. **Half of Modules v2 is "when X happens,
  do Y" and there is no X today.**
- [ ] `s8` **Attribution roll-up tables, computed nightly** — NONE — ⚡SCALE
  *Acceptance:* cost per move-in by channel × card × ad × creative × ZIP is precomputed; the
  portfolio dashboard reads roll-ups only; **no attribution aggregation runs on page load.**
- [ ] `s9` **Idempotency discipline on anything that spends or sends** — NONE — ⚡SCALE
  *Acceptance:* intent row written before the call; unique index on the provider id; outcome-unknown
  freezes rather than retries. **Port the PostcardRobot pattern — do not reinvent it.**
- [ ] `s5` **Messaging layer — SMS + voice behind one interface** — NONE — ⚡SCALE
  *Acceptance:* one seam; nothing outside it imports the vendor (the `PrintProvider` rule);
  per-brand 10DLC registration state is modelled and visible.
- [ ] `s6` **PMS adapter interface — storEDGE / SiteLink / Storable** — PARTIAL — ⚡SCALE
  *Acceptance:* one contract, one adapter per vendor; webhooks preferred over polling; a shared
  scheduler with per-facility cursors and vendor-aware backoff. Today's `facility_pms_*` tables are
  upload-driven.
- [ ] `s10` **Unit-level hold / reservation lock** — NONE
  *Acceptance:* two concurrent callers cannot book the same unit; holds expire.
- [ ] `s11` **Decide: absorb PostcardRobot, or keep it behind an API** — SPEC
  *Recommendation:* keep it separate behind an API. It already has a public-API task on its roadmap
  and it is the only part of the stack that spends real money on every call. **Log the decision in §7.**

### Phase B — RESPOND

The new revenue and the actual differentiator. Inventory already lands from the PMS, which is the
hard half. Gate: Phase A complete.

- [ ] `r1` AI voice agent quoting live sizes and prices — NONE — reads `facility_pms_units`
- [ ] `r2` Reservation + payment link by text mid-call — NONE — ⚡SCALE — needs `s10`
- [ ] `r3` Missed-call text-back in 5 seconds — NONE — ⚡SCALE — cron cannot do 5 seconds; needs `s1`+`s5`
- [ ] `r4` AI chat trained on the facility — SPEC — `facility_context` is the knowledge source
- [ ] `r5` Speed-to-lead under 60 seconds on every form — PARTIAL — ⚡SCALE — `partial_leads`, `lead_status_events`
- [ ] `r6` Tour booking with 24h and 1h reminders — NONE
- [ ] `r7` No-show recovery same day — NONE
- [ ] `r8` Abandoned online rental rescued within 10 minutes — PARTIAL — `partial_leads` is this capture
- [ ] `r9` Sold-out waitlist, auto-notify, payment link — NONE — **best idea in the module**; needs `s7`
- [ ] `r10` Spanish flows throughout — NONE — cheaper built in than retrofitted
- [ ] `r11` Overflow routing to a human — NONE — ⚡SCALE — **the pressure valve that makes voice
      concurrency caps safe. Build it with the agent, not after.**

### Phase C — MAIL

Connect a working system; unblock the triggers. Gate: `s11` decided, `s-mail-batch` shipped.

- [ ] `m1` Prospecting triggers, 5 touches ~24 days apart, First Class — BLOCKED — ⚡SCALE — see §5
- [ ] `m2` Welcome kit with gate code and map on move-in day — NONE — needs `s7`
- [ ] `m3` Referral card in month two — NONE — `referral_codes` exists
- [ ] `m4` Winback at 6, 12 and 24 months after move-out — PARTIAL — `moveout_remarketing`
- [ ] `m5` Rate-increase letter softened with a referral offer — NONE — `facility_pms_rate_history`
      gives the trigger. **Turns the most churn-inducing letter in storage into a referral ask.**
- [ ] `m6` Lien and auction notices — NONE — ⚠ statutory, state-specific. **Counsel before it sends.**
- [ ] `m7` Handwritten-style notecards for commercial and RV — NONE — `handwriting_style_id` is
      **already a parameter on the Thanks.io send call**. Close to free, premium price.

### Phase D — finish the bones

Highest value per hour in the plan: these have data layers already. Mostly configuration and UI.

- [ ] `t4` Autopay enrolment push in month one — NONE — **biggest churn reducer in storage, unbuilt**
- [ ] `t1` Review engine, 3 days post-move-in — PARTIAL — ⚠ **fix the routing first, see §5**
- [ ] `t3` Delinquency at 5/10/15 days with payment link — PARTIAL — easiest ROI story in the platform
- [ ] `t2` AI drafts review responses — NONE — owner approves, never auto-post
- [ ] `t5` Insurance and lock upsell at move-in — NONE
- [ ] `t6` Referral program, both sides free month — PARTIAL
- [ ] `t7` Exit survey with counter-offer — NONE — `churn_predictions` targets it
- [ ] `t8` Anniversary touches — NONE
- [ ] `c3` storEDGE rental embed — reserve and pay in page — NONE — the one hard CONVERT integration
- [ ] `c6` Price-drop and back-in-stock alerts — NONE — shares waitlist machinery with `r9`
- [ ] `c7` Exit-intent offer — NONE
- [ ] `c8` QR yard signs on fence line and gate — NONE — free drive-by traffic; needs per-sign codes
- [ ] `c1` Branded site scoring 90+ on mobile — PARTIAL — measurement task
- [ ] `c2` One landing page per ad — PARTIAL
- [ ] `c4` Size calculator ending in "reserve this unit" — PARTIAL — `/calculator` exists
- [ ] `c5` Live unit availability with price — PARTIAL — ⚠ freshness depends on `s6`
- [x] `c9` Google Business Profile built and posting weekly — SHIPPED — six GBP tables
- [ ] `p1` One dashboard, cost per move-in — PARTIAL — ⚡SCALE — needs `s8`
- [ ] `p6` Revenue attributed, not leads counted — SPEC — ⚡SCALE
- [ ] `p8` Portfolio roll-up for multi-facility owners — PARTIAL — ⚡SCALE — needs `s8`
- [ ] `p2` Tracked number and QR on every asset — PARTIAL
- [ ] `p3` Call recordings — PARTIAL — ⚠ two-party consent states need an announcement
- [ ] `p4` Occupancy trend against their market — PARTIAL
- [ ] `p5` Competitor rate tracking, monthly — PARTIAL — ⚠ ToS exposure depends on collection method
- [ ] `p7` Monthly branded "State of Your Market" report — PARTIAL — retention + referral in one PDF

### Phase E — widen

Gate: one facility fully attributed end to end.

- [ ] `h2` Competitor conquesting inside 1 mile — NONE — `places_data` already finds them
- [ ] `h3` Geofenced audiences — U-Haul, apartments, dorms, permits — NONE
- [ ] `h4` Just-sold retargeting synced to the ZIPs the mail hits — NONE — ⚠ see PII note in §5
- [ ] `h5` Seasonal autopilot — May move-out, October snowbirds, pre-winter RV — NONE
- [ ] `h6` Lease-up mode for new builds — NONE
- [ ] `h1` Meta and Google management — PARTIAL
- [ ] `h7` Past-tenant reactivation audiences — PARTIAL — `moveout_remarketing`
- [ ] `h8` Creative engine — UGC, drone, before/after — PARTIAL
- [ ] `v1` **Vertical seam** — domain layer speaking `Location` / `InventoryItem` — NONE — see §6
- [ ] `v2` White-label GA + per-partner 10DLC pipeline — PARTIAL

---

## 4 — Scale: the numbers

**The thesis: capacity is not the problem, fairness is.** You hit *vendor* limits long before
hardware, and each one is a single shared budget spent across all customers at once. The failure
mode is not slowness — it is **one portfolio customer's Tuesday making fifty other customers'
Wednesday late.**

### What scales with what

| Resource | Scales with | A 20-facility account |
|---|---|---|
| Mail throughput | prospect universe × touches | **The big one.** |
| Dashboard aggregation | facilities × attribution dimensions | **Worst case — combinatorial.** |
| SMS volume | unit count × lifecycle events | Proportional, predictable |
| PMS API calls | facility count | Exactly 20× — and multiplied again per customer |
| Database rows | unit count × event rate | Large but boring; `facility_id` is well indexed (72 index entries across 64 tables) |
| Voice concurrency | **customer count, not facility count** | **Barely moves.** Calls spread across the day |

> **Do not fear the voice bill from a big account.** Fear the mail window and the dashboard query.

### Chokepoint register

| Chokepoint | Limit today | Breaks when | Fix |
|---|---|---|---|
| **Mail API** (Thanks.io) | 60 req/min **account-wide**, throttled to 50. One recipient per call. ≈2.16M cards/month company-wide | **Immediately.** A 50,000-piece run is 50,000 calls = **16.7 hours** of the company's entire mail capacity, everyone else queued behind it | `s-mail-batch`. At 100/call the same run is **500 calls, ~10 minutes** |
| **Job runtime** | Vercel functions cap at 300s. **No queue.** | Any run over 300s | `s1` — prerequisite for most of this table |
| **PROVE roll-ups** | Live joins across `facility_id IN (…)` × 5 dimensions | 20 facilities × cost-per-move-in by channel/card/ad/creative/ZIP | `s8` nightly roll-ups |
| **PMS APIs** | Per-connection vendor limits | 100 customers × 20 facilities = **2,000 connections**; 5-min polling = 24,000 calls/hour | `s6` webhooks first, then shared scheduler with cursors and backoff |
| **SMS** | A2P 10DLC per-campaign TPS, per-brand registration | **The first white-label partner** | Registration as an onboarding gate with visible status |
| **Voice** | Concurrency priced per line | Simultaneous conversations across all customers exceed provisioned lines | Per-tenant caps + `r11` overflow-to-human |
| **Tenancy** | `organization_id` nullable | Any portfolio authz check or roll-up | `s3` |
| **Plan ceiling** | `facility_limit` = 10 | Day one of the first 20-facility deal | `s4` |

### Load tiers

| Tier | Facilities | What must be true |
|---|---|---|
| Single | 1 | Today's architecture is fine |
| Small | 2–5 | Facility switcher, per-facility numbers and pages — mostly shipped |
| Mid | 6–19 | Roll-ups start to hurt; **`facility_limit` trips at 10** |
| **Portfolio** | **20+** | **All of Phase A is mandatory** |
| White-label | partner × many orgs | Adds a tenancy level above org, per-partner 10DLC brands, per-partner billing |

> **The one thing to do before signing a portfolio account:** ship `s-mail-batch` and `s1`. Together
> they turn the largest load the platform will ever take from a sixteen-hour company-wide outage
> into a ten-minute job.

---

## 5 — Compliance and data reality

Four things in Modules v2 **cannot ship as written.** See also `COMPLIANCE.md`.

### The trigger gap

The signal set is fixed in code — 9 events, 6 conditions, 5 scores
(`robopostcards/src/lib/feeds/types.ts`). Six of ten promised triggers map; four do not exist.

| Promised | Reality |
|---|---|
| Movers | ✓ `just_sold` |
| Pre-foreclosure · Probate · Tax delinquent | ✓ exist — **but gated, below** |
| Absentee owner · Expired listings | ✓ `absentee_owner` · `expired_listing` |
| **Divorce** | ✗ Not in the set. Court records; no vendor supplies it |
| **Evictions** | ✗ Not in the set. Same problem |
| **Downsizers** | ✗ Not a signal. Derivable at best, unproven |
| **Business closings** | ✗ Not in the set. Commercial data, different vendor |

**Do not sell what does not exist.**

### The distress gate

Probate, pre-foreclosure, foreclosure, tax delinquent, tax lien, quit claim and expired listing are
**refused by the code** pending a live filter-bite proof. The decision to mail them was made and
logged; the proof has not run. **Until it does, MAIL prospecting ships on three usable triggers —
movers, absentee owner, expired listing — not ten.** Say that in the sales conversation.

### RESPOND is inbound-safe by design — hold that line

Every RESPOND capability is inbound or consented: missed-call text-back (they called), form
speed-to-lead (they submitted), abandoned-rental rescue (they started checkout), waitlist notify
(they opted in), tour reminders (they booked). That is genuinely well-constructed and keeps the
module clear of the worst of TCPA.

**Outbound AI voice to prospects is a different legal universe.** The FCC ruled in February 2024
that AI-generated voices in robocalls are "artificial" under the TCPA — prior express written
consent for anything marketing. **Answering is fine. Dialling is not.**

### Review routing as written is review gating

"Happy tenants to Google, unhappy ones to a private form" is the textbook definition. Google's
policies forbid soliciting reviews selectively by sentiment, and enforcement is real.

**The compliant version keeps almost all the value:** ask every tenant the same question, show both
paths to everyone, never branch the public-review invitation on the score. You still catch unhappy
tenants first — you just do not suppress them. Fix `t1` before it ships, not after a policy strike
on the map pack you are trying to protect.

### Also needing a decision, not a surprise

- **A2P 10DLC per white-label brand** — each partner needs its own registered brand before sending
  one text; registration takes days. Make it an onboarding gate with visible status.
- **Call recording consent** — two-party states need an announcement. The agent is the place to say it.
- **Address-matched custom audiences** (`h4`) — uploads prospect addresses to Meta. Processor
  relationship and a DPA question, sitting next to a deliberate posture in the mail system that
  owner PII never reaches customers. Decide it explicitly.
- **Lien and auction mail** (`m6`) — statutory and state-specific; getting format or timing wrong is
  a legal consequence, not a refund.

---

## 6 — The vertical seam

Storage first is right. The risk is not starting narrow — it is **storage vocabulary leaking into
the spine** so vertical two becomes a rewrite.

**Do not migrate the schema.** Renaming `facilities` and `facility_pms_units` across 64 tables is
expensive, risky and low-reward. **Quarantine the vocabulary instead:** define the generic contract
in a domain layer — `Location`, `InventoryItem` (size, price, availability), `LifecycleEvent`,
`Metric` — map storage onto it, and never let a second vertical touch the physical table names.
Same discipline the mail system uses for vendor wire formats: the fix stays in one file.

**A vertical is a config pack, not a codebase:** inventory schema · lifecycle event map (start, end,
at-risk, price change, availability change) · trigger catalog · copy catalog · integration adapter ·
metric definitions + compliance profile.

**Stays storage-only:** PMS adapters · lien and auction statutory mail · occupancy and economic-
occupancy metrics · unit-size taxonomy and the size calculator.

> **Define the seam. Do not build the framework.** An abstraction with one implementation is a
> guess. Storage is where you learn what the abstraction should have been.

---

## 7 — Decision log

Append-only. Date, decider, decision. Newest entry wins over prose above.

- **2026-08-30 · Claude** — MISSION.md created to fill the gate slot that `next.md` and
  `continue.md` have referenced since they were written. States derived from schema reading, not
  from running the app; see the provenance note in §0.

### Open decisions

- **`s11`** — absorb PostcardRobot or keep the API boundary? *Recommendation: keep it separate.*
- **Voice vendor** — concurrency pricing and latency decide it; the one dependency with no fallback.
- **Which PMS first** — storEDGE is named in CONVERT; SiteLink and Storable are the rest of the market.
- **Portfolio price** — $2,497 is the current top tier; a 20-facility owner is a different animal.
- **Does the distress filter-bite proof pass?** Seven of ten triggers depend on it.
- **Who operates this at 50 accounts?** The console is good; it is not a support team.
