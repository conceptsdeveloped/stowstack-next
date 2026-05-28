# StorageAds Operator OS — Investor / Corp Dev One-Pager

**Audience:** Vertical SaaS investors (Bessemer, Insight, Sageview), storage-focused PE, Storable corporate development, technical due-diligence reviewers, REIT innovation teams, industry analysts.
**Register:** Pitch voice (`.claude/pitch-voice.md`). Operator-facing copy is in `.claude/copy-voice.md` derivatives and does not appear here.
**Length target:** One page printed (8.5 × 11). Approximately 700-900 words.

---

## The category

Self-storage paid acquisition has measured against the wrong event for the entire history of digital advertising in the vertical. Cost per lead is the optimization target every incumbent tool exposes, because the lead is the event the ad platform can see. Cost per move-in is the optimization target the operator actually pays in dollars, and it sits behind the property-management system, invisible to the bidder. The 5% of the industry at REIT scale solved this internally a decade ago through in-house teams running multi-platform bidders against PMS-confirmed move-in data. The 95% below REIT scale has no equivalent tool.

StorageAds is the operator-built version of that internal capability, packaged as vertical SaaS. The Operator OS extends the wedge from PMS-attributed paid acquisition to the full front-office surface of an independent storage facility: Google Business Profile domination, AI-handled inbound across every digital text channel, lifecycle automation (win-back, churn prevention, referral), competitor and market intelligence, and operating outside the PMS throughout.

## The bounded novelty claim

To the analyst's knowledge, the combination of (a) server-side multi-platform paid-acquisition attribution forwarding (Meta CAPI, Google Enhanced Conversions), (b) PMS-data-driven operational intelligence (occupancy, ECRI candidate flagging, churn prediction), and (c) operator-language AI audits as a public top-of-funnel demand-generation tool, in a single self-storage vertical software platform operating outside the PMS, is uncommon — because (a) is typically the domain of generalist attribution platforms that lack the PMS data connection; (b) is typically the domain of the PMS vendor itself that has not integrated cross-platform server-side ad attribution; and (c) is typically the domain of agencies that operate the audit as a sales-team service rather than as automated software.

Each clause is hedged. Honesty about what is unknown is part of the register, not a weakness. Narrower fallback claims are available in `analysis/08_comparison.md` §8.6.1 and §8.6.2 if any single component is pressure-tested.

## The architectural moat

Operator-knowledge encoding is the structural advantage that is not replicable by horizontal marketing-tech vendors entering the vertical. The defaults, schema decisions, AI-prompt benchmarks, ECRI flagging logic, brand-voice templates, content-trigger taxonomy, and the click-to-move-in identifier integrity all ship the operator's instincts as software. A generalist competitor must either acquire that encoding or rebuild it slowly through customer feedback.

The architecture, as of this writing: 89 Prisma models, 178 API routes, a 16-identifier click-to-move-in spine, 13 cron jobs, 5 distinct authentication systems, with an integrated AI receptionist across SMS, web form, Google Business Profile messages, Meta Messenger, and Instagram DMs operating against a 30-second SLA and four hardcoded safety guardrails, plus a Postiz-backed organic-social engine with per-facility geographic profiles feeding deep-locality content templates. Operator OS Phase 1 adds nine schema tables and six cron jobs to the existing base; Phase 2 adds direct PMS API integration with the top two independent-operator PMS vendors.

## The comparator landscape

Storable's bundled marketing modules are competitively closest, architecturally constrained by being inside the PMS, and tie the marketing decision to the PMS decision — which a meaningful share of operators reject. The agency model (StoragePug, G5, StorageRankers, local digital shops) carries billable-hour economics with no compounding software asset and infrastructure ownership that flows to the vendor. Generalist attribution platforms (Triple Whale, Northbeam, Rockerbox) have sophisticated server-side forwarding but no PMS data connection and no vertical knowledge encoding. DIY (Google Ads plus spreadsheet) is the modal state of the 95% below REIT scale and is the baseline against which the audit's "cost of doing nothing" is computed.

StorageAds sits at the intersection none of them occupy: vertical-specific, operating outside the PMS, multi-platform server-side, operator-knowledge-encoded.

The pattern analog is ServiceTitan in home services. The competitive analog with the closest customer base is Storable.

## The unit-of-revenue argument

Server-side conversion forwarding from Meta CAPI and Google Enhanced Conversions, joined to PMS-confirmed move-in events via the storEDGE webhook (and via manual upload reconciliation where direct API access is not yet integrated), produces campaign-level cost-per-move-in attribution that closes the measurement gap incumbent tools leave open. The architectural commitment to maintain identifier integrity across the 16-step click-to-move-in chain is what produces the unit-of-revenue measurement; the alternative is the cost-per-lead optimization target that incumbents are stuck with.

The Operator OS layer extends the same architectural posture from paid acquisition into organic surfaces (GBP, FB/IG), inbound surfaces (AI receptionist), and lifecycle surfaces (win-back, churn prevention, referral). All five surfaces produce events that join to the same PMS-confirmed move-in spine, producing full-surface cost-per-move-in attribution rather than channel-isolated cost-per-lead.

## Addressable market and beachhead

Approximately 30,000 single-facility independent operators exist in the United States, with the multi-facility independent segment (2-30 facilities) adding a comparable tier above. The beachhead is the 1-3 facility solo owner-operator at a $199-499 per-facility-per-month entry tier, selected for ICP density and for the structural credibility of the operator-built positioning at that segment. The upgrade ladder ($199 Good, $399 Better, $799 Best, custom Enterprise for management-company white-label) is calibrated so the Better and Best tiers carry the margin that makes the entry tier economically viable.

The horizontal-by-vertical expansion path (RV/boat storage as the first adjacency, followed by other local-pack-dependent verticals: moving services, truck/trailer rental, auto repair, dental, regulated home services) follows ServiceTitan's pattern. The Operator OS chassis is industry-agnostic; self-storage is the wedge.

## Phase 1 proof

A 90-day pilot on the founder's own portfolio is the first proof artifact, with measurement methodology committed in `docs/operator-os-pilot-measurement-plan.md`: baseline locked at week 0, no revision, no survivorship bias, time-series weekly snapshots reported in full, lift-vs-baseline as the headline framing, pre-registered metric set. The pilot intentionally hedges on the founder-portfolio limitation so the Phase 2 external 10-operator pilot becomes the externally-defensible version.

## Strategic case for Storable acquisition

The bundled-with-PMS comparator (Storable's marketing modules) couples the marketing decision to the PMS decision, which a meaningful share of operators reject — and which Storable cannot easily decouple without cannibalizing the PMS revenue line. StorageAds occupies the intersection neither Storable nor the agency landscape holds, with the architectural commitment and operator-knowledge encoding that a generalist marketing-tech entrant cannot replicate without acquiring it. The acquisition case is operator-coverage expansion (the 95% below REIT scale that Storable's PMS-bundled marketing does not address structurally) plus the unit-of-revenue measurement capability that the PMS bundling has not produced internally in a decade.

— Built by Blake. Operator. blake@storageads.com.
