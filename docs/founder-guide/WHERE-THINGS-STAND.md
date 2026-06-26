# Where Things Stand

*The honest status. Based on a fresh security, data, and functionality audit run 2026-06-25 against the actual current code — not the March audit docs (SHIP_READINESS_AUDIT.md etc.), several of which are stale and overstate problems already fixed.*

---

## The headline

**You can onboard a hand-held design partner today. You cannot let strangers sign up and pay themselves yet. And the single most important feature in the whole pitch is built in pieces but not connected.**

Everything below explains those three sentences.

---

## First, the good news: the scary March audit is mostly out of date

The March 2026 audit graded this **"NOT SHIPPABLE AS-IS, Security D, Database D+"** and flagged a catastrophic data-loss risk in the build process. That document is what most people would find if they went looking for "status." **It is largely stale.** A fresh audit on 2026-06-25 found:

- **Security is solid, not "D."** Every private screen is properly gated. Every webhook (Stripe, Twilio, storEDGE, Meta) verifies its signature. No secrets are committed to the code. Database queries are safe from injection. Tenant data is properly isolated. There is **no critical, customer-blocking security hole.**
- **The catastrophic build risk is genuinely fixed.** The dangerous auto-migration was removed (2026-06-03), and a guard script now blocks it from coming back.

So: don't let the old audit scare you. The fundamentals are in better shape than any existing doc says. What follows are the *real* remaining gaps.

---

## What actually works today (verified, not claimed)

This is a genuinely substantial, working product. If a storage operator were onboarded today, all of this would function:

✅ **Onboarding** — an operator's org, login, and portal can be set up without anyone touching the database by hand.
✅ **AI creative** — ad copy, images, and video generate for real.
✅ **Ad publishing** — real campaigns get created on Meta, Google, and TikTok (created *paused*, pending a human hitting "go").
✅ **Lead capture** — web form, tracked phone, and walk-in QR all work, including capturing and chasing people who abandon the form.
✅ **Lead follow-up** — automated email and text sequences actually send (email via Resend; text via Twilio once it's switched on).
✅ **PMS intelligence** — operators upload their management reports (CSV); the system reads occupancy, rent roll, and revenue and produces churn predictions, rate-increase opportunities, and profit reports.
✅ **Audience building** — real tenant/lead lists get pushed to Meta as Custom Audiences and Lookalikes.
✅ **Weekly reports** — polished performance reports with a PDF attachment send automatically.
✅ **Google Business Profile** — review requests, posts, and Q&A automation.
✅ **The free audit tool** — the top-of-funnel lead magnet works end to end.
✅ **Call tracking** — fully coded; needs only a Twilio account provisioned (an ops step, not a build step).

That's a lot. Most "pre-launch" startups have a fraction of this.

---

## The one that matters most: the move-in loop is not connected

This deserves its own section because it's the heart of the entire pitch.

**The promise:** when a real tenant moves in, StorageAds tells Meta and Google "*this specific person moved in*," so the ad robots stop chasing cheap clicks and start chasing people who actually rent units.

**The reality:** all the parts exist, but **no code connects them.**

- The tool that sends move-in data to Meta (the "Conversions API") is built and correct — **but it currently fires when someone fills out a form, not when they move in.** That's optimizing for exactly the form-fills the pitch says it transcends.
- The tool that matches a PMS tenant back to the lead who generated them is built and sophisticated — but when it finds a match, it just updates the database. It doesn't tell Meta or Google.
- The storEDGE webhook that fires on a completed move-in — the natural place to close the loop — only writes a log entry. It forwards nothing to the ad platforms.
- The Google side is using the **wrong mechanism entirely** — an old browser pixel, not the proper "offline conversion import" that Google Ads needs to learn from a move-in.

**In plain terms:** the system is a beautiful pipeline with the final, most important pipe missing. The Meta side is genuinely close — roughly "connect the matcher to the sender and fire a *move-in* event instead of a *form-fill* event." The Google side is more work, because the correct mechanism doesn't exist yet and has to be built, not just wired.

**Why this is the #1 priority:** until this is connected, StorageAds optimizes ads on the same form-fill metric every competitor uses. The differentiator — the entire reason the company exists — is the one thing not yet delivered. The good news is the hard parts (the matcher, the Meta sender, the move-in webhook) are already built. This is a connection job, not a from-scratch build, at least for Meta.

---

## The second blocker: you can't actually take money through the website

Two related issues:

1. **There's no "Subscribe" button wired up.** Every pricing-page button ("Start with Signal/System/Compound") links to a "Book a call" Cal.com link or the audit tool — not to checkout. The entire Stripe checkout machine is built and tested, but **nothing in the website connects to it.** So today, getting paid means doing it by hand: a sales call, then a manual invoice or a manually-created Stripe subscription.
2. **The prices don't match between the website and the billing code.** The website says Signal $299 / System $749 / Compound $1,249. The billing code says Launch $750 / Growth $1,500 / Portfolio. These are two different naming schemes with different numbers. If you wired up checkout right now without fixing this, **a customer could see one price and be charged another** — a trust-and-money problem.

**What this means practically:** for your first handful of design partners, hand-billing is totally fine and arguably better (you want to talk to them anyway). But before you ever let strangers self-serve, checkout has to be wired and the prices reconciled.

---

## The third concern: no proven safety net for customer data

Two things here:

1. **No verified backup plan.** There's nothing in the codebase proving that database backups are turned on and tested. The database host (Neon) has built-in point-in-time recovery, but its window depends on the plan, and nobody has confirmed it's enabled on the production database or tested a restore. **Before real customer data lives in there, this needs to be confirmed and a one-page "how to restore" runbook written.**
2. **Schema changes still reach production by hand.** The dangerous *automatic* version is gone (good), but the way database changes go live is still a manual command run against the live database, with no review step and the backup question above unanswered. That's the classic way someone accidentally drops a column of live data. Low risk while it's just you, real risk once there are paying customers.

---

## Smaller stuff worth knowing (not blockers, but real)

- **Subscription enforcement is shallow.** If a customer's payment fails or they cancel, the system blocks them from *adding a facility* — but they can still use almost everything else. So a canceled customer keeps most of the product. Revenue leakage, not a data risk.
- **Twilio isn't provisioned.** The call/text code is complete but there's no Twilio account wired up, so calls and texts won't flow until that's set up.
- **PMS is CSV-only.** Operators upload spreadsheets; there's no live, automatic data feed from any property-management system yet (storEDGE has a webhook, but it only logs). SiteLink and Yardi are "queued" = not started.
- **The move-out win-back sequences** enroll tenants automatically but don't actually send — they just log. A stub on the sending side.
- **A few security hardening items** from the fresh audit: the content-security policy is in "report-only" mode (watching, not blocking), some API keys can be created without a rate limit, and the portal access codes never expire. All medium-priority, none customer-blocking, all fixable in hours.
- **No staging environment.** Code deploys straight to the live production site when pushed. Fine for now; risky once customers depend on uptime.

---

## The "doc fiction" to be aware of

Some of your existing documents describe things as more (or less) finished than they are:

- The **March audits** describe problems already fixed. Treat them as historical.
- **OVERVIEW.md and WHITEPAPER.md** describe the move-in loop as essentially done ("~50 lines to automate"). That's optimistic — true-ish for Meta, not for Google.
- **CLAUDE.md** says "Twilio not set up" — true for the *account*, but the *code* is complete.
- **PROGRESS.md** only tracks one recent sub-project (the admin redesign), not the whole business — don't read it as overall status.

See [DECISIONS-AND-CONTRADICTIONS.md](./DECISIONS-AND-CONTRADICTIONS.md) for the full list of conflicts and what we decided is true.

---

## Bottom line, graded honestly

| Dimension | Status | One-line reason |
|-----------|--------|-----------------|
| **Security** | 🟢 Good | Solid fundamentals; only medium hardening left. (Not the "D" the old audit claims.) |
| **The marketing machine** | 🟢 Largely working | Ads, capture, follow-up, reports, intelligence all real. |
| **The core differentiator (move-in loop)** | 🔴 Not connected | The pieces exist; the wire between them doesn't. #1 priority. |
| **Taking money** | 🟡 Manual only | No self-serve checkout; website/billing prices disagree. Fine for design partners. |
| **Data safety** | 🟡 Unproven | No confirmed backups; manual production changes. Fix before paying customers. |
| **Overall readiness** | **Design-partner ready, not self-serve ready** | You can sell to 1–5 hand-held customers now. Public launch needs the three blockers closed. |

**The honest summary:** This is not "NOT SHIPPABLE." It's "shippable to a few people you personally onboard, with three known gaps to close before it's shippable to the world." The biggest of those three is the move-in loop — and closing it is mostly connecting things that already exist. That's a very good place to be.
