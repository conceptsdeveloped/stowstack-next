# Operator OS — 90-Day Blake-Portfolio Pilot Measurement Plan

**Status:** Measurement spec. Derivative of `docs/operator-os-vision.md` and `docs/operator-os-phase-1-prd.md`.
**Audience:** Blake (owner of the portfolio data + sales narrative), Angelo (owner of the ad-platform and creative-performance instrumentation), engineering (instrumenting the data capture).
**Purpose:** Define exactly what gets measured, how, and how the results render as the proof artifact every Phase 2 sales conversation depends on.
**Register:** Pitch voice. The output of this plan becomes the most cited slide in every future investor and operator conversation. It must hold up under scrutiny.

---

## 1. Why this plan is critical

The vision doc commits to a positioning that rests on a single proof: Blake ran the Operator OS on his own facilities for 90 days, and the numbers moved. If the numbers do not move, the operator-built positioning collapses. If the numbers move but cannot be defended methodologically, sophisticated prospects discount the claim and the positioning weakens. The measurement plan is therefore the load-bearing artifact for the entire GTM motion.

The plan also serves a second purpose: it defines the dashboard the platform will eventually ship to every customer. The same metrics, computed the same way, will populate the operator-facing Operator OS Overview tab in production. The Blake-portfolio pilot is the first instance of the production reporting system, not a one-off proof exercise.

---

## 2. The metrics that matter

Three tiers of metrics, in order of importance to the proof artifact.

### 2.1 Tier 1 — outcome metrics

These are the metrics the operator buyer judges the platform on. They are the headline numbers in the proof artifact and the headline numbers in the future customer dashboard.

**Occupancy percentage** is the north-star metric per the vision doc. Defined as `(occupied units) / (total rentable units)`, measured as a 7-day rolling average to smooth daily variance. Reported as the absolute percentage at each weekly snapshot and as the delta from baseline.

**Move-in volume** measured as monthly gross move-ins, with same-month-prior-year and trailing-12-month comparisons.

**Cost per move-in (CPMI)** measured as `(paid acquisition spend for the period) / (move-ins attributable to paid acquisition for the period)`, with attribution via the existing utm/lift chain. CPMI is the unit-of-revenue metric and the structural argument that distinguishes the platform from cost-per-lead-optimized competitors.

**Net revenue per facility per month** measured as `(sum of rent collected) / (period)`, separated by new tenant revenue versus renewal revenue, with the new-tenant line being the direct platform-attributable component.

### 2.2 Tier 2 — operational metrics

These are the metrics that explain Tier 1 movement and demonstrate the platform's mechanism of action. They are the supporting evidence on the proof artifact and the diagnostic instrumentation in the future operator dashboard.

**Lead volume by channel**, separated into: GBP local search (direction requests + website clicks from GBP), Google paid, Meta paid, organic social, drive-by (signage QR scans + geo-fenced session matches), and referral. Weekly counts and channel-mix percentages.

**Lead-to-move-in conversion rate by channel**, with the gap between best-converting and worst-converting channels as the operational signal.

**AI receptionist activity** — total inbound conversations handled, p50 / p95 / p99 response latency, percentage of conversations resolved without human escalation, escalation rate by trigger category.

**GBP performance** — search views, maps views, direction requests, website clicks, phone calls, photo views, post views, post clicks, review count delta, average rating delta, review response coverage percentage.

**Organic social performance** — posts published, engagement rate by platform, follower delta (acknowledged as a vanity metric but operator buyers expect to see it).

**Lifecycle activity** — win-back enrollments, win-back conversions, churn-prevention alerts triggered, churn alerts that did not result in move-out within 30 days (positive outcome), referral enrollments, referral activations.

### 2.3 Tier 3 — efficiency metrics

These metrics demonstrate the platform's unit economics for internal evidence and for the eventual investor / Storable corp dev one-pager.

**Operator time savings** — hours per week the operator estimates they previously spent on marketing tasks the platform now handles. Self-reported by Blake at week 0 and week 12 via structured interview, with the gap claimed as the savings.

**Cost per facility per month** — the all-in platform cost to operate one facility, including Anthropic API costs, Postiz cloud cost, Twilio cost, infrastructure cost, QA labor cost. This is the input to the Phase 2 pricing tier validation.

**Safety event rate** — `ai_safety_events` per 1,000 AI outputs, broken down by event type (escalation, blocklist hit, QA sample flag, review queue insert). Low rate validates the safety architecture; high rate triggers prompt revisions.

---

## 3. Baseline capture — week 0

Baseline capture happens before the platform is turned on for each Blake facility. This is the comparator without which every Tier 1 claim is uninterpretable.

### 3.1 What gets captured at baseline

For each Blake facility, the following data points are recorded as of week 0 and stored in `facility_pms_snapshots` (existing schema) plus a new `pilot_baseline` JSON blob on the facility metadata:

- Occupancy percentage on the baseline date, plus the trailing-12-month monthly occupancy series.
- Trailing-12-month monthly move-in count series.
- Trailing-12-month monthly net revenue series.
- Trailing-90-day GBP insights snapshot (all metrics in `gbp_insights` table).
- Trailing-90-day GBP review count and average rating.
- Current marketing spend by channel (typically zero or near-zero for the Blake portfolio, per the operator-built positioning — the absence of pre-existing marketing infrastructure is itself part of the story).
- Current marketing tools in use (typically also none or minimal).
- The operator's structured-interview answers on time spent per week on marketing, perceived biggest pain, and stated goal for the pilot.

The baseline data sources: PMS reports for occupancy / move-ins / revenue, the existing GBP sync infrastructure for GBP metrics, manual capture for spend and tools, interview for time and stated goals.

### 3.2 Baseline as a contract

The baseline numbers are recorded once at week 0 and never revised. Subsequent measurements are reported as deltas from the locked baseline. This is the methodological commitment that makes the lift claim defensible. The temptation to revise baseline downward (which would flatter the lift) is the single largest methodological risk; the lock-at-week-0 rule is the mitigation.

---

## 4. Measurement cadence

### 4.1 Weekly snapshot

Every Monday at 09:00 local, an automated snapshot writes a row to the `pilot_weekly_snapshots` table (defined in PRD §3.9). The snapshot includes every Tier 1 and Tier 2 metric at the moment of capture.

The weekly snapshot enables: time-series visualization, the lift-vs-baseline chart in the operator dashboard, the 4-week / 8-week / 12-week milestone reports, and the ability to spot inflection points and tie them to specific platform events (e.g., new GBP post type adoption, new lifecycle sequence activation).

### 4.2 Monthly milestone reports

At day 30, day 60, and day 90, a more detailed milestone report is produced. The milestone report includes:

- The locked baseline numbers (unchanged from week 0).
- Current snapshot numbers (week 4, 8, 12).
- Absolute delta and percent delta on each Tier 1 and Tier 2 metric.
- Qualitative commentary on what platform actions drove the largest deltas.
- Tier 3 efficiency metrics through the milestone window.
- Open issues, safety events of note, prompt revisions made.

### 4.3 Final 90-day report

At day 90, the final report is the artifact that gets used in every future sales conversation. Structure documented in §6 below.

---

## 5. What gets instrumented automatically vs. captured manually

### 5.1 Automatic instrumentation

Captured by the platform without manual intervention:

- All GBP metrics (existing `gbp_insights` cron).
- All paid-acquisition metrics (existing campaign instrumentation).
- All AI receptionist metrics (PRD §10.1).
- All organic social metrics (Postiz webhook write-back).
- All lifecycle module metrics (existing nurture/churn/retention schema).
- Occupancy and revenue (from PMS report processing, weekly cadence in Phase 1 given manual upload).
- Safety event counts (`ai_safety_events`).
- Cost per facility per month (computed from API usage logs + infrastructure attribution).

### 5.2 Manual capture

These data points require Blake's input each week and are captured in a shared spreadsheet or a simple structured form:

- Weekly PMS report upload (week 0, then weekly).
- Week 0 structured interview on marketing time spent and stated goals.
- Week 4, 8, 12 structured interviews on time spent (delta from baseline), perceived value, and any operational friction.
- Qualitative commentary on which platform features drove which observed changes (Blake's own attribution sense check).

The manual capture should be designed for 15 minutes of Blake's time per week. Anything longer becomes a friction risk that degrades data quality.

---

## 6. The 90-day proof artifact

The output of the 90-day pilot is a single document, designed to be the most-cited piece of evidence in every future Operator OS sales conversation. It exists in three derivative forms.

### 6.1 The full case study (long-form PDF)

A 12-15 page document with the following structure:

**Section 1 — The pilot setup.** Describes the Blake portfolio (number of facilities, total units, geographic distribution, baseline operational state, explicit acknowledgment that this is the founder's own portfolio and therefore not a representative external customer). The transparency on the founder-portfolio nature of the pilot is itself a credibility move — sophisticated readers respect the honest framing.

**Section 2 — The baseline.** All Tier 1 and Tier 2 metrics at week 0, with the trailing-12-month context series.

**Section 3 — What we did.** A factual description of what platform modules were activated and when, per facility. No marketing language; this section is the methodology disclosure.

**Section 4 — The numbers.** Tier 1 metrics through the 90 days, with weekly snapshots charted, milestone deltas tabulated, and the lift-vs-baseline view prominent. Each metric movement is annotated with the operational events that plausibly caused it.

**Section 5 — Mechanism of action.** Tier 2 operational metrics, organized by the platform module that drove them. This is the section that demonstrates the platform is not a black box — the GBP movements tie to specific GBP actions, the lead conversion movements tie to specific AI receptionist behavior, and so on.

**Section 6 — Efficiency profile.** Tier 3 metrics. The cost-per-facility-per-month number that validates the pricing tier. The operator-time-savings number from Blake's self-report.

**Section 7 — Honest limitations.** A direct enumeration of what the pilot does not prove: that the lift would replicate at scale, that the lift would replicate for non-founder operators, that the cost profile would hold under multi-tenant load, that the safety architecture would catch every failure mode at higher message volume. The limitations section is the strongest single argument for the platform's credibility — it pre-empts the objections sophisticated readers will raise.

**Section 8 — What changes for the Phase 2 external pilot.** The 10-operator paid pilot that follows Phase 1 is described, with the specific measurement upgrades that will produce the Phase 2 proof artifact (which will be the externally-defensible version of this document).

### 6.2 The sales-deck slide (single page)

A one-page summary distilled from the full case study, designed to drop into a sales conversation. The slide shows:

- Baseline occupancy, day-90 occupancy, absolute delta and percent delta — large.
- Baseline trailing-12-month average move-ins, day-90 30-day average move-ins, absolute delta and percent delta — large.
- CPMI at day 90 — large.
- A 3-line caption: "Run on the founder's own portfolio. Pilot, not customer base. Phase 2 external pilot underway."

The caption is intentionally hedged. The 3 large numbers carry the persuasive weight; the caption pre-empts the "what about external customers" question.

### 6.3 The investor / Storable corp dev one-pager (single page)

The same numbers as the sales-deck slide, but framed in pitch voice with the architectural claim alongside the outcome claim. Structure:

- The architectural claim: server-side multi-platform attribution + PMS-data-driven operational intelligence + operator-language AI as the public top-of-funnel, in a single vertical platform operating outside the PMS.
- The proof: the three Tier 1 numbers and the lift framing.
- The methodological commitment: baseline locked at week 0, no revision, hedged on founder-portfolio limitations.
- The Phase 2 next step: 10-operator external pilot already scoped, measurement infrastructure already production.

The investor version emphasizes the architectural commitment as much as the outcome numbers, because the audience evaluates defensibility as much as performance.

---

## 7. Measurement integrity — methodological commitments

Five methodological commitments that make the proof artifact defensible. Each commitment is also a discipline that future internal practice must inherit.

**Baseline lock at week 0, no revision.** Documented in §3.2. Even if errors are discovered in the week-0 capture, the corrected number is reported as a separate "corrected baseline" annotation rather than as a baseline revision.

**No survivorship bias.** All Blake facilities are reported, including any facility that underperforms or shows no movement. The temptation to omit underperformers is real and disqualifying.

**Time-series transparency.** Weekly snapshots are reported in full, not just the milestone deltas. A 12-week chart that shows steady improvement is a stronger story than a single before/after comparison, and a chart that shows volatile improvement (gain, dip, gain) is the most credible of all because it matches what real operational data actually looks like.

**Attribution honesty.** Lift-vs-baseline is the headline framing because it is the most defensible. Multi-touch attribution is reported alongside for completeness. Any claim that a specific platform action caused a specific outcome is annotated as inferential, not causal, unless A/B isolation is available.

**Pre-registered metrics.** The metrics listed in §2 are the metrics reported in §6. No metric is added retrospectively because it happens to flatter the result, and no metric is removed retrospectively because it happens to disappoint. The metric set is locked at the start of the pilot.

---

## 8. Risk register specific to the measurement

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Blake's portfolio shows no meaningful lift | Low-Medium | Catastrophic to the GTM narrative | The 90-day window must be long enough to capture lift; if no lift at day 60, the milestone report triggers a diagnostic review and a possible pilot extension to 180 days before the proof artifact is finalized |
| Lift is real but driven by exogenous factors (seasonality, local market shift) | Medium | High | Same-month-prior-year and trailing-12-month comparisons isolate platform effect from seasonal effect; submarket competitor intel data (when available) further isolates local-market effects |
| Blake's facilities are too small / too unrepresentative to be persuasive | Medium | Medium | Section 7 of the case study acknowledges the limitation directly; the Phase 2 external pilot is positioned as the externally-defensible version |
| PMS data quality issues degrade the occupancy/revenue series | Medium | High | Weekly PMS upload cadence + parsing validation; any data gap is reported transparently in the case study rather than papered over |
| AI safety events flood early in the pilot and damage Blake's portfolio | Medium | Medium | Conservative escalation thresholds in Phase 1 favor over-escalation; manual review of every escalation in the first 4 weeks catches drift before customer harm |
| Measurement bias from Blake being both the operator and the founder | High | Medium | Manual interview answers explicitly flagged as self-report; quantitative metrics from instrumentation are the load-bearing data; the founder-portfolio caveat is featured prominently in the case study |

---

## 9. Pre-pilot checklist

Before week 0 of the pilot, the following items must be complete:

- Phase 1 PRD acceptance criteria all passed (PRD §10.2).
- `pilot_baseline` JSON blob populated on each Blake facility.
- `pilot_weekly_snapshots` table migrated.
- Week 0 structured interview conducted and stored.
- Trailing-12-month PMS data captured for each Blake facility.
- GBP sync caught up to current state on each facility (no backfill needed mid-pilot).
- The shared spreadsheet / structured form for weekly manual capture provisioned.
- The Monday-09:00 weekly snapshot cron operational.
- A calendar reminder set for Blake at week 4, week 8, week 12 for the milestone interviews.

---

## 10. From measurement to product

The pilot measurement plan does double duty: it produces the proof artifact AND it specifies the production reporting system that ships in Operator OS Phase 2 and beyond.

Every metric defined here corresponds to a tile or chart in the operator-facing dashboard (PRD §8.1). Every methodological commitment in §7 becomes a feature in production: baseline lock at onboarding, time-series visualization with weekly snapshots, lift-vs-baseline as the headline number, pre-registered metric sets per tier.

The Blake-portfolio pilot is therefore the first customer of the production reporting system, not a separate measurement exercise. Building the reporting infrastructure once, well, against the Blake-portfolio dataset, ensures that the same instrumentation that produces the proof artifact also produces the day-90 dashboard for the first 10 external pilot operators.

That alignment is the strongest single argument for treating measurement as a product surface, not an analytics exercise. The dashboard is the proof artifact; the proof artifact is the dashboard. They are the same thing, computed the same way, presented in two different formats — long-form for the sales deck, live for the operator login.
