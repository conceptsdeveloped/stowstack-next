# Diagnostic Link Outreach Sequence

Cold outbound built around sending a prospect their personalized facility diagnostic
(`storageads.com/audit/[slug]`). Operator-to-operator voice. Give before you ask: the
link is the soft CTA, the call is the hard ask, and the call CTA lives on the diagnostic
page itself (Cal.com "Book a Walkthrough").

**Merge fields:** `{{firstName}}`, `{{facilityName}}`, `{{city}}`, `{{diagnosticLink}}`,
`{{senderName}}`, `{{senderTitle}}`, `{{companyAddress}}`, `{{unsubscribeLink}}`

**Notification triggers (for timing, not copy):**
- Prospect opens the link the first time → move to "opened" track.
- Prospect hits 3 views → hot lead, prioritize a human follow-up / call attempt.

**Stat grounding:** Any number used here is either a merge field (pulled live from the
prospect's own diagnostic) or sourced from `.claude/market-data-2026.md`. Do not hardcode
made-up figures.

**Compliance (CAN-SPAM):** Every email identifies the real sender, includes a physical
mailing address, and a working opt-out. Subject lines are honest. Placeholders below.

---

## Step 1: Initial cold email

**Timing:** Day 0
**Angle:** The finding. Lead with what I saw on their facility, not the product.

**Subject options (pick one, A/B):**
- `ran a quick marketing check on {{facilityName}}`
- `{{facilityName}}: found a few things worth a look`
- `looked at how {{facilityName}} shows up online`

**Body:**

```
{{firstName}},

I run storage facilities and built a tool that scores how a place shows up
online and where it's leaving move-ins on the table. I pointed it at
{{facilityName}} this week.

A few things stuck out. Here's the full read, your numbers, nothing to fill in:

{{diagnosticLink}}

It scores you by category and puts a dollar figure on the empty units. Took
me about a minute to run, takes you about two to read.

No pitch in there. If it's useful, the page has a link to grab time with me
and walk through it. If not, no hard feelings.

{{senderName}}
{{senderTitle}}, StorageAds

{{companyAddress}}
Not useful? {{unsubscribeLink}} and I'll stop.
```

---

## Step 2: Follow-up #1 (no open)

**Timing:** Day 3-4, only if the link was never opened.
**Angle:** New angle. The REIT gap. Why I bothered running it. Re-share the link.

**Subject options:**
- `re: {{facilityName}}`
- `the REIT down the road from {{city}}`

**Body:**

```
{{firstName}},

Quick one. The reason I run these:

The big REITs sit around 92% occupancy. The average independent sits around
87%. That five-point gap is real money every month, and almost none of it is
about location. It's about how the place markets and prices.
(Source: Yardi Matrix / TractIQ, 2025-26.)

Your diagnostic for {{facilityName}} breaks down where that gap is showing up
for you specifically:

{{diagnosticLink}}

Still here whenever you want to look.

{{senderName}}
StorageAds

{{companyAddress}}
Done hearing from me? {{unsubscribeLink}}
```

---

## Step 3: Follow-up #2 (opened, no booking)

**Timing:** 2-3 days after first open (or same day if they cross 3 views = hot lead).
**Angle:** They saw it. Acknowledge it lightly, lower the bar, offer one concrete thing.

**Subject options:**
- `saw you opened the {{facilityName}} read`
- `the empty-unit number on {{facilityName}}`

**Body:**

```
{{firstName}},

Saw the diagnostic for {{facilityName}} got opened, so I'll keep this short.

If one thing on there is worth fixing, it's usually the top category. I can
walk you through your score and tell you the one move I'd make first, free,
whether or not you ever work with us.

Twenty minutes, your numbers on the screen. Same link, the booking button
is at the bottom:

{{diagnosticLink}}

Or just reply with a day that works and I'll send a time.

{{senderName}}
StorageAds

{{companyAddress}}
Prefer I drop it? {{unsubscribeLink}}
```

---

## Step 4: LinkedIn DM variant (opener)

**Angle:** Same as Step 1, shorter, no compliance footer (1:1 DM, not bulk email).
**Use:** When you have a LinkedIn connection or open InMail instead of, or alongside, the
cold email.

```
{{firstName}}, I run storage facilities and built a tool that scores how a
place shows up online and where it's losing move-ins. Ran it on
{{facilityName}} this week and a couple things jumped out.

Here's your read, real numbers, no form to fill out: {{diagnosticLink}}

No pitch in it. If it's useful there's a link to grab time with me. If not,
no worries.
```

---

## Notes on running it

- **Cadence:** 3 touches over ~7 days, plus the DM as a parallel channel. Stop the email
  track immediately on a reply or a booking.
- **Hot-lead override:** If a prospect hits 3 views before Day 3, skip the no-open
  follow-up and go straight to Step 3 (or a direct human reply). Three views means they
  are circulating it internally.
- **One idea per email:** Step 1 = the finding. Step 2 = the gap (why it matters). Step 3
  = a free first move. Never repeat the same ask.
- **Voice check:** No "solutions," "synergy," "reach out," no em dashes, no agency-speak.
  Peer who runs facilities, giving something away before asking for anything.
```
