# Founder's Guide — Start Here

*Plain-English reading material so you (Blake) can hold the whole picture of StorageAds in your head — the product, the business, where it really stands, and where to take it next. Written 2026-06-25, grounded in the actual code and a fresh audit done that day — not in the older strategy/audit docs (several of which contradict each other or are stale).*

---

## What this folder is

You have a *lot* of documents already — OVERVIEW, WHITEPAPER, STRATEGY, six audit files, a full market-research pack. They're good, but they're (a) written for different audiences (investors, partners, the AI), (b) contradictory in places (three different pricing schemes, a half-finished rename), and (c) some are three months out of date.

This folder is the **clean layer on top**. Six short documents, written for *you*, in plain language, telling the truth as of today. Read them in order. They'll take about 45 minutes total.

---

## The reading order

| # | Document | What it answers | Read it when |
|---|----------|-----------------|--------------|
| 1 | **[WHAT-WE-BUILT.md](./WHAT-WE-BUILT.md)** | What is this thing? What does a customer experience, and what does the machine do behind the scenes? | You want to actually understand the product you own |
| 2 | **[THE-BUSINESS.md](./THE-BUSINESS.md)** | What's the business? Who's it for, how does it make money, who do we compete with, what's the moat? | You're talking to an investor, partner, or customer and need the story straight |
| 3 | **[WHERE-THINGS-STAND.md](./WHERE-THINGS-STAND.md)** | Honest status. What works, what's half-built, what's stale doc-fiction, and what's actually blocking the first paying customer. | You want to know if you can sell this tomorrow (short answer: design-partner yes, self-serve no) |
| 4 | **[YOUR-OPTIONS.md](./YOUR-OPTIONS.md)** | The real forks in the road — the strategic choices in front of you and the honest trade-offs of each. | You're deciding what to do with this, not just how |
| 5 | **[WHERE-TO-TAKE-IT-NEXT.md](./WHERE-TO-TAKE-IT-NEXT.md)** | If I were you: do these things, in this order, for these reasons. A sequenced 90-day plan. | You want a recommendation, not a menu |
| 6 | **[DECISIONS-AND-CONTRADICTIONS.md](./DECISIONS-AND-CONTRADICTIONS.md)** | The conflicts I found across your existing docs, what we decided is canonical, and the cleanup still owed. | Something in an old doc disagrees with this folder and you want to know which to trust |

---

## The 60-second version (if you read nothing else)

- **What it is:** Software that runs a self-storage operator's whole marketing machine — ads, landing pages, lead capture, reviews, reports — and (this is the pitch) ties ad spend all the way down to **actual move-ins**, not just form-fills.
- **How big it is:** Real and large. ~94 database tables, ~180 API endpoints, 21 automated background jobs, ~125,000 lines of code. Built by you and Angelo in roughly six weeks. This is not a prototype.
- **What it sells for:** Founding/alpha pricing — **Signal $299 / System $749 / Compound $1,249** per facility per month, plus a **$1,000/mo ad-spend minimum** that goes straight to Meta/Google (you don't touch it). Prices roughly double after alpha. Enterprise tier for 10+ facilities.
- **Where it stands:** Pre-launch. No paying customers yet. The marketing machine genuinely works. **But the single most important feature — sending a completed move-in back to Meta and Google so the ad robots learn from it — is not connected.** All the parts exist; the wire between them doesn't. That's the headline.
- **The other blocker:** There's no "click here to subscribe" button wired up anywhere, and the prices shown on the website don't match the prices in the billing code. Selling today means doing it by hand (a call, a manual invoice), which is fine for your first few design partners.
- **The good news:** The scary March audit ("NOT SHIPPABLE, Security D") is mostly out of date. A fresh security and data audit on 2026-06-25 found the fundamentals are solid — gated routes, verified webhooks, no leaked secrets, safe database queries. The remaining issues are real but fixable in days, not months.

**The one-line takeaway:** You've built ~90% of a genuinely impressive product. The missing 10% includes the exact thing that makes the whole story true. That's the good kind of problem to have — go read [WHERE-TO-TAKE-IT-NEXT.md](./WHERE-TO-TAKE-IT-NEXT.md).
