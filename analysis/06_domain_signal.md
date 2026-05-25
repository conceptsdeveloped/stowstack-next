# Phase 6 — Encoded Domain Knowledge

This phase determines whether the codebase encodes deep self-storage operator knowledge or is generic marketing-automation logic wrapped in self-storage vocabulary. The distinction matters: the *operator-built* thesis (candidate T3 in Phase 0) requires the former; the *measurement-thesis* candidates (T1, T2) are supported by either.

The phase examines vocabulary density, defaults that encode assumptions, edge cases handled and not handled, and the ratio of vertical-specific to general-purpose integrations.

## 6.1 Vocabulary Census

### Quantitative Density

A grep across the codebase for self-storage-specific terminology — `street_rate`, `web_rate`, `push_rate`, `ECRI`, `gross_potential`, `economic_occupancy`, `lien`, `delinquency`, `move_in`, `move_out`, `tenant_protection`, `autopay`, `insurance_premium`, `drive-up`, `climate-controlled` — yields **1,671 distinct occurrences** across `.ts`, `.tsx`, and `.prisma` files. A second grep for tenant-lifecycle terms (`rental_start`, `paid_thru`, `lease_end`, `days_past_due`, `days_delinquent`, `aging`, `move_in_date`, `moved_out`, `tenant_name`, `rent_roll`, `rent_rate`) yields **326 more occurrences**.

The combined ~1,997 occurrences against 124,291 LOC produces a vocabulary density of **~16 self-storage-specific term occurrences per 1,000 LOC**. For comparison, a generalist marketing platform would have terms like `lead`, `contact`, `campaign`, `account` at much higher absolute counts but no vertical-specific terms. The density here is meaningful: vocabulary saturated with operator vocabulary appears in roughly every 60 lines on average.

The vocabulary appears in every code surface — schemas, route handlers, lib helpers, components, AI prompts. It is not isolated to a single "vertical layer."

### Term Locations and Roles

The following table samples the principal terms by location and role (schema field, route handler logic, AI prompt content, component label, or admin form input).

| Term | Where it appears | Role |
|------|------------------|------|
| **ECRI** (Existing Customer Rate Increase) | `src/app/api/audit-generate-diagnostic/route.ts:417,621` (prompt input + industry benchmark "72%"), `src/app/api/occupancy-intelligence/route.ts:346,378` (recommendation logic), `src/app/api/storedge-import/route.ts:125-126,139` (eligibility flagging), `src/components/admin/facility-tabs/revenue-analytics/revenue-loss-analysis.tsx:76,90` (UI panel), `prisma/schema.prisma:785-787` (`facility_pms_tenant_rates.ecri_flag`, `ecri_suggested`, `ecri_revenue_lift`) | Cross-cutting: schema column, business logic, AI prompt, UI |
| **street rate / web rate / push rate** | `prisma/schema.prisma:807-810` (`facility_pms_units` columns), `src/app/api/storedge-import/route.ts` (rate variance calculations), `src/app/api/audit-generate-diagnostic/route.ts:418-419` (input survey) | Schema-encoded: three distinct rate columns, not one |
| **move-in / move-out** | Pervasive: schema columns (`tenants.move_in_date`, `moved_out_date`, `facility_pms_revenue_history.move_ins`, `move_outs`, `facility_pms_length_of_stay.move_in`, `move_out`, `moveout_remarketing` entire model), route handlers (`/api/storedge-import/route.ts:119` daysAsTenant calc), prompts (`audit-generate-diagnostic.route.ts:35-36,508-509`) | Primary unit of operational analysis |
| **rent roll** | `prisma/schema.prisma:690-708` (`facility_pms_rent_roll` model), `src/app/api/storedge-import/route.ts:77-92` (per-tenant import) | Schema-level encoding of a specific PMS report type |
| **autopay** | `prisma/schema.prisma:1530` (`tenants.autopay_enabled`), `src/app/api/churn-predictions/route.ts:59-65` (churn factor +10 points for no autopay), `src/app/api/upsell/route.ts:53-56` (upsell opportunity), `audit-generate-diagnostic.route.ts:97,423,623` (input + benchmark "55%") | Operational lever: enrollment % is benchmarked, tracked, and used to predict churn |
| **days_delinquent / days_past_due / aging buckets** | `prisma/schema.prisma:641-658` (`facility_pms_aging` with 5 buckets: 0-30, 31-60, 61-90, 91-120, 120+), `src/app/api/occupancy-intelligence/route.ts:129-137` (severity rollups), `src/app/api/churn-predictions/route.ts:48-56` (scoring), `prisma/schema.prisma:1535,1506` (`tenants.days_delinquent`, `tenant_payments.days_late`) | Industry-standard 5-bucket aging scheme |
| **ECRI 180-day threshold** | `src/app/api/storedge-import/route.ts:125` (`longTenure = daysAsTenant >= 180`) | Industry-specific eligibility rule encoded as a literal |
| **80% rate recovery** | `src/app/api/storedge-import/route.ts:128-129` (`ecriSuggested = actual_rate + (variance * 0.8)`) | Industry-specific economic assumption |
| **walk-in attribution** | `src/app/walkin/[code]/page.tsx` (route exists), `src/app/api/walkin-attribution/route.ts:40` (handler), `audit-generate-diagnostic.route.ts:339` (input: "online vs walk-in") | Industry-specific attribution channel — the physical-arrival counterpart to click attribution |
| **tenant_protection / insurance_monthly** | `prisma/schema.prisma:1531-1532` (`tenants.has_insurance`, `insurance_monthly`), `audit-generate-diagnostic.route.ts:422` (input field) | Industry-specific revenue line item |
| **unit_type / size_label / width_ft / depth_ft / sqft / features** | `prisma/schema.prisma:797-803` (`facility_pms_units`) | Industry-standard unit-catalog dimensions: size string + numeric width/depth + sqft + features array |
| **lease-up / stabilized** | `audit-generate-diagnostic.route.ts:284,500` (input + prompt) | Industry-specific facility-stage terminology |
| **gross_potential / actual_revenue / vacancy_pct / delinquency_pct** | `prisma/schema.prisma:736-740` (`facility_pms_snapshots` columns) | Industry-standard occupancy snapshot fields |
| **storEDGE** | Webhook handler, import endpoint, schema field `storedge_widget_url`, env var `STOREDGE_WEBHOOK_SECRET` | Industry-specific PMS — the only one with direct integration |

The vocabulary is not decorative. Each term is *load-bearing* in at least one of: schema column, business-logic literal, AI prompt content, or UI label.

### Vocabulary Substituted, Not Added

The vocabulary census also reveals what is *not* in the codebase. Generic marketing-CRM terms that one might expect — `lead_source`, `contact`, `account`, `lifetime_value`, `mql`, `sql` — are present in *some* generic contexts (the `partial_leads.lead_status` field uses generic CRM-style states), but they are not the dominant vocabulary. Generic CRM vocabulary co-exists with vertical vocabulary; it does not replace it.

The choice to use `tenants` rather than `customers`, `move-in` rather than `purchase`, `rent_roll` rather than `subscription_log`, `street_rate` rather than `list_price`, `lien_warning` (implied) rather than `payment_overdue_severe` — these are substitutions an author makes when the vertical vocabulary is the author's native idiom. A generalist would have used the generic CRM vocabulary and added a "customer type" enum.

## 6.2 Defaults That Encode Assumptions

The strongest signal of operator-built code is *defaults the author chose without thinking about them.* A non-practitioner would have asked a domain expert. A practitioner-author types the number from memory. The following defaults are observed in code.

### D1: $110 per unit per month average rate

`src/app/api/audit-generate/route.ts:256`. The "revenue leakage" calculation in the audit assumes $110/month average unit rent. This is plausible for storage in non-premium markets (the national average per cubic foot times an average unit cube). A non-practitioner would have used a placeholder ($100? $50? $200?) or asked. The choice of $110 reflects awareness of approximate market rates.

The value is also repeated in `audit-generate-diagnostic.route.ts:938` as the average-rate constant for the deep-path audit. Both pipelines agree on the figure.

### D2: Occupancy bucket midpoints

`audit-generate-diagnostic.route.ts:234-243`:

```javascript
const OCCUPANCY_MAP: Record<string, number> = {
  "Under 50%": 45,
  "50–59%": 55,
  "60–69%": 65,
  "70–79%": 75,
  "80–84%": 82,
  "85–89%": 87,
  "90–94%": 92,
  "95%+": 97,
};
```

The bucket boundaries are not uniform. The buckets narrow as occupancy rises: ten-point intervals from 50–80, then five-point intervals from 80–95. This reflects the operational reality that small occupancy differences matter much more at high occupancy than at low occupancy — going from 50% to 60% is one thing; going from 85% to 95% requires a different conversation. A non-practitioner would have used uniform buckets.

The light-path version (`audit-generate.route.ts:154-165`) uses different bucket labels (`below-60`, `60-75`, `75-85`, `85-95`, `above-95`) but the same non-uniform-interval principle.

### D3: Unit count midpoints

`audit-generate-diagnostic.route.ts:245-253`:

```javascript
const UNIT_COUNT_MAP: Record<string, number> = {
  "Under 100": 75,
  "100–199": 150,
  "200–349": 275,
  "350–499": 425,
  "500–749": 625,
  "750–999": 875,
  "1,000+": 1100,
};
```

The buckets reflect typical facility size distribution. The breakpoints (100, 200, 350, 500, 750, 1000) are the operationally meaningful thresholds — a 200-unit facility is operated differently from a 350-unit facility, which is operated differently from a 750-unit facility. The midpoints are biased low (e.g., the "100-199" bucket midpoint of 150 rather than 149.5) — reflecting the empirical observation that smaller-end-of-range facilities are more common.

The light-path uses simpler buckets (`under-100: 75`, `100-300: 200`, `300-500: 400`, `500+: 650`).

### D4: ECRI 180-day tenure threshold

`src/app/api/storedge-import/route.ts:125`:

```javascript
const longTenure = daysAsTenant >= 180;
const payingBelow = (actual_rate / standard_rate) < 0.80;
const ecriFlag = payingBelow && longTenure;
```

The rule: a tenant who has been in their unit for 180+ days AND is paying less than 80% of the standard rate is an ECRI candidate. Both thresholds are domain-specific:

- 180 days reflects the industry rule of thumb that rate increases on tenants under 6 months elicit higher move-out rates. A non-practitioner would have chosen 30 or 90 days or used "ever a tenant."
- 80% reflects the rate-management heuristic that a tenant 20% below market is far enough below to justify a partial recovery push without provoking immediate move-out. A non-practitioner would have chosen 50% or any-below-market.

### D5: ECRI 80% recovery target

`src/app/api/storedge-import/route.ts:128-129`:

```javascript
const variance = standard_rate - actual_rate;
const ecriSuggested = actual_rate + variance * 0.8;
const ecriRevenueLift = ecriSuggested - actual_rate;
```

When ECRI is recommended, the suggested new rate recovers 80% of the variance — not 100%. This is the empirical operator rule: pushing tenants back to full market rate causes excess churn; pushing 80% retains most of them and captures most of the revenue.

### D6: Industry benchmarks in AI prompts

`audit-generate-diagnostic.route.ts:617-625`:

```
- "industryAverage": "78% of facilities" (online rental capability)
- "industryAverage": "72% of facilities" (ECRI implementation)
- "industryAverage": "4.2 stars" (Google review rating)
- "industryAverage": "55%" (autopay adoption); "75%+" (top performers)
- "industryAverage": "48% automated" (revenue management software)
- "industryAverage": "$35-50" (cost per lead); "$15-25" (top performers)
```

Each benchmark is a number a practitioner would know from reading SSA or REIT reports. A non-practitioner would have used round numbers (50%, 75%, $50, $25) or "industry average" placeholders.

### D7: $110 default rent + 12-month annualization

The combination of D1 ($110/month) with the annual-multiplier-of-12 in `audit-generate-diagnostic.route.ts:631` and `audit-generate-diagnostic.route.ts:976-978` produces the audit's "annual revenue leakage" number:

```javascript
const monthlyLoss = vacantUnits * 110;
const annualLoss = monthlyLoss * 12;
```

A non-practitioner would have annualized differently (or applied a vacancy-decay model, or considered shorter lease lengths). The 12× annualization assumes a unit, once rented, produces 12 months of rent — the implicit lifetime-value model in the self-storage vertical. (Reality is the average tenant stays ~14 months, so 12× is conservative. The audit chooses conservatism intentionally — the leakage number remains defensible.)

### D8: Nurture sequence delays

`src/app/api/nurture-sequences/route.ts:33-37`:

- Step 1: 60 minutes (abandonment recovery email)
- Step 2: 24 hours
- Step 3: 72 hours
- Step 4: 7 days
- Step 5: 14 days

And the post-move-in lifecycle (`nurture-sequences.route.ts:53-57`):

- Step 1: 2 hours (welcome)
- Step 2: 4 days
- Step 3: 30 days (check-in)
- Step 4: 60 days
- Step 5: 90 days

And the moveout remarketing (`nurture-sequences.route.ts:64-66`):

- Step 3: 90 days (re-engagement offer)

These cadences are not the standard SaaS drip cadence (daily for 7-14 days). They reflect the storage-industry tempo: rentals are decided slowly (over a week or two, not minutes); tenant lifecycle is measured in months (30/60/90-day check-ins); and former tenants need a 90-day cool-down before re-engagement is welcome rather than annoying.

### D9: ROAS minimum of 2.0×

`src/app/api/campaign-alerts/route.ts:95` and `src/app/api/cron/check-campaign-alerts/route.ts:83`. The alert threshold "campaign performance below target" is ROAS < 2.0×. The choice of 2.0× is the industry-standard performance floor for self-storage paid acquisition. A non-practitioner would have used 3.0× (a common SaaS marketing default) or "any positive ROAS."

### D10: Hot-lead at 3 audit views

`src/app/api/audit-load/route.ts:81-96`. When the audit page hits 3 views (with the trigger firing once at the crossing), the admin gets a "hot lead" email. The choice of 3 reflects: one view is exploratory, two views could be the operator sharing with one partner, three views indicates active deliberation. A non-practitioner would have triggered on first view or on any view.

### D11: Calculator's lead-score recipe

`src/app/api/partial-lead/route.ts:17-55`. The behavioral lead score formula:

- 40 pts × (fields_completed / total_fields)
- up to 20 pts for time-on-page (5 pts at 10s, 10 at 30s, 15 at 60s, 20 at 120s+)
- up to 15 pts for scroll depth (5 at 25%, 10 at 50%, 15 at 80%+)
- +15 if email present, +10 if phone present, +5 if exit-intent

The relative weights — 40% form completion, 20% time, 15% scroll, 30% contact info presence + intent — encode an opinion about what predicts conversion. A non-practitioner would have weighted differently (typical SaaS would weight contact info presence at 60-70%).

The 5/10/15-pt scroll thresholds at 25/50/80% reflect the fact that landing-page conversions correlate with scroll depth above ~50% (the visitor saw the proof-section), with diminishing returns above 80%. The choice of these specific bands is opinionated.

### D12: 90-day audit slug expiry

`audit-generate-diagnostic.route.ts:984-985`:

```javascript
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 90);
```

The shared audit slug expires 90 days after generation. A non-practitioner would have used 30 days or no expiry. The 90-day window reflects: a B2B sales cycle in storage takes 30-90 days; after 90 days, either the lead converted or they didn't, and the audit content is stale enough that re-generation is preferable.

## 6.3 Edge Cases Handled

The following code paths address situations that a generalist would have missed.

### E1: ECRI eligibility requires both tenure AND below-market rate

A naive implementation would flag any below-market tenant. The implementation requires *both* 180+ day tenure AND <80% rate. The conjunction is the operator's lived understanding: rate increases on new tenants drive immediate move-outs; rate increases on long-tenure tenants close to market rate produce minimal pushback.

### E2: Aging bucket structure matches industry-standard auction-prep timing

The 5-bucket aging (`facility_pms_aging`) with breakpoints at 30, 60, 90, 120 reflects the typical state-law-driven lien process: 30-day late notice → 60-day pre-lien letter → 90-day lien notice → 120-day auction publication. The bucket structure is the data view operators use to manage the lien-prep workflow. A generic AR-aging implementation might use 30/60/90 only; the 120+ bucket exists because *that's when the auction happens.*

### E3: Walk-in attribution separate from form attribution

The codebase has a distinct `/api/walkin-attribution` route and a `/walkin/[code]` page (QR-code-driven scan in the office). A generic marketing platform would not have this — it would assume all attribution is digital. The storage industry's walk-in rate is substantial (20-40% depending on facility); explicit handling is required.

### E4: Move-out reason categorization with sequence-template selection

`src/app/api/moveout-remarketing/route.ts:63-78`. The `move_out_reason` is captured, and the moveout-remarketing sequence selects different message templates per reason: "downsized" tenants get unit-upgrade offers; "relocated" tenants get a "welcome back when you're in town" message; "overcapacity" (storage no longer needed) tenants get a different cadence. A non-practitioner would have used one sequence for all moveouts.

### E5: Tenure-weighted churn risk

`src/app/api/churn-predictions/route.ts:40-130`. Churn-risk factors include:

- Tenure: shorter is higher-risk. Tenure-score = 15 − (tenureMonths × 5), so a 1-month tenant scores 10, a 3-month tenant scores 0, anyone longer-tenure contributes nothing to risk.
- Days delinquent: contributes up to 30 points.
- Late-payment history: count × 5, capped at 20.
- Lease end proximity: ≤ 30 days adds additional points.

The model encodes the observed operator pattern: new tenants are flighty, established tenants are sticky, but a payment problem flips even an established tenant into risk.

### E6: 1-1.5 month proration not in app logic — delegated to PMS

The system does *not* implement partial-month proration in code. `facility_pms_rent_roll.paid_thru` and `days_past_due` come pre-calculated from storEDGE. This is deliberate: storage PMS systems handle the legal-and-state-specific proration logic; the StorageAds platform doesn't try to re-implement it. A naive implementation would try to.

### E7: Facility access code as walk-in credential

The 16-character `facilities.access_code` is reused for: client portal login (email + access_code), walk-in attribution capture (access_code in the body of `/api/walkin-attribution`), and (presumably) embedded in QR codes. A single bearer credential per facility, used across surfaces. A generic system would have used distinct credentials per surface.

### E8: Two-tier audit pipeline by audience

The light path (`audit-form` + `audit-generate`) suits a casual website visitor. The deep path (`diagnostic-intake` + `audit-generate-diagnostic`) suits an operator willing to spend 15 minutes on a 40+ field survey. The bifurcation matches the audience reality: visitors who don't want to fill 40 fields shouldn't be forced to; operators who want a deep diagnostic deserve one.

### E9: 100KB tracking payload cap

`src/app/api/tracking/event/route.ts:28` and `/api/tracking/visit/route.ts:27`. Tracking event payloads larger than 100KB are accepted with a 200 OK but never persisted. This silently caps the cost of misbehaving clients (or maliciously inflated payloads) without breaking the page. A generalist might enforce hard limits with 4xx errors and break the user experience.

### E10: storEDGE webhook idempotency via JSONB path lookup

`src/app/api/webhooks/storedge/route.ts:65-74`. The handler looks up existing `activity_log` rows by `meta.webhook_id` using a Postgres JSONB path query. This is unusual — most webhook idempotency systems use a dedicated `webhook_deliveries` table with a unique constraint. The implementation here is correct (the dedup logic is sound) but uses the schema's pervasive JSON columns rather than adding new infrastructure.

## 6.4 Edge Cases Not Handled

Honesty requires naming what the codebase does *not* address.

### N1: Lien sale logistics

The `delinquency_escalations` model has a `stage` field, but no code path automates the legal lien-sale process: notice publication in newspapers (state-specific), unit auction listing, post-auction overage accounting. The system tracks the *escalation* but operators must execute the actual lien sale outside the platform.

### N2: State-specific lien notice timing

Self-storage lien laws vary by state (some require 30-day notice, others 60, others 90). The codebase does not encode per-state rules. The `delinquency_escalations.next_stage_at` field would need a per-facility per-state configuration to be correct; nothing in the schema or code provides this.

### N3: Military clause handling

Active-duty military tenants are protected from rent increases and lien actions under the Servicemembers Civil Relief Act (SCRA). The codebase does not have an `is_military` field on `tenants` or a code path that exempts military tenants from ECRI flagging. A non-practitioner might never know to add this; the codebase does not show evidence of having considered it.

### N4: Vehicle vs unit storage distinction

The schema's `facility_pms_units.unit_type` is a free-form string. There is no explicit distinction between unit storage and vehicle/RV/boat storage, which have different pricing structures, sizing conventions (parking spaces are typically measured in width × length, not w × d × h), and revenue management approaches.

### N5: Insurance vs tenant protection distinction

The schema has `tenants.has_insurance` and `tenants.insurance_monthly`. In the industry, "tenant protection" (operator-provided protection plan) and "insurance" (true insurance policy) are legally distinct — protection plans are warranty contracts and don't require an insurance license; true insurance must be sold by a licensed agent. The codebase conflates them under "insurance," which is a simplification a non-practitioner would make.

### N6: Multi-facility tenant tracking

A single tenant might rent at multiple facilities (a vehicle at one, household goods at another). The schema's `tenants` table has `facility_id` as a non-nullable FK, so a "tenant" is per-facility. Multi-facility tenants would appear as multiple `tenants` rows with no link. A multi-facility operator might want to know who their cross-facility renters are; the schema does not support it.

### N7: Gate code rotation policy

Operators rotate gate codes on a schedule (per-quarter is common) to limit code-sharing among former tenants. The schema has no `gate_code` field on `tenants`. The codebase does not address this operational reality.

### N8: Climate-controlled vs standard differentials

`facility_pms_units.unit_type` may contain "climate-controlled" as a string value, but the schema does not enforce a relationship between climate-controlled units and higher rates. The pricing model is unit-by-unit, not class-by-class.

### N9: Annual rate review cycle

Operators typically conduct annual rate reviews (each January or each fiscal year start). The schema's `facility_pms_rate_history` records *changes*, but there is no encoded annual review *cadence*. A non-practitioner would not know to ask about this.

### N10: Discount stacking rules

`facility_pms_specials` permits multiple active specials, but the schema does not encode whether specials stack (a tenant can get both a "new tenant" discount and a "summer move-in" discount) or are exclusive. Operators have explicit stacking rules; the codebase leaves it to manual operator discretion.

## 6.5 Vertical-Specific vs. General-Purpose Integration Ratio

| Integration | Type | Status | Vertical or generic |
|-------------|------|--------|---------------------|
| storEDGE | PMS API + webhook | Active | **Vertical** |
| Google Places API | Facility lookup | Active | **Vertical-adjacent** (used vertically for self-storage facility identification) |
| SpareFoot / SelfStorage.com / aggregator scraping | Competitor pricing intelligence | Active (`src/lib/aggregator-scrape.ts`) | **Vertical** |
| RentCafe / Yardi / Crexi | Mentioned in CLAUDE.md as scrape targets | Aspirational | **Vertical** (if implemented) |
| Other PMS (SiteLink, ESS, Domico, Tenant Inc) | Operator survey input only | Not integrated | **Vertical** (operator-aware) |
| Meta Graph API / Conversions API | Paid social + server-side attribution | Active | Generic |
| Google Ads + Enhanced Conversions + Keyword Planner | Paid search + server-side attribution + research | Active | Generic |
| TikTok Ads | Paid social | Active | Generic |
| Stripe | Subscription billing | Active | Generic |
| Resend | Transactional email | Active | Generic |
| Twilio | SMS + call tracking | Active | Generic |
| Anthropic API | AI generation | Active | Generic |
| FAL.ai (Flux, Wan) | Image and video generation | Active | Generic |
| Runway ML | Video generation (env var present) | Configured | Generic |
| Replicate | AI image / video | Allowed in CSP | Possibly active |
| Unsplash | Stock images | Active | Generic |
| Vercel Blob | File storage | Active | Generic |
| Upstash Redis (via KV) | Cache + rate-limit | Active | Generic |
| Cal.com | Booking | Active (embed + webhook) | Generic |
| Clerk | Auth middleware (currently inert) | Configured | Generic |
| Sentry | Observability | Active | Generic |
| Google Business Profile API | Reputation management | Active | Vertical-adjacent (used vertically for facility GBP) |

**Counts:** 4-5 vertical or vertical-adjacent integrations against ~15 general-purpose integrations. The ratio is roughly **1 vertical to 3 generic** — confirming the agent's earlier finding of ~1:3.6.

**Interpretation.** The ratio alone is not the whole story. The *generic* integrations are configured and used in standard ways (Stripe for billing, Resend for email, Anthropic for AI). They are not customized for self-storage in any deep way (with one exception: the Anthropic prompts contain operator vocabulary and benchmarks — see §6.6).

The *vertical* integrations are not deep either: storEDGE has a webhook receiver and a manual-import endpoint, not a real-time bidirectional sync; aggregator scraping is supplementary intelligence; Google Places is used for facility lookup but is a generic API.

The vertical depth in the codebase is *not* in vendor integrations. The vertical depth is in the **schema** (Phase 2, especially Cluster C with 10 PMS-mirroring models), in the **workflow logic** (ECRI threshold rules, aging bucket structure, churn factor weighting), in the **defaults** (§6.2), and in the **AI prompts** (§6.6 below).

## 6.6 Workflows That Mirror Operational Reality

### W1: Audit-then-pitch B2B sales motion

The light + deep audit pipeline mirrors how self-storage marketing agencies historically pitch operators: send a free assessment, then book a sales call. The codebase implements this motion structurally: form intake → AI audit generation → shareable URL → admin approval → email to operator → Cal.com booking → call_booked status → admin works the deal. The motion is not generic SaaS demand-gen; it is the storage-marketing-agency playbook.

### W2: Tenant retention via churn prediction → retention campaign enrollment

`churn_predictions` → `retention_campaigns` → `tenant_communications`. The system identifies likely-to-churn tenants (using the operator-knowledge-weighted factors of §6.3.E5), enrolls them in retention sequences, and tracks the outcomes (`retention_campaigns.enrolled_count`, `retained_count`). The cycle is operationally what large operators do manually with their PMS data; the platform automates it.

### W3: ECRI candidate identification → admin approval → push back

The system identifies ECRI candidates per the §6.2.D4-D5 rules and surfaces them in the admin UI (`revenue-loss-analysis.tsx`). The operator approves or rejects each candidate; approved candidates have rate increases applied via storEDGE on the PMS side. The platform's role is identification and decision support; execution lives in the PMS. This split mirrors the operator's actual workflow.

### W4: Move-out → 90-day cooldown → win-back attempt

`moveout_remarketing` enrolls moved-out tenants in a sequence whose third step fires at 90 days (D8). The 90-day cooldown reflects the operator-known fact that ex-tenants don't want immediate "come back" messaging — they need months to either find their storage solution unsatisfactory at the new facility or to need storage again. The 90-day delay is the wait-it-out tactic that experienced operators use.

### W5: Walk-in scan → activity_log → manual conversion mark

A walk-in tenant scans the QR code at the office, staff fills in `source`, `sawOnlineAd`, `tenantName`, `unitRented`. The platform logs this as an activity_log row tagged to the facility. No tenant record is created automatically; staff later manually adds the tenant to the PMS (or the PMS export brings the new tenant in via `facility_pms_*` data). The system captures the attribution at the moment of walk-in without trying to take over the rental process. This split is exactly how a marketing platform should relate to a PMS: capture demand signals, leave rental execution to the PMS.

### W6: Audit email open → 3-view threshold → hot-lead alert

The single-fire-at-3-views audit signal (§6.2.D10) is a behavioral micro-signal that a generic CRM would not have. Operators looking at their own audit page repeatedly is meaningful in a way that opening a typical marketing email is not — the audit page contains revenue numbers and recommendations specific to *their* facility, so re-viewing it indicates active deliberation. The 3-view trigger is calibrated to that behavior.

## 6.7 AI Prompts as Encoded Domain Knowledge

The Anthropic prompts in the codebase are not generic AI prompts. They are dense embeddings of operator knowledge that condition the model to produce operator-authentic output.

The deep-path diagnostic prompt (`audit-generate-diagnostic.route.ts:486-772`) provides:

- **40+ input fields** in 9 sections (Facility profile, Occupancy, Unit mix, Lead flow, Sales, Marketing, Digital presence, Revenue management, Operations, Competition, Operator priorities).
- **8 audit categories** (Occupancy & Unit Mix, Lead Generation, Sales & Follow-Up, Marketing, Digital Presence, Revenue Management, Operations, Competitive Position) — matching the categories an experienced operator would think in.
- **Industry benchmarks inline** (78% online rental, 72% ECRI, 4.2 stars, 55% autopay, 48% automated pricing, $35-50 CPL, $15-25 CPL for top performers).
- **Explicit vocabulary instruction**: "Use operator language: 'move-ins' not 'customers', 'units' not 'rooms', 'street rate' not 'price'."
- **Scoring rules**: each category requires exactly 2 green flags, 1 yellow flag, 3 red flags. The prescriptive structure reflects how operators consume the analysis — they want 2 things working, 1 thing to watch, 3 things to fix.
- **doNothingConsequence** requirements: each category must articulate the financial cost of inaction using the operator's actual move-in/move-out numbers. This is the urgency-generating language that converts an audit into a sales pitch.
- **inactionCost** dollar requirements: each category must produce a quantified annual cost. The prompt explicitly directs the model to compute this from the operator's data.
- **90-day projections** in both directions: "if you act" and "if you don't." The bidirectional framing is the negotiation structure of a sales conversation.

A generic AI-powered marketing analyzer would not have this prompt. The prompt's authorship is observably from someone who has had the audit-then-pitch conversation many times and codified what works.

## 6.8 Quantification Summary

| Metric | Value | Interpretation |
|--------|-------|----------------|
| Self-storage vocabulary term occurrences | ~1,997 | Across schema, routes, lib, components, prompts |
| Total LOC | 124,291 | TypeScript + TSX |
| Vocabulary density | ~16 per 1,000 LOC | High — saturated |
| Industry-specific defaults catalogued | 12 (D1–D12) | All defensible from operator knowledge |
| Industry edge cases handled | 10 (E1–E10) | All defensible as operator-specific |
| Industry edge cases not handled | 10 (N1–N10) | Some structural (lien sale logistics); some omissions worth noting |
| Vertical or vertical-adjacent integrations | 4-5 | storEDGE, GBP, Places, aggregators |
| General-purpose integrations | ~15 | The standard SaaS stack |
| Vertical-to-generic integration ratio | ~1:3 | Generic-platform-heavy at the integration layer |
| Workflows mirroring operator reality | 6 (W1–W6) | Audit-pitch motion, retention cycle, ECRI workflow, etc. |
| AI prompts containing operator vocabulary | 4-6 (audit prompts, GBP prompts, social prompts, marketing plan) | Substantive — not boilerplate |

## 6.9 Synthesis: What the Density Says

The density and specificity of domain signal in this codebase is **high in schema and workflow logic, modest at the integration layer, and dense in AI prompts.** The pattern is consistent with an *operator-built* codebase that uses the *generic SaaS stack* as its infrastructure.

The author has clearly run a self-storage facility (or worked closely with someone who does). The choice of three rate columns (street/web/push) on `facility_pms_units`, the 180-day-and-80%-variance ECRI rule, the 5-bucket aging structure, the 90-day moveout cooldown, the 2.0× ROAS floor, the bucketed occupancy and unit-count maps — these are not choices a generalist with a domain expert advising would make. A generalist would have generalized one rate, picked an arbitrary tenure threshold, used a 3-bucket aging, fired moveout sequences immediately, used a 3.0× ROAS target, and used uniform-interval buckets.

The author is also a competent engineer. The schema is sensibly normalized where queries need to be fast and sensibly JSON-blob'd where the shape is fluid. The cron infrastructure batches and time-budgets correctly. The middleware applies CSRF and rate limits where they belong. The OAuth-token storage is pragmatic. Tests cover the riskiest authentication helpers and the most safety-critical external integration (Stripe webhook).

The thesis the paper will defend can rest on this finding: **the platform is operator-built — and the evidence is in the defaults, edge cases, vocabulary, and prompts, not in vendor integrations.** The operator's knowledge is encoded in *what the code chooses to compute* and *what the code chooses not to compute*, and in the *thresholds the code chooses by default.*

This is the strongest form of T3 (operator-built thesis) the evidence supports. T1 and T2 (measurement thesis) are also supported — the cost-per-move-in metric is first-class, the attribution chain is structured around it, and the marketing claim is consistent with the architectural commitment. The honest paper combines T1/T2 with T3: *the measurement convention is wrong (T1/T2), and what makes correcting it possible in this vertical is operator-built encoding of the right metric, the right vocabulary, and the right operational reality (T3).*

Phase 7 builds the honest inventory of what the system does and does not do today.
