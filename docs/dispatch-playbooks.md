# StorageAds Dispatch Playbooks

Pre-written, self-contained tasks you can fire at this machine from your phone (Claude Dispatch) or run on a clock (the `/schedule` routine layer, see below). Each is scoped so a cold session, with no memory of any prior conversation, can run it reliably.

**What this is, bigger picture.** This is the internal, build-the-company version of the Operator OS philosophy in [operator-os-vision.md](operator-os-vision.md): automate the repeatable work, keep a human in the loop on anything risky, never let raw output ship unchecked. Operator OS automates the front office of a storage facility. This automates the front office of *building StorageAds*: the dev hygiene, the content pipeline, the market intel, and the daily read on where the build stands. Fired from your phone when a thought hits you on a facility walk, or running on a schedule while you sleep.

**How to fire one:** from your phone, send Dispatch a short message like:

> Run StorageAds dispatch playbook 1

> Run StorageAds dispatch PB-3, topic: the REIT pricing squeeze

The session opens this file, reads that playbook, and executes it. Keep the phone message short. The detail lives here.

**Freeform dispatch.** You do not have to name a playbook. Send a plain instruction ("the audit page headline is weak, fix it" or "what did Angelo ship today") and the session maps it to the closest playbook, or improvises within the Global Guardrails below if none fits. The playbooks are the well-worn paths; the guardrails are the fence around the whole yard.

---

## Global guardrails (apply to every playbook)

**What you have, cold:** the repo at `/Users/blake/Documents/stowstack-next`, a shell, web search, and `git` / `gh` (Blake's auth). Assume cwd is the repo root.

**What you do NOT have:** direct production database access, or third-party API keys for writes or paid calls (Stripe, Resend, Twilio, Meta/Google/TikTok, FAL, Runway). Never trigger those services unattended. **One narrow exception:** on a local run you may read `ADMIN_SECRET` from `.env.local` for the single purpose of calling the read-only `/api/admin-founder-digest` endpoint (PB-6). Never use a secret to write prod data or to fake a number.

**Verify gate:** the cold-safe signal is

```bash
npm run typecheck && npm test
```

Both run without a DB or env. Do NOT rely on `npm run build` as a pass/fail gate: it runs `prisma generate && next build` and can fail for missing-env reasons that have nothing to do with the code. Only run `build` if a playbook explicitly says to.

**Deploy safety (the important one):** `main` auto-deploys to production on Vercel. There is no staging. So when you are running unattended:
- Anything that touches **shipping code or live marketing copy** goes to a **new branch + a PR**. Never push code to `main`. (This is the deliberate exception to Blake's usual commit-straight-to-main habit, because he is away and cannot catch a bad deploy.)
- **Content drafts** (blog markdown written with `draft: true`) and **docs/** files are safe to commit straight to `main`, because they do not ship anything live.

**Copy rules (any customer-facing text):** read `.claude/copy-voice.md` first. Operator-to-operator voice. **Never use em dashes.** Never use italics (Manrope has no italic glyphs). Never use sienna gold or `--color-gold*` tokens. Never invent a market statistic: pull only from `.claude/market-data-2026.md` or cite a real source URL.

**Always end by reporting:** what you did, the verify output (paste it), the branch/PR URL or file path, and anything you intentionally skipped or punted on. No silent truncation.

---

## PB-1: Build-break hunt and fix

**Use when:** you want to know if `main` is green, or you suspect a recent commit broke it.

1. `git fetch && git checkout main && git pull`.
2. If `node_modules` looks stale or install errors appear, run `npm install`.
3. Run `npm run typecheck && npm test`.
4. **If both pass:** report "main is green," paste the output, and stop. Make no changes.
5. **If either fails:** read the error, find the failing file(s), and make the **minimal** fix to get back to green. No refactors, no new features, no "while I'm here" changes.
6. Re-run `npm run typecheck && npm test` until green.
7. Branch `fix/dispatch-build-<short-desc>`, commit, push, and `gh pr create` with a title and body explaining the break and the fix. Do **not** merge.
8. Report the PR URL plus the before/after error.

**Guardrail:** if the fix is non-obvious or needs a product decision, do not guess. Stop and report your diagnosis so Blake can decide.

---

## PB-2: Weekly dependency and security sweep

**Use when:** routine hygiene, or before a release.

1. `git checkout main && git pull`.
2. Run `npm audit` and `npm outdated`.
3. Summarize: critical/high vulnerabilities, and which updates are patch/minor (safe) vs major (breaking).
4. For low-risk **patch/minor** bumps only: apply them, run `npm run typecheck && npm test`, and if green open a PR `chore/dispatch-dep-bump`.
5. Report: the vulnerability summary, what you bumped, the PR URL, and what you left alone (majors) and why.

**Guardrails:** never run `npm audit fix --force`. Never bump major versions unattended. Do not touch the ad-platform or video/image generation integrations (Meta/Google/TikTok/FAL/Runway) without flagging them for Angelo.

---

## PB-3: Blog draft from market data

**Use when:** you want a new article queued for review. The blog is not live yet, so this is zero-risk.

1. `git checkout main && git pull`.
2. Read `.claude/copy-voice.md` (voice) and `.claude/market-data-2026.md` (stats). Read one or two existing posts in `content/blog/` to match structure.
3. Pick a pillar from the four defined in `src/lib/blog.ts`: `operator-math`, `whats-working`, `operators-edge`, `industry-takes`. Use the topic from the phone message if one was given; otherwise pick an unused angle from the market-data file.
4. Write `content/blog/<slug>.md`. Front-matter must match the schema parsed by `src/lib/blog.ts`:
   ```yaml
   ---
   title: "Quoted title"
   slug: same-as-filename-without-md
   date: <today, YYYY-MM-DD>
   pillar: operator-math
   description: "Quoted one-line description"
   author: "Blake"
   tags: [tag-one, tag-two]
   featured: false
   draft: true
   heroAlt: "Short alt text"
   ---
   ```
   Note: the parser splits `tags` on commas, so no commas inside a single tag. Quote any title/description that contains a comma.
5. Write in Blake's first-person operator voice. **No em dashes. No invented stats** (market-data file or cited source only).
6. Commit straight to `main`. `draft: true` keeps it unpublished until Blake flips it.
7. Report: file path, title, pillar, word count, and the source for every statistic used.

**Guardrail:** `draft: true` is mandatory.

---

## PB-4: Marketing copy fix on a named page

**Use when:** "the copy on [page] is weak or off-brand."

1. `git checkout main && git pull`.
2. Read `.claude/copy-voice.md`. Locate the target under `src/app/**/page.tsx` or `src/components/marketing/**`.
3. Rewrite **only the copy strings**: operator voice, no em dashes, no italics, no sienna-gold tokens. Do not change layout, structure, or logic.
4. Run `npm run typecheck` to catch any broken JSX or strings.
5. Branch `copy/dispatch-<page>`, commit, push, open a PR. Do **not** merge (the live site auto-deploys).
6. Report the PR URL and a before/after of the key strings.

**Guardrail:** copy only, never structural. PR, never `main`. (A richer rewrite can invoke the `operator-copy` skill if available.)

---

## PB-5: Competitor or market scan memo

**Use when:** you want intel on a competitor or a local market.

1. Take the target from the phone message (a competitor name, or a city/market). If none was given, scan the broader self-storage market using the market-data file plus web research.
2. Web-research pricing, occupancy signals, positioning, and recent news. **Cite every source URL.**
3. Cross-reference against `.claude/market-data-2026.md` so the memo stays consistent with our own numbers.
4. Write a dated memo to `docs/market-scans/<YYYY-MM-DD>-<target>.md` (create the folder if needed): a short summary, findings with sources, and two or three "so what for StorageAds" implications.
5. Commit straight to `main` (docs are safe).
6. Report the file path and the headline findings.

**Guardrail:** cite sources. Never present an unsourced number as fact. This is internal intel, not customer-facing copy.

---

## PB-6: Founder morning briefing

**Use when:** you want a fast read on where the build stands, fired on a clock or on demand. This is *your* briefing as the founder. It is not the customer-facing operator digest in [operator-digest-templates.md](operator-digest-templates.md) (that is a product feature StorageAds sends to its customers about their facilities). This one is about building and running StorageAds itself.

**Tone:** same rules as the digest doc. Plain language, contractions, concrete numbers, short sentences, no marketing language, no em dashes.

1. `git checkout main && git pull`.
2. **Build health:** `npm run typecheck && npm test`, plus `gh run list -L 5` for recent CI. Note pass/fail and any failing files.
3. **Shipped:** `git log --since="36 hours ago" --oneline`, summarized in plain English (who shipped what).
4. **Needs you:** `gh pr list`. Flag any dispatch-created PRs (branches `fix/dispatch-*`, `copy/dispatch-*`, `chore/dispatch-*`) awaiting review.
5. **Pipeline:** count `content/blog/*.md` with `draft: true` and list their titles (drafts waiting for you to publish).
6. **Intel:** list any `docs/market-scans/` memos added in the last 7 days.
7. **Industry pulse:** one web search on recent self-storage industry news. Cross-reference `.claude/market-data-2026.md` so nothing contradicts our own numbers. Two or three bullets, each with a source.
8. **Business funnel:** fetch the read-only digest. Read `ADMIN_SECRET` from `.env.local` (or `.env`), then `curl -s -H "X-Admin-Key: $ADMIN_SECRET" https://storageads.com/api/admin-founder-digest`. The JSON returns audit-tool leads (24h and 7d), conversions (7d), and signed clients (24h and 7d). Put those in the Funnel line. If the key is missing or the call fails, elide the Funnel line and say so. Never fabricate a number. (Revenue and portfolio occupancy are not in this endpoint yet.)
9. Assemble the briefing below and report it as your final message (this pushes to Blake's phone). Also write it to `docs/founder-briefings/<YYYY-MM-DD>.md` (create the folder if needed) and commit to `main` (docs are safe).

```
StorageAds, {{day}} {{date}}

Build:     {{green or red, one line}}
Funnel:    {{new audit leads 24h/7d, conversions 7d, signed clients 7d}}
Shipped:   {{1-3 lines on what landed since yesterday}}
Needs you: {{open PRs awaiting review, dispatch PRs flagged; or "nothing"}}
Pipeline:  {{N blog drafts waiting; titles}}
Intel:     {{new scan memos this week; or elide}}
Industry:  {{two or three sourced bullets}}
```

**Guardrail:** report only, never fix code here (that is PB-1, a deliberate action). Never fabricate a metric. Keep it phone-readable.

---

## Scheduled routines (the clock side)

The same playbooks run two ways: fired from your phone, or on a schedule via `/schedule`. A scheduled run is just a cold session triggered by the clock instead of a text, so it reads this same file and obeys the same Global Guardrails. Current set:

| Routine | Playbook | Schedule | Output |
|---|---|---|---|
| Founder briefing | PB-6 | Daily, 7:00am | Briefing pushed to your phone, archived to `docs/founder-briefings/` |
| Blog draft | PB-3 | Mondays, 8:00am | New `draft: true` post in `content/blog/` for review |
| Market scan | PB-5 | Fridays, 8:00am *(proposed: name your competitors first)* | Dated memo in `docs/market-scans/` |

Routines run while the Claude app is open. If it is closed when one is due, it runs on next launch, so the daily briefing effectively greets you when you start your day. To change a time, pause one, or add another, say so or use `/schedule`.

---

*Add or revise playbooks as the workflow settles. Keep each one self-contained: a cold session is the test of whether a playbook is written well enough.*
