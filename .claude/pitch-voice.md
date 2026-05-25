## Pitch & Voice — Read Before Writing Anything Investor- or Acquirer-Facing

**Register separation rule.** This register is for investors, acquirers (Storable corp dev specifically), technical due-diligence reviewers, partnership conversations (PMS vendors, REIT innovation teams, industry analysts), and the whitepaper. It is NEVER used in homepage copy, landing pages, in-app text, cold emails to operators, ad copy, or any surface where a storage operator will read it. If you are writing for an operator, use [.claude/copy-voice.md](.claude/copy-voice.md) instead. If you are unsure which register applies, ask before drafting.

### Who we're writing to

The reader is a sophisticated investor or acquirer evaluating StorageAds as a strategic asset. Vertical SaaS investors (Bessemer, Insight, Sageview). Storage-focused private equity. Storable corporate development. Technical due-diligence reviewers brought in by either side. Strategic partners — PMS vendors evaluating integration, REIT innovation teams scouting acquisitions or partnerships, industry analysts (Inside Self Storage, MJ Partners). They are not buying marketing services. They are evaluating defensibility, position, and trajectory. They expect category-level language and architectural claims, and they will discount unsupported assertion harder than an operator will.

### What they actually care about

In order:
1. Defensibility of the position — what is the moat, and is it actually a moat or just a head start.
2. Size and shape of the addressable market — TAM, ICP density, vertical depth versus horizontal width.
3. The architectural moat — what's been built, how hard it is to replicate, where the encoded knowledge lives in code.
4. The unit-of-revenue argument — why measuring against move-ins (not leads) changes the math of the whole vertical.
5. Encoded operator knowledge as a non-replicable asset — defaults, schema decisions, AI prompts that ship the operator's instincts as software.
6. Path to Storable acquisition — the strategic case for the eventual conversation.

What customers care about (filling units, not getting ripped off, closing the gap with the REITs) is downstream of all of this. In this register you can name the operator pain at the level of category structure, but you do not write *to* the operator.

### The frame we lead with

Self-storage paid acquisition has measured against the wrong event for the entire history of digital advertising in the vertical. Cost per lead is the optimization target every incumbent tool exposes, because the lead is the event the ad platform can see. Cost per move-in is the optimization target the operator actually pays in dollars, and it sits behind the PMS, invisible to the bidder. The architectural commitment that closes that gap is not optional and not small: PMS integration via webhook, server-side multi-platform conversion forwarding (Meta CAPI, Google Enhanced Conversions), and operator-knowledge encoding in defaults and prompts. That combination is uncommon in the vertical. That is what makes StorageAds a category, not a product.

### Word list — use these

Demand engine. Full-funnel attribution. Cost-per-move-in (CPMI). Unit of revenue. Server-side conversion forwarding. Meta CAPI. Google Enhanced Conversions. PMS-integrated. Operator-knowledge-encoded. Vertical SaaS. Architectural commitment. Bounded novelty. Addressable market. Defensibility. Moat. Click-to-move-in chain. Server-side multi-platform attribution. Operating outside the PMS. Vertical depth. Pattern analog (ServiceTitan in home services). Competitive analog (Storable). Category fit.

### Word list — do not use these

Agency. Marketing service. Freelancer. Retainer. Plug-and-play (in pitch context it undersells the technical depth — say architectural commitment instead). "The REITs have a marketing team. Now you do too." (that line lives in customer copy). Folksy operator language — gate motors, midnight calls, sign on a chainlink fence — those are evidence the writer drifted into the wrong register. Anything that reads as small-business when the audience is evaluating a category.

Bad in any register: synergy, leverage, best-in-class, cutting-edge, disruptive, revolutionize, game-changer, paradigm shift.

### Sentence rules

- Sentences can run longer than in customer voice. Subordinate clauses are fine when they carry weight.
- Category language is required, not avoided. Use the term and define it where the reader needs it.
- Numbers should be architectural and specific: 89 Prisma models, 178 API routes, 16 identifiers in the click-to-move-in spine, ~16 vocabulary terms per 1000 LOC, 13 cron jobs, 5 auth systems. Not "$94 per move-in" — that is an operator number, not an acquirer number.
- Hedging is part of the register. "To the analyst's knowledge" is a feature, not a weakness. Sophisticated readers respect honest scoping and discount unqualified claims.
- Cite the whitepaper and the code citations bibliography (WHITEPAPER_REFERENCES.md) when an architectural claim needs proof.
- Em-dashes are for tightening a clause, not for breath beats. Customer voice leans on em-dashes; pitch voice leans on commas, colons, and semicolons.

### Right vs wrong

The same underlying claim renders very differently in each register. In this register, customer-voice phrasing is the *wrong* answer because the audience is wrong for it.

WRONG: "We tie every ad dollar to the unit that actually got rented."

RIGHT: "Server-side conversion forwarding from Meta CAPI and Google Enhanced Conversions, joined to PMS-confirmed move-in events via the storEDGE webhook, produces campaign-level cost-per-move-in attribution that closes the measurement gap incumbent tools leave open."

WRONG: "The REITs have a marketing team. Now you do too."

RIGHT: "The REITs solved this problem internally a decade ago through in-house teams running multi-platform bidders against PMS-confirmed move-in data. The 95% of the industry below REIT scale has no equivalent tool. StorageAds is the operator-built version of that internal capability, packaged as vertical SaaS."

WRONG: "We're operators who built software, not marketers selling to operators."

RIGHT: "Operator-knowledge encoding is a structural advantage that is not replicable by horizontal marketing-tech vendors entering the vertical. The defaults, schema decisions, AI-prompt benchmarks, and ECRI flagging logic ship the operator's instincts as software. A generalist competitor must either acquire that encoding or rebuild it slowly through customer feedback."

WRONG: "You don't need an agency. You need a system that turns on."

RIGHT: "The agency comparator (StoragePug, G5, StorageRankers) sells billable hours against a horizon that does not compound. The bundled-with-PMS comparator (Storable's marketing modules) couples the marketing decision to the PMS decision, which a meaningful share of operators reject. StorageAds occupies the intersection neither holds: vertical-specific, operating outside the PMS, multi-platform server-side, operator-knowledge-encoded."

WRONG: "We turn the ads on. You watch the units fill."

RIGHT: "The click-to-move-in chain is a 16-identifier pipeline spanning 12 sequential steps from ad click through landing-page visit, partial-lead capture, storEDGE reservation, server-side conversion forwarding, PMS webhook, and attribution reporting. The architectural commitment to maintain identifier integrity across that chain is what produces the unit-of-revenue measurement; the alternative is the cost-per-lead optimization target that incumbents are stuck with."

### The comparator we're displacing

In customer voice the comparator is the operator's inaction. In pitch voice the comparator is the existing software landscape:

- **Storable's bundled marketing modules** — competitively closest, architecturally constrained by being inside the PMS, ties the marketing decision to the PMS decision.
- **The agency model (StoragePug, G5, StorageRankers, local digital shops)** — billable-hour economics, infrastructure ownership flows to the vendor, no compounding software asset.
- **Generalist attribution platforms (Triple Whale, Northbeam, Rockerbox)** — sophisticated server-side forwarding, no PMS data connection, no vertical knowledge encoding.
- **DIY (Google Ads + spreadsheet)** — the modal state of the 95% below REIT scale, the baseline against which the audit's "cost of doing nothing" is computed.

StorageAds sits at the intersection none of them occupy: vertical-specific + outside the PMS + multi-platform server-side + operator-knowledge-encoded. ServiceTitan in home services is the pattern analog. Storable in self-storage is the competitive analog with the closest customer base.

### The bounded novelty claim

The defensible claim, lifted verbatim from the whitepaper's comparative analysis (§8.6 of `analysis/08_comparison.md`):

> To the analyst's knowledge, **the combination of (a) server-side multi-platform paid-acquisition attribution forwarding (Meta CAPI, Google Enhanced Conversions), (b) PMS-data-driven operational intelligence (occupancy, ECRI candidate flagging, churn prediction), and (c) operator-language AI audits as a public top-of-funnel demand-generation tool, in a single self-storage vertical software platform operating outside the PMS, is uncommon — because (a) is typically the domain of generalist attribution platforms that lack the PMS data connection; (b) is typically the domain of the PMS vendor itself that has not integrated cross-platform server-side ad attribution; and (c) is typically the domain of agencies that operate the audit as a sales-team service rather than as automated software.**

Each clause is hedged ("to the analyst's knowledge") because public information about comparators is incomplete. Honesty about what is unknown is part of the register, not a weakness — sophisticated readers will pressure-test the claim, and unhedged versions invite easy refutation. If a reviewer challenges any single component, narrower fallback claims are available in `analysis/08_comparison.md` §8.6.1 and §8.6.2.

The novelty is not "first to do X." It is "first to combine A + B + C in this vertical from outside the PMS." That positioning is what the architecture, the schema decisions, and the comparative analysis ladder up to.

### When in doubt

Ask: would this hold up in a Storable due-diligence room? Would a vertical SaaS investor recognize the category language? If the answer is no, rewrite.

The customer voice doc tests against "would Nick Huber tweet this." This doc tests against "would this survive a Storable corp dev review."

The whitepaper is the canonical source for the technical register and the bounded novelty claim. The customer site is for the operator who just got off the phone with a tenant about a gate code. Different audiences. Different docs. Different registers. Do not confuse them.
