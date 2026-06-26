# Decisions & Contradictions

*Your existing docs contradict each other in several places. This is the record of every conflict found, what we decided is canonical (with your sign-off on the big three), and the cleanup still owed in the code and docs. When an old document disagrees with this Founder's Guide, this page says which to trust and why.*

---

## The big three — decided with you on 2026-06-25

### 1. Pricing → canonical is the live website pricing

There were **three** different pricing schemes floating around:

| Source | Scheme |
|--------|--------|
| **Live website** (`src/app/pricing/page.tsx`) | **Signal $299 / System $749 / Compound $1,249** + $1,000/mo ad-spend min; Enterprise 10+ |
| Billing code (`src/lib/stripe.ts`) | Launch $750 / Growth $1,500 / Portfolio (custom) |
| OVERVIEW.md / WHITEPAPER.md | Launch $499 / Growth $999 / Portfolio $1,999 / Enterprise $2,499+ |

**✅ DECIDED: The live website is canonical.** Signal $299 / System $749 / Compound $1,249 per facility/mo, plus the $1,000/mo ad-spend minimum (paid to Meta/Google, not to you). These are *founding/alpha* prices that roughly double after alpha and lock for 12 months if a customer signs during alpha. Enterprise (10+ facilities) uses volume pricing: $599/facility at 10–24, $499 at 25–49, $449 at 50+.

**⚠️ Code cleanup owed:** the billing code (`stripe.ts`) still uses the old Launch/Growth/Portfolio names and different numbers ($750/$1,500). The Stripe Price objects, the billing code, and the website must be unified on Signal/System/Compound *before* self-serve checkout ships — otherwise a customer could be charged a different amount than they saw. (This is Phase 3 in [WHERE-TO-TAKE-IT-NEXT.md](./WHERE-TO-TAKE-IT-NEXT.md).)

### 2. Brand name → canonical is StorageAds

The company was renamed **StowStack → StorageAds**, but the rename is half-finished.

| Says "StorageAds" | Still says "StowStack" |
|-------------------|------------------------|
| The live domain (storageads.com), your email (blake@storageads.com), all current site copy, the market research | The repo folder name (`stowstack-next`), the Cal.com booking handle (`stowstack`), some old copy-audit docs |

**✅ DECIDED: StorageAds is canonical.** StowStack is legacy.

**⚠️ Cleanup owed (low priority — housekeeping, not a blocker):** the Cal.com handle, repo/folder name, and any lingering "StowStack" copy should be updated when you have a slow week. Note the package name inside the code is `storageads-next` (already correct); only the outer folder is `stowstack-next`.

### 3. Status → fresh audit (2026-06-25) supersedes the March audits

The March audit docs (SHIP_READINESS_AUDIT.md, AUDIT_RESULTS.md, etc.) graded the product "NOT SHIPPABLE, Security D, Database D+." Per your request, a **fresh audit was run on 2026-06-25** rather than trusting those grades.

**✅ DECIDED: The fresh audit is canonical.** Its findings are reflected in [WHERE-THINGS-STAND.md](./WHERE-THINGS-STAND.md). In short: security fundamentals are solid (not "D"), the catastrophic build risk is genuinely fixed, but three real gaps remain — the move-in loop isn't connected, there's no self-serve checkout, and data backups are unverified. The March docs should be treated as **historical** and ideally moved to an `/archive` folder or stamped "SUPERSEDED 2026-06-25" so no one mistakes them for current.

---

## Other contradictions & doc problems found

These are smaller but worth knowing so you trust the right source:

### "STRATEGY.md is the company strategy" — false
`STRATEGY.md` is **not** a company roadmap. It's the *Marketing Intelligence Doctrine* — the playbook the platform's AI uses to generate campaigns (customer archetypes, channel mix, seasonality, etc.). Useful, but mis-titled. **The actual company strategy lives in THE-BUSINESS.md (this folder), OVERVIEW.md, and the market-research EXECUTIVE_SUMMARY.md.** Consider renaming STRATEGY.md to `AI-CAMPAIGN-DOCTRINE.md`.

### "PROGRESS.md tracks overall progress" — false
`PROGRESS.md` only logs one recent sub-project (the admin IA / "Operator's Console" redesign from June 19). Despite the generic name, it is **not** a whole-business status. **For real status, use WHERE-THINGS-STAND.md.**

### "The move-in loop is ~50 lines from done" — optimistic
OVERVIEW.md and WHITEPAPER.md imply the move-in loop is nearly automated. **True-ish for Meta** (it's mostly connecting existing pieces), **false for Google** (the current code uses the wrong mechanism — a legacy browser pixel — and the correct "offline conversion import" must be built from scratch). See [WHERE-THINGS-STAND.md](./WHERE-THINGS-STAND.md).

### "Twilio not set up" — ambiguous
CLAUDE.md says Twilio isn't set up. **The code is complete; the *account* isn't provisioned.** It's an ops switch, not a build task.

### "Raw SQL only lives in one file" — false (but harmless)
CLAUDE.md claims raw database queries are confined to one file. In fact they're in 100+ files — but all use the safe, parameterized form, so there's no security issue. The doc is just misleading and could trip up a future contributor. Worth a one-line correction.

### OVERVIEW.md and WHITEPAPER.md overlap ~70%
They cover much of the same ground (same cost-per-move-in thesis, same competitor table, same pricing). Not wrong, just redundant. If you ever consolidate: keep OVERVIEW.md as the plain explainer and WHITEPAPER.md as the long-form sales narrative, and make sure both point at *this* folder for current status and pricing.

### README.md is default boilerplate
The README is still the generic `create-next-app` template — no StorageAds content. Prime candidate to replace with a short pointer to this Founder's Guide and basic setup instructions.

### BLOCKERS.md is empty
That's accurate — nothing is currently stuck. Just don't read "empty" as "no work left"; the work is in [WHERE-TO-TAKE-IT-NEXT.md](./WHERE-TO-TAKE-IT-NEXT.md).

---

## The cleanup checklist (when you have a slow week)

None of these block selling. They're hygiene that makes the codebase cleaner and more acquisition-ready.

- [ ] Unify pricing in code (`stripe.ts` + Stripe Price objects) to Signal/System/Compound — **do this before self-serve checkout** (not slow-week; it's Phase 3).
- [ ] Finish the StowStack → StorageAds rename (Cal.com handle, repo/folder name, stray copy).
- [ ] Move or stamp the March audit docs as "SUPERSEDED 2026-06-25."
- [ ] Rename `STRATEGY.md` → `AI-CAMPAIGN-DOCTRINE.md` (it's not the company strategy).
- [ ] Rename or re-scope `PROGRESS.md` (it's only the admin-redesign log).
- [ ] Replace the boilerplate `README.md` with a real one pointing here.
- [ ] Correct the CLAUDE.md "raw SQL in one file" claim.
- [ ] Decide whether to consolidate OVERVIEW.md + WHITEPAPER.md or keep both with clear roles.

---

## How to keep this folder true

This guide is only useful if it stays honest. Two habits:

1. **When you close a gap, update [WHERE-THINGS-STAND.md](./WHERE-THINGS-STAND.md).** Especially the move-in loop — the day it's connected, that 🔴 becomes 🟢, and the whole status story changes.
2. **When a decision changes, update this page.** It's the tie-breaker; if it goes stale, the contradictions creep back.
