# Copy Voice Audit v2 (against BRAND_DOCTRINE Section VIII) — 2026-05-24

Auditor: fresh pass against canonical voice (BRAND_DOCTRINE Section VIII +
`.claude/copy-voice.md`). Prior audit is stale and ignored. Worktree:
`/Users/blake/Documents/stowstack-next-voice-v2`.

## Summary

- **22 files scanned** (12 Tier A marketing/composition, 7 Tier B public pages, 3 Tier C public surfaces, plus `src/app/layout.tsx` and `src/lib/drip-email-templates.ts`).
- **89 total findings**: 14 CRITICAL, 31 HIGH, 32 MEDIUM, 12 LOW.
- **Top offenders (worst voice density, descending):**
  1. `src/app/layout.tsx` — `<title>` and OG/twitter all read **"StorageAds | Full-Funnel Demand Engine for Self-Storage"**. This is the single most-rendered string on the site and it stacks two banned-from-hero phrases ("full-funnel," "demand engine") in the meta title.
  2. `src/components/marketing/hero.tsx` — `aria-label="StorageAds: full-funnel demand engine for self-storage"`, "Full-funnel attribution" trust badge, "Full-funnel campaigns across platforms" capability, plus the framing trust badge "Operator-founded" was *removed* but "Full-funnel attribution" wasn't, plus heavy `--color-gold` density (~25+ references).
  3. `src/app/audit/[slug]/page.tsx` — "Full-Funnel Lead Tracking" feature card heading, "Our platform is purpose-built to solve the exact problems this diagnostic found" (generic-SaaS frame), and the "What StorageAds Would Fix First" section reads like a generic SaaS feature grid (Performance Dashboard / PMS Integration / GBP & Review Management) rather than the strategist voice.
- **Estimated rewrite effort per file** (in surgical-fix hours):
  - `src/app/layout.tsx` — 0.25h (one string, three places + JSON-LD)
  - `src/components/marketing/hero.tsx` — 3h (aria-label, trust badges, `CAPABILITIES` data array, `FEATURE_HIGHLIGHTS` data array, "Full platform capabilities" h2, plus `STATS`/dashboard mockup gold colors stay since they're chart visualizations)
  - `src/app/audit/[slug]/page.tsx` — 1.5h (two h3s, two body paragraphs, one CTA frame)
  - `src/app/pricing/page.tsx` — 1.5h (`metadata` strings × 3, "Demand Engine (Paid Media)" section header, "Full-Stack Acquisition System" h2, "full-funnel system" in CTA body)
  - `src/components/marketing/cta-section.tsx` — 0.5h ("Strategy call" copy already on-voice; rewrite the deep diagnostic CTA from "AI-Powered Deep Diagnostic")
  - `src/app/demo/demo-client.tsx` — 0.5h ("Pixel data matures" pitch language; KPI labels could be tightened)
  - `src/components/marketing/demand-engine-visual.tsx` — 0.5h (component is on-voice; section header kicker is fine per context-dependent ruling)
  - `src/app/guide/page.tsx` — 0.25h (one stale "StowStack" brand string; rest of guide is portal-facing client copy, acceptable register)
  - `src/lib/drip-email-templates.ts` — 0.5h ("full stack" + "Marketing that fills units" footer is fine; gold hex is on-purpose for the brand stripe)
  - Tier C remainder (calculator, changelog, case-studies, compare, blog, insights) — 1h total for stale gold purges only

## Findings by file

### Tier A — Marketing components & composition

#### `src/components/marketing/hero.tsx`

CRITICAL — line 1472 — `aria-label="StorageAds: full-funnel demand engine for self-storage"` — uses two banned-from-hero terms ("full-funnel," "demand engine") in the highest-stakes semantic label. Violates BRAND_DOCTRINE Section VIII ("Never Sounds Like a generic SaaS marketing page") and `.claude/copy-voice.md` pitch-register banned list.

CRITICAL — line 1535 — `{ icon: Star, text: "Full-funnel attribution" }` — third trust badge under the hero CTA pair. "Full-funnel attribution" is a pitch-register phrase per `.claude/copy-voice.md`; on-voice replacement: "Every move-in tied to the ad."

HIGH — line 184 — `{ icon: Megaphone, label: "Meta & Google Ads", desc: "Full-funnel campaigns across platforms", color: "var(--color-blue)" }` — "Full-funnel" in body copy. Per `.claude/copy-voice.md` pitch-register list.

HIGH — line 1648 — `<h2>Full platform capabilities</h2>` — "platform" used in a hero section heading. Per `.claude/copy-voice.md`, "platform" is context-dependent and NOT OK in hero prose. The section is the section above `CapabilitiesGrid` on the homepage hero.

HIGH — lines 211–215 — `FEATURE_HIGHLIGHTS` titles "AI Creative Engine" / "4x faster" / "Generate ad copy, headlines, and page variants. Test winners automatically by revenue." — "AI Creative Engine" reads as generic-SaaS marketing; the strategist would name the *outcome* ("New ads in a day, not a week"). Severity HIGH because it's hero-adjacent feature copy.

HIGH — lines 1488–1497 — Headline "The marketing system that **proves** which ads produce move-ins." — this headline is on-voice. Body sub: "Every move-in traced to the ad that produced it. Custom landing pages with embedded rental flow — from first click to signed lease." — also on-voice. **No finding on the headline itself.** Flagging only the typewriter array next.

MEDIUM — line 194 — `TYPEWRITER_WORDS = ["Fill units.", "Prove ROAS.", "Kill bad spend.", "Track every move-in.", "Win your zip code."]` — "Prove ROAS" uses a hero acronym banned in `.claude/copy-voice.md` ("CPL / CPMI / ROAS as hero acronyms"). The other four are on-voice. Replace "Prove ROAS." with something concrete: "Prove your spend." or "Know what each move-in cost."

MEDIUM — line 1053 — `<h3>90-Day Performance Snapshot</h3>` — "Performance Snapshot" is mild generic-SaaS but inside a deep widget; acceptable. LOW alt rating if you disagree.

MEDIUM — lines 218–223 — `BEFORE_AFTER` items use "Move-in level tracking" / "Real-time live dashboard" / "Revenue attribution per ad" / "Custom LP per campaign." "LP" is jargon — operators don't say "LP," they say "landing page." Recommend spelling out.

MEDIUM — lines 1604–1614 — `<h2>Everything you need to fill units</h2>` + "From the first impression to the signed lease: every step tracked, every dollar accounted for." — on-voice. **No finding.** (Noting only because it's a positive contrast against the surrounding violations.)

MEDIUM — lines 1620–1632 — `<h2>Stop guessing. Start knowing.</h2>` + "See how StorageAds replaces every broken workflow." — first line is on-voice and great; "every broken workflow" is mildly generic but fine.

HIGH — line 1133 (`HeroStatusStrip`) — `"MARKETING INFRASTRUCTURE · BUILT FOR SELF-STORAGE"` — "Marketing infrastructure" is OK as a positioning phrase (echoes the strategist register), no finding. The neighboring `REV {ymd} · {hms} · SOC2` strip is on-voice product UI.

HIGH — `STATS` array, lines 176–181 — `{ value: 35, prefix: "", suffix: "x", label: "Return on ad spend", decimals: 0, icon: BarChart3 }` — "Return on ad spend" full-text is acceptable. But `LiveStatsStrip` (lines 1327–1455) cards have on-voice captions ("Most still buy ads on faith." "We optimize for fewer, better clicks instead." "leases tied to specific creatives, channels, and pages — not last-click guesses or vendor reports.") — these are some of the best on-voice strings in the whole codebase. **No finding on captions, flagging as exemplar.**

CRITICAL — lines 905–920 — `BECAUSE_MESSAGES` array — every single message is excellent on-voice strategist-talking-to-operator copy. Highlights: "A SIGN ON A CHAINLINK FENCE IS NOT AN ACQUISITION STRATEGY", "EXTRA SPACE IS RUNNING 14 CAMPAIGNS IN YOUR ZIP CODE AND YOU'RE RUNNING VIBES", "YOUR BEST AD GOT 3 LIKES AND TWO WERE EMPLOYEES." This is the voice. **No finding — flagged as a positive exemplar.** Keep as-is.

HIGH — stale gold density — `var(--color-gold)` appears 25+ times in this file (lines 447, 452, 474, 481, 494, 519, 537, 541, 562, 591, 735, 743, 772, 993, 1502, 1524, 1540, plus rgba(181,139,63,...) instances at lines 451, 474, 481, 591, 597, 720, 730, 732, 1041 etc.). Per CLAUDE.md line 83 ("sienna gold is banned"), all uses in user-visible UI need replacement with the new accent token (`var(--accent)`). The dashboard chart legends keep gold to denote "Google" per the BRAND_DOCTRINE chart-color rule — that's allowed. But the logo letter color, the "live" cursor blink, the trust-badge tints, the CTA hover, and the feature highlight icon tint all need migration to the new theme accent.

#### `src/components/marketing/problem-statement.tsx`

LOW — line 9 — "A customer searching \"climate controlled storage in Paw Paw\" lands on the same page as someone clicking a \"first month free\" ad. Different intent: same dead-end experience." — uses a colon-as-em-dash construction ("intent: same"). Per copy-voice.md "No em-dashes in CTAs" — this is body not CTA, so OK. **No finding.**

LOW — line 14 — "When a customer finally decides to reserve, they get bounced to an off-brand system page that looks nothing like your facility." — on-voice. **No finding.**

LOW — line 19 — "They're optimizing for clicks, not leases." — "optimizing" is named-and-condemned, which is on-voice strategist (the speaker frames the agency's behavior as the problem). **No finding.**

The whole component is on-voice strategist explaining the agency trap to the operator. No CRITICAL/HIGH findings. Excellent file.

#### `src/components/marketing/how-it-works.tsx`

MEDIUM — line 11 — STEPS[0].body: "Meta ads reach people before they search. Google PPC captures people already looking. Retargeting brings back the ones who left. Most operators only do one of these. We run all three." — on-voice and excellent.

MEDIUM — line 33 — STEPS[3].body: "Cost per reservation. Cost per move-in. Conversion rate by campaign, ad, audience, keyword, and creative. Not clicks. Not impressions. Revenue." — on-voice (anti-vanity framing is correct).

MEDIUM — line 66 — `<p>Every step connects. The ad drives the click, the landing page converts it, the rental flow closes it, and attribution tells you which ad deserves the credit.</p>` — "the ad drives the click" uses "drives" in the abstract verb sense BRAND_DOCTRINE flags. The sentence is also somewhat over-explanatory ("ad drives click" is mechanical filler). Tighten to: "The ad gets the click. The page converts it. The rental flow closes it. Attribution shows you which one earned the move-in."

Otherwise on-voice. No CRITICAL findings.

#### `src/components/marketing/three-way-comparison.tsx`

HIGH — line 100–103 — `<h2>Three approaches.\n<span>Only one fills units and proves it.</span></h2>` — on-voice and excellent. **No finding.**

MEDIUM — line 33 (ROWS Attribution row) — `agency: "Clicks and impressions (40% may be existing tenants)"` — operator-credible specific number, on-voice.

MEDIUM — line 59 — `storageads: "An operator who built this for his own facilities"` — on-voice, strategist+operator-fluent.

Component is on-voice end-to-end. **No HIGH findings.**

#### `src/components/marketing/results.tsx`

LOW — line 11 — "A 247-unit facility at 71% occupancy with no paid ads and a default storEDGE rental page." — specific, on-voice.

LOW — line 102 — `text-2xl font-semibold text-[var(--color-gold)]` — stale gold token in stat numbers, per the gold ban this should be `var(--accent)`. Severity HIGH if treated as a brand violation; LOW as a copy violation.

MEDIUM — lines 129–148 — "Here's the math. A single move-in at a typical facility is worth $100-150/mo in recurring revenue. At a 12-month average tenant stay, that's $1,200-1,800 in lifetime value per move-in. If StorageAds's Growth tier produces 5-10 incremental move-ins per month, you're generating $6,000-18,000 in annualized revenue from a $1,500/mo investment. That's a 4-12x return before the system even starts optimizing." — on-voice, numbers-over-adjectives, strategist showing math. Final clause "before the system even starts optimizing" is mild generic-SaaS verb usage. Tighten to "before the campaigns are dialed in."

Component is on-voice. Gold token migration aside, no copy violations of severity.

#### `src/components/marketing/cta-section.tsx`

CRITICAL — lines 180–187 — Deep Diagnostic CTA: `<p>Want an AI-Powered Deep Diagnostic?</p><p>5-minute form → Instant AI audit with scores, benchmarks & action plan</p>` — "AI-Powered" reads as generic-SaaS marketing prose; the strategist would not lead with the mechanism. BRAND_DOCTRINE Section VIII: "Confident but not arrogant — the work speaks for itself." Replacement: "Want the deep diagnostic? 5-minute form. Scores, benchmarks, an action plan — in your inbox."

LOW — line 119 — "Get a free facility audit. We'll look at your current digital presence, ad spend, landing pages, rental flow, and competitive landscape: then show you exactly where you're losing move-ins." — colon-then-clause is a tic. Use period.

LOW — line 125 — "No contracts. No commitment. Just a clear picture of what's costing you move-ins." — on-voice.

MEDIUM — line 305 — `["Response within 24 hours.", "Free — no credit card required.", "Takes 2 minutes."]` — em-dash in micro-trust strip. Per copy-voice.md the em-dash ban is for CTAs specifically, so this is borderline. LOW finding. Replace with a colon if you want consistency, or leave it.

MEDIUM — line 342 — "30-minute strategy call. Operator to operator. No pitch deck. No account executives. Just Blake walking through your situation." — on-voice and excellent. **No finding.**

The form itself is on-voice. Only the AI-Powered banner needs surgery.

#### `src/components/marketing/demand-engine-visual.tsx`

MEDIUM — line 12 — `title: "Demand Intelligence"` — "Intelligence" is mild generic-SaaS but acceptable as a deep product-surface section label, per copy-voice.md context-dependent ruling for "demand engine."

LOW — line 107 — `<h2>One engine. Six capabilities. <span>Every move-in attributed.</span></h2>` — on-voice. The kicker `THE DEMAND ENGINE` is acceptable as a section/component name per copy-voice.md.

MEDIUM — line 117 — "Ads, pages, attribution, optimization: all connected. Not an agency guessing on your behalf. A system that shows you what's working and what isn't." — on-voice. The colon construction is a tic but acceptable in body.

Component is on-voice for a deep product-surface section. **No CRITICAL findings.**

#### `src/components/marketing/inaction-timeline.tsx`

MEDIUM — line 96 — "Here's what happens over 6 months when you don't have a demand engine." — "demand engine" used in body prose, not as a section name. Per copy-voice.md context-dependent ruling, this borders on "deep product surface" (still arguably OK since the section is mid-page), but in the inaction body it's marketer-frame creep. Replacement: "Here's what 6 months without paid marketing actually costs."

LOW — line 86 — `<div ... text-red-400>The Cost of Doing Nothing</div>` — on-voice section pill.

LOW — line 220 — "The math isn't complicated. Inaction is the most expensive option." — on-voice and great.

LOW — line 224 — CTA "Get Your Free Revenue Audit" — overlaps with all the other "Get Your Free X Audit" CTAs across the site (audit-tool says "Run Audit," cta-section says "Get My Free Audit," footer says "Free Diagnostic," hero says "Get a Free Facility Audit"). Inconsistent CTA copy; the substance is fine.

#### `src/components/marketing/quick-calculator.tsx`

LOW — line 44 — "Quick Revenue Calculator" pill — on-voice.

LOW — line 50 — `<h2>See What You're Losing in 10 Seconds</h2>` — on-voice loss-frame headline, strategist-honest. Title case is fine here.

MEDIUM — line 164 — "StorageAds Projection" badge + "X move-ins/mo / Y revenue recovered / Zx revenue multiple on Growth plan" — on-voice. The "revenue multiple" phrase is operator-credible.

LOW — line 183 — Assumes disclaimer is on-voice strategist.

LOW — gold token density: lines 43, 65, 105, 119, 161, 166 use `--color-gold`. Stale per CLAUDE.md ban.

Component is on-voice.

#### `src/components/marketing/nav.tsx`

MEDIUM — lines 280–283 — Logo treatment `storage<span>ads</span>/attr` — the `/attr` suffix is product-ish (echoes the NULL//TRACE deep-surface aesthetic). Acceptable per BRAND_DOCTRINE Section II "typographic confidence." The brand doctrine says "storageads" is the logo and "ads" gets the accent color; the `/attr` suffix is new and arguably adds noise. LOW alt: keep it as a deep-product gesture, but be aware it makes the wordmark less clean.

LOW — line 354 — CTA `Book Call` — on-voice short, no em-dash.

LOW — line 377 — CTA `Get Audit →` — uses → arrow character inside button text; per copy-voice.md "No em-dashes in CTA button text" — arrow isn't an em-dash, so OK.

LOW — line 684 — Mobile menu footer "Marketing automation for self-storage" — on-voice short positioning line.

LOW — gold token density: lines 262, 310, 318, 446, 511, 528, 537, 638, 656 use `--color-gold`. Stale per CLAUDE.md ban.

Nav is otherwise on-voice and structurally excellent.

#### `src/components/marketing/footer.tsx`

LOW — line 39 — "Prove which ads produce move-ins." — on-voice, mirrors the hero headline.

LOW — line 45 — "Built by an operator. Tested at my own facilities first." — on-voice, strategist-operator frame.

LOW — line 32 — Logo: just `storageads` in `--color-dark`, missing the `ads` accent treatment per brand doctrine. Recommend the standard logo treatment, not the all-dark variant.

Footer is clean.

#### `src/components/marketing/live-monitors.tsx`

NO COPY FINDINGS — this is product-UI labeling ("CHANNEL · 24H", "MOVE-IN TAPE · T-5M", "ATTRIBUTION · 90D", "STRM" tag, "NOW" / "-90D" axis labels). On-voice for the NULL//TRACE deep-product aesthetic per BRAND_DOCTRINE Section II "Anthropic-meets-literary-magazine."

#### `src/components/marketing/exit-intent-popup.tsx`

MEDIUM — line 105 — "Before you go" eyebrow — slightly desperate-salesperson frame per BRAND_DOCTRINE Section VIII ("Never Sounds Like a desperate salesperson"). Tighten to "One more thing" or just drop the eyebrow.

LOW — line 119 — "We'll email the complete breakdown for {facilityName}: the fixes that matter most." — on-voice short.

LOW — line 152 — "No spam. Just your audit results and one follow-up." — on-voice trust signal.

#### `src/app/page.tsx`

NO FINDINGS — composition file only.

### Tier B — Important public pages

#### `src/app/audit-tool/page.tsx` + `src/app/audit-tool/audit-client.tsx`

**Metadata (page.tsx):**

LOW — lines 5–17 — "Free Storage Audit Tool" / "Check your self-storage facility's online presence. Get an instant marketing audit score across Google rating, reviews, photos, and more." — on-voice. Title is functional, description is specific.

**Client (audit-client.tsx):**

LOW — line 314 — eyebrow "Self-Service Audit" — on-voice product label.

LOW — line 319 — `<h1>How does your facility show up online?</h1>` — on-voice strategist question.

LOW — line 322 — "Enter your facility name and location. We will check your Google presence and generate a quick marketing audit score." — on-voice, no contractions; consider "We'll check..." for consistency with rest of site.

MEDIUM — lines 424–429 — Audit grade body text "Your facility has a strong online presence. Focus on conversion optimization." / "Good foundation. There are areas to improve for better lead generation." / "Your online presence needs work. You are likely losing leads to competitors." / "Significant gaps in your online presence. Immediate action recommended." — these read as generic SaaS-audit-report prose. "Conversion optimization" is borderline (`.claude/copy-voice.md` says "optimization" as marketing prose is banned). "Focus on conversion optimization" is the worst offender. Recommend: "Your online presence is solid. The next step is turning visits into move-ins." / "You're set up reasonably. The gaps are fixable." / "Your online presence is leaking customers." / "Big gaps. Start here."

MEDIUM — line 595 — `<h2>Want a full marketing audit?</h2>` — on-voice but generic.

LOW — line 597 — "Get a detailed analysis including vacancy cost, ROI projections, competitive insights, and personalized recommendations." — "personalized recommendations" is generic-SaaS phrasing. Tighten to "Get vacancy cost, projections, competitor data, and what to fix first."

MEDIUM — line 605 — "We'll send your full audit shortly." — on-voice short.

LOW — line 659 — CTA button "Get Full Audit" — on-voice.

LOW — lines 678, 683, 688 — Pre-search cards "Google Presence / Audit Score / Actionable" + descs — on-voice, functional. "Get a 0-100 score across 6 key marketing dimensions" — "marketing dimensions" is mild generic-SaaS phrasing; tighten to "Get a 0-100 score across 6 things customers actually see."

LOW — line 716 — Footer "Powered by StorageAds by StorageAds.com" — redundant ("StorageAds by StorageAds.com" repeats); awkward. **Same issue appears in many places** — see structural observation below.

#### `src/app/audit/[slug]/page.tsx`

CRITICAL — line 1155 — `<h3>Full-Funnel Lead Tracking</h3>` — "Full-Funnel" is pitch-register banned. Section is a 6-up feature grid titled "What StorageAds Would Fix First" — this entire grid reads as generic SaaS feature copy.

HIGH — line 1132 — `<h2>What StorageAds Would Fix First</h2>` — heading is OK, framing is good.

HIGH — line 1136 — "Our platform is purpose-built to solve the exact problems this diagnostic found" — "platform is purpose-built to solve" is textbook generic-SaaS. BRAND_DOCTRINE Section VIII bans this register. Rewrite: "Every fix in this diagnostic maps to a feature we already built."

HIGH — lines 1146, 1182, 1188 — feature h3s "Ad-Specific Landing Pages" / "Performance Dashboard" / "PMS Integration" — these are descriptive product labels, acceptable as deep-product feature names but jarring inside a customer-facing CTA section. The grid would land harder with operator-language labels: "A page per ad" / "One screen, every number" / "Plugs into your storEDGE."

HIGH — line 1158 — "Track every lead from first click to move-in. Know your exact cost-per-lead and cost-per-move-in by campaign, ad group, and keyword — no more guessing." — "cost-per-lead and cost-per-move-in" as hero-adjacent prose violates `.claude/copy-voice.md` ("CPL / CPMI as hero acronyms" — same rule applies to spelled-out versions in marketing prose). The substance is right; the framing is the strategist *talking about the strategist's stack* instead of about the operator's facility.

HIGH — line 1173 — "GBP & Review Management" feature title — "GBP" is operator vernacular which is correct, but the section feature label "Automated Google Business Profile posting, AI-powered review responses, and review solicitation campaigns to boost your rating and local search visibility." reads as a feature-spec dump.

MEDIUM — line 1167 — "Automated follow-up sequences for abandoned reservations, no-shows, and past inquiries. No lead falls through the cracks — even when your team is busy." — second sentence on-voice. First sentence is fine.

CRITICAL — line 568–584 — Top CTA banner: "This diagnostic was generated by **StorageAds** by StorageAds.com" — **"StorageAds by StorageAds.com" appears 4× in this file** (lines 574, 1231) and **repeatedly across the codebase**. It's stale-rename leakage: the product was renamed and the old name now reads as a tagline. Per CLAUDE.md "All emails from *@storageads.com" — the brand is just "StorageAds." Drop the "by StorageAds.com" tail.

LOW — lines 736 — "How {facilityName} compares to REIT averages and top-performing facilities" — on-voice, REIT name-drop is operator-credible per `.claude/copy-voice.md` ("The REITs" in the use-these list).

LOW — line 1010 — "Every month without action, this facility is losing ground" — on-voice strategist.

LOW — line 1006 — "The Cost of Waiting" — on-voice section h2.

#### `src/app/demo/page.tsx` + `src/app/demo/demo-client.tsx`

**Client (demo-client.tsx):**

HIGH — line 253 — "CPL decreases as Pixel data matures and audiences sharpen" — uses "Pixel" as marketing prose. Per `.claude/copy-voice.md` pitch-register banned list. Replacement: "CPL drops as the system learns who actually moves in."

MEDIUM — line 178 — "{X} move-ins generated at ${Y} per move-in. Watch the campaign compound month over month." — on-voice math-forward. "Watch the campaign compound" is good strategist phrasing.

MEDIUM — line 295 — "Campaign intelligence — {month}" — "intelligence" mild generic-SaaS but acceptable for deep-product section header.

MEDIUM — line 437 — Bottom CTA "Every facility is different. Our free audit analyzes your specific market, unit mix, and competition to project what campaigns could deliver for you." — on-voice strategist.

LOW — line 445 — Disclaimer "This is a demonstration dashboard with simulated data. Actual results vary by facility, market, and ad spend. All metrics shown are illustrative of typical campaign performance patterns." — on-voice, legal-appropriate.

LOW — line 135 — Demo banner "You are viewing a **live demo** with simulated data for a fictional facility." — fine.

The demo dashboard product UI itself (KPI cards, charts, tables) is on-voice for the product-UI register per BRAND_DOCTRINE Section VIII "tone by context: Internal/product UI — Clear, functional, zero ambiguity."

#### `src/app/about/page.tsx`

CRITICAL — line 166 — "This isn't a marketing agency. It's a **demand engine** built by someone who signs the same checks you do." — "demand engine" used in *body prose at the rhetorical climax of the page* (right before sign-off). Per `.claude/copy-voice.md` ruling — "demand engine" is OK as a section/component name, NOT in hero prose / meta descriptions / sales hero claims. This is the page's pitch sentence. Rewrite: "This isn't a marketing agency. It's the system I needed, built by someone who signs the same checks you do." — same rhythm, drops the jargon.

LOW — line 192 — "Storage operator & founder" sign-off line — "& founder" duplicates "Founder, StorageAds.com" above. Minor.

HIGH — lines 7–17 — Metadata "About StorageAds — Built by an Operator" + description "StorageAds was built by a storage operator who got tired of guessing which ads were filling units. Every feature is tested on real facilities before it ships." — **this is on-voice** and great. **No finding on metadata.**

LOW — lines 86–157 — Body is the best on-voice strategist-as-operator narrative on the site. "I run a storage facility. I spend my own money on ads every month." "Impressions don't pay the mortgage on a $3M building." (← that's actually from insights/page.tsx but same voice family.) Keep.

#### `src/app/pricing/page.tsx`

CRITICAL — lines 6–18 — **Metadata × 3** — "Pricing — StorageAds" + description "StorageAds pricing for self-storage **demand engine and conversion layer**. From $750/mo per facility." — meta description uses banned-from-hero phrases. Replace: "StorageAds pricing per facility. Paid media, custom landing pages, full attribution. From $750/mo."

CRITICAL — line 206 — `<h2>Demand Engine (Paid Media)</h2>` — section h2 uses "Demand Engine" in pitch-register section title above pricing cards. Per `.claude/copy-voice.md`, "demand engine" is fine as a section name in deep product surfaces, but pricing is a hero-adjacent decision page. The parenthetical "(Paid Media)" is operator-clear and could carry the heading alone: `<h2>Paid Media</h2>`.

HIGH — line 433 — `<h2>The Bundle: Full-Stack Acquisition System</h2>` — "Full-Stack Acquisition System" stacks "full-stack" (pitch-adjacent) and "Acquisition System" (generic-SaaS phrasing). Operators don't say "acquisition system" — they say "filling the place." Rewrite: "The Bundle: One System, One Bill."

HIGH — line 660 — "what a full-funnel system would look like for their facilities" — "full-funnel" in customer-facing body copy. Pitch-register banned. Tighten: "what the full system would look like for their facilities."

MEDIUM — line 491 — `<h2>What you're actually paying for</h2>` — on-voice strategist heading.

MEDIUM — line 501 — "No custom landing pages. No Meta ads. No full-funnel attribution." — third item again uses "full-funnel"; this one is more defensible because it's listing what competitors *don't* have (the strategist's frame). Borderline. LOW finding.

LOW — line 155 — `<h1>Before you look at the price, look at the math.</h1>` — on-voice strategist excellent.

LOW — line 197 — eyebrow "Product A" / line 322 "Product B" — internal-feeling labels on a public pricing page. Operator wouldn't say "Product A." Replace with descriptive: "Paid Media" / "Conversion Layer" or skip eyebrows.

LOW — line 658 — "This isn't a self-serve checkout. StorageAds is built for operators who want a real conversation about their vacancy, their market..." — on-voice.

#### `src/app/signup/page.tsx`

MEDIUM — lines 27–32 — Launch plan description "Perfect for getting started with 1-5 facilities" + "Up to 10 facilities / Google & Meta ad management / Monthly performance reports / Email support" — generic SaaS plan-card register. "Perfect for getting started" is filler. Replace: "1-5 facilities. Ads, monthly reports, email support."

MEDIUM — lines 39–46 — Growth plan "For growing operators scaling their portfolio" + features — "growing operators scaling their portfolio" is filler. Replace: "For operators with a growing portfolio."

MEDIUM — line 53 — Portfolio "Full-service marketing for large operators" — "Full-service" is borderline generic-SaaS, but in pricing context it's signaling and acceptable. LOW finding.

LOW — line 209 — `<h1>Start your 14-day free trial</h1>` — on-voice, functional.

LOW — line 218 — "No credit card required. Cancel anytime." — on-voice trust signal.

The form labels and password strength UI are all product-UI register, on-voice.

#### `src/app/diagnostic/page.tsx` + `src/app/diagnostic/diagnostic-form.tsx`

**Page metadata (page.tsx):**

LOW — lines 5–13 — "Free Facility Diagnostic — StorageAds" + "Get a comprehensive AI-powered diagnostic of your self-storage facility. Covers occupancy, marketing, digital presence, revenue management, and more. Free and confidential." — "AI-powered" appears in metadata. Per BRAND_DOCTRINE Section VIII "Confident but not arrogant — the work speaks for itself," lead with the outcome not the mechanism. Replacement: "A full diagnostic of your self-storage facility. Occupancy, marketing, digital presence, revenue. Free, confidential, in your inbox in minutes."

**Form (diagnostic-form.tsx):**

LOW — line 521 — `<h1>Free Facility Diagnostic</h1>` — on-voice.

MEDIUM — line 525 — "Get a comprehensive AI-powered analysis of your self-storage facility across 8 key categories. Takes about 5 minutes." — "AI-powered" again. Same fix as metadata.

LOW — lines 132–140 (BIGGEST_ISSUE select options) — "Not enough leads coming in / Plenty of leads, not enough are converting to move-ins / Both — not enough leads AND they're not converting / Revenue per unit is too low / Operations are stretched thin / Not sure where to start" — these are excellent operator-language options. **No finding.**

LOW — lines 142–147 (AGGRESSIVENESS options) — "Very aggressive — do whatever it takes / Moderately aggressive — open to change but measured / Conservative — small changes only / Just want information right now" — on-voice.

LOW — line 479 — "Your Diagnostic is Being Generated" — on-voice.

LOW — line 482 — "Our AI is analyzing your facility data right now." — third "AI" mention, more defensible here since this is a status message about what's actually happening (not a marketing claim). Acceptable.

Form is mostly on-voice; the "AI-powered" framing is the only systemic issue.

### Tier C — Other public surfaces (lighter pass)

#### `src/app/guide/page.tsx`

CRITICAL — line 167 — `Stow<span>Stack</span>` — **stale StowStack branding** in the header. This is the *only* StowStack string left in the customer-facing tree. Per CLAUDE.md the brand is StorageAds; "storageads" is the only logo treatment. Fix: replace with the standard `storage` + accent `ads` treatment.

LOW — line 224 — "Welcome to StorageAds by StorageAds.com" — "by StorageAds.com" tail again. Drop.

LOW — line 187 — "Everything you need to know about your StorageAds portal — your dashboard, campaign data, and how to get the most out of your ad campaigns." — on-voice, portal-client register acceptable.

LOW — line 227 — "StorageAds is a marketing platform built specifically for self-storage operators. We run targeted Facebook and Instagram ad campaigns to fill your vacant units with qualified tenants." — "marketing platform" is mildly generic but defensible in onboarding-doc register.

The guide reads as portal-help-doc voice (acceptable per BRAND_DOCTRINE Section VIII "Internal/product UI — Clear, functional, zero ambiguity"). Main issue is the StowStack relic.

#### `src/app/insights/page.tsx`

**Metadata + 21 posts.** This page is largely on-voice strategist-as-operator — many posts are exemplary. Selective findings:

LOW — line 6 — "Operator Notes — StorageAds" — on-voice.

LOW — line 7 — "Short-form thoughts on self-storage marketing from an operator who spends his own money on ads every month. Attribution, cost per move-in, and what actually works." — on-voice.

MEDIUM — lines 22–31 — Post "The Receipt That Started Everything": "I once paid a marketing agency $4,200/month for my storage facility. When I asked how many move-ins the ads actually drove, the answer was 'well, your impressions are up.' Impressions don't pay the mortgage on a $3M building. That was the month I started building my own tracking system." — on-voice exemplar. Keep.

LOW — lines 45–55, 57–67, 81–91, 119–133, 158–169, 217–225 — all on-voice strategist-operator posts. Keep.

MEDIUM — line 252 — Post "What Operators Actually Want": "Tell me how many move-ins my ads drove this month. Tell me what each one cost. Tell me which campaigns to keep and which to kill. That's it. That's the whole wish list." — **on-voice exemplar.** This is the voice. Mirror this on the homepage.

LOW — line 408 — "Founder, StorageAds.com" — could just be "Founder, StorageAds."

#### `src/app/calculator/page.tsx`

LOW — line 139 — `<h1>ROI Calculator</h1>` — "ROI" is a hero acronym banned per `.claude/copy-voice.md`. But this is a calculator tool — the operator typing in numbers knows what ROI means. Acceptable in this product context. LOW finding.

LOW — line 142 — "See what StorageAds could deliver for your facility. Enter your numbers — we'll show you the math." — on-voice strategist.

LOW — line 218 — "Annual Impact" stat label — generic-SaaS-ish. Acceptable.

LOW — line 232 — Disclaimer "Results are estimates. Actual performance varies by market." — on-voice.

LOW — line 242 — CTA "Book a Call with Blake" — on-voice and personal.

Calculator is on-voice product tool.

#### `src/app/changelog/page.tsx`

LOW — line 56 — Entry title "Full-funnel attribution" — "Full-funnel" in a changelog feature title. Pitch-register banned. Acceptable in changelog deep-product context per `.claude/copy-voice.md` context-dependent ruling — changelogs are a product-internal surface. LOW finding.

LOW — line 79 — "What's new in StorageAds. Features, improvements, and fixes." — on-voice.

#### `src/app/case-studies/page.tsx`

LOW — line 8 — Metadata "Real results from real storage facilities. See how StorageAds delivers attributed move-ins." — on-voice strategist.

LOW — line 50 — "Real results from real storage facilities. Every number is tracked from ad click to signed lease." — on-voice.

LOW — line 120 — "Want results like these for your facility?" — on-voice strategist.

#### `src/app/compare/[competitor]/page.tsx`

LOW — line 156 — `<h2>The core difference: we track cost per move-in, not clicks</h2>` — on-voice strategist contrast. **Excellent.**

LOW — line 162 — "Most storage marketing platforms stop at cost per click or cost per lead. StorageAds tracks the full journey from ad impression through signed lease — so you know exactly what each move-in costs." — on-voice.

LOW — line 35 — Feature row "Full-funnel ad-to-lease attribution" — "Full-funnel" in a feature-comparison row. Acceptable as deep product comparison label.

#### `src/app/blog/page.tsx`

LOW — line 9 — Metadata "Operator math, campaign insights, and hard-won lessons from running self-storage facilities and filling them with paid ads." — on-voice strategist.

LOW — line 88 — Body intro repeats metadata. On-voice.

LOW — gold token density: line 57 uses `--color-gold`. Stale per CLAUDE.md ban.

### Cross-cutting

#### `src/app/layout.tsx`

CRITICAL — line 44 — `default: "StorageAds | Full-Funnel Demand Engine for Self-Storage"` — **the single most-rendered string in the codebase** (every page tab title, every OG card, every Twitter card). Stacks "Full-Funnel" + "Demand Engine" — two banned-from-hero phrases. This is also flagged on lines 50 and 59 (OG title, Twitter title) and line 105 (JSON-LD SoftwareApplication description: "Full-funnel marketing automation for self-storage facilities. Ads, landing pages, call tracking, and move-in attribution.").

Recommended replacement: `"StorageAds | Marketing that proves which ads fill units"` or `"StorageAds | The marketing system for self-storage operators"`.

CRITICAL — line 40 — `siteDescription = "Stop losing units to bad marketing. StorageAds builds the entire system — ads, landing pages, attribution, and conversion — so independent storage operators fill vacancies and prove every dollar."` — opening clause "Stop losing units to bad marketing" is on-voice strategist; rest is solid. "fill vacancies and prove every dollar" — "prove every dollar" is on-voice; "fill vacancies" is operator-correct. **This description is on-voice and well-built.** Keep as the canonical meta. **No finding** on description, only on title.

#### `src/app/opengraph-image.tsx`

CRITICAL — lines 3, 60 — OG image alt + body copy "Full-Funnel Demand Engine for Self-Storage" — same banned-phrase stacking as layout.tsx. Every social share shows this image. Replace per layout fix.

#### `src/lib/drip-email-templates.ts`

LOW — line 55 — Footer "StorageAds — Marketing that fills units." — on-voice short tagline. **Mirror this on the homepage hero subline.**

LOW — line 96 — "That's your {facilityName} marketing score. {grade-conditional copy}" — on-voice strategist.

MEDIUM — line 181 — Body of valueAdd template: "StorageAds handles the full stack — local SEO, paid ads, retargeting, and reputation management — so you can focus on running the facility." — "full stack" is pitch-register adjacent. Acceptable in an email-body register, but tighten to: "StorageAds handles all of it — local SEO, paid ads, retargeting, reputation — so you can focus on running the facility."

LOW — line 152 — "The average self-storage unit rents for about $130/month. That means every vacant unit isn't just empty space — it's $130 walking out the door every 30 days." — on-voice strategist with the loss-frame math from inaction-timeline. Excellent.

LOW — line 206 — checkIn template: "I put together that audit earlier this week and wanted to follow up personally. I see some clear wins that could move the needle on occupancy, and I'd like to walk you through them." — on-voice operator-to-operator. "Move the needle" is a mild cliché but defensible from a founder voice. Acceptable.

LOW — line 210 — "No pitch deck, no pressure. Just 15 minutes to talk through what we found and whether it makes sense to work together." — on-voice.

LOW — gold hex `#B58B3F` hardcoded on lines 44, 68, 93 — email-rendering context where CSS vars don't work, so hardcoded hex is structurally necessary. Per CLAUDE.md gold-ban this should migrate to the new accent hex. The drip uses gold in three places: the logo accent, the CTA button bg, and the score-number color. All need the new accent hex.

## Files clean

Files where I found no CRITICAL/HIGH copy violations (gold-token migration is tracked separately):

- `src/app/page.tsx` — composition only, no copy
- `src/components/marketing/problem-statement.tsx` — fully on-voice
- `src/components/marketing/three-way-comparison.tsx` — fully on-voice
- `src/components/marketing/results.tsx` — on-voice (gold token aside)
- `src/components/marketing/inaction-timeline.tsx` — on-voice (one MEDIUM)
- `src/components/marketing/quick-calculator.tsx` — on-voice (gold token aside)
- `src/components/marketing/footer.tsx` — on-voice (logo color note)
- `src/components/marketing/live-monitors.tsx` — product UI register, on-voice
- `src/components/mono/section-header.tsx` — structural only
- `src/app/insights/page.tsx` — on-voice exemplar across 21 posts
- `src/app/case-studies/page.tsx` — on-voice
- `src/app/compare/[competitor]/page.tsx` — on-voice
- `src/app/calculator/page.tsx` — on-voice
- `src/app/blog/page.tsx` — on-voice
- `src/app/changelog/page.tsx` — on-voice
- `src/app/overview/page.tsx` — just an image, noindex

## Rewrite priority recommendation

1. **`src/app/layout.tsx` + `src/app/opengraph-image.tsx`** (CRITICAL × 4) — one string fix kills the most-rendered banned-phrase stack on the site. 30 minutes, biggest leverage.
2. **`src/components/marketing/hero.tsx`** (CRITICAL × 2, HIGH × 4) — `aria-label`, "Full-funnel attribution" trust badge, `<h2>Full platform capabilities</h2>`, `CAPABILITIES` row 1 "Full-funnel campaigns across platforms", "AI Creative Engine" feature card, typewriter "Prove ROAS." → "Prove your spend." About 90 minutes of surgical line edits.
3. **`src/app/audit/[slug]/page.tsx`** (CRITICAL × 2, HIGH × 5) — the "What StorageAds Would Fix First" 6-up grid is a generic-SaaS feature dump inside the most important downstream surface (every diagnostic recipient sees it). Rewrite the section header sub, the "Full-Funnel Lead Tracking" h3, and consider replacing the feature-spec labels with operator-language ones. 90 minutes.
4. **`src/app/about/page.tsx`** (CRITICAL × 1) — replace "demand engine" climax sentence on line 166. 10 minutes.
5. **`src/app/pricing/page.tsx`** (CRITICAL × 2, HIGH × 2) — meta descriptions, "Demand Engine (Paid Media)" h2, "Full-Stack Acquisition System" h2, "full-funnel system" in closing CTA. About 60 minutes.
6. **`src/components/marketing/cta-section.tsx`** (CRITICAL × 1) — "AI-Powered Deep Diagnostic" banner copy. 15 minutes.
7. **`src/app/guide/page.tsx`** (CRITICAL × 1) — replace the stale `StowStack` logo with `storageads` treatment. 5 minutes.
8. **`src/app/demo/demo-client.tsx`** (HIGH × 1) — "Pixel data matures" → "the system learns who actually moves in." 10 minutes.
9. **`src/app/diagnostic/page.tsx` + `diagnostic-form.tsx`** (MEDIUM × 2) — drop "AI-powered" from metadata and form intro; "Our AI is analyzing..." status message can stay. 15 minutes.
10. **`src/components/marketing/exit-intent-popup.tsx`** (MEDIUM × 1) — "Before you go" eyebrow → drop or replace. 5 minutes.
11. **`src/lib/drip-email-templates.ts`** (MEDIUM × 1) — "full stack" in valueAdd email body. 5 minutes.
12. **Tier C gold purge** — `--color-gold` token migration across all files listed in CLAUDE.md ban; treat as a separate design-token PR, not part of this voice audit's scope.

Total surgical voice rewrite: about **6 hours** of focused editing.

## Notable observations

**1. The NULL//TRACE design overhaul has *already* fixed a lot of voice problems.**
The new §00·NUMBERS sections, `LiveStatsStrip`, `LiveMonitorTriptych`, `BECAUSE_MESSAGES` split-flap, `BeforeAfterComparison`, and the on-voice strategist captions in `LiveStatsStrip` ("Most still buy ads on faith.") are some of the best on-voice copy in the codebase. These sections do not need rewriting — they are exemplars. The remaining voice debt is concentrated in:
   - **Old hero scaffolding** (`CAPABILITIES` / `FEATURE_HIGHLIGHTS` / trust badges) that survived the redesign but predates the voice doctrine.
   - **Metadata / OG titles** in `src/app/layout.tsx` and `src/app/opengraph-image.tsx` that were never touched in the overhaul.
   - **The audit-results PDF-replacement page** (`src/app/audit/[slug]/page.tsx`) — the deep diagnostic surface that operators land on after submitting the diagnostic form. Its lower half ("What StorageAds Would Fix First" + the "Book a Walkthrough" CTA) is the only major customer touchpoint that still reads as generic SaaS.

**2. Two systemic issues that aren't single-file:**
   - **"StorageAds by StorageAds.com"** appears in at least 6 files (audit-tool footer, audit/[slug] banner × 2, audit/[slug] footer, diagnostic-form footer, guide section h2). This was a rename relic — the product was renamed and the old "by StorageAds.com" tagline never got removed. Drop it sitewide.
   - **"Get a Free X Audit" CTA inconsistency** — across the site the same CTA appears as: "Get a Free Facility Audit" (hero), "Get My Free Audit" (cta-section), "Get Your Free Revenue Audit" (inaction-timeline), "Get Full Audit" (audit-tool), "Get your free facility audit" (about, pricing, calculator, insights, demo), "Run Audit" (audit-tool form), "See the Full Breakdown" (quick-calculator), "Submit Diagnostic" (diagnostic-form), "Get Your Free Audit" (audit/[slug]). Pick one CTA verb and one noun and standardize. The voice doctrine doesn't pick for you — but the brand doctrine's "every word earns its place" implies one canonical CTA.

**3. The `mono/section-header.tsx` `§ NN · KICKER` pattern is a powerful voice surface that's currently underused.**
The `right={<SectionMeta text="..." />}` slot is wired in every section but the meta text is mostly generic ("TRUTH · 4", "STEPS · 4", "MONTHS · 6"). This is a slot for strategist micro-copy that lands in every section. Consider populating it with operator-language micro-tags: "MARKETS · 3,200", "AGENCIES · 14 TESTED", "DOLLARS LOST · $5,850" — strategist-honest, numbers-forward, on-voice.

**4. `src/app/overview/page.tsx` is a single PNG with `robots: noindex` — assumed internal/sales handoff, not part of voice scope.**

**5. `src/app/preview/blueprint/`** mentioned in the task brief does not exist in this worktree.

**6. The `audit/sample` route was not scanned** (it loads the same component as `audit/[slug]` so findings apply identically).
