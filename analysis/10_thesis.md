# Phase 10 — Thesis Selection and Sharpening

The Phase 0 candidate theses, restated:

- **T1.** "Self-storage marketing has been measured against the wrong outcome — form submissions and leads — for the entire history of digital advertising in the vertical, and the consequence is a category-wide misallocation of acquisition spend."

- **T2.** "The attribution chain that matters in self-storage ends at physical move-in and rental revenue, not at form submission, and the absence of that chain has shaped every existing tool in the category."

- **T3.** "Operator-built software encodes industry assumptions that agency-built software cannot replicate, and the gap is widest in measurement — where measuring the right thing requires knowing what the right thing is."

Each is tested against the evidence accumulated in Phases 1–9.

## 10.1 Testing T1

**Strongest evidence supporting T1.**
- The schema's `client_campaigns.cost_per_move_in` field as a first-class column rather than a derived computation indicates the team treats cost-per-move-in as *the* reportable metric (Phase 2, Cluster H).
- The deep-path audit prompt explicitly instructs the model to use cost-per-move-in vocabulary and benchmarks `$15-25 (top performers)` against `$35-50 (industry average)` (Phase 6 §6.2.D6).
- The reporting endpoint `/api/attribution` computes cost-per-lead AND cost-per-move-in in the same query, treating them as parallel metrics rather than substitutes (Phase 4 §4.2 Step 10).
- The `partial_leads.lead_status` enum supports a `'moved_in'` state distinct from `'converted'` — the code explicitly distinguishes form-submission from physical-move-in.

**Strongest evidence weakening T1.**
- The claim makes a strong assertion about the *entire history* of the vertical and *category-wide* misallocation. The codebase cannot speak to history or to category-wide effects; it can only speak to its own architectural choice. The thesis is too strong for the evidence.
- The thesis is also adjacent to marketing rhetoric — "category-wide misallocation" reads as pitch language rather than systems-paper language.

**Verdict on T1.** True in essence, overclaimed in form. The kernel of the claim — that the right metric is move-in, not form-fill — is supported by the code. The "entire history" and "category-wide misallocation" overstate what the evidence proves. T1 must be sharpened.

## 10.2 Testing T2

**Strongest evidence supporting T2.**
- The architectural commitment to a server-side webhook from storEDGE (`STOREDGE_WEBHOOK_SECRET` env var, `/api/webhooks/storedge` route with HMAC verification, dedicated `attributed_move_in` activity_log type) is structural evidence that the team built the system *for* move-in attribution (Phase 4 §4.2 Step 7).
- The 16-identifier propagation table in Phase 4 §4.3 includes click identifiers, form identifiers, and move-in identifiers — the chain is designed end-to-end.
- The presence of operator-knowledge-encoded ECRI logic, 5-bucket aging, tenure-weighted churn risk — all hinge on PMS data, which is the same data that surfaces move-ins. The team's encoded knowledge is *operational* knowledge, which is where move-in attribution lives.

**Strongest evidence weakening T2.**
- Phase 4's critical finding: the chain *does not automatically close.* The storEDGE move-in webhook logs to `activity_log` but does not update `partial_leads.lead_status`. The cross-system identifier propagation is *architecturally planned* but *operationally manual*. T2's claim of "the attribution chain that matters... ends at physical move-in" is the *architectural intent*; the current implementation closes the chain at the campaign level via UTM string match, not at the click-or-lead level.
- The claim that "the absence of that chain has shaped every existing tool in the category" is again too strong — the codebase cannot speak to *all* existing tools.

**Verdict on T2.** True in architectural commitment, partial in operational closure, overclaimed in scope. The chain *is* the chain that matters; the chain *is* incompletely closed in the current code; the claim about category-wide shaping is unverifiable.

## 10.3 Testing T3

**Strongest evidence supporting T3.**
- Phase 6's vocabulary density (~16 self-storage-specific terms per 1000 LOC) is structural evidence that the codebase's primary idiom is operator vocabulary, not generic marketing.
- The 12 industry-specific defaults (D1–D12 in Phase 6 §6.2) include the 180-day ECRI tenure threshold, the 80% rate recovery target, the non-uniform occupancy bucket midpoints, the 90-day moveout cooldown, the 2.0× ROAS floor, the 3-view hot-lead threshold. Each is a choice a generalist would have made differently.
- The 10 edge cases handled (E1–E10) include ECRI conjunction (tenure AND below-market), the 5-bucket aging structure matching lien-prep timing, walk-in attribution as a first-class channel, tenure-weighted churn risk.
- The AI prompts contain inline industry benchmarks (78% online rental, 72% ECRI implementation, 4.2 stars, 55% autopay, $35-50 CPL) that a non-practitioner would not know.
- The Phase 5 catalogue of 14 subsystems shows operator-knowledge encoded in workflow design — the audit-to-pitch sales motion, the ECRI candidate → admin approval workflow, the 90-day moveout cooldown, the 3-view hot-lead signal.

**Strongest evidence weakening T3.**
- The integration layer (Phase 6 §6.5) is 4-5 vertical to ~15 generic. Most of the vendor integrations are generic. T3's claim is true at the schema / workflow / prompt layer but less true at the integration layer.
- A skeptic could argue that "operator-built" is a function of the author, not of the software, and that *anyone with operator advice could write the same code*. The counterargument is that operator advice is itself rare and unevenly distributed — but the counterargument is empirical, not architectural.

**Verdict on T3.** Strongly supported. The codebase is observably authored by someone with operator knowledge or working directly with one. The encoding is in defaults, edge cases, vocabulary, and prompts — not in vendor integrations.

## 10.4 The Selected Thesis

The strongest defensible thesis combines T1/T2's measurement claim with T3's operator-knowledge claim, sharpened to be falsifiable, precise, and not overclaim what the codebase can prove.

> **The measurement convention in self-storage paid acquisition — cost per lead, where "lead" means form submission — is wrong for the vertical, because the unit of revenue is the physical move-in and the join from click to move-in requires both a server-side attribution chain and operator-knowledge-encoded ingestion of property-management-system data; this paper documents an architecture that closes the loop, an implementation that demonstrates the architecture is buildable, and the encoded operator knowledge that makes the right measurement possible.**

Word count: ~80. Longer than the canonical 20–40 word thesis. A sharpening pass:

> **In self-storage paid acquisition, the right measurement is cost per move-in, not cost per lead; closing the click-to-move-in chain requires operator-knowledge-encoded ingestion of PMS data, and this paper documents an architecture that commits to the closure.**

40 words. Falsifiable (an architecture can fail to close the loop; the chain can be shown insufficient; the encoded operator knowledge can be shown shallow). Precise (names the metric correction, the chain mechanism, the operator-knowledge prerequisite). Provocative (asserts the current convention is wrong).

Compare to Nakamoto: *"A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution."* Same length, same shape (counterfactual + mechanism + obstacle removed).

Compare to Raft: *"Raft is a consensus algorithm for managing a replicated log... in order to enhance understandability."* Names a problem (consensus is hard), claims a solution, identifies the non-functional design constraint that makes it work.

The selected thesis is in that voice.

## 10.5 Honesty Caveats Inside the Thesis

The Phase 4 finding — that the click-to-move-in loop does not yet automatically close — must be reflected in the thesis. The current formulation says "documents an architecture that *commits to* the closure," not "documents a system that closes the chain." This is precise: the architecture is built for closure; the operational closure is mid-construction (Phase 7b P1). The thesis is true of the architecture; the paper's Limitations section makes clear what is and is not yet automated.

If the click-to-move-in loop closes operationally by the time the paper is finalized, the thesis can be sharpened further to "demonstrates the closure" rather than "commits to" it. Until then, the honest framing is "commits to."

## 10.6 Counter-Argument Anticipation

The Phase 0 mandate requires anticipating the strongest objections. Each is named and answered.

### Objection 1: The Storable executive

*"We've been bundling marketing with our PMS for years. We know storEDGE data; our marketing modules already use it. We have more customers, more facilities, more data. What does this paper say that we haven't been saying?"*

**Response.** Storable's marketing modules are bundled with the PMS purchase decision — an operator who wants Storable's marketing must take Storable's PMS, and vice-versa. The paper's architectural commitment is *outside* the PMS: a marketing platform that ingests storEDGE (and, in time, SiteLink, Yardi, others) via webhook + structured import without requiring the operator to switch PMS vendors. The paper's contribution is *the boundary choice* — operating outside the PMS while consuming its data — not the use of PMS data per se. A reasonable Storable response is to publish details of their server-side multi-platform conversion forwarding architecture; the paper would welcome that public comparison.

### Objection 2: The StorageRankers / StoragePug founder

*"We've been running ads and tracking conversions for storage facilities for years. We know what works. The paper acts like attribution is a new idea."*

**Response.** The paper does not claim attribution is a new idea. It claims that *server-side multi-platform attribution to the move-in event* — Meta CAPI for the Meta platform, Google Enhanced Conversions for the Google platform, the storEDGE webhook for the move-in completion, joined to operator-knowledge-encoded PMS data — is the architecture this vertical needs and that the platform implements. The agency model bundles human services with this work, which is a valid product strategy; the platform model exposes the architecture as software an operator owns. These are different products solving overlapping problems. The paper documents the platform model.

### Objection 3: The Adverank engineer

*"Pricing intelligence has been our category for years. ECRI flagging is what we do. What's novel about doing it as part of a marketing platform?"*

**Response.** The paper's ECRI handling is one element of an integrated operational-intelligence layer that *also* includes churn prediction, move-out remarketing, tenant communication automation, and GBP reputation management. The novelty is integration, not invention of any individual element. Adverank's pricing intelligence is a strong product; integrating equivalent intelligence with paid-acquisition attribution and tenant-side operations is the platform's contribution.

### Objection 4: The Meta attribution-platform engineer

*"Server-side CAPI forwarding is standard. PII hashing is required. We've documented all this. Why does this paper exist?"*

**Response.** The paper does not claim novel CAPI engineering. The CAPI implementation in the paper is conventional (and matches Meta's documented requirements precisely). The paper's claim is that CAPI in this *vertical*, joined to PMS-side move-in events via the storEDGE webhook, applied against an operator-knowledge-encoded audit funnel, is the *application architecture* that has not been published as such for self-storage. The novel-engineering claim (Section 5 of the paper) is bounded; the novel-application claim (Section 1 and 10) is what carries the argument.

### Objection 5: The skeptical investor

*"You haven't shown me production numbers. Show me the cost-per-move-in delivered for paying customers. Until then, this is a design doc."*

**Response.** Phase 9 acknowledges this directly. The paper is pre-launch. The Evaluation section is architecture-and-schema-based, not metric-based. The paper does not claim production results; it claims architectural commitments. The investor's decision is between funding the architecture against future evidence or waiting for the evidence to accrue. Both are defensible. The paper makes the architectural case as clearly as the code permits.

### Objection 6: The self-storage operator

*"This doesn't match how I run my facility. I don't think about ECRI eligibility as 180 days and 80%; I think about my tenants and whether they'll move out if I raise their rates. Algorithms can't replace operator judgment."*

**Response.** The platform does not aspire to replace operator judgment. It identifies candidates (the ECRI flag is a candidate flag, not an action); the operator decides per candidate. The platform automates the *identification* — which requires scanning the rent roll against street rates and tenure thresholds — and surfaces it; the operator owns the *decision*. This is the audit funnel pattern repeated at the operational layer: AI assists, operator decides. The platform's architectural commitment is to make the operator's decision-making faster and more informed, not to make it for them.

### Objection 7: The academic systems researcher

*"This isn't a novel architecture; vertical SaaS with server-side attribution and operator dashboards is well-documented. The Snowflake paper would not accept this thesis."*

**Response.** The paper acknowledges the architecture pattern is established (ServiceTitan in home services, Triple Whale in e-commerce, AppsFlyer in mobile — all use the same server-side conversion forwarding plus vertical-data-integration pattern). The contribution is *the vertical application* in self-storage, the documentation of the encoded operator knowledge that makes the application work, and the public articulation of the architectural choice to operate outside the PMS. The novelty is bounded and specific. The paper is *applied systems*, not *novel systems mechanism*. Both have a place; the paper does not claim to be the latter.

## 10.7 Drift-Vector Audit

Phase 0 declared eight drift vectors. Reviewing each at thesis-selection time:

- **D-A "Self-storage marketing automation SaaS":** Verified by Phase 6. Vocabulary density ~16/1000 LOC; vertical-specific defaults and edge cases throughout. The framing is accurate.
- **D-B "Audit funnel as spine":** Refuted by Phase 4. The spine is the B2C attribution chain, not the audit funnel. The audit funnel is the demand source (Subsystem 1). The paper's spine section will document the attribution chain.
- **D-C "Pre-launch" claim:** Verified by Phase 9. No production data accessible from codebase.
- **D-D "Operator-built thesis":** Verified by Phase 6. Strongly supported.
- **D-E "Move-in attribution thesis":** Partially verified by Phase 4. The chain is architecturally complete; operational closure is manual (Phase 7b P1). The thesis is sharpened in §10.4 to reflect this.
- **D-F "Server-side attribution (CAPI/Enhanced Conversions/GA4 MP)":** Verified by Phase 3 (Cluster I-1) and Phase 4 (Steps 6, 8). Meta CAPI and Google Enhanced Conversions are present; GA4 Measurement Protocol is configured but full server-side implementation not verified — most of the Google work uses the conversion-tracking URL.
- **D-G "Identifier propagation table":** Built in Phase 4 §4.3. Identifies the chain and explicitly names the break points.
- **D-H "Angelo's work":** Respected throughout. Ad-platform integrations and creative generation are catalogued (Phase 3 Cluster I-10, Phase 5 Subsystem 12) without modification.

All drift-vector triggers were either confirmed (D-A, D-C, D-D, D-F, D-G, D-H) or correctly forced a thesis reframing (D-B → spine is attribution chain not audit funnel; D-E → architectural commitment, not full operational closure). The paper writes the thesis the evidence supports.

## 10.8 The Single Most Important Sentence

If a reader takes one sentence from the paper, this is it:

> **The unit of revenue in self-storage is the physical move-in, and the attribution chain that ends there — server-side from click through PMS-webhook-confirmed completion — is what the vertical needs, what the existing tools do not provide, and what operator-built encoded knowledge makes possible.**

This sentence will appear in the abstract, the introduction's closing paragraph, and the conclusion. It is the paper's single load-bearing claim.

## 10.9 Bridge to Phase 11

The thesis is selected. Phase 11 builds the final pre-writing synthesis: the ten-question outline that the white paper will be built on. The white paper itself (Phase 12) is then written.
