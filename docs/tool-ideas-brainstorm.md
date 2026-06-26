# Tool Ideas — derived from /ideas Parts 2 & 3

Internal brainstorm. Source: the `/ideas` doc (`src/lib/ideas-doc.ts`), Part 2 ("New Ideas That Build On What Exists", depts A–J) and Part 3 ("The Most Advanced Ideas", #1–12).

## What counts as a "tool" here

The free **audit tool** is the archetype: a self-contained utility where a user gives a few inputs and gets an instant, useful output — and it doubles as a lead. So for this list, a "tool" is:

- **Discrete + on-demand** — you open it, run it once, get a result. Not a background automation.
- **Input → output** — a calculator, generator, diagnostic, lookup, simulator, or report builder.
- **Standable-alone** — could live on its own page (public lead-gen) or as a single panel in admin/portal.

That distinction matters because **most of Parts 2 & 3 are NOT tools** — they're *autopilots* (run continuously: budget autopilot, street-rate autopilot, win-back autopilot), *syncs/plumbing* (live PMS sync, rate write-back, move-in reconciliation), or *platform/marketplace plays* (demand exchange, data co-op, fintech rails). Those are valuable but they aren't the "open it and run it" shape. The tool ideas below extract the runnable core from those, or are net-new.

---

## A. Which existing Part 2 / Part 3 ideas are already tool-shaped

These are the ones from the doc that map cleanly onto a discrete utility (vs. an autopilot or a platform):

| Source | Idea | Tool form |
|---|---|---|
| 2-A | "You vs. your competitor" audit | Side-by-side scorecard — already a tool |
| 2-D | What-if NOI simulator | Slider simulator — pure tool |
| 2-D | Rate-increase letter machine | One-shot letter generator |
| 2-E | Lender / board NOI deck | Deck/PDF builder |
| 2-E | New-facility demand map | Heatmap lookup |
| 2-F | Local rank tracker | Map-pack rank checker (one-shot version) |
| 2-J | A/B testing studio | Test-builder tool |
| 3-1 | Benchmark-as-a-service | Public benchmark lookup |
| 3-3 | Embeddable widgets | Drop-in audit/availability/review widgets |
| 3-6 | Auto-underwriting buy-box | Deal underwriter tool |
| 3-6 | Appraisal-grade valuation | Instant valuation tool |
| 3-11 | On-demand market reports | Metro report generator |
| 3-11 | Self-serve data API store | Query console |

Everything else in Parts 2 & 3 is an autopilot, a sync, an agent, or a network/marketplace — not a standalone tool.

---

## B. New tool ideas, sorted basic → most complex

Each entry: **what it does · input → output · builds on · public lead-gen (🎣) or operator-facing (🛠) · derived-from.** "New twist" notes where it goes beyond the source idea rather than copying it.

### Tier 1 — Basic (single formula or one scraped input; mostly static; great public lead-gen)

1. **Vacancy Cost Clock** 🎣
   What an empty unit costs you per day, sitting idle.
   *In:* unit type + your rate · *Out:* $/day and $/month bleeding, with a "days to fill" payback line.
   Builds on: revenue-loss math. Derived from 2-C "pause when full" inverted into a guilt-trip calculator. New twist: framed as a live ticking counter, pure top-of-funnel hook.

2. **Revenue Leak Calculator** 🎣
   How much you're leaving on the table vs. market.
   *In:* # units, avg occupancy, avg rate, zip · *Out:* annualized $ gap vs. local street rates.
   Builds on: audit + competitor scan. Derived from the audit's revenue-loss analyzer, pulled out as a one-number standalone.

3. **"What Should I Charge?" Rate Calculator** 🎣
   Suggested street rates for your mix.
   *In:* zip + unit sizes you offer · *Out:* recommended web rate per size from nearby comps.
   Builds on: competitor scan + unit mix. Derived from 2-D street-rate autopilot → its read-only one-shot core.

4. **ECRI / Rate-Increase Letter Generator** 🛠
   *In:* current rate, tenant tenure, target % · *Out:* ready-to-send, on-brand increase letter (email + SMS variants).
   Builds on: email/SMS templates + safety scoring. Derived from 2-D rate-increase machine, minus the scheduling automation.

5. **Map-Pack Rank Checker** 🎣
   Where you rank for "storage near me" today.
   *In:* facility name/address · *Out:* current local rank + the 3 competitors above you.
   Builds on: Google listing + market scan. Derived from 2-F local rank *tracker* → one-shot check (tracker = the autopilot version).

6. **Review Response Generator** 🛠/🎣
   *In:* paste a Google review · *Out:* on-brand reply draft (and a flag if it needs an owner's personal touch).
   Builds on: GBP responses + Claude. Derived from existing GBP machinery as a free standalone.

7. **Move-Out Win-Back Offer Generator** 🛠
   *In:* move-out reason + unit type · *Out:* tailored win-back offer copy + suggested incentive.
   Builds on: win-back + creative generator. Derived from 2-H win-back *autopilot* → its copy core.

8. **Ad Headline Generator (lite)** 🎣
   *In:* facility + current promo · *Out:* 5 ready ad headlines + 2 primary-text options.
   Builds on: creative generator. A trimmed public taste of Angelo's engine (coordinate; don't touch internals).

9. **Storage Demand Snapshot by Zip** 🎣
   *In:* zip · *Out:* quick read: # facilities, est. saturation, demand temperature.
   Builds on: competitor + demographics scan. Derived from 2-E demand map, simplified to a single-zip readout.

10. **Auction Math / Lien Recovery Estimator** 🛠
    *In:* months delinquent, balance, est. unit contents value · *Out:* projected recovery vs. write-off after fees.
    Builds on: tenant CRM math. Derived from 2-D delinquency→auction pipeline → its calculator slice.

### Tier 2 — Intermediate (multi-input, blends scraped + entered data, richer report/simulation; usually needs an account)

11. **What-If NOI Simulator** 🛠
    Sliders for occupancy, rate, and ad budget → live profit impact.
    Builds on: NOI report + revenue analytics. Directly 2-D — already tool-shaped, just build it.

12. **Unit-Mix Optimizer** 🛠
    *In:* current unit mix · *Out:* which sizes to add/convert based on local demand and rate-per-sqft.
    Builds on: unit mix + market demand. New: nobody in the list owns "should I reconfigure my mix."

13. **Delinquency-to-Auction Timeline Builder** 🛠
    *In:* state + first-missed-payment date · *Out:* state-lien-law-compliant escalation schedule + each templated notice, dated.
    Builds on: messaging + tenant CRM. Derived from 2-D pipeline; the state-law layer makes it a real tool, not a toy.

14. **Acquisition Quick-Underwrite** 🎣/🛠
    *In:* paste a facility-for-sale listing (or address + asking price) · *Out:* est. NOI, cap rate, and a buy / watch / pass verdict.
    Builds on: market scan + NOI model. Derived from 3-6 auto-underwriting buy-box → one-shot, no LOI drafting yet.

15. **Lender / Board NOI Deck Builder** 🛠
    *In:* facility numbers (or connected data) · *Out:* investor-ready PDF performance deck.
    Builds on: NOI report + pitch voice. 2-E, as an on-demand export.

16. **Creative Fatigue Checker** 🛠
    *In:* paste an ad's CTR-over-time · *Out:* fatigue score + "refresh now / still fine" verdict + a fresh headline if it's tanking.
    Builds on: spend/attribution + creative gen. Derived from 2-C fatigue *detector* → manual checker version.

17. **Portfolio Benchmark Report** 🛠
    *In:* your facilities (connected) · *Out:* ranked against each other and the local market, with the worst-gap callouts.
    Builds on: performance aggregator + market intel. 2-E, as a report.

18. **Trade-Area Demand Heatmap** 🎣/🛠
    *In:* draw or pin a trade area · *Out:* unmet-demand heat score for "where to build/buy."
    Builds on: competitor + demographics. 2-E demand map, full version.

19. **Tenant Referral Kit** 🛠
    *In:* facility + credit rules · *Out:* a shareable referral link + printable QR + tracking page.
    Builds on: referral engine + tenant CRM. Derived from 2-H referral program → the self-serve setup tool.

20. **On-Demand Market Report Generator** 🎣/💲
    *In:* a metro · *Out:* polished, sellable market study PDF (rates, occupancy, saturation, demand).
    Builds on: market scan + report engine. 3-11 — strong paid-tool / lead-magnet candidate.

### Tier 3 — Advanced (needs the data network, live availability, the v1 API, or agentic layers; platform-grade)

21. **Benchmark-as-a-Service Portal** 🎣/💲
    Any facility — even a non-customer — pays/signs up to see exactly how its rates, occupancy, and reviews rank against its true local set.
    Builds on: data network + market scan. 3-1 NEAR. The wedge that pulls facilities onto the network.

22. **Embeddable Widgets** (audit · live-availability · reviews · booking) 🎣
    Drop-in `<script>` widgets for a facility's own site.
    Builds on: audit + availability API + GBP. 3-3 NEAR. Distribution as a tool.

23. **Appraisal-Grade Valuation Tool** 🛠/💲
    *In:* facility (connected or addressed) · *Out:* instant, defensible valuation with the comps and assumptions shown.
    Builds on: data network + NOI model. 3-6.

24. **Storage NOI Score Lookup** 🛠/💲
    A verified, real-time creditworthiness primitive per facility, on demand.
    Builds on: NOI report + PMS sync. 3-5 — the "FICO of facilities" surfaced as a lookup.

25. **Facility Digital Twin Simulator** 🛠
    Test "cut rates 5% / double ad spend" against a modeled facility before risking a dollar — a richer, forecasted sibling of the NOI simulator (#11).
    Builds on: forecast + NOI model. 3-4.

26. **AI Availability Concierge Widget** 🎣
    Renter asks "got a 10×10 near downtown under $120?" → real availability + a reservation link, by text or on-page chat.
    Builds on: live availability + reservation + Claude. 2-G + 3-2, surfaced as an embeddable tool.

27. **Portfolio AI Assistant (ask-anything)** 🛠
    Natural-language console over all analytics: "how are my ads doing this month?" → a real answer with the numbers.
    Builds on: all analytics + Claude. 2-G.

28. **Self-Serve Data Query Console** 🛠/💲
    Pay-per-query access to competitor pricing, occupancy, and demand by market — the human-facing front end of the data API.
    Builds on: data network + v1 API + metering. 3-11.

29. **Reverse-Marketplace Renter Request Tool** 🎣
    Renters post "need a 10×10 near downtown under $120"; facilities auto-respond with offers.
    Builds on: reservation widget + availability + pricing. 3-2 BIG.

30. **AI Voice Receptionist Console** 🛠/💲
    Config + transcript review tool for a 24/7 agent that answers calls, quotes real availability, books tours.
    Builds on: call tracking + availability + reservation. 3-4 BIG.

---

## C. Sequencing read

If the goal is *lead-gen tools that feed the audit funnel*, the cheapest high-leverage builds are the **Tier 1 public calculators** (#1–3, #5) — they're single-input hooks that reuse the audit's scrapers and drop straight onto landing pages. If the goal is *operator value that justifies a paid tier*, **#11 NOI Simulator** and **#17 Portfolio Benchmark** turn read-only data we already collect into something operators open weekly. And the strategic wedge from the doc itself — **#21 Benchmark-as-a-Service** + **#22 Embeddable Widgets** (both 3-NEAR) — is the tool pair that pulls non-customer facilities onto the network and starts the data flywheel.

The autopilots and syncs in Parts 2 & 3 are not on this list by design — they're background engines, not tools. Several of these tools are the *manual, on-demand front half* of those engines (e.g. #3 → street-rate autopilot, #16 → fatigue detector, #5 → rank tracker), which makes them a natural shipping order: ship the tool, learn, then automate it.

---

## D. Deep-dive specs — the first eight to build

Grounded in machinery that already exists in the repo. File references are the real source each tool leans on, so "builds on" is verifiable, not aspirational.

**Existing machinery these reuse:**
- `src/lib/aggregator-scrape.ts` — `scrapeSparefoot()` / `scrapeSelfStorage()` return `AggregatorResult` with `AggregatorUnit[]` (live competitor unit sizes + prices). This is the engine behind every "vs. market" number below.
- `src/lib/noi-report.ts` — `computeNOIForFacility()`, NOI snapshots, `weekRange()`. The engine behind every profit/NOI tool.
- `src/lib/scrape-website.ts` + `/api/audit-generate-diagnostic` — the audit's own facility-scrape + diagnostic.
- `src/lib/gbp/` + `/api/gbp-reviews` + `/api/review-request` — reviews + responses.
- `/api/generate-copy`, `/api/moveout-remarketing` — Claude copy generation already wired.
- `GOOGLE_PLACES_API_KEY` + `/api/places-photo` — facility lookup/identity.

Each spec: **the aha · inputs · output · data source · lead hook · effort.**

### 1. Revenue Leak Calculator 🎣 (Tier 1)
- **The aha:** one number — "$41,200/yr left on the table" — that the prospect didn't know and now can't unsee.
- **Inputs:** # units, avg occupancy %, avg current rate, zip (4 fields).
- **Output:** annualized $ gap = `(market_rate − your_rate) × occupied_units × 12`, plus the occupancy-gap line, plus a one-paragraph "where it's leaking."
- **Data source:** `scrapeSparefoot()`/`scrapeSelfStorage()` by zip for `market_rate`; everything else entered.
- **Lead hook:** "See the full breakdown by unit size → run the free audit." The leak number pre-fills the audit.
- **Effort:** S. The hard part (comp scrape) already exists; this is a form + one formula + the existing scrape call.

### 2. "What Should I Charge?" Rate Calculator 🎣 (Tier 1)
- **The aha:** a per-size rate table benchmarked to live local comps, in 10 seconds, no spreadsheet.
- **Inputs:** zip + which unit sizes you offer (checkboxes: 5×5, 5×10, 10×10, 10×15, 10×20, climate y/n).
- **Output:** recommended web rate per size (low/median/high band from comps) + "you're X% under/over market" if they enter current rates.
- **Data source:** `AggregatorResult.units` grouped by size from the aggregator scrape.
- **Lead hook:** "Want these set automatically as occupancy moves? That's Street-Rate Autopilot → book a call." (This tool is the read-only front half of 2-D.)
- **Effort:** S–M. Needs a size-normalization mapping over scraped unit labels.

### 3. Vacancy Cost Clock 🎣 (Tier 1)
- **The aha:** a literally ticking counter of dollars lost while a unit sits empty — pure emotional top-of-funnel.
- **Inputs:** unit size + your rate (2 fields; rate can default from #2's comp data).
- **Output:** `$/day`, `$/month`, and "every day empty = N days of a paying tenant you'll never get back."
- **Data source:** none required; optional comp default from aggregator scrape.
- **Lead hook:** embeddable widget → seeds #22 (Embeddable Widgets) as a distribution test.
- **Effort:** XS. Could ship this week. Best SEO/landing-page bait of the set.

### 4. Map-Pack Rank Checker 🎣 (Tier 1)
- **The aha:** "You're #7 for 'storage near me.' These 3 competitors are above you." Concrete, local, stings.
- **Inputs:** facility name or address.
- **Output:** current local-pack position for the core query set + the competitors ranking above + the top 1–2 reasons (review count/recency, listing completeness).
- **Data source:** Google Places (`GOOGLE_PLACES_API_KEY`) + the audit's GBP read.
- **Lead hook:** "Track this monthly and get alerted when you slip → that's the Rank Tracker." (front half of 2-F.)
- **Effort:** M. Rank derivation from Places results is the real work; identity/lookup exists.

### 5. Review Response Generator 🛠/🎣 (Tier 1)
- **The aha:** paste any review, get a publish-ready on-brand reply — including the awkward 1-stars.
- **Inputs:** review text + star rating + (optional) facility name.
- **Output:** reply draft in StorageAds voice; flags reviews that need a human/owner touch instead of auto-reply.
- **Data source:** `/api/generate-copy` (Claude) + `gbp/` voice. Operator-copy voice rules apply.
- **Lead hook:** "Auto-respond to every review and route happy movers to leave one → Reputation Autopilot." (2-F feedback triage.)
- **Effort:** S. Copy gen is wired; this is a focused prompt + UI.

### 6. ECRI / Rate-Increase Letter Generator 🛠 (Tier 1)
- **The aha:** the dreaded rate-increase letter, written and softened, in one click — the #1 chore operators hate.
- **Inputs:** current rate, tenant tenure, target new rate (or %), tone (firm/friendly).
- **Output:** email + SMS variants, with a "safety" note if the increase looks aggressive vs. tenure.
- **Data source:** `/api/generate-copy` + the safety-scoring heuristic from 2-D.
- **Lead hook:** "Schedule these to send automatically from your ECRI findings → Rate-Increase Machine."
- **Effort:** S.

### 7. What-If NOI Simulator 🛠 (Tier 2)
- **The aha:** drag occupancy from 84% → 90% and watch annual NOI move live — turns the static NOI report into a steering wheel.
- **Inputs:** sliders for occupancy %, avg rate, monthly ad budget; seeded from the facility's real numbers if connected.
- **Output:** live NOI, revenue, and break-even readouts; a saved scenario they can export.
- **Data source:** `computeNOIForFacility()` as the model; sliders perturb its inputs.
- **Lead hook:** operator-retention, not lead-gen — this is a "open it weekly" paid-tier anchor.
- **Effort:** M. Model exists; work is the reactive UI + scenario persistence.

### 8. Acquisition Quick-Underwrite 🎣/🛠 (Tier 2)
- **The aha:** paste a for-sale listing, get a cap-rate + buy/watch/pass in seconds — catnip for the acquisitive operators who are the best customers.
- **Inputs:** address + asking price (+ optional unit count / current occupancy if known).
- **Output:** estimated NOI, implied cap rate, market-rate upside, and a verdict with the assumptions shown.
- **Data source:** `scrapeSparefoot/scrapeSelfStorage` for market rates + `computeNOIForFacility()` model logic + Places for unit identity.
- **Lead hook:** "Underwrite your whole pipeline + auto-draft the LOI → Acquisition Scout." (front half of 3-6.)
- **Effort:** M–L. Estimation when inputs are sparse is the judgment call; gate behind email for the lead.

---

## E. Data-dependency matrix

What each priority tool needs vs. what the repo already has. **Have** = wired today, **Partial** = exists but needs shaping, **Missing** = net-new dependency.

| Tool | Comp pricing | Facility identity | NOI model | Claude copy | Net status |
|---|---|---|---|---|---|
| Revenue Leak Calc | Have (`aggregator-scrape`) | n/a (entered) | n/a | n/a | **Ship-ready** |
| Vacancy Cost Clock | n/a | n/a | n/a | n/a | **Ship-ready** |
| Rate Calculator | Have | n/a | n/a | n/a | **Ship-ready** (size-map) |
| Review Response Gen | n/a | Partial | n/a | Have (`generate-copy`) | **Ship-ready** |
| ECRI Letter Gen | n/a | n/a | n/a | Have | **Ship-ready** |
| Map-Pack Rank Checker | n/a | Have (Places) | n/a | n/a | **Partial** (rank logic) |
| What-If NOI Simulator | n/a | Have | Have (`noi-report`) | n/a | **Partial** (reactive UI) |
| Acquisition Underwrite | Have | Have | Have | n/a | **Partial** (sparse-input est.) |

Takeaway: five of the eight have **zero missing dependencies** — they're recombinations of `aggregator-scrape.ts`, `generate-copy`, and a formula. That's the wave-1 set.

---

## F. Funnel mechanics — the free-tools hub

The audit tool is one lead-gen surface. These calculators multiply it into a **suite**, each ranking for a distinct search intent and all funneling to the same audit → call.

- **SEO:** every Tier-1 tool is a high-intent query page — "self storage rate calculator," "what should I charge for a 10x10," "storage facility revenue calculator," "respond to google reviews storage." Cheap pages, durable organic, each a separate `/tools/[slug]` entry point.
- **Chaining:** every tool's result CTA hands off to the next deepest step — calculator → full audit → book a call. The number a prospect gets from the Revenue Leak Calc pre-fills the audit so they're already invested.
- **Hub page:** a `/tools` index ("Free tools for storage operators") that the blog and cold emails link into. Cold outreach gets a soft open: "ran your facility through our rate calculator, you're ~12% under market on 10×10s — here's the link."
- **The autopilot ladder:** every public tool names the paid autopilot it's the manual version of. The tool proves the value for free; the autopilot sells the automation. Rate Calc → Street-Rate Autopilot, Rank Checker → Rank Tracker, Review Gen → Reputation Autopilot, Win-Back Gen → Win-Back Autopilot. The free tools are the top of a productized upsell ladder, not loss leaders.

---

## G. Sequenced roadmap

**Wave 1 — ship-ready lead-gen (weeks, not months).** Vacancy Cost Clock, Revenue Leak Calculator, Rate Calculator, Review Response Generator, ECRI Letter Generator. Zero missing dependencies; all reuse `aggregator-scrape` / `generate-copy`. Stand up the `/tools` hub alongside. Goal: more top-of-funnel entry points feeding the audit.

**Wave 2 — operator-value / retention.** What-If NOI Simulator, Portfolio Benchmark Report, Map-Pack Rank Checker, Creative Fatigue Checker, Unit-Mix Optimizer. These are "open it weekly" tools that anchor a paid tier and deepen the connected-data story.

**Wave 3 — the network wedge.** Benchmark-as-a-Service portal + Embeddable Widgets (both 3-NEAR). These pull *non-customer* facilities onto the platform and start the data flywheel the whole `/ideas` thesis hinges on. Highest strategic value, but they depend on enough portfolio data to make the benchmark credible — so they follow the waves that grow the dataset.

**Wave 4 — agentic / platform.** Portfolio AI Assistant, AI Availability Concierge, Digital Twin, Data Query Console, Voice Receptionist. These need live availability, the v1 API surface, and agent orchestration — build once the data and reservation rails are solid.

One-line rule for ordering: **ship the manual tool first, learn from real usage, then automate it into the autopilot.** Every tool here is either a lead-gen hook, a retention anchor, or a network wedge — and the cheapest, highest-leverage five are all in Wave 1.
