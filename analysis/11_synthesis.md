# Phase 11 — Pre-Writing Synthesis

The ten questions from the Phase 0 task brief, answered in order. These answers are the scaffolding the white paper is built on.

## Q1. Definition (two sentences, no marketing language)

StorageAds is a vertical software platform that, sitting outside a self-storage facility's property-management system, ingests its events via webhook and structured import; runs a multi-platform paid-acquisition stack with server-side conversion forwarding to Meta and Google; and reports cost per physical move-in rather than cost per form submission. The platform's architectural commitment is that the unit of acquisition cost in self-storage is the move-in, not the lead.

## Q2. Problem (defend from Phase 2, 4, 6 evidence)

The problem the system solves: in self-storage paid acquisition, the platforms that operators currently use measure cost per form submission ("lead") because that is what the platforms can see at the moment of measurement. The platform cannot see the move-in because the move-in happens days or weeks later, in the property-management system, often after additional touchpoints (a call, a walk-in, a return visit). The result is a measurement error that propagates: campaign optimization optimizes the wrong objective; ad spend is allocated against an objective uncorrelated with revenue; the operator pays for leads that don't move in and is rewarded with reports that say the leads are cheap.

This is defended from:
- Phase 2: the `client_campaigns` model has `cost_per_move_in` and `roas` as first-class columns alongside `cpl`. The schema treats move-in metrics as the primary report (not derived).
- Phase 4: the spine workflow architecture is built end-to-end for the click-to-move-in chain, even though the operational closure is currently manual.
- Phase 6 §6.7: the AI audit prompt explicitly directs the model to use "cost per move-in" vocabulary, benchmark CPL against industry norms ($35-50), and treat cost per move-in as the more important metric.

## Q3. User (defend from defaults, vocabulary, workflows)

The user is a self-storage facility owner or operator — typically an independent or small-portfolio operator (5-50 facilities) — operating their facilities on a PMS (storEDGE primarily; SiteLink, Yardi, ESS, Domico, Tenant Inc inferred from operator survey form). The operator runs (or wants to run) paid digital advertising and currently either pays an agency or runs it themselves with limited attribution visibility.

Defended from:
- Plan tiers (Launch / Growth / Portfolio) with facility limits (10 / 50 / Enterprise) suggest the target customer's facility-count distribution.
- The diagnostic form's 40+ fields (operator role, years managed, facility count, monthly ad spend, ideal budget, agency experience) profile the operator demographically.
- Vocabulary throughout (move-in, move-out, street rate, ECRI, autopay) is the operator's idiom.
- The audit funnel terminates in "Schedule a call" — a B2B sales motion appropriate for SMB operators making 4-5-figure-per-year decisions, not for retail self-serve.

## Q4. Mechanism (one paragraph)

The system runs a click-to-move-in attribution chain implemented across approximately fifteen route handlers, six external systems, and sixteen distinct identifiers. The UTM-coded inbound URL increments a click counter and 302-redirects to a landing page; the landing page's client-side tracker accumulates form-state, behavioral, and identity signals into a `partial_leads` row keyed by a client-generated session identifier; explicit form submission upgrades the row to the converted state and triggers server-side conversion forwarding to Meta's Conversions API and Google's Ads Conversion API with SHA-256-hashed PII per platform requirements; the storEDGE reservation widget (embedded as iframe on the landing page) propagates the tracking parameters round-trip and, on reservation and move-in completion, fires HMAC-signed webhooks back to the platform's `/api/webhooks/storedge` endpoint, which logs the attributed move-in to the activity log with the full tracking parameters; reporting joins the captured spend (by `utm_campaign`) against the captured move-ins (where `lead_status = 'moved_in'`) to produce campaign-level cost-per-move-in. The operational closure from move-in webhook to lead-status transition is performed manually in the current implementation — the architecture commits to the closure, the automation has not yet been written.

## Q5. Hard parts

Several things in this system are difficult or unusual.

**Hard part 1: server-side multi-platform conversion forwarding with correct event-name mapping.** Each platform has its own event names (`reservation_started` → Meta `InitiateCheckout` vs. Google `initiate_checkout`), its own hashing requirements (Meta accepts single hashed values; Google Enhanced Conversions wants arrays of hashed values), its own pass-through technical identifiers (`fbc`/`fbp` for Meta; `gclid` for Google), and its own deduplication mechanism (Meta uses caller-supplied `event_id`; Google deduplicates by `gclid` + timing).

**Hard part 2: cross-domain iframe attribution.** The storEDGE reservation widget runs on `storedge.com`; the landing page on `storageads.com`. Tracking parameters must travel from URL → parent page → iframe URL → iframe internal state → reservation event → webhook callback. Each hop is a potential break.

**Hard part 3: operator-knowledge encoding in defaults.** The 180-day ECRI tenure threshold, the 80% rate-recovery target, the 5-bucket aging structure matching state-law-driven lien-prep timing, the non-uniform occupancy bucket midpoints, the 90-day moveout cooldown — each requires *practitioner judgment* to choose. A non-practitioner would have chosen wrong.

**Hard part 4: AI prompts that produce operator-credible output.** The deep-path audit prompt is over a thousand lines, with 40+ input fields, 8 audit categories, inline industry benchmarks, scoring rule constraints (exactly 2 green, 1 yellow, 3 red), and explicit vocabulary instructions. Producing a prompt that an operator will recognize as legitimate-sounding (rather than ChatGPT generic) is a substantial design exercise.

**Hard part 5: the four-system authentication topology.** Public for the audit funnel, admin-key for ops, client access-code for portal, partner session-token for the org dashboard, v1 API key for external integrations — five distinct credential schemes coexisting cleanly with shared middleware (CSRF, rate limit, Sentry) and shared lib helpers (`requireAdminKey`, `getSession`, `requireApiAuth`).

**Hard part 6: the 13-cron operational hygiene with three batching patterns.** Cursor pagination, time-budgeted loops, chunked deletes — each correct for its workload, all with admin failure alerts, idempotent where appropriate, transactional where state safety requires it.

## Q6. Easy parts

**Easy part 1: the React frontend.** Next.js App Router, Tailwind, Poppins + Lora, lazy-loaded marketing-page chapter components. Conventional choices well-executed.

**Easy part 2: Stripe billing.** Stripe SDK, webhook verification via `constructEvent`, atomic provisioning. Standard pattern.

**Easy part 3: the multi-tenant CRUD APIs.** Most of the admin routes are CRUD against the Prisma client, with auth + rate-limit middleware. The shape is conventional.

**Easy part 4: the Anthropic API integration mechanically.** A single `fetch` with API key header, message body, response parsing. The interesting work is in the prompt, not the integration.

**Easy part 5: Sentry, Resend, Upstash configuration.** Standard env-var-driven configuration; nothing platform-specific.

**Easy part 6: Vercel deployment.** Out-of-the-box Next.js on Vercel with cron schedules in `vercel.json`. No infrastructure-as-code complexity.

## Q7. Category fit

The system is *vertical SaaS for self-storage*, more specifically *acquisition platform sitting outside the PMS*. It does not fit cleanly into:
- *Generalist attribution platforms* (Triple Whale, Northbeam): too vertical-specific.
- *Marketing CRM* (HubSpot, Salesforce): not enough vertical specificity.
- *Vertical PMS marketing add-on* (Storable's marketing modules): wrong architectural side of the PMS boundary.
- *Vertical marketing agency* (StoragePug, G5, StorageRankers): not an agency — it's software the operator owns.

The closest pattern analog is ServiceTitan in home services: a marketing layer that consumes operational events from a vertical operations system to attribute marketing spend to revenue-bearing events (jobs closed for ServiceTitan, move-ins for StorageAds). The structural difference is that ServiceTitan owns the FSM operations layer too; StorageAds is positioned outside the storEDGE / SiteLink / Yardi PMS layer.

What about it doesn't fit cleanly: the four-parallel-sequence-engines (drips, nurture, retention, moveout) and the two-parallel-audit-pipelines (light, deep) and the two-CSP-layers all suggest in-progress consolidation. The internal-dev-tooling cluster (`commit_*` models in production schema) suggests a culture of in-application working that's unusual.

## Q8. Surprises (against Phase 0 priors / Phase 1 hypothesis)

The Phase 1 hypothesis was: *"a full-funnel marketing and operations platform for self-storage operators... in which the technical center of gravity is a click-to-move-in attribution chain built on top of Next.js, Prisma, and the major ad platforms' server-side APIs."*

Surprises encountered through Phases 2-9:

1. **The schema has 89 models, not 75** as CLAUDE.md claims. The 19% drift indicates the schema has grown faster than CLAUDE.md was updated.

2. **The internal developer tooling cluster (9 routes / 9 models) lives in production.** Commit annotations, deploy tags, dev handoffs in the same database as customer data. This is unusual.

3. **The diagnostic pipeline has not been consolidated** — both a light path (5 fields) and a deep path (40+ fields) operate in parallel with different AI models, different output shapes, different audit storage. The two coexist.

4. **The storEDGE webhook does not update `partial_leads`.** This is the Phase 4 critical finding. The attribution chain is architecturally complete but operationally manual.

5. **Vocabulary density is ~16 per 1000 LOC** — saturated with operator-specific terms. The thesis-supporting evidence is more abundant than expected.

6. **The vertical-to-generic integration ratio is ~1:3** — most vendor integrations are generic (Stripe, Resend, Anthropic, Twilio). The vertical depth lives in the schema, workflows, defaults, and prompts; not in vendor integrations.

7. **The external v1 API is real** — 12 routes, scope system, rate-limit, usage logging, outbound webhooks, three test files. This is a partner-integration surface, not a marketing feature.

8. **The cron infrastructure is highly disciplined** — every job has cron-secret auth, every job has admin failure alerts, every job bounds work via batching. For a 15-day-old codebase by two people, the discipline is unusual.

9. **The Twilio webhook does not verify signatures** — the one exception in an otherwise carefully signature-verified webhook surface. Logged in Phase 7b M12.

10. **Vitest tests exist** — CLAUDE.md says no test framework, but eight test files exist for the most critical auth helpers, the v1 API, and the Stripe webhook. The team is testing the things that would hurt if they broke.

## Q9. Authors-vs-code divergence

Several places where the product's self-description diverges from the code's behavior. Each was logged in `CONTRADICTIONS.md`.

The main divergences:
- CLAUDE.md describes Twilio as "not set up yet"; the code has the SDK, schema models, webhook handler, and active cron-job usage of `/api/sms-send`.
- CLAUDE.md describes a single CSP; the code has two competing CSP layers (next.config enforcing + middleware report-only) that disagree.
- CLAUDE.md describes "9 Vercel cron jobs"; there are 13.
- CLAUDE.md describes "~75 models"; there are 89.
- CLAUDE.md describes 118+ API route directories; there are 190.
- CLAUDE.md describes "No test framework is configured"; there are 8 test files, vitest configuration, and a test/ directory.
- CLAUDE.md says "never use icon libraries"; `lucide-react` is in dependencies.
- Marketing copy claims "move-in attribution"; the code captures the move-in event but does not automatically transition the lead-status.

These are signals about the team. They are not signals about the code's intent — the intent is correctly described, but the description has drifted as the code raced ahead. The team builds faster than they document.

## Q10. The single most important sentence

Restated from Phase 10 §10.8:

> **The unit of revenue in self-storage is the physical move-in, and the attribution chain that ends there — server-side from click through PMS-webhook-confirmed completion — is what the vertical needs, what the existing tools do not provide, and what operator-built encoded knowledge makes possible.**

This sentence will appear in the abstract, the introduction's closing paragraph, and the conclusion. It is the load-bearing claim of the paper.

## Phase 11 → Phase 12 Bridge

Phases 0–11 are complete. The accumulated evidence supports a paper that:

- Opens with the wrongness of cost-per-lead as the unit of measurement in self-storage, without naming the product.
- Provides background on the vertical's economics (per-unit revenue, occupancy as primary KPI, the three-rate model, ECRI as a load-bearing operator practice).
- Surveys existing tools and names their boundary positions (Storable inside the PMS; StoragePug/G5/StorageRankers as agencies; generalist attribution platforms; DIY).
- Documents the architecture in detail — the schema's 89 models, the 178 routes' behavioral clustering, the spine workflow's 12-step trace with the identifier propagation table.
- Names the operator-knowledge encoding in defaults, edge cases, vocabulary, and AI prompts.
- Names the limitations honestly: the click-to-move-in operational closure is manual; PMS integration is storEDGE-only; the sequence engines are unconsolidated; the system is pre-launch.
- Compares against the established baseline and produces a bounded novelty claim about the architectural position (outside the PMS, server-side multi-platform, operator-knowledge-encoded).
- Discusses the surprises and the open problems.
- Sketches what becomes possible if the architectural commitments are realized.

The paper is now ready to be written.
