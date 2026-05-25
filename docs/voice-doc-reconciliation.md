# Voice Doc Reconciliation — copy-voice.md / pitch-voice.md vs BRAND_DOCTRINE.md / CREATIVE.md

**Date:** 2026-05-24
**Status:** Analysis only. No code or branch changes made.

## TL;DR

The remote `main` branch already has two canonical brand documents — `BRAND_DOCTRINE.md` (350 lines) and `CREATIVE.md` (225 lines) — that I never consulted because they didn't exist when I started. My `.claude/copy-voice.md` and `.claude/pitch-voice.md` **overlap with these, partially align, partially conflict**, and were authored as if they were establishing the canonical voice from scratch.

**Recommendation:** Do not merge `.claude/copy-voice.md` to main as-is. Either (a) discard it and reference BRAND_DOCTRINE Section VIII directly from CLAUDE.md, or (b) reframe it as a *tactical operationalization* of BRAND_DOCTRINE Section VIII with a header that defers to the doctrine and resolves the tensions noted below.

The marketing rewrite commits (surfaces 1–6 on `claude/copy-voice-rewrite`) should also be considered abandoned. They edit strings on an outdated tree against a voice doc that's now downstream of an authoritative source the work didn't account for.

---

## What's on remote that I missed

`BRAND_DOCTRINE.md` is structured as:
- I. Creative Philosophy (Super Bowl bar, Chiat\Day, Bernays)
- II. Aesthetic Identity (Porsche, Rimowa, Anthropic, Kubrick, newspaper finish, Franklin Gothic / Gill Sans)
- III. **Context separation: Generated Marketing Content vs. StorageAds Product**
- IV. Strategic Differentiators (conversion funnel as product, pre-qualification play, premium domain as infrastructure)
- V. Content Generation Standards (7 gates, copy principles, visual principles)
- VI. Digital & Social Media Doctrine
- VII. Feature Design Doctrine
- **VIII. Brand Voice** ← the section that maps most directly to my copy-voice.md

`CREATIVE.md` is structured as:
- Voice & Identity ("we are not the brand — the facility is")
- Visual Doctrine
- Creative Standards
- Ad Theory & Conversion Principles
- Platform-Specific Guidelines (Meta, IG, Google Search, TikTok, GBP)
- Video Content Direction

**Critical context separation in BRAND_DOCTRINE Section III:**
- **Generated Marketing Content** = ads, landing pages, videos for facility clients. Porsche aesthetic. Bernays/Chiat\Day persuasion. Bold, warm, tactile, witty.
- **StorageAds Product** = the platform UI, sales materials, brand identity of StorageAds itself. Anthropic-meets-literary-magazine. Dieter Rams restraint. Quiet, intelligent, considered.

`CREATIVE.md` governs the **first** context (generated ad output for clients). The marketing site at storageads.com falls under the **second** context — the StorageAds Product. My `.claude/copy-voice.md` was written for the marketing site, so the comparison that matters is **my copy-voice.md vs. BRAND_DOCTRINE Section VIII (StorageAds Brand Voice)**.

---

## BRAND_DOCTRINE Section VIII (verbatim)

> **StorageAds Speaks Like:**
> - A brilliant strategist who explains complex things simply
> - Confident but not arrogant — the work speaks for itself
> - Direct, specific, no filler — every sentence moves the conversation forward
> - Obsessed with results, allergic to vanity metrics
> - Technical when precision matters, human when emotion matters
> - Witty when the moment allows — in the Porsche tradition, never forced, always earned
>
> **StorageAds Never Sounds Like:**
> - A generic SaaS marketing page ("Unlock the power of..." / "Revolutionize your...")
> - A desperate salesperson ("Act now!" / "Don't miss out!" without substance behind it)
> - A committee (vague, hedging, trying to please everyone)
> - A textbook (jargon without translation, complexity without purpose)

---

## My .claude/copy-voice.md (summary)

- **Audience:** Independent self-storage operator, 35–65, 1–5 facilities, agency-skeptical
- **Voice exemplars:** Nick Huber, Michael Wagner, AJ Osborne, Scott Meyers, Stacy Rosetti
- **Frame:** "Operators who built software, not marketers selling to operators"
- **Banned words (selective):** demand engine, full-funnel, attribution-as-hero-phrase, CAPI, server-side, ROAS, CPL, CPMI, impressions, optimize, leverage, solution, platform, stack, synergy, best-in-class, cutting-edge, empower, unlock, drive
- **Sentence rules:** ≤40 words, concrete over abstract, verbs over nouns, numbers over adjectives
- **Test:** "Would Nick Huber tweet this? Would Michael Wagner say this on a podcast?"

---

## Alignment matrix

| Dimension | BRAND_DOCTRINE VIII | .claude/copy-voice.md | Verdict |
|---|---|---|---|
| Reject vanity metrics | "Allergic to vanity metrics" | Bans impressions/engagement/clicks-as-hero | ✅ Aligned |
| Reject SaaS jargon | Bans "Unlock the power of," "Revolutionize" | Bans leverage, synergy, empower, unlock, etc. | ✅ Aligned, mine more prescriptive |
| Concrete & specific | "Direct, specific, no filler" | "Concrete over abstract. Numbers over adjectives." | ✅ Aligned |
| Anti-committee | "Never sounds like a committee" | Implicit in operator voice | ✅ Aligned |
| Wit when earned | "Witty when the moment allows — Porsche tradition, never forced" | "Wit is welcome" (in copy-voice.md by way of the right examples) | ✅ Aligned |
| **Speaker identity** | "**A brilliant strategist** who explains complex things simply" | "**An operator** — Nick Huber, Michael Wagner" | ⚠️ **Tension** |
| **Register** | "Anthropic-meets-literary-magazine. Typographic confidence. Quiet sophistication." (Section II) | "Plain language. Operator-to-operator. No MBA words." | ⚠️ **Tension** |
| **Folksy operator markers** | Not endorsed; "brilliant strategist" implies more polish | Endorses "gate motors, midnight calls, sign on a chainlink fence" | ⚠️ **Tension** |
| Banned-word specificity | Broad anti-jargon principle | Specific banned list including "demand engine" | ⚠️ Conflict in implication: see below |

---

## The "demand engine" problem

My copy-voice.md bans the phrase "demand engine" in customer copy. Six of my seven commits enforce this ban. But on remote:

- `src/components/marketing/demand-engine-visual.tsx` still exists and is actively wired into the NULL//TRACE theme via `@/components/mono/section-header`
- BRAND_DOCTRINE Section IV.A calls the product a "**conversion machine**" — different metaphor than "demand engine" but in the same family
- BRAND_DOCTRINE Section IV titles strategic differentiators "Strategic Differentiators (The 'Why StorageAds Wins' Framework)" — comfortable with framework/system terminology

The empirical evidence from Angelo's commits is that "Demand Engine" as a section name is a **live design element** in the current product. My ban was based on the voice guide I authored; it has no independent authority over Angelo's design decisions.

**Resolution:** Either (a) treat "demand engine" as a section name owned by the design system (legitimate use), and only ban it in marketing prose / hero claims / meta descriptions; or (b) raise the ban with Angelo and reach consensus. My unilateral ban was premature.

---

## The "operator voice" vs. "brilliant strategist" tension

This is the central reconciliation question. The two registers are **not the same**:

| | Operator voice (my copy-voice.md) | Brilliant strategist (BRAND_DOCTRINE) |
|---|---|---|
| Speaker | A storage facility operator | A senior strategist / advisor |
| Vocabulary | "Fill units, gate motors, midnight calls, chainlink fence" | Concrete and specific but not necessarily folksy |
| Sentence shape | Short, fragments OK, contractions | Direct, specific, but can carry weight |
| Test | "Would Nick Huber tweet this?" | "Anthropic-meets-literary-magazine" |
| Example WRONG → RIGHT | "Empower your facility with enterprise-grade marketing technology." → "The REITs have a marketing team. Now you do too." | (Both of these arguably fail the brand doctrine — the WRONG is too jargon-y, the RIGHT is *almost* too folksy) |

**The honest read:** My copy-voice.md drifts into folksy-operator territory in places where BRAND_DOCTRINE would want polished-strategist instead. "A sign on a chainlink fence is not an acquisition strategy" is great as a memorable line; it would not appear in Anthropic's product marketing. The voice may be **too operator-flavored** for the product's intended register.

But it's not wholly wrong either: "Direct, specific, no filler — every sentence moves the conversation forward" can absolutely include "Fill units. Move-ins. Trade area. What you spent. What you got. What each move-in cost." Those are strategist sentences delivered in operator vernacular. The compatibility is real, but it requires explicit reconciliation.

---

## My .claude/pitch-voice.md vs. BRAND_DOCTRINE / CREATIVE

pitch-voice.md is for investor/acquirer/whitepaper context. Neither BRAND_DOCTRINE nor CREATIVE addresses this register directly — they're about generated ad content and the product itself. **pitch-voice.md is therefore non-conflicting** because it occupies a register the canonical docs don't cover.

That said, pitch-voice.md should probably acknowledge that the product's *brand* voice (per BRAND_DOCTRINE VIII) is the "brilliant strategist" register, and pitch-voice.md's "category language + bounded novelty + architectural commitment" is the same speaker simply addressing a different audience (acquirers instead of customers).

---

## Recommendations

### Option A — Discard my voice docs, reference BRAND_DOCTRINE from CLAUDE.md (cleanest)

Pros:
- One source of truth, owned by Angelo + Blake
- No competing doctrine to maintain
- The CLAUDE.md "Voice & Copy" section in my commit `78a0c17` becomes a 3-line pointer to BRAND_DOCTRINE Section VIII

Cons:
- Loses the tactical specificity of my banned-word list
- Loses the operator-buyer audience framing (which BRAND_DOCTRINE leaves implicit)
- pitch-voice.md (which is genuinely net-new) gets discarded too unless re-homed

### Option B — Keep my voice docs, reframe as tactical implementation (recommended)

Action items:
1. Add a header to `.claude/copy-voice.md`:
   > **This is a tactical implementation of BRAND_DOCTRINE.md Section VIII (StorageAds Brand Voice). Where this doc and BRAND_DOCTRINE.md conflict, BRAND_DOCTRINE.md wins. This doc translates the strategic voice ("brilliant strategist who explains complex things simply") into specific banned/preferred vocabulary for day-to-day copywriting.**
2. Reconcile the operator-voice tension: keep the "Nick Huber / Michael Wagner" exemplars as **one input to** the strategist voice, not the whole thing. The strategist speaks the operator's language fluently but isn't reducible to operator vernacular.
3. Remove "demand engine" from the absolute-banned list (since it's actively used in the product) and instead specify when it's appropriate (section name / design element) vs. when it isn't (hero prose, meta descriptions, sales hero claims).
4. Update pitch-voice.md to note that it's the same brand-doctrine voice addressed to acquirers rather than operators.

### Option C — Push as-is to main and let it conflict (not recommended)

Would create two competing brand authorities in the repo. Confusing. Don't do this.

---

## What to do with the `claude/copy-voice-rewrite` branch

Regardless of which option above:

The **6 marketing rewrite commits** (surfaces 1–6) were applied to files that have been substantially restructured on origin/main. They edit strings that:
- May no longer exist (replaced by Angelo's NULL//TRACE / §00·NUMBERS treatment)
- May have moved into theme components I didn't audit
- May have been wrapped in `@/components/mono/section-header` or similar new components I never saw

Cherry-picking these commits onto the new tree is unsafe. Re-auditing the new tree and applying voice-doctrine fixes targeted at the current code is the correct workflow.

**Recommended:** Open the PR on origin (https://github.com/conceptsdeveloped/stowstack-next/pull/new/claude/copy-voice-rewrite) with a description pointing at this reconciliation doc. Let Angelo or you decide which commits, if any, are salvageable as direct application or as reference for a re-audit.

---

## What I would do next if asked

1. Read the rest of BRAND_DOCTRINE.md (sections I–VII) and CREATIVE.md in full to verify nothing in my analysis missed important context
2. Pull origin/main into a separate worktree and re-audit the **new** state of all customer-facing files against BRAND_DOCTRINE Section VIII (not against my copy-voice.md)
3. Produce a new audit + targeted rewrite series against the current tree, using BRAND_DOCTRINE as the source of truth and my copy-voice.md as supplementary tactical guidance (if kept at all)

But that's substantial work and should not start without explicit direction.
