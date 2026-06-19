# StorageAds Dispatch Playbooks

Pre-written, self-contained tasks you can fire at this machine from your phone (Claude Dispatch) without being at the keyboard. Each playbook is scoped so a cold session, with no memory of any prior conversation, can run it reliably.

**How to fire one:** from your phone, send Dispatch a short message like:

> Run StorageAds dispatch playbook 1

> Run StorageAds dispatch PB-3, topic: the REIT pricing squeeze and what it means for independents

The session opens this file, reads that playbook, and executes it. Keep the phone message short. The detail lives here.

---

## Global guardrails (apply to every playbook)

**What you have, cold:** the repo at `/Users/blake/Documents/stowstack-next`, a shell, web search, and `git` / `gh` (Blake's auth). Assume cwd is the repo root.

**What you do NOT have:** the production database, env secrets, or live API keys (Stripe, Resend, Twilio, Meta/Google/TikTok, FAL, Runway). Never attempt anything that needs live data or those services. If a task seems to require them, stop and report that instead of faking it.

**Verify gate:** the cold-safe signal is

```bash
npm run typecheck && npm run test
```

Both run without a DB or env. Do NOT rely on `npm run build` as a pass/fail gate: it runs `prisma generate && next build` and can fail for missing-env reasons that have nothing to do with the code. Only run `build` if a playbook explicitly says to.

**Deploy safety (the important one):** `main` auto-deploys to production on Vercel. There is no staging. So when you are running unattended:
- Anything that touches **shipping code or live marketing copy** goes to a **new branch + a PR**. Never push code to `main`. (This is the deliberate exception to Blake's usual commit-straight-to-main habit, because he is away and cannot catch a bad deploy.)
- **Content drafts** (blog markdown written with `draft: true`) and **docs/** files are safe to commit straight to `main`, because they do not ship anything live.

**Copy rules (any customer-facing text):** read `.claude/copy-voice.md` first. Operator-to-operator voice. **Never use em dashes.** Never use italics (Manrope has no italic glyphs). Never use sienna gold or `--color-gold*` tokens. Never invent a market statistic: pull only from `.claude/market-data-2026.md` or cite a real source URL.

**Always end by reporting:** what you did, the verify output (paste it), the branch/PR URL or file path, and anything you intentionally skipped or punted on. No silent truncation.

---

## PB-1 — Build-break hunt and fix

**Use when:** you want to know if `main` is green, or you suspect a recent commit broke it.

1. `git fetch && git checkout main && git pull`.
2. If `node_modules` looks stale or install errors appear, run `npm install`.
3. Run `npm run typecheck && npm run test`.
4. **If both pass:** report "main is green," paste the output, and stop. Make no changes.
5. **If either fails:** read the error, find the failing file(s), and make the **minimal** fix to get back to green. No refactors, no new features, no "while I'm here" changes.
6. Re-run `npm run typecheck && npm run test` until green.
7. Branch `fix/dispatch-build-<short-desc>`, commit, push, and `gh pr create` with a title and body explaining the break and the fix. Do **not** merge.
8. Report the PR URL plus the before/after error.

**Guardrail:** if the fix is non-obvious or needs a product decision, do not guess. Stop and report your diagnosis so Blake can decide.

---

## PB-2 — Weekly dependency and security sweep

**Use when:** routine hygiene, or before a release.

1. `git checkout main && git pull`.
2. Run `npm audit` and `npm outdated`.
3. Summarize: critical/high vulnerabilities, and which updates are patch/minor (safe) vs major (breaking).
4. For low-risk **patch/minor** bumps only: apply them, run `npm run typecheck && npm run test`, and if green open a PR `chore/dispatch-dep-bump`.
5. Report: the vulnerability summary, what you bumped, the PR URL, and what you left alone (majors) and why.

**Guardrails:** never run `npm audit fix --force`. Never bump major versions unattended. Do not touch the ad-platform or video/image generation integrations (Meta/Google/TikTok/FAL/Runway) without flagging them for Angelo.

---

## PB-3 — Blog draft from market data

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

## PB-4 — Marketing copy fix on a named page

**Use when:** "the copy on [page] is weak or off-brand."

1. `git checkout main && git pull`.
2. Read `.claude/copy-voice.md`. Locate the target under `src/app/**/page.tsx` or `src/components/marketing/**`.
3. Rewrite **only the copy strings**: operator voice, no em dashes, no italics, no sienna-gold tokens. Do not change layout, structure, or logic.
4. Run `npm run typecheck` to catch any broken JSX or strings.
5. Branch `copy/dispatch-<page>`, commit, push, open a PR. Do **not** merge (the live site auto-deploys).
6. Report the PR URL and a before/after of the key strings.

**Guardrail:** copy only, never structural. PR, never `main`. (A richer rewrite can invoke the `operator-copy` skill if available.)

---

## PB-5 — Competitor or market scan memo

**Use when:** you want intel on a competitor or a local market.

1. Take the target from the phone message (a competitor name, or a city/market). If none was given, scan the broader self-storage market using the market-data file plus web research.
2. Web-research pricing, occupancy signals, positioning, and recent news. **Cite every source URL.**
3. Cross-reference against `.claude/market-data-2026.md` so the memo stays consistent with our own numbers.
4. Write a dated memo to `docs/market-scans/<YYYY-MM-DD>-<target>.md` (create the folder if needed): a short summary, findings with sources, and two or three "so what for StorageAds" implications.
5. Commit straight to `main` (docs are safe).
6. Report the file path and the headline findings.

**Guardrail:** cite sources. Never present an unsourced number as fact. This is internal intel, not customer-facing copy.

---

*Add or revise playbooks as the workflow settles. Keep each one self-contained: a cold session is the test of whether a playbook is written well enough.*
