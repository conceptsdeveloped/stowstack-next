# StorageAds Operator OS — Master Vision

**Status:** Internal strategic document. Audience: founders (Blake, Angelo), advisors, prospective investors, Storable corp dev, technical due-diligence reviewers.
**Register:** Pitch voice (see `.claude/pitch-voice.md`). Operator-facing copy derived from this document must be re-rendered in `.claude/copy-voice.md` before shipping.
**Date drafted:** May 2026.

---

## 1. The category claim

The self-storage vertical has measured paid acquisition against cost per lead for the entire history of digital advertising in the industry, because the lead is the event the ad platform can see and the move-in is the event that sits behind the PMS, invisible to the bidder. The 5% of the market at REIT scale solved this internally a decade ago through in-house teams running multi-platform bidders against PMS-confirmed move-in data. The 95% below REIT scale has no equivalent tool.

StorageAds is the operator-built version of that internal capability, packaged as vertical SaaS. The **Operator OS** vision extends that wedge: PMS-attributed paid acquisition is the foundation, and on top of it sits a full-stack autonomous demand engine — Google Business Profile domination, AI-handled inbound across every digital text channel, lifecycle automation (win-back, churn prevention, referral), competitor and market intelligence, and a website/landing-page system purpose-built for move-in conversion. One platform, one north-star metric, one unmissable promise to a buyer profile that has nowhere else to go.

The architectural commitment is large and the bounded novelty claim from the comparative analysis still holds: the combination of server-side multi-platform attribution forwarding, PMS-data-driven operational intelligence, and operator-language AI as the public top-of-funnel — in a single vertical software platform operating outside the PMS — is, to the analyst's knowledge, uncommon. Operator OS is the productized expression of that combination, with the Operator OS layer extending the wedge from "ads that close to move-ins" to "the front office of an independent storage facility, fully automated."

---

## 2. North-star metric and the unit-of-revenue argument

**Occupancy percentage is the metric the buyer judges us on.** It was selected by the founder over move-in volume, net revenue per facility, and time-saved framings, because it is the metric the operator dashboards already track, the metric the lender and the appraiser already cite, and the metric that compounds into facility valuation.

This is consistent with — not in conflict with — the CPMI argument. Cost-per-move-in is the internal optimization target the bidder runs against; occupancy percentage is the outcome the operator measures the platform by. The two ladder: CPMI optimization fills units, units fill the building, occupancy rises, lender covenants improve, valuation expands. The reporting surface emphasizes occupancy because that is the language the buyer speaks. The architecture optimizes CPMI because that is the lever the platform actually pulls.

The reporting layer therefore presents occupancy as the headline and CPMI as the supporting evidence — not the inverse. This is a register choice driven by buyer preference, not an architectural change.

---

## 3. Beachhead and addressable market

**Beachhead ICP:** the solo owner-operator with 1-3 facilities, no marketing budget, and no in-house marketing personnel. Approximately 30,000 single-facility operators exist in the United States; the multi-facility independent segment (2-30 facilities) adds another meaningful tier above that. This is the densest, most under-served buyer profile in the vertical, and the segment for which the operator-built positioning is most credible — small operators trust other small operators in a way that they do not trust agencies, platform vendors, or REIT-adjacent software.

The beachhead choice has three structural consequences that the entire product, pricing, and GTM design follow from:

**Unit economics force radical automation.** At the $199-499/facility/month band selected for the entry tier, the per-account human-touch budget is effectively zero. Onboarding must be self-serve for the Good tier (sales-assisted for Better and Best). Ongoing operations must be AI-driven with a 5-10% human QA sample as the entire labor input. This is not a stretch goal; it is a precondition for the segment to be economically addressable.

**Trust must be inherited, not earned.** Solo operators do not have the time or the budget to vet vendors at length. The platform's credibility wedge is Blake's identity as a sitting operator running the platform on his own portfolio. The proof artifact is the 60-90 day pilot on Blake's facilities, with the resulting occupancy and CPMI numbers as the centerpiece of every sales conversation.

**The upgrade ladder subsidizes the entry tier.** The Better and Best tiers, and the management-company white-label tier above them, carry the margin that makes the Good tier viable. Tier differentiation is therefore hybrid feature-and-volume — Good covers GBP, organic social, and a constrained ad capability; Better adds the full AI receptionist, expanded ad management, and the lifecycle module; Best adds competitor intelligence, rate-recommendation automation, occupancy intelligence reporting, and the cross-facility benchmarking layer. Volume caps (posts per week, leads handled, LP variants) reinforce the feature gates and create natural upgrade pressure.

---

## 4. Product scope — the eight modules of Operator OS

The Operator OS is structured as eight modules. Each is independently shippable, independently observable, and independently priceable. All eight share the underlying entity model (facilities, tenants, leads, units, campaigns, content calendars) and the same AI-safety substrate.

### 4.1 GBP domination

Google Business Profile is the flagship surface, by founder direction. The module covers every productizable GBP lever: scheduled posts across all four Google post types in even rotation (Offers, Events, What's New, Products), proactive Q&A seeding from a storage-vertical master library (15-20 questions at onboarding, monitored thereafter), AI-drafted responses to every incoming review with sentiment-aware tone selection, SMS-based review solicitation timed to 48 hours after move-in for highest response yield, and ongoing photo refresh through a hybrid mechanism — a one-time professional or drone shoot at onboarding for the high-asset baseline, supplemented by a monthly SMS prompt that asks the operator to snap two facility photos with their phone, which the platform geotags and uploads to the profile.

The Products inventory on GBP becomes a synchronized catalog of every available unit size at every facility, with current pricing, climate status, and a deep link to the relevant landing page. This is a known but underused GBP feature; in the storage vertical it converts directly because the search-to-rental intent is high. The Q&A seeding and the Products catalog together push the profile higher in the local pack ranking model because both are first-party content that Google rewards.

NAP citation consistency, service-area definition, attribute management, hours management, and category optimization round out the module. The operator never logs into GBP again after the initial OAuth.

### 4.2 Paid acquisition

The paid acquisition module spans Meta and Google, with TikTok positioned as a Phase 3 addition pending creative format alignment with storage intent. Ad creative is generated per facility from the facility's photo library, current occupancy mix, and active offers, using the Runway and FAL infrastructure Angelo already operates. Generation is monthly by default, with a triggered refresh when CTR drops below threshold or when the occupancy mix shifts enough to change the promoted unit size.

Ad spend is paid by the operator directly to Meta and Google. The platform does not take ad spend through its own books — a deliberate choice to avoid the pass-through accounting burden and the perception of agency markup. The platform manages strategy, creative, targeting, and bidding; the operator sees raw platform spend in the dashboard and reconciles it independently.

Landing page strategy is the facility × unit-size grid: each facility has a dedicated landing page per primary unit size (5x10, 10x10, 10x15, 10x20, 10x30, and climate variants), routed from the matching ad creative for highest message-match conversion. The grid is generated programmatically at onboarding from the facility's catalog and refreshed when pricing or availability changes.

The full architectural depth — server-side conversion forwarding to Meta CAPI and Google Enhanced Conversions, joined to PMS-confirmed move-in events via webhook where the PMS supports it and via manual upload reconciliation otherwise — is the foundation that makes the unit-of-revenue argument hold. This is unchanged from the existing positioning.

**Offline-to-online capture is part of the paid stack.** The drive-by channel was named by the founder as a meaningful move-in source despite its attribution invisibility, and the platform addresses it with two coordinated mechanisms. First, geo-fenced radius advertising targets Meta and Google audiences who have entered a defined polygon around the facility, retargeting both repeat passers-by and recent property-line crossings into the standard paid funnel where attribution can capture them. Second, signage QR codes routed to facility-specific tracked landing pages convert offline sign exposure into measurable digital sessions that flow into the same CPMI chain as the rest of the paid funnel. Sign creative refresh is included on a quarterly cadence so that the signage itself remains an active asset rather than a static one. Aggressive offline capture mechanics (license-plate harvesting, mobile-ID retargeting inside the lot) were considered and explicitly declined on ethical and policy grounds.

### 4.3 AI receptionist

The receptionist handles every digital text inbound channel: SMS, web form fills, Google Business Profile messages, Facebook Messenger, Instagram DMs, and website live chat. Voice is explicitly out of scope at v1 — phones remain with the operator or a third-party answering service. The decision is not about technical capability but about brand risk: AI voice in a high-stakes customer interaction has a failure profile the platform cannot yet absorb.

The SLA is 30 seconds, every channel, 24 hours a day. This is the marketable claim and the operational commitment.

Reply behavior is warm and helpful — short enough to feel responsive, long enough to provide unit pricing, climate options, and a hold offer in the first message. The voice is universal across the platform — the StorageAds voice, plain-spoken and professional — rather than per-facility customized. This is a deliberate tradeoff: per-facility voice quizzes would add onboarding friction and operational variability that the unit economics do not support, and tenants are not in a position to detect or care about voice variation between facilities they are not yet customers of.

Reservation depth at v1 is hold-plus-tour-booked: the AI places a 48-hour soft hold on the requested unit, books an in-person tour or move-in appointment, and hands the warm lead to the operator for the rental paperwork. Full booking with card capture and gate-code dispensation is a Phase 3 addition, contingent on direct PMS API integration with the operator's PMS. The hold-plus-tour model is safer at v1 because it does not require PMS write access, which the manual-upload data ingest in Phase 1 cannot support.

Escalation rules: the AI hands off to the operator the moment a conversation contains a complaint, refund request, legal threat, explicit human request from the prospect, question outside the facility data and FAQ corpus, or a high-value pattern (multi-unit, commercial account, long-term contract). The escalation triggers are non-negotiable and intentionally generous — false-positive escalations are cheap; false-negative AI responses to sensitive conversations are catastrophic.

Multi-language support is English-only at v1. Spanish is a high-priority Phase 2 addition for the TX, CA, FL, and AZ markets where Spanish-speaking inbound is a meaningful percentage of total leads.

### 4.4 Organic social

The organic social module handles Facebook Pages and Instagram for every facility via the Postiz integration (see §10.1 for the deferred Postiz hosting decision). Content cadence is three to seven posts per week depending on tier, drawn from five trigger sources:

Weather-triggered posts use facility-level National Weather Service forecasts to push seasonal, urgency-aware content (hurricane preparation, snow load, summer heat, fall yardwork). Calendar-driven posts pull from local school district calendars, regional events, and national retail moments (back-to-school, spring cleaning, year-end moves). Occupancy-driven posts promote the unit sizes with the most current vacancy, turning organic social into a yield-management surface rather than a brand-awareness exercise. Ad-campaign-synced posts mirror active paid campaigns the same week the campaigns run, producing surround-sound paid-plus-organic messaging from a single creative concept. Evergreen library posts cycle through educational and trust-building content generated once per facility and refreshed quarterly.

Localization depth is deep: street names, neighborhood references, school districts, and micro-local weather. The depth-versus-safety tradeoff is managed by templating — local references are pulled from a curated per-facility geographic profile assembled at onboarding, not free-generated by the LLM, which constrains hallucination risk while preserving the local feel.

Emoji policy is sparing on social, never in operator-branded customer comms.

### 4.5 Lifecycle automation

The lifecycle module covers three patterns:

**Win-back campaigns.** Past tenants receive a sequenced re-engagement series at 30, 60, 90, and 365 days post move-out. The content is offer-led, personalized by their prior unit size and tenure, and delivered by SMS and email. Past tenants are the cheapest acquisition channel the operator has access to, and almost no independent facility runs this systematically.

**Churn prevention.** Behavioral and payment signals — payment failure, autopay decline, late payment pattern, complaint history, no gate activity over an unusual window — feed a churn risk score per active tenant. Above a threshold, the platform triggers an outreach (rate adjustment offer, payment recovery sequence, or a courtesy check-in from the operator), with the goal of reducing move-out incidence before the move-out notice is filed.

**Referral engine.** Happy tenants — identified by review behavior, payment history, and tenure — receive an SMS-based referral offer with a unique tracked link. Successful referrals trigger an automated reward (account credit, gift card, or operator-defined incentive). The referral channel becomes a measurable line in the move-in mix rather than an ambient assumption.

Rate-increase softening was explicitly declined for v1. The operator will run their rate-increase program as they always have; the platform does not intervene in the price the tenant pays.

### 4.6 Competitor and market intelligence

Posture is passive — weekly reports rather than active warfare. The intelligence layer scrapes the standard public surfaces (RentCafe, SpareFoot, Yardi listings, competitor websites, GBP profiles within radius) and reports:

Local market occupancy estimates per competitor, derived from listing availability and unit-mix signals. Local market rate trends per unit size, normalized to the facility's submarket. New-supply alerts triggered by construction permits, new GBP profiles, or visible site activity within a configurable radius of the facility. Demand signals drawn from move-to-area data, household formation rates, and residential construction permits in the submarket.

The operator receives this as a weekly intelligence brief. No automated rate adjustment, no automated ad-bidding warfare against named competitors, no review surveillance of competitor tenants — those moves were considered and explicitly declined, and the declined options remain available for a Phase 4 reconsideration if the segment evolves.

### 4.7 Website and digital storefront

The platform operates in two parallel modes per facility, by founder direction:

**Replacement mode.** Every facility on the platform receives a StorageAds-built website at a vanity subdomain (and at the operator's own domain via DNS pointing where the operator opts in), engineered for move-in conversion. The replacement site stays alive in parallel with whatever the operator already has, so the operator can switch traffic at their pace without losing their existing presence.

**Bypass mode.** Paid traffic from the ad module routes to the dedicated facility × unit-size landing pages described in §4.2. These pages are independent of the operator's site, optimized purely for conversion, and instrumented end-to-end for the CPMI attribution chain.

The two modes are not in tension. Replacement mode owns the operator's organic and direct traffic, with conversion lift built in. Bypass mode owns the paid funnel, with message match and conversion lift maximized per ad concept. Together they ensure the platform owns every conversion surface that money flows through.

### 4.8 Operator-facing reporting and dashboard

The dashboard is rich and live, by founder direction. Operators who do want to look get the full picture: occupancy chart (current versus baseline, with cohort benchmark overlay), lead volume by channel, AI receptionist activity, content calendar, GBP performance, paid-campaign performance with CPMI per campaign, competitor and market intelligence brief, and the lifecycle module's active workflows.

Communication cadence wraps the dashboard in layered push: real-time alerts for high-signal events (new move-in, bad review, ad-spend anomaly), a daily morning digest by SMS for the operator who lives on their phone, and a weekly Monday email for the full report. The operator who never logs in still gets the value; the operator who wants depth has it on demand.

Attribution methodology is industry-standard multi-touch with last-click weight as the headline number, supplemented by a "lift versus baseline" view that compares the facility's post-onboarding move-in trajectory to its trailing 12 months. The lift view is the most persuasive renewal artifact because it is the simplest argument: this is what your facility did before us, this is what it does with us, this is the delta.

Cross-facility benchmarking is opt-in and anonymized, surfaced once the platform has 50+ facilities for statistical significance. The benchmark is positioned as a competitive pull rather than a privacy concession — operators in the top quartile see that ranking and renew; operators in the bottom quartile see it and engage more deeply with the platform.

---

## 5. AI safety architecture

AI failure modes are the founder-named killer risk for the platform. The safety architecture is correspondingly aggressive and is non-negotiable from day one.

**Per-facility brand voice templates** constrain every AI output. The voice profile is the universal StorageAds voice, applied per facility with the facility's name, geography, and inventory substituted. Raw LLM output is never shipped; every customer-facing artifact passes through the voice template and a topic filter before send.

**Review queues for sensitive surfaces.** Reviews, complaint responses, and any future rate-related communication are AI-drafted and human-approved before send. The approval surface is queued by priority — operator review for high-value or high-risk items, internal QA review where the operator has delegated.

**A 5-10% human QA sample audits every output stream.** The sample catches drift in voice, hallucination, and emerging failure modes before they propagate. Sample audit results feed back into prompt revisions and template adjustments.

**Hard topic blocklist with escalation triggers.** Lawsuits, threats, injuries, deaths, fires, contraband, weapons, hazardous materials, and a category of "anything ambiguously dangerous" auto-escalate to a human and never receive an AI response under any circumstance. The blocklist is conservative on purpose — false positives are cheap, false negatives are existential.

The safety architecture is also the marketing message in the pitch register: it is the answer to "what happens when the AI screws up." The answer is that the architecture is designed so the AI cannot screw up in a customer-visible way without crossing a hard guardrail first.

---

## 6. Pricing and packaging

Tier band and structure:

- **Good — $199/facility/month.** Self-serve onboarding. GBP module in full (posting, review responses, Q&A monitoring, photo refresh). Organic social on Facebook and Instagram, three posts per week. Paid ads gated to a constrained scope (one campaign, one creative refresh per quarter). Lead capture from web forms only (no full AI receptionist). Weekly email digest reporting. Replacement website included.
- **Better — $399/facility/month.** Sales-assisted onboarding. Everything in Good, plus the full AI receptionist across all channels, monthly ad creative refresh, expanded landing-page grid, lifecycle module (win-back and referral, not churn prevention), and the daily SMS digest.
- **Best — $799/facility/month.** Sales-assisted onboarding with a strategy call. Everything in Better, plus competitor and market intelligence, churn prevention, rate-recommendation reports, cross-facility benchmarking, and real-time push alerts.
- **Enterprise / Management-company white-label.** Custom pricing, volume-discounted from the per-facility rate, with a platform fee. Multi-facility batching, brand-customizable operator-facing surfaces, and an internal reseller dashboard.

Tier mechanics:

- **No setup fee.** Frictionless signup. The cost of onboarding (AI generation, OAuth wizard, initial content calendar generation, landing-page build) is amortized into the recurring price.
- **20% annual discount plus one free month for prepayment.** Aggressive on the annual commitment to lock in retention and improve cash flow.
- **30-day money-back guarantee.** Card upfront for commitment, but the operator can exit if it is not working. The risk-reversal framing is sufficient for the segment without overcommitting to an occupancy-percentage outcome guarantee that is operationally fragile.

Ad spend is paid directly to the platforms (Meta, Google) by the operator, not invoiced through StorageAds. This keeps the recurring fee clean and the ad budget transparent.

---

## 7. Go-to-market

GTM operates on four channels simultaneously, with the audit-as-cold-outreach mechanic as the single highest-leverage move.

### 7.1 The proactive audit as cold outreach

The single sharpest GTM mechanic in the plan: rather than emailing operators to ask for a meeting, the platform generates and sends them their facility's audit unsolicited. The cold outbound message becomes "we audited your facility, here is what we found," with the partial audit findings inline and the full report behind a link that requires no signup.

The audit funnel itself: partial instant results plus projections delivered at audit completion, then a booked call to review the findings, then a close on the call with the first month free and immediate onboarding. The audit does the heavy lifting before the prospect ever talks to a human; the call exists to convert curiosity into commitment.

The audit was already the top-of-funnel asset. Repositioning it as the cold-outreach payload turns it into a demand engine of its own — every prospect approached has already seen what the platform does, before deciding whether to engage.

### 7.2 Founder-led credibility across podcasts and communities

Blake on the guest circuit across the existing storage podcast surface (Inside Self Storage, AMS, The Self Storage Show, and the rotating regional shows). The narrative is operator-to-founder: a sitting facility owner who built the platform he wanted for his own portfolio, now selling it. The story is the moat — and it cannot be replicated by horizontal entrants or agency-model competitors.

In parallel, daily presence on Reddit (r/selfstorage, r/Entrepreneur) and the operator Facebook groups, as the consistently most helpful voice in operator conversations. Show up before there is anything to sell. By the time the cold audit lands, the prospect has already seen Blake's voice in the spaces they trust.

### 7.3 Direct outreach at scale, audit-led

Outbound volume runs on the audit mechanic, scaled across operator lists assembled from public records, GBP scrapes, and association directories. The motion is industrial — high volume, audit as the artifact, founder-signed messaging — and feeds the calendar from the close-on-call funnel.

### 7.4 Industry conferences as authority anchor

Speaking slots at SSA, ISS Expo, and the regional conference circuit, with a small booth presence at the top two shows in year one. The conference investment is sized for authority establishment rather than direct lead generation — the beachhead segment is not concentrated at the major shows, but the credibility halo from speaking on the main stage carries into the cold-outreach motion and the founder-podcast circuit.

---

## 8. Onboarding and operator experience

Tiered onboarding by founder direction:

**Good tier — fully self-serve, 20 minutes.** Wizard walks the operator through facility information capture, OAuth for Google Business Profile, Facebook, and Instagram, payment method, and a five-question voice and inventory configuration. AI generates the initial content calendar, lands the LP grid, seeds the GBP Q&As, and triggers the first scheduled posts within the hour. The operator never speaks to a human.

**Better and Best tiers — sales-assisted, 30-60 minute kickoff call.** Setup is self-serve where possible, but a human verifies the inventory configuration, walks the operator through the dashboard, and confirms the first month's strategy. The kickoff also serves as the relationship anchor that justifies the higher tier price.

The platform is designed for an operator who logs in week one for orientation and then almost never again. The push communication layer (real-time, daily, weekly) carries the value. The dashboard is there for the operator who wants depth and for the once-a-month deep dive; it is not the operator's daily surface.

---

## 9. Compliance and risk posture

**TCPA / SMS compliance.** Twilio's Toll-Free Verified and 10DLC compliance framework is the outsourced compliance posture. Standard ToS, explicit opt-in collection at every channel where SMS will be used, clear opt-out, and audit trail. The compliance bar is the minimum defensible posture for the channels in use.

**Account-level platform risk.** Meta and Google account bans, ad-policy changes, and platform-level OAuth revocations are the second-tier risk profile (after AI failure modes). Mitigations: never run platform-native shared assets across the customer base in a way that creates contagion if one account is flagged; per-facility ad accounts owned by the operator (not the platform); platform-policy compliance audits on creative before publication; and rapid escalation paths to platform partner support.

**Data residency and privacy.** US-only at v1. Tenant data is the operator's, with platform-mediated access controls. Cross-facility benchmarking is opt-in only. Data retention policies follow operator-jurisdiction defaults.

**AI failure modes.** Covered in detail in §5. The architectural mitigations are the core of the risk response.

**Competitive replication.** Storable, SiteLink, and storEDGE could in principle extend their marketing modules to compete on the broader Operator OS scope. The structural defenses are the operating-outside-the-PMS architecture (operators who reject Storable's bundling specifically choose us for that reason), the operator-knowledge encoding in defaults and prompts (not replicable by horizontal entrants without acquiring the encoding), and the beachhead density (the solo operator segment is where the operator-built narrative is most credible and where Storable's enterprise posture is least competitive).

---

## 10. Critical open architectural decisions

### 10.1 Postiz hosting

Flagged by the founder as an integral critical core decision to be made with deliberation. Pros and cons of the three options:

**Self-host Postiz on Railway/Render, call its API from StorageAds.** Cleanest separation. Two services, one product. Open-source MIT license preserves the option to fork later if customization needs grow. Per-account compute cost is low at scale. Operational complexity is moderate (a second service to monitor, a second deployment surface, a second on-call boundary). Recommended as the default unless one of the alternatives demonstrates a clear superiority during the pilot.

**Fork Postiz into a private repo and embed inside the StorageAds monorepo.** Tightest integration. Lowest latency between StorageAds business logic and Postiz publishing logic. Allows deep customization of the publishing surface (StorageAds-specific UI, custom channel adapters, embedded analytics). Higher maintenance burden — every Postiz upstream change is a fork-merge decision. Higher onboarding cost for engineers (one repository, but more code surface to understand). Right answer if the customization surface proves to be larger than the standalone Postiz API can absorb.

**Use Postiz cloud (managed) for v1, self-host or fork later.** Fastest time-to-MVP. Lowest operational burden in the first 60 days. Per-account cost adds up at scale (likely uneconomical beyond the first 50-100 facilities). Acceptable if the alpha runs on Blake's portfolio only and the production decision is deferred until pilot results justify the migration cost.

**Recommendation:** Start the alpha on Postiz cloud for speed-to-MVP, with a clear migration trigger (50 facilities or 6 months, whichever comes first) to either self-hosted or forked-and-embedded based on what the alpha reveals about the customization surface needs. This sequences the decision behind the data.

### 10.2 PMS integration depth (Phase 2+)

Phase 1 commits to manual upload of facility management reports (PDF, CSV, Excel) only, per existing project scope. The Operator OS modules that require real-time data (churn prevention, occupancy-driven content, dynamic LP grid updates, full AI receptionist booking) are constrained by this. Phase 2 must commit to direct API integration with the top two or three independent-operator PMSs (likely Easy Storage Solutions, syrasoft, and one other based on market share signal). The eventual long-term path is the bounded novelty claim's structural form — operating outside the PMS while integrated to its data layer, which is the position no competitor occupies.

### 10.3 Photo refresh production model

The hybrid model — one-time professional or drone shoot at onboarding plus monthly SMS prompts for fresh phone photos — is the default. The unit-economics question is whether the onboarding shoot cost (estimated $200-500 per facility) sits inside the no-setup-fee structure or surfaces as an explicit add-on. Recommendation: bake it into the Better and Best tiers as included, offer as a $299 add-on for the Good tier where the unit economics will not absorb it.

---

## 11. Long-term vision

The founder-selected end state at $50M ARR is a marketing platform expanded across adjacent local-business verticals. Self-storage is the wedge; the Operator OS chassis is industry-agnostic.

The vertical expansion path, in order of adjacency:

**RV and boat storage.** Closest natural expansion. Same buyer (many storage operators already operate RV alongside self-storage), similar unit catalog, similar conversion mechanics. The platform requires only the unit-type abstraction in the catalog and a few adjustments to the content templates.

**Other local-pack-dependent verticals.** The chassis applies to any local business whose move-in equivalent depends on Google local pack ranking, paid acquisition, and lifecycle automation: moving services, truck and trailer rental (U-Haul dealer add-on for the existing customer base), auto repair, dental, regulated home services. Each vertical is a year-long market-entry investment, sequenced after self-storage market position is established.

The pattern analog is ServiceTitan: vertical-first dominance in one trade, then expansion into adjacent trades with the same chassis. The competitive analog (Storable) is locked into the PMS axis; the horizontal-by-vertical path is the structural lane neither incumbent owns.

---

## 12. Build sequence

### Phase 1 — Alpha on Blake's portfolio (months 1-3)

Self-host Postiz on a managed instance, integrate its API. Add the Operator OS schema layer to Prisma: `social_accounts`, `content_calendar`, `scheduled_posts`, `post_templates`, `gbp_review_log`, `inbound_messages`, `ai_responses`, `lifecycle_events`. Build the operator-facing `/admin/facilities/[id]/operator-os` surface and the corresponding `/portal/operator-os` surface. Implement the GBP module end-to-end (posts, reviews, Q&A seeding, photo refresh prompts). Implement the SMS-based AI receptionist for web form fills as the first inbound channel. Wire the Anthropic API for content generation against the brand voice template. Cron job pushes scheduled posts to Postiz daily.

Run on Blake's portfolio only. Measure: GBP impressions per facility (pre vs. post), GBP direction requests, review velocity, organic move-in incidence, AI response latency, AI response quality (5-10% sample audit).

### Phase 2 — Expanded modules + paid pilot (months 4-6)

Add the full multi-channel AI receptionist (GBP messages, FB Messenger, IG DMs). Add the organic social module with weather, calendar, and evergreen triggers. Ship the replacement-mode website builder. Begin direct PMS API integration with the top one or two independent-operator PMSs. Onboard the first 10 paid pilot operators outside Blake's portfolio at a discounted pilot rate, with full sales-assisted onboarding and weekly feedback loops.

### Phase 3 — General availability + lifecycle (months 7-9)

Open self-serve onboarding for the Good tier at $199. Launch the lifecycle module (win-back, churn prevention, referral engine). Add cross-facility benchmarking once 50 facilities are live. Add the competitor and market intelligence module. Begin the proactive-audit cold-outreach motion at scale.

### Phase 4 — Scale and adjacency (months 10-12+)

Spanish-language AI receptionist for TX/CA/FL/AZ market. TikTok ad creative pipeline. RV and boat storage vertical extension. Management-company white-label tier. Reconsider the active-warfare competitor stance based on operator demand and platform maturity.

---

## 13. What this document does not commit to

The bounded novelty claim (§83 of `.claude/pitch-voice.md`) hedges deliberately. This vision document follows the same posture:

It does not claim AI voice answering will be added — it remains explicitly out of scope until the failure-mode profile changes.

It does not claim full booking with payment at v1 — the hold-plus-tour model is the v1 commitment, with full booking gated behind PMS API integration.

It does not commit to the active competitive warfare posture (rate manipulation, competitor-targeted ad warfare, tenant intercept) that the founder declined; those moves remain explicitly available for Phase 4 reconsideration if the segment evolves to demand them.

It does not commit to a specific Postiz hosting model — the decision is sequenced behind alpha data, per §10.1.

It does not commit to non-storage vertical expansion in the first 12 months — that is a Year 2+ move, contingent on self-storage market position.

The honest scoping is part of the register, not a weakness. Sophisticated readers respect the hedging, and the commitments that remain are stronger for being defended rather than asserted.

---

## Document maintenance

This document is the canonical Operator OS vision as of the date drafted. Subsequent material decisions (Postiz hosting commitment, pricing band shifts, scope additions, vertical extensions) are amendments to this document and should be reflected here before propagating to derivative artifacts (sales pages, pitch decks, PRDs, customer-facing copy).

Derivative artifacts to be produced from this document, in order of next-action priority:

1. Phase 1 PRD — schema, routes, AI guardrail architecture, Postiz alpha integration plan, 60-day measurement plan against Blake's portfolio.
2. Pricing and packaging one-pager — Good/Better/Best/Enterprise feature matrix, ready for operator-facing test.
3. Homepage and audit-tool sales-page draft in operator voice register (`.claude/copy-voice.md`).
4. 90-day Blake-portfolio pilot measurement plan — baseline capture, target metrics, dashboard for prospect-facing case study.
5. Investor / Storable corp dev one-pager — distillation of §1, §2, §10, and §11 into a single page for outbound conversations.

Each derivative is a separate artifact and should be drafted against the appropriate voice register, not against this document's pitch-voice register directly.
