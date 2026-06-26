# Attribution Rebalance — Audit & Change Report (2026-05-29)

Goal: stop treating attribution as the hero/sole differentiator in copy-generation governance. Reposition attribution as the measurement layer underneath a full-funnel acquisition system. Canonical positioning now lives in [`.claude/positioning.md`](../.claude/positioning.md).

---

## Step 1 — Where attribution was the hero / sole differentiator

Classified as **(G)** copy-gen governance, **(C)** customer-facing copy, or **(I)** internal/technical (left untouched per scope).

### Governance — drove generation (FIXED)

| File | Line(s) | What it said | Class |
|---|---|---|---|
| `BRAND_DOCTRINE.md` | 180 | "Full-journey attribution … the metric that closes deals" (differentiator row) | G |
| `BRAND_DOCTRINE.md` | 252–255 | "Attribution & Measurement Doctrine"; "Full-funnel tracking is the product's moat" | G |
| `BRAND_DOCTRINE.md` | 274, 278 | Feature gates: "data we can use for attribution"; "deepen the attribution moat" | G |
| `BRAND_DOCTRINE.md` | 325, 327 | Competitive table: "Single-domain full-funnel attribution"; "Real-time attribution: ad spend in → move-ins out" | G |
| `CREATIVE.md` | 3 | Competing "single source of truth" claim with no positioning hierarchy | G |
| `CLAUDE.md` | 7–13 | Voice section pointed to voice docs but had no canonical positioning anchor | G |
| `.claude/copy-voice.md` | — | Banned the jargon but had no positive funnel hierarchy and no "only ones" ban | G |
| `.claude/skills/operator-copy/SKILL.md` | 21–27, 46–48 | Loaded voice docs only; ban list missing closed-loop family; no "only ones" rule | G |
| `.claude/brand-voice-guidelines.md` | 1–9 | Generated guide; one-liner didn't name the funnel; no positioning anchor | G |

### Customer-facing copy (two FIXED, rest FLAGGED below)

| File | Line(s) | What it said | Action |
|---|---|---|---|
| `src/app/help/page.tsx` | 19 | "…what enables full-funnel attribution." (banned phrase, any customer surface) | FIXED → outcome line |
| `src/types/billing.ts` | 80 | Feature label "Full-funnel attribution" | FIXED → "Every move-in tied to the ad that drove it" |
| `src/app/compare/[competitor]/page.tsx` | 33–36 | Comparison hinges on attribution-only rows (we do / they don't) | FLAG (load-bearing) |
| `src/types/billing.ts` | 60–62 | Plan **named** "Demand Engine" (banned word) + tier IDs | FLAG (load-bearing) |
| `src/app/insights/page.tsx` | 8, 42, 98, 130 | Posts themed on attribution ("Attribution isn't a buzzword…") | FLAG (load-bearing) |
| `content/blog/dedicated-landing-pages-vs-main-website.md` | 6, 66, 74 | "closed-loop rental experience" / "That's the closed loop" | FLAG (blog not live) |

### Internal / technical / pitch — intentionally NOT touched (per scope)

`OVERVIEW.md` (investor/partner explainer, incl. line 17 "the part nobody else does well"), `WHITEPAPER.md`, `.claude/pitch-voice.md` and `brand-voice-guidelines.md` §4 (investor/acquirer register — attribution is legitimately one of three bounded-novelty legs there, not the sole hero), `docs/roadmap/10-closed-loop-attribution.md` + `docs/roadmap/00-overview.md` ("Closed Loop (the moat)"), `analysis/*`, legal pages (`cookies`, `privacy`, `dpa`), product/report names ("Move-in Attribution Report"), portal/in-app labels, and the attribution API/code. These describe the system as engineering or speak to the investor register; out of scope.

**Also checked, already clean (no change needed):** the AI copy-gen prompts in `src/app/api/audit-generate/route.ts` and `src/app/api/audit-generate-diagnostic/route.ts` already lead with move-ins, occupancy, and revenue and never hero attribution. No `.claude/commands/` slash-command files exist (the referenced `/route`, `/audit`, `/gap` commands are not in this repo).

---

## Step 2 — Canonical positioning installed

New file: [`.claude/positioning.md`](../.claude/positioning.md). Contains HERO / CORE PROMISE / FUNNEL PILLARS / ATTRIBUTION-DEMOTED, the attribution-mention rules, the translate-to-outcomes table, the "only ones" ban, and a precedence order. Every generation surface now points to it:

- `CLAUDE.md` → "Positioning is canonical… read positioning.md before any copy in any register."
- `BRAND_DOCTRINE.md` and `CREATIVE.md` → defer to positioning.md for message hierarchy (they keep aesthetics/craft).
- `.claude/copy-voice.md`, `.claude/brand-voice-guidelines.md`, `operator-copy/SKILL.md` → load positioning.md first.

## Step 3 — Attribution-mention rules now enforced in the skill

`operator-copy/SKILL.md` validator now bans, everywhere customer-facing: attribution-as-lede, the closed-loop / ad-to-move-in / cost-per-reservation jargon family, and all "only ones who do X" framing — with the outcome translations inline. `copy-voice.md` gained a matching "Don't claim we're the only ones who do X" section and a "what we lead with (the funnel)" section.

---

## Step 4 — Load-bearing flags (your call before rewrite)

1. **`src/app/compare/[competitor]/page.tsx` (lines 33–36).** The whole comparison's "StorageAds yes / competitor no" advantage is the two attribution rows ("Cost per move-in tracking", "Ad-to-move-in tracking"). Rewriting changes what the page argues. Recommendation: keep those as *proof rows* but reframe the page's headline/differentiator around the full system (market mapping → acquisition → landing pages → move-in conversion), so attribution is one row among funnel pillars, not the only thing we "win."

2. **`src/types/billing.ts` (plan "Demand Engine", id/tier `demand_engine`).** "Demand engine" is a banned customer word (investor-only). The plan *name* is customer-facing, but `id`/`tier` are almost certainly Stripe price keys / DB values — renaming needs a coordinated migration, not a string swap. Also note this conflicts with `CLAUDE.md`'s stated "Good / Better / Best" tiers. Needs a product/pricing decision from you. (I changed only the safe display feature label.)

3. **`src/app/insights/page.tsx` (4 posts).** Several insights posts open on attribution ("Attribution isn't a buzzword…", "How attribution works"). These are operator-voice education and arguably valuable, but they lead with the mechanism. Recommendation: keep the teaching, rewrite the openers to the outcome ("knowing which dollar made you money"), demote the word.

4. **Sales talk-tracks — `StorageAds-Market-Research/03-Customer-Intel/operator-pain-points.md` (lines 53, 114).** Internal research (out of scope to edit), but these scripted rep responses lean entirely on "cost per move-in … that's the insight nobody else provides." If reps say these live, they violate the new positioning. Flagging so you can align the talk-track.

5. **Internal narrative still calls attribution "the moat"** — `docs/roadmap/10-closed-loop-attribution.md` ("Pillar: Closed Loop (the moat)") and `docs/roadmap/00-overview.md`. Out of scope (internal engineering roadmap), but this is the conceptual source of the hyperfocus. You may want to realign the internal story so the moat is the operator-built full system, with attribution as its measurement layer.

6. **`OVERVIEW.md` line 17 "the part nobody else does well."** Lives in the investor/partner explainer, so left as-is. If this doc ever gets repurposed toward operators, that line needs the "only ones" treatment.
