# StorageAds — What It Is, How It Works, Why It's Different

A plain-English walkthrough for investors, partners, developers, and anyone Blake wants to explain the company to over coffee.

---

## The problem in one paragraph

If you own a self-storage facility and you spend money on Google or Facebook ads, the report you get at the end of the month says something like: *"You got 100 leads at $30 each."* That sounds great. The catch: a "lead" is just someone who filled out a form. It isn't money. Money is when someone signs a lease and moves their stuff in. The difference between leads and move-ins is huge — some landing pages convert 30% of leads to move-ins, others 5%. A $30 lead at a good landing page costs $100 per move-in. A $20 lead at a bad one costs $400 per move-in. *Cost per lead* alone can't tell you which is which. But cost-per-lead is what every storage marketing report has measured for the last twenty years.

**StorageAds measures cost per move-in.** That single change — from "the form got filled out" to "the unit got rented" — is the whole company.

---

## What StorageAds does, in one paragraph

StorageAds is software a self-storage owner uses to run their ads, build their landing pages, capture their leads, automate their Google reviews, and — here's the part nobody else does well — connect those marketing dollars to the actual move-ins inside their property-management system (PMS).

Instead of *"you spent $5,000 and got 167 leads,"* the operator sees *"you spent $5,000 and got 23 move-ins at $217 each, locking in $34,500 of annual rent."* That second sentence is the one the operator can act on.

---

## How it works (5 steps, no jargon)

1. **The operator signs up.** We connect their property-management software (today: storEDGE; SiteLink, Yardi, Easy Storage Solutions coming next).

2. **We build their marketing stack.** Landing pages on storageads.com. Ads across Google, Meta, and TikTok. A tracked phone number on the landing page (Twilio). A QR code in the office for walk-ins. Google Business Profile connected for reviews and Q&A.

3. **We follow the customer the whole way.** Someone clicks an ad → lands on the page → starts filling out a form → reserves a unit → physically moves in. Every step is captured. Whether it happens in 10 minutes or 3 weeks. Whether it ends in a form, a phone call, or a walk-in.

4. **We tell the ad platforms what really happened.** When a move-in completes, we send a signal back to Meta and Google so their bidding algorithms learn what produces *move-ins*, not just what produces form-fills. (Industry term: "server-side Conversions API.") Most storage marketers don't do this, and you can't really do it without integrating with the PMS.

5. **We report on the right number.** Cost per move-in. Return on ad spend (ROAS). Occupancy change versus baseline. Plus the day-to-day things: which tenants are likely to leave, which units are underpriced, which Google reviews need responses, when to send a "come back" email to a former tenant.

---

## What makes us different (the 60-second version)

There are basically four kinds of tools self-storage owners use today. None of them does all of what we do.

| Option | What they do well | What's missing |
|---|---|---|
| **Storable's marketing** (the PMS giant) | Built-in, knows your PMS data | You have to use *their* PMS to get it. Marketing decision is tied to the PMS decision. |
| **Marketing agencies** (StoragePug, G5, StorageRankers) | Will do it for you. Often a good job. | You rent the work, not own it. Switching is painful. Mostly Google Ads — limited multi-platform. |
| **DIY** (Google Ads + a spreadsheet) | Cheapest, fully under operator's control | No automation, no attribution to move-ins, lots of operator time. |
| **General attribution tools** (Triple Whale, Northbeam, etc.) | Sophisticated tracking | Built for e-commerce. Doesn't know what a "move-in" is or how to pull it from storEDGE. |

**StorageAds is software the operator owns, works with whatever PMS they have, and measures cost per move-in.** That combination doesn't exist in the market today (as far as we can tell from public information about each competitor).

---

## The "secret sauce": operator-built software

Here's the thing that doesn't show up on a feature list but matters more than any individual feature:

The platform is **built by a self-storage operator, not by software people who hired a storage consultant.** That shows up in small, specific places throughout the code:

- We know that raising rates on a tenant who's been there less than 6 months drives them out. So we only flag rate-increase candidates after 180 days of tenancy AND when they're at least 20% below market.
- We know the storage industry's accounts-receivable aging buckets (0–30, 31–60, 61–90, 91–120, 120+) line up with state-by-state lien-sale timing. We bucket aging that way; generic accounting software doesn't.
- We know self-storage demand happens in three flavors: online form-fill, phone call, drive-by walk-in. Most marketing tools handle the first. We handle all three.
- Our AI-generated audit tool uses operator vocabulary ("move-ins" not "customers", "street rate" not "list price") and references industry-standard benchmarks (autopay adoption averages 55%; top performers hit 75%+). A generalist tool wouldn't know those numbers existed.

A facility owner reading the platform's output recognizes it as written for them. That's the moat.

---

## How we get our first customers (the audit funnel)

Top of funnel is a free audit tool at **storageads.com/audit-tool**. An operator fills out a 40-question diagnostic. Our AI (Claude Sonnet 4) produces a detailed audit:

- 8 categories scored (Occupancy, Lead Generation, Sales, Marketing, Digital Presence, Revenue Management, Operations, Competition)
- Industry benchmarks vs. their facility
- A *"cost of doing nothing"* number — projected revenue loss in 6, 12 months if they ignore the findings
- A 90-day projection if they take action
- A specific recommendation list

The operator gets a shareable URL good for 90 days. When they view their audit page three times, we automatically notify our sales team — that's the "hot lead" signal. Then we book a call (via Cal.com), walk them through the findings, and pitch them on the platform.

The audit is honest — it gives operators real numbers they can use even if they don't buy. The pitch is that we can fix the things the audit found.

---

## What's built today

✅ Full attribution chain: click → landing page → form/call/walk-in → reservation → move-in
✅ Server-side conversion forwarding to Meta CAPI and Google Enhanced Conversions
✅ storEDGE PMS integration (webhook + structured report import)
✅ 40-question AI audit funnel with shareable results
✅ Landing-page builder
✅ Call tracking with Twilio
✅ Walk-in attribution via in-office QR codes
✅ Google Business Profile sync with AI-drafted review responses
✅ Tenant churn prediction
✅ ECRI (rate-increase) candidate flagging
✅ Move-out → 90-day win-back email sequence
✅ White-label / partner dashboard for management companies
✅ Subscription billing via Stripe (4 tiers: $499–$2,499/month per facility)
✅ External API for partners with scoped keys and outbound webhooks
✅ 13 daily/weekly automation jobs (drip sequences, review solicitation, recovery emails, GBP sync, etc.)

The platform is **89 database tables, 178 API endpoints, ~125,000 lines of code**, built by two people (Blake + Angelo) over the last six weeks. Currently pre-launch; alpha-testing with Blake's own facilities starts next.

---

## What's coming (the honest "what we don't do yet")

The biggest gap is small in code but big in importance:

- **Auto-close the move-in loop.** Today, when storEDGE confirms a move-in, our system logs it but a human has to mark the corresponding lead as "moved in" for the report to count it. This is roughly 50 lines of code to automate; it's the next thing on the build list.

Other things on the near-term list:

- SiteLink integration (the second-most-common PMS after storEDGE)
- Yardi Self-Storage integration
- AI extraction from PDF reports for owners whose PMS doesn't have an API
- Consolidate four separate sequence engines (drip, nurture, retention, win-back) into one
- Add Twilio webhook signature verification (currently rate-limited only)
- More test coverage — today only the highest-risk pieces (Stripe webhook, auth helpers, public API) have automated tests

Honest about it because it's all addressable and tracked.

---

## Who this is for

Each audience needs different details. Here's the quick version for each.

### For a storage operator

- **What changes for you.** You stop guessing whether your ads work. Instead of *"we got 100 leads at $30"* you see *"we got 12 move-ins at $250 each — locking in $14,400 of annual rent."* That second number is the one your bank cares about.
- **What you do week to week.** Very little. We run the ad accounts, build and operate the landing pages, provision the tracked phone numbers, watch the funnel. You spend 15 minutes reviewing AI-drafted Google review replies, glancing at the rate-increase candidates we flag, and reading a weekly digest email. The platform handles the rest.
- **Do you have to switch PMS?** No. We work alongside whatever you're on. storEDGE is integrated today; SiteLink, Yardi Self-Storage, and Easy Storage Solutions are next.
- **What it costs.** Four tiers between $499 and $2,499 per facility per month. Ad spend is separate and goes directly to Meta and Google — we don't mark it up or skim it. Most independent operators we've designed for spend $1,000–$5,000/month per facility on ads.
- **What you get on day one.** A full facility audit. AI-generated, 8 categories scored against industry benchmarks, real recommendations, a dollars-per-month estimate of what doing nothing is costing you. The audit is yours whether you sign up or not.
- **What you get by day 30.** Landing pages live. Ads running across Google and Meta. Calls tracked. Google reviews getting AI-drafted responses for your approval. First attribution data populating.
- **What you get by day 90.** Real cost-per-move-in numbers. Churn risk scores on your current tenants. ECRI (rate-increase) candidates flagged with projected revenue lift. Your first full monthly client report.
- **Who this isn't for.** REIT-scale operators with 500+ facilities (the platform isn't sized for that yet). Operators in lease-up looking for site-selection or feasibility help (we're an acquisition platform, not a consultancy). Operators who don't run digital advertising and don't intend to start (we're a force multiplier, not a magic wand).

### For an investor

- **Market.** ~60,000 self-storage facilities in the US. ~35% are owned by the five large REITs (Public Storage, Extra Space, CubeSmart, Life Storage, NSA). The remaining ~40,000 facilities are held by independents and small portfolios — our addressable customers.
- **Revenue model.** Per-facility-per-month subscription, $499–$2,499. Net revenue retention is structurally strong because the platform produces measurable rent uplift; churn correlates with overall facility performance, not with platform satisfaction.
- **Defensibility.** The operator-built knowledge encoded in the platform — ECRI rules, aging buckets, audit prompts, walk-in handling, churn factors — is hard to replicate for a software-first competitor. The PMS integrations (storEDGE today; others next) are non-trivial vertical-industry work. Storable has the data but won't unbundle from their PMS. Agencies have the relationships but can't ship software at this depth.
- **Category shift.** "Cost per move-in" replacing "cost per lead" is the bet. The same shift e-commerce made from "cost per click" to "cost per purchase" a decade ago. Whoever owns the measurement category in self-storage during the shift wins disproportionately because attribution data compounds — every additional facility makes the platform's benchmarks more accurate, which makes the next sale easier.
- **Stage.** Pre-launch but functional end-to-end. Alpha-testing begins on Blake's own facilities. We're not raising on a deck; we're raising on a working platform.

### For a partner (management company or marketing agency)

- **White-label-ready.** Per-organization custom logo, colors, primary/accent palette, and custom domain. Your facilities see your brand, not ours.
- **Revenue share.** Built into the platform at the schema level. Partners earn a configurable percentage of MRR on facilities they refer or operate. Tracked monthly; payouts auditable.
- **External API.** 12 v1 endpoints, scoped API keys (`sk_live_*` bearer tokens), rate limits per key, usage logged. Outbound webhook subscriptions for six event types (`lead.created`, `lead.updated`, `unit.updated`, `facility.updated`, `special.created`, `special.updated`) with HMAC-SHA256-signed payloads.
- **Partner dashboard.** Your team manages your portfolio of facilities under your organization. Multi-user with role-based access (`viewer`, `org_admin`, `org_superadmin`). Optional TOTP 2FA. 30-day session tokens. Full audit log of org activity.
- **What this lets you do.** Operate dozens or hundreds of facilities under one org. Sell marketing services to your operator base under your brand. Plug your existing dashboards and reporting into our API. Get paid a share of platform revenue on every facility you bring.

### For a developer

- **Stack.** Next.js 16 (App Router) on Vercel, React 19, Prisma 5 against Postgres (Neon), Tailwind CSS 4. Server-side Sentry with auth-header scrubbing. Upstash Redis for rate-limit and cache. Vercel Blob for file uploads. Anthropic Claude for AI generation. FAL.ai for image/video generation.
- **Auth.** Four parallel systems handled cleanly through shared middleware: admin key (`X-Admin-Key`), client portal access code, partner session token (`Bearer ss_*`), external API key (`Bearer sk_live_*`), plus webhook signature verification (HMAC-SHA256 on storEDGE, Cal.com, Stripe, Meta) and cron-secret auth on scheduled jobs. CSRF double-submit on state-changing browser requests; rate-limit tiers via Upstash.
- **Cron.** 13 scheduled jobs on Vercel with three batching patterns (cursor pagination, time-budgeted loops, chunked deletes), transactional state-safety where partial completion would corrupt state, and failure alerts to admin email.
- **Test coverage.** Vitest, focused on the highest-risk surfaces: auth helpers, Stripe webhook, external API CRUD. Coverage expansion is on the near-term roadmap.
- **What you'd build against.** The v1 API exposes facilities, units, occupancy snapshots, specials, leads, tenants, tenant payments, call logs, landing pages, webhook subscriptions, and usage analytics. Bearer-token auth with nine scopes. Outbound webhook subscriptions for real-time event notifications. JSON over HTTPS; no SDKs to install. Documented with examples on day one.

---

## The single sentence

If a busy person reads only one sentence about StorageAds, this is it:

> **Self-storage marketing has been measuring the wrong thing for twenty years; the right thing to measure is cost per move-in, and StorageAds is the operator-built platform that finally does it.**

That's the company.

---

*For the deep technical version of this — schema details, API surface, attribution chain trace, the limitations we know about — see [WHITEPAPER.md](WHITEPAPER.md). For the line-by-line code citations behind every claim, see [WHITEPAPER_REFERENCES.md](WHITEPAPER_REFERENCES.md). For the per-phase analysis that produced both, see the [analysis/](analysis/) directory.*
