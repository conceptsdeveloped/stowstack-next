# StorageAds Homepage Rewrite

**Voice register:** Operator voice (`.claude/copy-voice.md`). Strict.
**Frame:** We are operators who built software, not marketers selling to operators.
**Audience:** Independent self-storage operator, 1-5 facilities, 35-65, busy, smart, skeptical, burned by agencies before.
**Structure:** Built to drop into the existing chapter-component pattern in `src/components/marketing/`. Each section is its own component file.

---

## Hero — `MarketingHero.tsx`

**Eyebrow:** Built by operators. For operators.

**H1:** Fill your facility. We handle the rest.

**Sub:** StorageAds is the marketing system we built for our own facilities. We turned it into software so you can plug it in. No agency. No retainer. No mystery.

**Primary CTA:** Run a free audit of my facility →
**Secondary CTA:** See plans

**Social proof line under CTAs:** Run on Blake's own portfolio of facilities. Now opening to independent operators.

**Hero image direction:** Real photograph of a working self-storage facility — roll-up doors, blacktop, sun. Not a glossy render. Not stock. If we can use a Blake-portfolio shot, use that.

---

## Audit hook — `AuditToolHook.tsx`

**H2:** See what your facility's missing in 60 seconds.

**Body:** Type in your facility. We pull your Google Business Profile, your reviews, your local rank, your competitors. You see exactly where the gaps are and what they're costing you in unfilled units.

It's free. No card. No call. You get the audit.

**CTA:** Audit my facility →
**Field placeholder:** Your facility name or address

**Sub-CTA line:** Already know what you need? See plans →

---

## The problem we solve — `OperatorProblem.tsx`

**H2:** You already know this part.

**Body (three short paragraphs, not bulleted):**

The REITs — Public Storage, Extra Space, CubeSmart — have a marketing team. They have somebody answering every lead in 30 seconds, every Google review the same day, posting on Google Business weekly. They have ads running that get cheaper every quarter because they're tied to actual move-ins, not just clicks.

You don't. Most independent operators don't. Most of us are paying nobody right now and feeling slightly bad about it. The website hasn't been touched in three years. The GBP has 14 reviews. The phone rings, sometimes nobody picks up. The ad budget went to an agency once, didn't work, and now it sits.

We built StorageAds because that was us. We have storage facilities of our own. We needed a marketing system. We couldn't find one that was honest about what it did, didn't lock us into a contract, didn't take 20% of our ad spend, and actually filled units. So we built one.

---

## How it works — `HowItWorks.tsx`

**H2:** What StorageAds does for your facility.

**Subhead:** Four things, every day, on every facility you have.

**Four feature blocks, two per row on desktop, one column on mobile.**

### Block 1 — Your Google Business Profile, worked weekly.

The biggest local-search lever almost no operator pulls. We post to it. We answer your reviews. We seed the questions people search for. We keep your photos fresh. Your local rank goes up because Google rewards facilities that show up.

### Block 2 — Every lead, answered in 30 seconds.

Text. Web form. Google message. Facebook message. Instagram DM. All of them. 24 hours a day. Our system holds the unit, books the tour, hands you a warm lead ready to sign. Your phone keeps ringing for the calls you want to take.

### Block 3 — Ads that tie to actual move-ins.

We run your Google and Meta ads. You pay the ad platforms directly — we don't take a cut of your spend. We track what every ad dollar got you — not clicks, not leads, the units that actually rented. You see exactly what's filling the place.

### Block 4 — Your past tenants, working for you.

Every move-out gets followed up at 30, 60, 90 days. Happy tenants get a text to refer their friends, with a credit attached. Tenants at risk of leaving get spotted before the move-out notice. The cheapest acquisition channel you have is the one you already lost.

---

## The proof — `BlakePortfolioProof.tsx`

**H2:** Run on our own facilities first.

**Body:** Before we let any other operator on this, we ran StorageAds on our own portfolio for 90 days. Here's what moved.

**Three-stat strip (large numbers, monospaced figure styling):**

- **+X.X%** occupancy in 90 days
- **$XX** cost per move-in across all paid channels
- **XX min** average lead response time, 24/7

*[Insert real numbers from the Blake-portfolio pilot per `docs/operator-os-pilot-measurement-plan.md`. Pre-launch placeholder copy below.]*

**Honest caveat line:** Pilot on the founder's own facilities. Now opening to a small group of outside operators. Want in?

**CTA:** Get an audit →

---

## What it costs — `PricingTeaser.tsx`

**H2:** Three plans. Pay monthly or annually. Cancel anytime.

**Three-tier card row:**

### Good — $199/facility/mo
For the operator getting basics on autopilot. GBP. Social. One ad campaign. Full dashboard.

[See what's in Good →]

### Better — $399/facility/mo
**Most popular.** Everything in Good, plus the AI receptionist that answers every lead in 30 seconds, win-back campaigns for past tenants, and the referral engine.

[See what's in Better →]

### Best — $799/facility/mo
Every lever on. Competitor intel, churn prevention, rate recommendations, daily reporting.

[See what's in Best →]

**Below the cards:** No setup fee. 30-day money-back guarantee. Annual pricing saves 20% and gets you a free month.

**CTA:** See the full feature breakdown →

---

## Why us, not an agency — `WhyNotAgency.tsx`

**H2:** Why this isn't an agency.

**Two-column comparison (mobile: stacked).**

### Agency
- Locks you in for 6 or 12 months
- Takes 15-20% of your ad spend on top of their fee
- Sends you a PDF report once a month
- Owns the dashboards, owns the accounts
- Has a "strategist" you only see at QBRs
- Hires marketers, not operators

### StorageAds
- Monthly billing, cancel any time
- Your ad spend goes straight to Meta and Google. We don't take a cut.
- Live dashboard. Daily text. Weekly email. Whatever you want.
- You own everything. We sit on top.
- Real operators on the other end. We've all run a facility.
- We built this for our own facilities first.

---

## What an operator gets — `OperatorDay.tsx`

**H2:** What a Tuesday looks like with StorageAds on.

**Body (narrative, not bulleted):**

Wake up. Coffee. Open your phone. There's a text from us: 4 leads yesterday, 2 tours booked, 1 move-in, occupancy ticked from 88.2% to 88.6%. The bad review from Saturday got answered Sunday morning. Your GBP got 38 new search impressions. The new 10x10 ad started running.

You go run your facility. Talk to the gate guy. Walk the property. Have lunch.

When you come back, you check the dashboard once — the lead from this morning already got a text back, asked for a 10x15, our system held one for her, she's coming in at 3. Nothing else needs you. The Tuesday-afternoon post about hurricane prep already went out on your Facebook and Google. You close the laptop.

That's the day. That's what StorageAds is.

---

## Final CTA — `FinalCTA.tsx`

**H2:** Audit your facility. See for yourself.

**Body:** It's free. You don't talk to anyone. You get the audit. You decide what to do next.

**Primary CTA:** Audit my facility →
**Secondary CTA:** Talk to Blake first

**Footer line under CTAs:** Built by operators. blake@storageads.com — that's a real inbox.

---

## Component layout notes

- Hero, Audit hook, Operator problem, How it works, Blake-portfolio proof, Pricing teaser, Why-not-agency, Operator day, Final CTA — nine sections, all lazy-loaded per the existing `src/components/marketing/` pattern.
- The Audit hook (`AuditToolHook.tsx`) should live just below the hero — duplicate of `AuditToolForm` in the existing audit-tool route, with the same form action.
- Operator day section is the secret weapon. It is the only section that reads like fiction, and it should — operators can imagine themselves in that day, which is the persuasive job the rest of the page isn't doing.
- All headlines short. All sub-copy under 60 words per section unless narrative (Operator day, Operator problem).
- No "Enterprise" mention on the homepage — the management-company white-label tier lives one click deeper on the pricing page. Homepage is for the beachhead.

## Copy register checks before publish

- Re-read against `.claude/copy-voice.md` word blocklist. "Demand engine," "full-funnel," "CAPI," "server-side," "ROAS," "CPL" — none should appear.
- "Cost per move-in" appears once on the proof strip, scoped to the bound product-page exception in copy-voice.md.
- The Nick Huber tweet test: every headline, every CTA, every block of body copy — would Nick tweet it. If no, rewrite.
- Contractions throughout. We're, you're, don't, can't.
- No semicolons in headlines or CTAs. No em-dashes in CTAs.
- The closing line in Final CTA — "blake@storageads.com — that's a real inbox" — is the strongest single trust signal on the page. Keep it. Do not corporate-ify it.
