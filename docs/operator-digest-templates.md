# Operator Digest Templates — Daily SMS, Weekly Email, Real-Time Push

**Purpose:** Layered operator-comms templates per vision doc §4.8 and PRD §8.2. The dashboard is for the operator who wants depth; the push layer carries the actual value for the operator who never logs in.

**Voice register:** Operator voice (`.claude/copy-voice.md`). These messages are read by the operator on their phone or in their inbox. Same rules apply: plain language, short sentences, contractions, concrete numbers, no marketing language.

**Substitution variables in `{{double_braces}}`:** filled from the operator's facility data at send time. Templates fail gracefully when a metric is unavailable (the line elides).

**Channels:** SMS via Twilio, email via Resend, push via the existing `push_subscriptions` / web push infrastructure.

---

## Daily SMS morning digest

**Trigger:** `/api/cron/daily-sms-digest` at facility-local 07:00.
**Channel:** SMS to the operator's `contact_phone` (must have opted in).
**Format constraint:** Single SMS where possible (320 char limit on long-form SMS via Twilio with proper segmentation). If content exceeds, split into 2 messages, marking second "(2/2)".

### Standard daily template

```
{{facility_name_short}} — {{day_of_week}} {{date}}

Yesterday: {{leads_count}} leads, {{move_ins_count}} move-ins, occupancy
{{occupancy_pct}}% ({{occupancy_delta_arrow}}).

Inbox: {{ai_responses_count}} replies sent, avg {{avg_latency_sec}}s.
{{escalations_pending_line}}

{{top_action_line}}

Full view: {{portal_url}}
Stop: text STOP
```

**Variable detail:**

- `{{facility_name_short}}` — facility name truncated to 25 chars if needed.
- `{{day_of_week}}` — "Mon", "Tue", etc.
- `{{date}}` — "Mar 4".
- `{{leads_count}}` — total leads across all channels.
- `{{move_ins_count}}` — confirmed move-ins.
- `{{occupancy_pct}}` — current 7-day rolling average.
- `{{occupancy_delta_arrow}}` — "+0.4 from last wk" / "flat" / "-0.2 from last wk".
- `{{ai_responses_count}}` — AI receptionist replies sent.
- `{{avg_latency_sec}}` — average response latency in seconds across the day.
- `{{escalations_pending_line}}` — included only if escalations are pending: "**{{count}} escalation(s) need you**" else elided.
- `{{top_action_line}}` — see Section "Top action lines" below.

### Top action line library

The top-action engine selects one line per day from this prioritized list. If none apply, the line elides.

Priority order (first matching wins):

1. `**{{count}} escalation(s) need you — open Inbox.**` — if escalations pending.
2. `New {{rating}}-star review needs a reply — opened a draft for you.` — if a negative review is unresponded.
3. `{{competitor_name}} dropped 10x10 to ${{competitor_price}} this week.` — if competitor intel surfaces a relevant price move.
4. `New supply breaking ground 4mi away — ad budget recommended +{{percent}}%.` — if new-supply alert triggers.
5. `Your 10x10s are 92% full. Recommend rate +${{amount}}.` — if rate-recommendation engine has a recommendation.
6. `Past tenant {{name}} replied to win-back — Inbox.` — if a win-back conversation needs operator attention.
7. (no top action line — elide)

### Daily SMS examples

**Standard day:**

```
Pine Ridge Storage — Tue Mar 4

Yesterday: 6 leads, 2 move-ins, occupancy 88.4% (+0.3 from last wk).

Inbox: 12 replies sent, avg 22s.

Your 10x10s are 92% full. Recommend rate +$8.

Full view: storageads.com/p/pine-ridge
Stop: text STOP
```

**Day with escalation:**

```
Pine Ridge Storage — Wed Mar 5

Yesterday: 4 leads, 1 move-in, occupancy 88.4% (flat).

Inbox: 9 replies sent, avg 18s.
1 escalation needs you

New 1-star review needs a reply — opened a draft for you.

Full view: storageads.com/p/pine-ridge
Stop: text STOP
```

---

## Weekly Monday email digest

**Trigger:** `/api/cron/weekly-digest` (existing route, extended) at Monday 06:00 facility-local.
**Channel:** Email via Resend to operator's `contact_email`.
**Format:** HTML email with mobile-first responsive layout. Plain-text fallback included.

### Subject line

`{{facility_name}}: last week was +{{occupancy_delta}}, {{move_ins}} move-ins`

If no occupancy delta to report:

`{{facility_name}}: last week, {{move_ins}} move-ins`

### Email body — section structure

**Greeting:**

```
Hey {{operator_first_name}},

Quick recap of last week at {{facility_name}}. 5-minute read.
```

**Section 1 — The headline numbers (visual stat strip):**

```
OCCUPANCY: {{current_occupancy}}% ({{delta_from_baseline}}% from baseline)
MOVE-INS: {{week_move_ins}} ({{delta_from_prior_week}} vs. last week)
LEADS: {{week_leads}} across all channels
COST/MOVE-IN: ${{week_cpmi}} (only includes paid channels)
```

**Section 2 — What moved:**

```
Three things stood out last week.

1. {{notable_event_1}}
2. {{notable_event_2}}
3. {{notable_event_3}}
```

The notable events come from a small library based on actual metric movements:

- "GBP impressions up {{percent}}% from the photo refresh on Tuesday."
- "{{rating}}-star review came in — we replied within {{hours}} hours."
- "10x10 vacancy filled to 92% — recommend a rate increase, see Dashboard."
- "AI receptionist held {{count}} units last week; {{percent}}% converted to a tour booking."
- "Win-back campaign re-rented {{count}} unit(s) from past tenants — ${{revenue}} in monthly rent recovered."
- "Competitor {{name}} dropped 10x10 pricing by ${{amount}} — your rate is still competitive at ${{your_price}}."
- "New review request sent to {{count}} recent move-ins — {{count}} responded with a {{avg_rating}}-star review."
- "Phantom occupancy alert — {{count}} tenants behind on payment, win-back drip running."

**Section 3 — What's on for this week:**

```
What we're running this week at {{facility_name}}:

- {{post_count}} scheduled posts on GBP, Facebook, and Instagram.
- {{active_campaigns_count}} active ad campaigns — {{campaign_summary}}.
- {{win_back_count}} past-tenant touchpoints in the win-back sequence.
- {{any_special_focus}}.

If you'd rather change anything, the calendar's in the dashboard.
```

**Section 4 — Lift versus baseline (the headline chart):**

```
LIFT VS. BASELINE (since you started with StorageAds)

[Inline visualization: weekly occupancy line vs. baseline horizontal line,
or trend chart with weekly snapshots]

Baseline (week 0): {{baseline_occupancy}}%
Current: {{current_occupancy}}%
Delta: {{occupancy_delta}} percentage points

Baseline 12-month average monthly move-ins: {{baseline_move_ins}}
30-day rolling current: {{current_move_ins}}
Delta: {{move_ins_delta}}
```

**Section 5 — Anything that needs you:**

```
{{action_items_list}}
```

The action items come from the same library as the daily SMS top-action lines, with deeper detail. If no action items: elide this section entirely.

**Footer:**

```
That's it for this week. Reply with any questions — Blake at StorageAds
(blake@storageads.com) reads every reply.

— The StorageAds team
```

### Weekly email — full example

```
SUBJECT: Pine Ridge Storage: last week was +0.6%, 8 move-ins

Hey Mike,

Quick recap of last week at Pine Ridge Storage. 5-minute read.

────────────────────────────────────────
OCCUPANCY: 88.4% (+2.1% from baseline)
MOVE-INS: 8 (+2 vs. last week)
LEADS: 47 across all channels
COST/MOVE-IN: $84 (paid channels only)
────────────────────────────────────────

Three things stood out last week.

1. GBP impressions up 14% from the photo refresh on Tuesday.
2. 5-star review came in from Sarah K. — we replied within 3 hours.
3. 10x10 vacancy filled to 92% — recommend a rate increase, see Dashboard.

What we're running this week at Pine Ridge Storage:

- 5 scheduled posts on GBP, Facebook, and Instagram.
- 2 active ad campaigns — one targeting 10x15s, one geo-fenced around the
  new Walmart construction site.
- 14 past-tenant touchpoints in the win-back sequence.
- Photo refresh prompt going out Wednesday — snap 2 facility shots when
  you have a minute.

If you'd rather change anything, the calendar's in the dashboard.

────────────────────────────────────────
LIFT VS. BASELINE (since you started with StorageAds)

[Chart: weekly occupancy trend]

Baseline (week 0): 86.3%
Current: 88.4%
Delta: +2.1 percentage points

Baseline 12-month average monthly move-ins: 6.2
30-day rolling current: 8.4
Delta: +2.2
────────────────────────────────────────

Anything that needs you:

→ Your 10x10s are 92% full. Recommend rate increase of $8/month. We've
  modeled the impact — see the dashboard.
→ 1 GBP question pending your review: "Do you have RV storage?" We
  drafted an answer; you can approve or edit.

────────────────────────────────────────

That's it for this week. Reply with any questions — Blake at StorageAds
(blake@storageads.com) reads every reply.

— The StorageAds team
```

---

## Real-time push alerts

**Trigger:** event-driven, fired from the relevant module's processing pipeline.
**Channels:** Web push (existing `push_subscriptions` model) with email fallback to operator's primary email; SMS for the highest-priority events.

### Event taxonomy

| Event | Push channel | Subject / body | Operator action |
|---|---|---|---|
| New move-in confirmed | Push | "{{tenant_name}} just moved into {{unit_size}} at {{facility_name_short}}. Welcome." | None required |
| New review (≤3 stars) | Push + email + SMS | "1-star review just came in at {{facility_name_short}}. Draft reply ready for your review." | Approve / edit reply in Inbox |
| AI receptionist escalation | Push + email + SMS | "Escalation at {{facility_name_short}}: {{escalation_reason_short}}. Conversation: {{deep_link}}" | Reply to conversation in Inbox |
| Ad spend anomaly | Push + email | "Ad spend at {{facility_name_short}} is +{{percent}}% above normal today. Most of the spend is on {{campaign_name}}." | Review in Ads tab |
| Competitor price move | Push | "{{competitor_name}} moved 10x10 pricing to ${{new_price}} (was ${{old_price}}) at {{facility_name_short}}." | Review in Intel tab |
| New supply alert | Push + email | "New facility broke ground 4 miles from {{facility_name_short}}: {{competitor_name}}, opening in {{months}} months." | Review in Intel tab |
| Churn signal high-priority | Push | "{{tenant_name}} at {{facility_name_short}} flagged at high churn risk: {{signal_reason}}. Drip running." | Optionally review or call tenant |
| Win-back successful | Push | "Past tenant {{tenant_name}} just signed up at {{facility_name_short}} from the win-back drip — ${{monthly_rent}}/mo recovered." | None required |
| Referral converted | Push | "{{tenant_name}} just signed up at {{facility_name_short}} via referral from {{referrer_name}}. ${{credit_amount}} credit issued." | None required |
| Photo refresh request | SMS | "Time for monthly facility photos at {{facility_name_short}}. Snap 2 shots and text back — we'll upload them to your GBP." | Reply with photos |
| Onboarding milestone | Push + email | "{{milestone_message}}" | None required |
| Plan upgrade opportunity | Email | "We noticed {{specific_trigger}}. Want to see what Better would do? {{upgrade_url}}" | Click through to upgrade |

### Push notification format constraints

- Title: max 50 chars.
- Body: max 120 chars.
- Action buttons: 0-2 ("View", "Reply", "Dismiss" — context-dependent).

### Push notification examples

**New move-in:**

```
Title: New move-in: Pine Ridge
Body: Sarah just moved into a 10x10. Welcome.
Action: View
```

**Negative review escalation:**

```
Title: 1-star review needs you
Body: Pine Ridge — review just came in. Draft reply ready.
Action: Review reply | Snooze
```

**Receptionist escalation:**

```
Title: Escalation: refund request
Body: Pine Ridge — Sarah K. asking for refund. Inbox.
Action: Open Inbox | Snooze 1 hr
```

**Competitor price move:**

```
Title: Competitor lowered 10x10
Body: Affordable Storage 1.2mi — was $129, now $115.
Action: View intel
```

---

## Operator preferences

Operators can configure their preferences for each comm channel in the Settings tab of the Operator OS dashboard:

- Daily SMS digest: ON / OFF, time-of-day adjustment, weekend opt-out.
- Weekly email digest: ON / OFF (default ON, very rarely turned off).
- Real-time push: per-event-type toggles.
- Real-time SMS for critical events only: ON / OFF (default ON for new escalations and negative reviews; OFF for everything else).
- Quiet hours: no push notifications between operator-defined hours (default 9 PM - 7 AM local).

Preferences stored on the `facilities` row metadata or in a new `operator_preferences` table (TBD in PRD revisions).

---

## Tone consistency check

Every template above should pass:

- Reads like the operator's competent assistant wrote it.
- Uses contractions throughout.
- Concrete numbers, not adjectives.
- No marketing language.
- Plain text, no jargon.
- Short sentences.
- Always offers a way out (Stop on SMS, opt-out link on email, dismiss on push).
- Always has a deep link to the Operator OS for the operator who wants depth.

The daily SMS is the highest-frequency operator touchpoint and therefore the highest-risk for fatigue. The opt-out should be one tap; the value-per-message should be measurable enough that operators don't unsubscribe. Track unsubscribe rate per channel as a continuous health signal — if daily SMS unsubscribe rate climbs above 5% in any 30-day window, the message format needs revision.
