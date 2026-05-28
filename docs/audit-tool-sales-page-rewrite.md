# Audit Tool & Results Page Rewrite

**Voice register:** Operator voice (`.claude/copy-voice.md`). Strict.
**Surfaces covered:** `/audit-tool` (the form), `/audit/[slug]` (the results), the audit follow-up email, the audit-results-to-call CTA.
**Frame:** Top-of-funnel + cold-outreach payload. This is the highest-leverage GTM mechanic per the vision doc (§7.1).

---

## `/audit-tool` — the form page

### Hero

**Eyebrow:** Free. No card. No call.

**H1:** See exactly what's costing your facility move-ins.

**Sub:** We pull your Google Business Profile, your reviews, your local rank, your competitors within five miles, your website, your speed-to-lead. You get a real audit in under two minutes. You decide what to do next.

**Form:**
- Field 1 — Facility name or address — autocomplete via Places API.
- Field 2 — Your name (so we can send the report)
- Field 3 — Email (so we can send the report)
- Optional field 4 — Phone (for the partial-results SMS, opt-in checkbox)
- Submit: **Run my audit →**

**Microcopy under form:** No spam. No agency call. You'll get your audit in two minutes.

### What you'll see — three-card preview row

**Card 1:** Your local rank in the Google 3-pack — and exactly which competitors are sitting above you.

**Card 2:** Your speed-to-lead — we test how fast a phone call, a form, and a Google message actually get answered at your facility.

**Card 3:** Your trade area's demand and supply — how many other facilities are within five miles, what they charge, how full they probably are.

### Why we built this

**H2 (small):** We built the audit because we needed it for our own facilities.

**Body:** Before we built StorageAds, we needed to know what was actually broken at our own places. There wasn't a tool that told us. So we built one. Now anybody can run it — for free, no strings — because the operators who run it usually figure out fast that they want help fixing what they see.

---

## `/audit/[slug]` — the results page

Layout: stat-heavy. Charts. A few short sentences per section. Big numbers, monospaced. Honest about what we found.

### Top of page

**Facility header:**
*[Facility name]*
*[Address]*
**Audit run [date and time]**

**Three-stat strip — the headlines:**

- **Your local rank:** #4 in the Tampa 3-pack (3 competitors ranking above you)
- **Speed to lead:** 47 minutes average across phone, form, and Google message
- **Estimated missed move-ins per month:** 6-9 units (worth $1,180-$1,770/month)

**Below the strip:** This is what your audit found. Read the sections below. If you want help fixing it, [book a call with Blake] or [start a plan].

### Section 1 — Your Google Business Profile

**H2:** Your Google Business Profile

**Stat row:**
- **38** reviews (average **4.3 stars**)
- **Last post:** 8 months ago
- **Photos:** 12 total, last uploaded 2 years ago
- **Q&A:** 3 questions asked, **0 answered**

**Plain-language read:** Your GBP is doing the minimum. The reviews are fine. The post history is the biggest gap — Google rewards facilities that post weekly, and you haven't posted since October. Your competitors who do post are ranking above you in Maps because of it. The unanswered questions are a smaller fix but it's an easy lift, and a $0 lever you're leaving on the floor.

**What StorageAds would do:** Post to your GBP three to five times a week, depending on plan. Answer every review. Seed the questions people search for. Refresh photos monthly. Your local rank moves up because Google's ranking model rewards exactly this.

### Section 2 — Your competitors

**H2:** Who's beating you in your trade area

**Table — top 5 competitors within 5 miles:**

| Competitor | Distance | Reviews | Rating | Local rank | Posts in last 90 days | Photos uploaded recently |
|---|---|---|---|---|---|---|
| Acme Storage | 1.2 mi | 184 | 4.6 | #1 | 14 | Yes |
| Public Storage #3401 | 1.8 mi | 312 | 4.4 | #2 | 22 | Yes |
| ABC Self Storage | 2.4 mi | 67 | 4.5 | #3 | 6 | No |
| Your facility | — | 38 | 4.3 | **#4** | 0 | No |
| Storage Spot | 4.1 mi | 22 | 4.0 | #5 | 0 | No |

**Plain-language read:** Two of the four competitors above you are doing the GBP work. The REIT is doing all of it. You can't beat the REIT on reviews (they've had 312 over years), but you can beat them on the GBP signals that swing the local rank — posts, photos, Q&A — and you can catch the ones that are also not doing the work.

### Section 3 — Your website and lead capture

**H2:** Your website and how leads come in

**Findings:**
- Website: *[detected URL or "no website detected"]*
- Mobile speed score: **42/100** (below average for the industry)
- Lead form on homepage: **No**
- Phone number click-to-call enabled: **Yes**
- Live chat: No
- SSL certificate: Yes

**Plain-language read:** The site loads slowly on phones, which is where 60-70% of storage searches happen. There's no form on the homepage, so the only way to reach you is the phone number — which is fine if you always answer, but the speed-to-lead test below says you don't.

**What StorageAds would do:** We build you a fast, mobile-first site tuned for move-ins, set up alongside your current one. Your paid traffic goes to dedicated landing pages per unit size. The phone keeps ringing; the form and the chat catch the people who don't want to call.

### Section 4 — Speed to lead

**H2:** How fast leads actually get answered at your facility

**Test results from our audit:**
- **Phone call:** Answered on 6th ring, voicemail offered. Voicemail not returned by audit deadline (24 hrs).
- **Web form:** No response within 24 hrs.
- **Google Business Profile message:** No response within 24 hrs.

**Plain-language read:** This is the single biggest fixable gap on your audit. Industry data says a lead contacted within 5 minutes is 9x more likely to convert than one contacted after 30. Your three leads in this test got contacted in 0 minutes. Each one of those is a likely move-in lost to whoever answered first.

**What StorageAds would do:** Every text, web form, Google message, Facebook message, and Instagram DM gets answered in 30 seconds, 24 hours a day. The system holds the unit, books the tour, hands you the warm lead. You don't have to be on the phone for it to work.

### Section 5 — Your trade area's demand

**H2:** Demand in your trade area

**Stats:**
- Facilities within 5 miles: 8
- Estimated occupancy in your trade area: 86% (above national average of 90%, below for your metro)
- New supply breaking ground within 5 miles: **1 facility (47,000 sqft, opening 8 months)**
- 12-month population growth in your trade area: +2.4%
- 12-month new household formation: +1.8%

**Plain-language read:** Your trade area is healthy on demand. The new supply opening 8 months out is your biggest signal — that's the moment your rates and occupancy can get squeezed if you're not running paid ahead of it. Operators who get out in front of new supply by 90-180 days hold rate better. Operators who don't get out in front lose 4-7 percentage points of occupancy.

### Section 6 — Estimated cost of doing nothing

**H2:** What this is costing you

**Big-number callout block:**
- **6-9 move-ins per month** likely missed across all channels
- At your average effective rate (**$197**), that's **$1,180-$1,770 per month in missed rent**
- Over 12 months: **$14,160-$21,240 in missed rent on this facility alone**

**Plain-language read:** This is rough. We're conservative on it. The real cost is probably higher because the missed move-ins compound — units that don't get rented this month don't get rented next month either, and the empty space carries holding costs.

The good news is the fixes are all known. The bad news is they take consistency, every week, on every facility, and nobody at most independent operators has the time.

That's what StorageAds is for.

### CTA block — bottom of audit results

**H2:** Want help fixing this?

**Two paths, equal weight:**

**Path 1 — Talk to Blake.**
30 minutes. Walk through the audit together. Decide if StorageAds makes sense for your facility. Founder, operator, real conversation.

**CTA:** Book a call with Blake →

**Path 2 — Start a plan.**
You already know what you want. Skip the call. Pick a plan, OAuth your accounts, we're posting by Friday.

**CTA:** See plans →

**Below both CTAs, small text:** Audit yours? Audit your friend's facility — [link]. We don't charge for audits.

---

## Audit follow-up email (sent immediately after audit completes)

**From:** Blake at StorageAds <blake@storageads.com>
**Subject:** Your StorageAds audit for [Facility Name] is ready

**Body:**

Hey [first name],

Your audit for [Facility Name] is at the link below.

[Audit link]

A few things stood out:

1. Your local rank in the [City] 3-pack is #[X], with [N] competitors above you. Two of them are doing the GBP work that pushed them past you. That's fixable.
2. Speed to lead is the single biggest gap. We tested three inbound channels and none got answered inside 24 hours. Every one of those is a likely move-in lost.
3. New supply breaking ground within 5 miles in [X] months. You want to be running paid ahead of that.

The audit walks through everything we found, including what each gap is costing you in missed rent. It's a long read but the headlines are at the top.

If you want to talk through it, my calendar's here: [Cal link]. If you'd rather just pick a plan and start, here's the pricing page: [pricing link].

Either way, the audit is yours. No agency call. No spam.

— Blake
Founder, StorageAds
Operator of [Blake's portfolio name] facilities
blake@storageads.com

---

## Audit reminder email (sent 3 days later if no booking, no plan purchase)

**Subject:** Quick follow-up on your [Facility Name] audit

**Body:**

Hey [first name],

Just checking back on the audit we ran for [Facility Name] last week.

[Audit link]

The two things I'd focus on first if you were doing this yourself:

1. **Post on your Google Business Profile this week.** Any post. An offer, a What's New, a Product listing. Google rewards facilities that post; you haven't posted since October. One post this week probably moves your local rank within 14 days.
2. **Answer the three unanswered questions on your GBP.** They're sitting there public. Anybody searching for storage in [City] sees them. Takes 5 minutes.

That's the free DIY version. If you want us to do it for you and run the rest of the marketing system, the pricing page is here: [pricing link]. If you'd rather talk first, my calendar's here: [Cal link].

— Blake

---

## Cold-outreach version of the audit (when we send it unsolicited)

This is the cold-outreach version per vision doc §7.1 — "we audited your facility, here's what we found." The audit results page itself is the same; the difference is the surrounding outbound.

**From:** Blake at StorageAds <blake@storageads.com>
**Subject:** Audited your facility — three things stood out

**Body:**

Hey [first name],

I run a few storage facilities and I built a tool that audits any facility's marketing. I ran it on [Facility Name] this morning out of curiosity. Here's the report:

[Audit link]

Three things stood out:

1. You're #[X] in the local 3-pack with [N] competitors above you. Two of them got there with weekly GBP posts.
2. Your speed-to-lead test came back with no answer on the phone, no answer on the form, no answer on the GBP message inside 24 hours. That's the biggest cost in missed rent.
3. There's [N] facility breaking ground within 5 miles of you. You'll want to be running paid before it opens.

The full audit walks through everything and gives you the rough dollar cost. It's free. No agency pitch, no spam.

If you want to talk about it, my calendar's here: [Cal link]. If you don't, the audit is still yours.

— Blake
Operator and founder, StorageAds
blake@storageads.com

---

## Notes on the audit-results page implementation

- The existing `/audit/[slug]` route should be the implementation surface. The data model already exists for shared audits per CLAUDE.md.
- The plain-language read paragraphs are intentionally NOT generated fresh per audit — they're templates with substitution slots. The audit findings drive substitution; the prose stays consistent in voice.
- The big-number callouts (estimated missed move-ins, cost of doing nothing) require careful instrumentation — these are the most-cited numbers from the audit and they need to be defensible. Document the calculation methodology in a footnote linked from the audit (and in the deep product docs where the CPMI math lives, per copy-voice.md's "acceptable in deep product pages" carve-out).
- The "Audit your friend's facility" link at the bottom of the CTA block is the referral mechanic on the audit itself. Every audit becomes a potential second audit. This is the cheapest way to grow audit volume.
- The cold-outreach email is the highest-leverage GTM mechanic on the platform. Every word in it has been weighed. The phrase "out of curiosity" softens the cold-call energy without diluting the credibility. The numbered list of three findings is the hook. The "no agency pitch, no spam" close is the trust signal. The sign-off as "Operator and founder" is the differentiator.
- A/B test candidates after launch: subject line ("Audited your facility — three things stood out" vs. "Ran a marketing audit on [Facility Name] this morning"); body opening ("I run a few storage facilities" vs. "I'm a storage operator who built a marketing tool"); CTA structure (call vs. audit-only vs. pricing-page).
