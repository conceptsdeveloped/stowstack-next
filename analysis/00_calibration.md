# Phase 0 — Calibration and Canonical Study

## Purpose

Establish the stylistic and epistemic standard the final paper will meet. Declare priors so they can be falsified. Identify confirmation-drift vectors so they can be resisted. Set stop conditions so re-categorization is possible when evidence requires it.

## 0.1 Re-Reading the Canonical Openings

Six papers form the calibration set. Each is studied for what its opening accomplishes mechanically.

### Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System" (2008)

The abstract opens: *"A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution."*

**What the first sentence does, mechanically.** It does not introduce a product. It does not introduce Bitcoin. It states a counterfactual world ("would allow") and identifies the obstacle removed in that world ("without going through a financial institution"). The reader is placed inside the imagined-better-world before being told anything about the proposed mechanism. The sentence assumes the reader already accepts that the current arrangement has a defect — financial-institution-mediated payment — and offers no defense of that assumption. The economy of this is staggering: in twenty-eight words, the paper has named what is wrong, named what is desired, and skipped the question of whether the reader agrees, on the wager that the reader does.

**How it establishes the wrongness of the prior world.** The wrongness is built into the modal verb. "Would allow" implies "currently does not allow." The reader feels the absence as defect rather than as natural state. The next sentence — *"Digital signatures provide part of the solution, but the main benefits are lost if a trusted third party is still required to prevent double-spending."* — re-states the defect ("trusted third party is still required") and admits partial progress already exists, which signals authorial humility and credibility simultaneously.

**How it avoids introducing the system before the problem is established.** The word "Bitcoin" does not appear in the abstract. Not once. The system is not named until late in the body. The argument is established first; the artifact comes after. This is the most-imitated and least-actually-imitated feature of the paper.

**What the last sentence of the introduction does.** *"In this paper, we propose a solution to the double-spending problem using a peer-to-peer distributed timestamp server to generate computational proof of the chronological order of transactions."* It names the mechanism in technical-but-readable terms (peer-to-peer distributed timestamp server, computational proof, chronological order), commits to a specific approach, and bounds the contribution to a specific problem (double-spending). It does not promise to revolutionize finance. It promises to solve double-spending. The narrow promise is what made the wide implication credible.

**Authorial credibility signal.** The paper is signed Satoshi Nakamoto. The credentials are absent. The signal of credibility is the prose: spare, technical, unhedged where mathematics permits, hedged where attacker behavior is concerned. A skeptical reader trusts the paper because the paper does not ask to be trusted.

### Ghemawat, Gobioff, Leung, "The Google File System" (SOSP 2003)

The opening: *"We have designed and implemented the Google File System, a scalable distributed file system for large distributed data-intensive applications. It provides fault tolerance while running on inexpensive commodity hardware, and it delivers high aggregate performance to a large number of clients."*

**What the first sentence does, mechanically.** It names the artifact (Google File System), the category (scalable distributed file system), and the target workload (large distributed data-intensive applications). Three nouns in eighteen words. The brevity earns the reader's continued attention.

**How it establishes the wrongness of the prior world.** The second paragraph: *"While many of the same goals are shared with previous distributed file systems, our design has been driven by observations of our application workloads and technological environment, both current and anticipated, that reflect a marked departure from some earlier file system design assumptions."* The phrase "marked departure from some earlier file system design assumptions" carries the entire load. The wrongness of the prior world is *misaligned assumptions*, not technical inferiority. This is the most-defensible form of the wrongness-claim available: prior work was right for its assumptions; the assumptions have changed.

**The four corrected assumptions are then enumerated.** Component failures are the norm. Files are huge. Most writes are appends. The application and file system are co-designed. Each is one paragraph. Each is grounded in observation. None is defended with proof — they are stipulated as observed-by-the-authors, and the paper proceeds on that authority.

**How it signals authorial credibility.** The paper is written by Google engineers in 2003. Google's scale was already legendary. The credibility signal is the audacity of the corrected assumptions combined with the calm tone in which they are stated. A team without operational evidence behind them could not have written this paragraph without being mocked. The reader knows the team has the evidence; the paper does not have to display it.

**What the last sentence of the introduction does.** *"The file system has successfully met our storage needs. It is widely deployed within Google as the storage platform for the generation and processing of data used by our service as well as research and development efforts that require large data sets."* It announces production deployment as a single sentence and moves on. No hedging, no metrics yet, no list of services using it. The reader is told it works; the proof comes later.

### Dean and Ghemawat, "MapReduce: Simplified Data Processing on Large Clusters" (OSDI 2004)

The opening: *"MapReduce is a programming model and an associated implementation for processing and generating large data sets. Users specify a map function that processes a key/value pair to generate a set of intermediate key/value pairs, and a reduce function that merges all intermediate values associated with the same intermediate key."*

**What the first sentence does, mechanically.** Categorizes the contribution as a programming model first and an implementation second. This ordering is the entire argument. The implementation is interchangeable; the programming model is the contribution. The paper is sold as an abstraction, not a system.

**How it establishes the wrongness of the prior world.** The wrongness is the *complexity of large-scale data processing for individual engineers*. The paper does not say so directly in the abstract. The body opens with: *"Over the past five years, the authors and many others at Google have implemented hundreds of special-purpose computations that process large amounts of raw data... Most such computations are conceptually straightforward. However, the input data is usually large and the computations have to be distributed across hundreds or thousands of machines in order to complete in a reasonable amount of time."* The wrongness is *conceptual simplicity colliding with operational complexity*. The reader recognizes the pattern from their own work.

**Why the abstraction generalizes.** The paper claims hundreds of internal applications fit the model. The proof is the list of example use cases later in the paper: distributed grep, count of URL access frequency, reverse web-link graph, term-vector per host, inverted index, distributed sort. The applications are visibly distinct. The abstraction's generality is established by enumeration rather than argument.

**Authorial credibility.** Same as GFS — Google operational scale.

### DeCandia et al., "Dynamo: Amazon's Highly Available Key-value Store" (SOSP 2007)

The opening: *"Reliability at massive scale is one of the biggest challenges we face at Amazon.com, one of the largest e-commerce operations in the world; even the slightest outage has significant financial consequences and impacts customer trust. The Amazon.com platform, which provides services for many web sites worldwide, is implemented on top of an infrastructure of tens of thousands of servers and network components located in many datacenters around the world."*

**What the first sentence does, mechanically.** It establishes operational stakes ("significant financial consequences," "customer trust") before establishing technical content. The reader is told this is a real problem with real consequences, and the rest of the paper is positioned as the solution to a problem that already mattered.

**How it legitimizes the tradeoff.** The Dynamo contribution is the choice of availability over strong consistency. This was a heterodox position in 2007. The paper does not argue the tradeoff abstractly. It grounds the tradeoff in Amazon's operational reality: *"There are many services on Amazon's platform that only need primary-key access to a data store... For many services, such as those that provide best seller lists, shopping carts, customer preferences, session management, sales rank, and product catalog, the common pattern of using a relational database would lead to inefficiencies and limit scale and availability."* The tradeoff is defended not as theory but as observation.

**What this enables.** By grounding the unconventional choice in unimpeachable operational reality, the paper legitimizes an entire category of databases (eventually-consistent key-value stores) that would otherwise have been laughed out of academic consideration. The contribution is partly technical, partly *category-creation through credibility-borrowing*.

**Authorial credibility.** Amazon engineers in 2007. The shopping cart never going down on Black Friday is the credibility signal. The paper does not have to argue for its right to be heard.

### Ongaro and Ousterhout, "In Search of an Understandable Consensus Algorithm" / Raft (USENIX ATC 2014)

The opening: *"Raft is a consensus algorithm for managing a replicated log. It produces a result equivalent to (multi-)Paxos, and it is as efficient as Paxos, but its structure is different from Paxos; this makes Raft more understandable than Paxos and also provides a better foundation for building practical systems."*

**What the first sentence does, mechanically.** Names the artifact (Raft), the category (consensus algorithm), and the immediate domain (managing a replicated log). Eleven words. Zero ambiguity.

**The thesis sentence is the second.** Raft is equivalent to Paxos in result, equivalent in efficiency, different in structure, more understandable. The contribution claim is *understandability*. This is the audacious move: positioning a non-functional, human-cognitive property as the first-class design constraint of an algorithm. The paper has to defend the claim that understandability is even a legitimate design constraint before it can defend Raft. It does both, and the doing of the first is what made the paper famous.

**How wrongness of prior world is established.** Paxos is hard to understand. The paper says this directly, with citations to confused implementers and to NSDI 2007 discussions in which Paxos was described as "difficult." The wrongness is named with named-citation evidence; the wrongness is not the algorithm but the *teaching-and-implementing experience around it*.

**Authorial credibility.** Stanford PhD work. The credibility signal is the user study in the paper — students taught Raft and Paxos, tested on both, demonstrably learn Raft faster. The paper makes its non-functional claim falsifiable and then falsifies it in the empirical-evidence direction.

**The last sentence of the introduction.** It enumerates Raft's distinguishing features: strong leader, leader election by randomized timers, membership changes via joint consensus. Three named mechanisms, each one a chapter pointer for the body. The reader has been given a table of contents in narrative form.

### Dageville et al., "The Snowflake Elastic Data Warehouse" (SIGMOD 2016)

The opening: *"We live in the golden age of distributed computing. Public cloud platforms now provide virtually unlimited compute and storage resources on demand. At the same time, the SaaS model brings enterprise-class systems to customers who previously could not afford such systems due to their cost and complexity."*

**What the first sentence does, mechanically.** Establishes the *era* in which the paper is written. The sentence is unusually grand for a systems paper. It works because it is then immediately operationalized: cloud means unlimited resources on demand; SaaS means access for the previously-excluded. The grandeur is paid for in the second and third sentences.

**The corrected assumption.** The paper's contribution is the separation of storage from compute in a data warehouse. The assumption being corrected is that data warehouses must couple them — an assumption built into all prior data warehouses (Teradata, Greenplum, Redshift in its original form). The wrongness is named explicitly: *"Yet, existing data warehousing technologies fall short of taking full advantage of this elasticity. The reason is that, unlike most data, the workloads typical of databases and data warehouses are tightly coupled to the underlying systems."*

**How the architecture is derived.** From the corrected assumption: if cloud provides separable storage and compute, and if workloads can be decoupled from the systems running them, then storage and compute should be separate services. The reader watches the architecture emerge from the assumption-correction. This is the mechanic the GFS paper introduced and Snowflake refined.

**Authorial credibility.** Snowflake had public production deployments by 2016, including very large customers. The paper opens with the era-defining sentence because the company had earned the right to talk that way.

## 0.2 Cross-Paper Pattern Synthesis

Across all six, the shared mechanics:

1. **The opening does not introduce the artifact.** Bitcoin does not say "Bitcoin." MapReduce does, but immediately reframes itself as a programming model. Snowflake names itself but positions the system as instance of a larger argument. The introduction is about the world, not the product.

2. **The wrongness is named once and not re-litigated.** Each paper names the prior-world defect in one or two sentences and moves on. There is no extended philosophical defense. The reader either accepts the framing or stops reading; the paper does not negotiate.

3. **The mechanism is sketched before it is detailed.** A reader who reads only the abstract and introduction can describe the mechanism in their own words. The body then specifies the mechanism in enough detail that an engineer can simulate it.

4. **Numbers appear early and often.** GFS: chunk size 64 MB, replication factor 3. Dynamo: 99.9% latency targets. MapReduce: hundreds of internal applications. Snowflake: petabyte-scale customers. The numbers are not for impressing the reader; they are for bounding the claim.

5. **The limitations section is the credibility section.** Each paper acknowledges what it does not do. Bitcoin acknowledges that the attacker majority case breaks the system. GFS acknowledges that small files are inefficient. Dynamo acknowledges read-your-writes anomalies. The acknowledgments are what make the rest believable.

6. **The conclusion does not flourish.** Each paper ends short. The summary restates the contribution and stops. No "future of computing" rhetoric. The argument has been made; the conclusion just clears the table.

The white paper to be written will replicate these mechanics for the self-storage acquisition domain.

## 0.3 Declaration of Priors

Before any project code is read, the analyst declares what it expects to find. Each prior is numbered for later falsification accounting.

### Stack-Inferred Priors

P1. The Next.js App Router structure means routes live under `app/`. The presence of API routes under `app/api/**` is expected.

P2. Server Actions are likely used for form submissions, but the breadth of API-route directories listed in CLAUDE.md (172) suggests REST-style endpoints are also heavily used. Possibly both patterns coexist.

P3. Prisma with PostgreSQL implies migration files under `prisma/migrations/`. The schema file is referenced explicitly in CLAUDE.md.

P4. Clerk is named as middleware-only with all routes marked public. The analyst expects Clerk's standard middleware pattern but with overrides that disable enforcement.

P5. Stripe integration implies webhook routes under `app/api/webhooks/stripe/` or similar. The webhook handler will verify signatures.

P6. Anthropic API usage implies one or more `lib/anthropic.ts` (or similar) wrappers that call `messages.create()`. The system uses Claude for audit generation, copy, marketing plans, and GBP responses (per CLAUDE.md).

P7. Resend for transactional email implies templated email files, likely React Email components or HTML strings, alongside a `lib/resend.ts` or `lib/email.ts`.

P8. Twilio is described as "not set up yet" — implying SDK present but routes either stubbed or absent.

P9. Upstash Redis is used for caching and rate limiting. Expect a `lib/redis.ts` with `@upstash/redis` import and `Ratelimit` patterns.

P10. The mention of Meta/Google/TikTok Ads as "Angelo's work — do not modify" implies these integrations exist as code but were not authored by the principal user. They will form a distinct stylistic cluster.

P11. FAL.ai and Runway ML for video and image generation — similar attribution to Angelo. Expect distinct service wrappers.

P12. Google Places API for facility lookup implies one or more endpoints that wrap Places search and details. Likely also a database table caching results.

P13. Cal.com integration is described as an embed only. Expect no API route — just an iframe or component embed.

P14. The audit-tool funnel (`/audit-tool` and `/audit/[slug]`) is the top-of-funnel. Expect:
- A form page (`/audit-tool`)
- A POST endpoint to create an audit
- A processing path (likely background) to generate the diagnostic via Anthropic
- A persisted record (likely `shared_audits` per CLAUDE.md)
- A public read endpoint (`/audit/[slug]`)
- A "schedule a call" CTA that links to Cal.com

P15. Four independent auth systems are claimed: Clerk (middleware), admin key (header), client portal (email + access code), partner/org sessions (email + password + slug). Expect helper functions in `lib/`: `requireAdminKey`, `getSession`, and per-system patterns.

P16. The schema has 75 models. Expect a high-cardinality central model (probably `organizations` or `facilities`) with many inbound relations.

P17. The 9 Vercel cron jobs imply scheduled batch work. Expect:
- Lead aging/follow-up automation
- Stale audit cleanup
- Drip sequence advancement
- Subscription billing reconciliation
- Platform sync (Meta/Google ads metrics)
- Email retry
- Report generation
- Possibly: occupancy data refresh

P18. The marketing site is described as "draft — will be regenerated from brand identity/tone docs." Expect copy quality to be uneven; expect placeholder content; expect TODO comments.

P19. The admin dashboard has 16+ lazy-loaded tab components in `src/components/admin/facility-tabs/`. Expect a single large tab-orchestrator component with conditional imports.

P20. The client portal has onboarding wizard, campaigns, billing, reports, messaging, settings. Expect six or more sub-route directories.

P21. The partner dashboard is described as wrapped by `partner-shell.tsx`. Expect similar structure to admin shell.

P22. Landing pages are dynamic under `/lp/[slug]` and rendered from DB-stored section configs. Expect a `landing_pages` model with a JSON `sections` column (per the CLAUDE.md models list).

### Architectural-Inferred Priors

P23. Singleton database client at `src/lib/db.ts` (stated in CLAUDE.md). Expect the standard Prisma singleton pattern with `globalThis` caching for dev hot-reload.

P24. `src/lib/api-helpers.ts` has `requireAdminKey()` and `corsResponse()`. Expect this file to be imported by most API routes.

P25. `src/lib/session-auth.ts` has `getSession()`. Expect a session-token verification function that looks up `org_sessions` by token.

P26. `src/lib/cron-auth.ts` has `verifyCronSecret()` that fails closed when `CRON_SECRET` is unset.

P27. `src/lib/v1-auth.ts` exists for the external V1 API. Expect API-key authentication via a `api_keys` table.

P28. Path alias `@/*` maps to `src/*`. Imports use `@/lib/db` etc.

P29. The schema uses UUID primary keys throughout. Expect `@default(uuid())` or `@default(cuid())` on `id` fields.

P30. Soft-delete is mentioned in a recent commit (`feat: add soft-delete for leads in pipeline`). Expect a `deletedAt DateTime?` pattern on at least the lead-equivalent model.

### Business-Logic-Inferred Priors

P31. Per-facility/month pricing implies a subscription model where the count of facilities determines the bill. Expect either a Stripe metered-billing pattern or a per-facility subscription line item.

P32. Good / Better / Best tiers imply a `plan` or `tier` field on the organization or subscription record. Expect three named tiers plus a `custom_enterprise` flag or separate path.

P33. White-label for management companies implies brand-override fields on the organization (logo URL, custom domain, color overrides). Expect these as nullable columns.

P34. The audit tool generates a "marketing diagnostic." Expect Anthropic API calls that produce structured output (sections, scores, recommendations). Expect a JSON column on `shared_audits` to store the diagnostic.

P35. Client portal sessions stored in localStorage with email + access code. Expect *not* a session token table for client portal (in contrast to partner/org session tokens). The access code itself functions as the bearer credential.

P36. Partner/reseller distinction is collapsed: "Partners = both resellers and referral partners." Expect a `partner_type` enum or a flag on `organizations`.

P37. The activity_log model implies an event-sourced audit trail. Expect inserts on most state-changing operations.

P38. Drip sequences imply a state machine: a sequence has steps, each step has a delay and a content payload, each contact-in-sequence has a current step and a next-step-due-at. Expect cron-driven advancement.

P39. Platform connections (Meta, Google, TikTok) likely store OAuth refresh tokens. Expect encryption at rest is *not* implemented (would be surprising in a pre-launch product).

P40. The "Phase 1 (current): Manual upload of facility management reports — PDF, CSV, and Excel only. No API integrations yet" claim implies file-upload endpoints and report-parsing logic. Expect distinct paths per format. Expect Anthropic API extraction for unstructured PDF content.

### Industry-Inferred Priors

P41. Self-storage industry-specific defaults: rental month length, delinquency notice timing (30/60/90), lien sale process, unit-size pricing. Expect at least some of these encoded in code.

P42. Self-storage PMS systems: storEDGE, SiteLink, Easy Storage Solutions, Domico, Yardi Self-Storage, Tenant Inc, SpareFoot listings. The white paper task brief names storEDGE specifically. Expect at minimum a `pms_*` or `platform_connection` for storEDGE if PMS integration exists, but Phase 1 is described as manual upload. Expect *no* live PMS API calls in current code.

P43. The audit form likely captures: facility name, address, website, phone, owner name, email. Probably also: facility size, number of units, current occupancy. Expect Google Places lookup to auto-fill some of these.

P44. Marketing diagnostic likely covers: Google Business Profile quality, website quality, paid search visibility, paid social presence, review count, ranking on Google Maps, competitive analysis. Expect six to ten diagnostic sections.

P45. Lead pipeline stages probably include: new, contacted, scheduled, signed, churned, lost. The recent commit "feat: add soft-delete for leads in pipeline" implies the lead is a first-class entity. Expect a `leads` model distinct from `clients`.

P46. The transition from `lead` to `client_signed` triggers access code generation. Expect an enum status transition with a side-effect (access code creation, welcome email).

## 0.4 Confirmation Drift Vectors

The CLAUDE.md document and the task brief push specific narratives. Each named narrative is paired with the verification protocol that must observe code before the narrative is accepted into the paper.

### Drift Vector A: "StorageAds.com — Marketing automation SaaS for the self-storage industry"

The CLAUDE.md states this as fact. The task brief reinforces it with marketing assumptions.

**Verification protocol.** The paper may state that the system targets self-storage *only* after Phase 6 has demonstrated a density of self-storage-specific terminology, defaults, and edge cases that a generalist tool would not contain. If the code is mostly generic marketing-automation logic with thin self-storage wrappers, the paper must say so.

### Drift Vector B: "Free audit tool... top-of-funnel"

The CLAUDE.md asserts this is the marketing engine. The task brief reinforces it as the spine.

**Verification protocol.** The Phase 4 spine-identification must compute candidate workflows numerically. If audit-tool-to-customer is the longest workflow by files touched, external calls, and DB writes, it earns spine status. If a different workflow is the spine, the paper documents that finding instead. Confirmation drift would be allowing the audit workflow to be designated as spine because the doc says so.

### Drift Vector C: "Pre-launch. Not live with paying customers yet."

The CLAUDE.md states this. The implication is that no production metrics will exist.

**Verification protocol.** Phase 9 must verify the absence. If production data exists (analytics events, Sentry errors, Stripe payment records, customer records that look real), the paper must reckon with that. If it does not exist, the paper must state the constraint and proceed with schema-and-architecture-based evaluation.

### Drift Vector D: "Operator-built software encodes industry assumptions that agency-built software cannot replicate"

This is candidate thesis T3. The task brief is friendly to it. The narrative would be flattering if confirmed.

**Verification protocol.** Phase 6 must produce vocabulary density numbers, edge-case-handled counts, and vertical-integration ratios. If the density is low — if the code is mostly generic marketing plumbing — the paper must say so and choose T1 or T2 instead. The thesis the paper defends is the one the evidence supports, not the one most flattering to the user.

### Drift Vector E: "Move-in attribution"

The candidate theses T1 and T2 assume the system is built to chain ad spend to physical move-ins. This is plausible given the vertical, but it must be verified in code.

**Verification protocol.** Phase 4 (spine workflow) must trace whether the system actually captures a move-in event, joins it to a click, and reports the join back to ad platforms. If the system captures only lead-stage events, the paper cannot claim move-in attribution. The thesis must then be reframed honestly — perhaps "the architecture is built for move-in attribution but the integration with PMS data has not been completed yet."

### Drift Vector F: "Server-side attribution (Meta CAPI, Google Enhanced Conversions, GA4 Measurement Protocol)"

The task brief assumes these are present.

**Verification protocol.** Phase 3 (API surface) must enumerate routes touching Meta Conversions API, Google Ads Enhanced Conversions, and GA4 Measurement Protocol. If they are not present, the paper cannot claim server-side attribution. The thesis must be adjusted.

### Drift Vector G: "Identifier propagation table is the analog of the Bitcoin paper's transaction-chain diagram"

The task brief asserts this. The structural claim is that there exists a chain of identifiers traversing click → landing page → reservation → move-in → revenue.

**Verification protocol.** Phase 4 must construct the identifier propagation table from code. If the chain breaks at any step (e.g., the click ID does not actually reach the reservation system in code), the paper says so. The "missing link" is itself a finding worth reporting; it does not invalidate the thesis but reshapes it.

### Drift Vector H: "Angelo's work — do not modify" (the ad platform integrations)

CLAUDE.md sets this aside. The task brief does not address it.

**Verification protocol.** The analysis must still read Angelo's code — the instruction is about modification, not about understanding. The paper must include Angelo's contributions as part of the system. Stylistic differences may be findings.

## 0.5 Stop Conditions

When any of these triggers fire, the analyst pauses, documents the trigger, and reconsiders whether the working thesis is still defensible.

S1. **Phase 6 vocabulary density is low.** If domain-specific terms appear at fewer than 5 terms per 1000 LOC outside the schema, the operator-built thesis weakens. Re-evaluate.

S2. **Phase 4 spine is not audit-to-customer.** If the longest, most-elaborate workflow is something else (e.g., the admin facility-management dashboard, or the AI ad creator), the paper's narrative spine shifts.

S3. **Phase 3 reveals no Meta CAPI / Google Enhanced Conversions / GA4 MP routes.** Server-side attribution is then unverified. Reframe thesis as architecture-without-execution if needed.

S4. **Phase 4 reveals no move-in event capture.** Move-in attribution is then aspirational rather than implemented. Thesis must reflect this.

S5. **Phase 8 reveals an existing product that does the same thing.** Novelty claim weakens. Reframe contribution as implementation-specific or vertical-adoption-specific.

S6. **Phase 7b is short.** If the "what is not built" list is brief, the analyst has not looked hard enough. Return to earlier phases.

S7. **Contradiction log is empty after Phase 5.** Same — not looking hard enough.

S8. **The opening paragraph of the draft Introduction contains the product name.** Rewrite.

S9. **The paper's claims about competitors cannot be verified from public sources.** Mark as `UNKNOWN` rather than fabricate.

S10. **The principal user's name (Blake) or Angelo's name appears in the paper's main body.** The paper is third-person. Names go in acknowledgments, if at all.

## 0.6 Compute Budget Declaration

The analyst has no compute budget constraint for this task. Every relevant file will be read. Counts will be computed rather than estimated. Code paths will be traced rather than skimmed. Citations will be made rather than summarized.

When a later phase reveals that an earlier phase missed something, the earlier phase will be revisited and its document updated. The revision will be logged in `analysis/REVISIONS.md`.

When a finding contradicts the CLAUDE.md or README, the contradiction will be logged in `analysis/CONTRADICTIONS.md` with citations to both sides.

The phase outputs feed the paper. Their quality bounds the paper's quality. If a phase output reaches 50,000 words, it reaches 50,000 words. The artifact is the deliverable.

## 0.7 Initial Position

The analyst now proceeds to Phase 1 with priors P1–P46 declared, drift vectors A–H named, and stop conditions S1–S10 armed.

The hypothesis to be tested in Phase 1: the system is a vertical-SaaS marketing-and-attribution platform for self-storage operators, in which the technical center of gravity is a click-to-move-in attribution chain built on top of Next.js, Prisma, and the major ad platforms' server-side APIs.

This hypothesis will be confirmed, partially confirmed, or refuted by direct code observation in Phases 1 through 10. The Phase 12 paper defends what the evidence supports, not what the hypothesis predicts.
