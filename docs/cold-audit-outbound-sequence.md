# Cold-Audit Outbound Sequence — 5-Touch

**Voice register:** Operator voice (`.claude/copy-voice.md`). Strict.
**Channel:** Email (touches 1, 2, 5), LinkedIn (touch 3), SMS (touch 4).
**Use case:** The proactive-audit cold outreach mechanic per vision doc §7.1 and GTM plan weeks 1-12. Each touch is built around the unsolicited audit as the payload.
**Drop-in target:** Apollo, Smartlead, Outreach, or any sequence runner. Substitution variables in `{{double_braces}}`.

---

## Pre-send checklist

- The audit for the prospect's facility has actually been run and is live at the audit URL. **Never send the cold email before the audit exists.** The "I ran an audit on your facility" claim must be literally true at the moment of send.
- The prospect's facility location is in the U.S., the GBP exists, and the audit completed cleanly (no errors). If the audit errored or partial-completed, drop the prospect from the cold list rather than sending an audit they can't fully load.
- The prospect's email is verified and the domain is deliverable. Catch-all domains and role-based emails (info@, contact@) are excluded.
- The sender (Blake by default for warmest 50/week; SDR-assisted from Blake's domain for volume) is warmed on the sending domain.

---

## Touch 1 — Cold email with audit (Day 0)

**Send:** Tuesday-Thursday, 7:00-9:00 AM operator local time.

**Subject line variants (A/B test):**

- A: `Audited {{facility_name}} — three things stood out`
- B: `Ran a marketing audit on {{facility_name}} this morning`
- C: `{{first_name}}, audited your facility — quick read`

**Body:**

```
Hey {{first_name}},

I run a few storage facilities and I built a tool that audits any facility's
marketing. I ran it on {{facility_name}} this morning out of curiosity.
Here's the report:

{{audit_url}}

Three things stood out:

1. You're #{{local_rank}} in the {{city}} 3-pack with {{competitors_above}}
   competitors above you. {{competitors_with_gbp_activity}} of them got there
   with weekly Google Business Profile posts.

2. Your speed-to-lead test came back with {{speed_to_lead_finding}}. That's
   the single biggest cost in missed rent.

3. There's {{new_supply_count}} facility breaking ground within 5 miles of
   you, {{new_supply_timing}}. You'll want to be running paid before it opens.

The full audit walks through everything and gives you the rough dollar cost.
It's free. No agency pitch, no spam.

If you want to talk about it, my calendar's here: {{cal_url}}. If you don't,
the audit is still yours.

— Blake
Operator and founder, StorageAds
blake@storageads.com
```

**Substitution variables and how they're filled:**

- `{{first_name}}` — from the operator contact record.
- `{{facility_name}}` — from the facility record.
- `{{audit_url}}` — the shared audit slug URL (`/audit/[slug]`).
- `{{local_rank}}` — computed from the audit data, integer.
- `{{city}}` — from the facility record.
- `{{competitors_above}}` — count of competitors ranking above the prospect's facility.
- `{{competitors_with_gbp_activity}}` — count of those competitors with active GBP posting in last 90 days.
- `{{speed_to_lead_finding}}` — substituted from a small library based on the test result: "no answer on the phone, no answer on the form, no answer on the GBP message inside 24 hours" / "no answer on the form or GBP message inside 24 hours" / "your phone answers fast but the form and GBP message went unanswered" / etc.
- `{{new_supply_count}}` — count of facilities breaking ground within 5 miles in the next 18 months. If zero, the entire bullet 3 gets swapped to a different finding (e.g., a competitor rate-cut, a demand-signal trend).
- `{{new_supply_timing}}` — "opening in 8 months" / "breaking ground next quarter" / etc.
- `{{cal_url}}` — Blake's Cal.com link.

**Fallback rules for missing data:**

- If local rank can't be determined (e.g., the city has fewer than 3 competitors), substitute bullet 1 with the GBP-engagement gap finding.
- If speed-to-lead test failed (e.g., the test calls didn't connect), substitute bullet 2 with the GBP photo-staleness finding or the unanswered-questions finding.
- If new supply count is zero, substitute bullet 3 with the demand-signal trend finding from the audit.

Three bullets, always concrete, always tied to a real finding from the actual audit. Never generic.

---

## Touch 2 — Reminder email (Day 4)

**Conditions:** Send only if Touch 1 was opened but no reply, no calendar booking, no audit URL click. If the audit URL was clicked but no reply, switch to Touch 2-alt below. If Touch 1 was not opened at all, skip Touch 2 (the channel is broken; rely on Touch 3).

**Subject:** `Re: {{Touch 1 subject}}`

**Body:**

```
Hey {{first_name}},

Following up on the audit I sent for {{facility_name}}. The link is still
live if you want to read it:

{{audit_url}}

The two things I'd focus on first if you were doing this yourself:

1. Post on your Google Business Profile this week. Any post. An offer, a
   What's New, a Product. Google rewards facilities that post. You haven't
   posted in {{months_since_last_gbp_post}} months. One post this week
   probably moves your local rank within 14 days.

2. Answer the {{unanswered_gbp_questions_count}} unanswered questions on
   your GBP. They're sitting there public. Anybody searching for storage
   in {{city}} sees them. Takes 5 minutes.

That's the free DIY version. If you want us to do it for you and run the
rest of the marketing system, the pricing page is here: {{pricing_url}}.
If you'd rather talk first, my calendar's here: {{cal_url}}.

— Blake
```

**Touch 2-alt — if the audit URL was clicked:**

```
Hey {{first_name}},

Saw you opened the audit for {{facility_name}}. Glad it landed.

Couple of things I noticed I didn't put in the email:

1. {{post_open_observation_1}}
2. {{post_open_observation_2}}

If you want to walk through it together, here's 30 minutes on my calendar:
{{cal_url}}. If you'd rather just see plans, the pricing page is here:
{{pricing_url}}.

Either way — the audit is yours.

— Blake
```

The post-open observations are pulled from deeper audit findings (review-response gap, photo recency, mobile speed score, etc.) — surfaces detail the cold email didn't fit.

---

## Touch 3 — LinkedIn connect (Day 7)

**Conditions:** Send if no reply to Touch 1 or Touch 2, and the prospect has a findable LinkedIn profile. Skip if no LinkedIn profile or if connect-rate cap has been hit for the week.

**Connection request note (200 char max):**

```
Hey {{first_name}} — I'm a storage operator who built a marketing tool I
audited {{facility_name}} with last week. Sent you a copy by email. Just
connecting in case it's easier here. — Blake
```

**If the connection is accepted, send the following DM 24-48 hours later:**

```
Thanks for the connect, {{first_name}}.

I ran an audit on {{facility_name}} last week — sent you a copy by email
(might've gone to spam). Here's the direct link if it's easier:

{{audit_url}}

No pitch. The audit is yours.

If you want to talk through it, here's my calendar: {{cal_url}}.

— Blake
```

---

## Touch 4 — SMS (Day 10)

**Conditions:** Send only if the prospect explicitly opted in via the audit-tool form (the optional phone field with the opt-in checkbox per `docs/audit-tool-sales-page-rewrite.md` form spec). **Never send cold SMS without opt-in.** Without opt-in, skip this touch.

**SMS body (160 char limit):**

```
{{first_name}} — Blake from StorageAds. Sent you a free audit on
{{facility_name}}: {{audit_short_url}}. Hit reply if you want to talk or
text STOP to opt out.
```

The `{{audit_short_url}}` is a tracked shortlink (storageads.com/a/xxxx) that redirects to the full audit URL.

If the prospect replies "STOP" or any variant, immediately suppress all future channels and write the suppression to the contact record.

---

## Touch 5 — Final email (Day 14)

**Conditions:** Send if no reply across Touches 1-4. This is the last touch in the sequence; the contact is paused for 90 days afterward, then optionally re-engaged with a different framing (e.g., a fresh case study, a conference invite).

**Subject:** `{{facility_name}} — last note`

**Body:**

```
Hey {{first_name}},

Last note from me. The audit on {{facility_name}} is still live if you
want it later:

{{audit_url}}

I'll stop emailing after this one. If anything in there made you think
"yeah I should do something about that," my calendar's still here:
{{cal_url}}. If not, no hard feelings — the audit is yours either way.

The one thing I'd genuinely encourage, free of any pitch: post on your
GBP this week. One post. It's the single biggest local-search lever
nobody pulls. Takes 10 minutes. Even if you never talk to us, it'll
move your rank.

— Blake
```

The unsolicited free advice in the closing paragraph is the trust signal. It does the work of saying "this isn't about closing you; it's about the work." Most prospects who don't reply to Touches 1-4 reply to Touch 5 — not to book a call, but to thank Blake for the free advice. Those replies frequently convert later.

---

## Sequence exit conditions

- **Reply received:** sequence pauses immediately. Blake (or the SDR with Blake's approval) handles the reply manually. Do not auto-progress to next touch.
- **Calendar booking:** sequence pauses immediately. Move the contact to the "booked call" pipeline stage.
- **Plan purchased:** sequence pauses immediately. Move to onboarding sequence.
- **Unsubscribe or SMS STOP:** suppress all future channels permanently. Write to suppression list.
- **Email hard bounce:** suppress email channel; LinkedIn and SMS (if opted-in) still active.
- **No response after Touch 5:** pause the contact for 90 days; eligible for re-engagement in a future cohort with new positioning material.

---

## Sequence-level metrics to track

For each touch:

- Send count.
- Open rate (email touches only).
- Click rate to audit URL.
- Reply rate.
- Connection acceptance rate (Touch 3 only).
- SMS opt-out rate (Touch 4 only).
- Calendar booking rate downstream of each touch.
- Plan purchase rate downstream of each touch.
- Sequence-overall booking rate (calendar bookings / total contacts entered into sequence).
- Sequence-overall conversion rate (plan purchases / total contacts entered into sequence).

Targets (from GTM plan §week-4):

- Open rate Touch 1: > 55%.
- Reply rate Touch 1: > 10%.
- Audit URL click rate Touch 1: > 30% of opens.
- Calendar booking rate Touch 1: > 2% of sends.
- Sequence-overall calendar booking rate: > 5%.
- Sequence-overall plan purchase rate: > 0.8% (1 paying customer per 125 prospects in the cold sequence).

---

## Decision triggers for sequence revision

- If Touch 1 open rate < 40% — subject line or sender reputation is broken; revise subject and/or warm a fresh sub-domain.
- If Touch 1 audit URL click rate < 15% — the body opener is failing; A/B test the three bullets vs. a single hook + headline.
- If Touch 1 reply rate > 15% — the sequence is working well above target; consider scaling outbound volume before further refinement.
- If Touch 5 reply rate < 1% — the "last note" framing isn't resonating; test the free-advice closing variation vs. a softer "checking in once more" close.
- If sequence-overall plan purchase rate < 0.4% — the sequence is producing conversations but not customers; the gap is in the sales call, not the cold sequence. Revise the call script or the onboarding flow, not the cold sequence.

---

## What the sequence is NOT

- Not a multi-thread account-based-marketing sequence — one contact per facility.
- Not a generic "marketing services" pitch — every touch is built around the audit-specific findings, never around the platform's features.
- Not aggressive — every touch ends with a soft out, every touch acknowledges the audit is theirs to keep, and Touch 5 explicitly stops the contact.
- Not impersonal — Blake's name, Blake's voice, Blake's signature. The SDR-assisted version is sent from Blake's email with the SDR drafting; recipients always perceive a Blake email.

The sequence is the cold-outreach mechanic of the platform. It's also the proof that the operator-built positioning carries through to the sales motion — the audit is real, the operator voice is consistent, the trust signals are everywhere, and the prospect never feels worked.
