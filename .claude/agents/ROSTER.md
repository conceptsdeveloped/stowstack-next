# 🏢 The StorageAds Agent Roster

A characterized roster of the 16 project subagents, using popular biblical names chosen so the name
is the mnemonic for the job. Names are flavor — real behavior lives in each agent's `.md` file.
**Invoke by the `id` (the slug) or just describe the work and let routing pick.** You can also summon
by name ("have Paul write a cold email" = `cold-outreach`).

```
                            ┌─────────────────────────────┐
                            │   SOLOMON                   │
                            │   Chief Growth Officer       │
                            │   (growth-strategist)        │
                            │   the wisdom to decide        │
                            │   what to work on & route it  │
                            └───────────────┬─────────────┘
                                            │ routes the work
        ┌───────────────────┬──────────────┼──────────────┬───────────────────┐
        │                   │              │              │                   │
  ┌─────▼─────┐       ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐       ┌─────▼─────┐
  │  DEMAND   │       │   SELL/   │  │  LAUNCH   │  │ STRATEGY  │       │   BUILD   │
  │ & FUNNEL  │       │ ACTIVATE  │  │  QUALITY  │  │  & INTEL  │       │  (eng)    │
  └─────┬─────┘       └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       └─────┬─────┘
        │                   │              │              │                   │
  Paul, Matthew,      John, Ruth,     Daniel, Thomas  Joshua, Esther    Peter, Adam,
  Andrew, Noah        Abraham                                           Moses, Samuel
```

---

## 🧭 STRATEGY & INTEL

### SOLOMON · `growth-strategist` — Chief Growth Officer
- **Why the name:** the wise king who makes the call. He decides what matters and divides the work.
- **Does:** GTM strategy, funnel math, launch sequencing, pricing/positioning. The orchestrator — routes work to everyone below.
- **Summon for:** "How do we get to launch / first 10 customers / what do we work on next."

### JOSHUA · `competitive-intel` — Head of Competitive Intelligence
- **Why the name:** he sent the spies to scout the land before the campaign.
- **Does:** competitor + market mapping, the REIT threat, positioning angles. Read-only.
- **Summon for:** "Who do we compete with / how do we position against X / research this market."

### ESTHER · `investor-relations` — Head of Investor Relations
- **Why the name:** she won over the king — i.e. pitched the person holding the power and the money.
- **Does:** pitch narrative, decks, data rooms, market sizing. Uses the pitch register (`pitch-voice.md`).
- **Summon for:** "Write the pitch / deck / one-pager / market sizing for an investor or acquirer."

---

## 📣 DEMAND & FUNNEL

### PAUL · `cold-outreach` — Outbound Lead
- **Why the name:** the missionary who went city to city, writing persuasive letters. That's outbound.
- **Does:** cold email + DM sequences to operators and management cos. Operator voice, CAN-SPAM-aware.
- **Summon for:** "Write a cold email / build an outreach sequence / find facilities to target."

### MATTHEW · `seo-content-engine` — Content & SEO
- **Why the name:** he wrote a gospel — long-form content that spreads and lasts.
- **Does:** blog posts, content calendars, organic SEO, internal linking. Works in `/content/blog/`.
- **Summon for:** "Write a blog post / plan our content / what should we rank for."

### ANDREW · `audit-funnel-optimizer` — Funnel & Conversion
- **Why the name:** the one who kept bringing people in — pure conversion.
- **Does:** optimizes the free-audit wedge: land → start → complete → book the call.
- **Summon for:** "Improve the audit tool / lift audit-to-call conversion."

### NOAH · `landing-page-builder` — Landing Pages
- **Why the name:** the builder. Give him a spec, he builds the thing that floats.
- **Does:** campaign landing pages from the `/lp/[slug]` section-config system. Brand + conversion.
- **Summon for:** "Spin up an LP for this campaign / segment / ad."

---

## 🤝 SELL · ACTIVATE · EXPAND

### JOHN · `sales-enablement` — Sales Coach
- **Why the name:** the persuader who speaks plainly and closes.
- **Does:** demo prep, discovery, objection handling, pricing conversations, follow-up.
- **Summon for:** "Prep me for this call / handle the price objection / write the follow-up."

### RUTH · `lifecycle-activation` — Lifecycle & Activation
- **Why the name:** "where you go, I will go" — loyalty and devotion. That's retention.
- **Does:** onboarding wizard, drip/nurture sequences, retention, land-and-expand.
- **Summon for:** "Improve onboarding / build a nurture sequence / reduce churn."

### ABRAHAM · `partnerships-channel` — Channel & Partnerships
- **Why the name:** the father of nations — one relationship multiplied into many.
- **Does:** management-co white-label, reseller margins, referral programs, the partner dashboard.
- **Summon for:** "White-label for management companies / set up a reseller or referral program."

---

## 🚦 LAUNCH QUALITY

### DANIEL · `launch-readiness` — Launch Gatekeeper
- **Why the name:** tested in the lions' den — careful and proven before the big moment.
- **Does:** end-to-end pre-launch QA, go/no-go punch lists, the CSRF-gate landmine hunt. Read/test-heavy.
- **Summon for:** "Are we ready to launch / walk the funnel / what's broken before go-live."

### THOMAS · `market-data-checker` — Fact Checker
- **Why the name:** doubting Thomas — won't believe a stat until it's proven.
- **Does:** validates every market claim against `market-data-2026.md`; flags product overclaims. Read-only.
- **Summon for:** (mostly automatic) "Is this stat real / fact-check this copy."

---

## 🛠️ BUILD (Engineering)

### PETER · `api-route-auditor` — Backend / API
- **Why the name:** he holds the keys — access, auth, the gate. First question on any 403: "is it in `isCsrfExempt()`?"
- **Does:** `src/app/api/` routes, the four auth systems, the CSRF gate footgun.
- **Summon for:** "Add an API route / this endpoint 403s in prod / audit auth on /api/…"

### ADAM · `schema-guardian` — Data / Database
- **Why the name:** he named every living thing — the original data model.
- **Does:** `prisma/schema.prisma`, migrations, prod-safety (no staging, no `db push` without approval).
- **Summon for:** "Change the schema / add a model / plan a migration."

### MOSES · `design-system-cop` — Design System
- **Why the name:** he came down with the commandments. Thou shalt not use sienna gold.
- **Does:** light-only palette, Manrope, brand tokens, the `urbit-landing !important` bleed.
- **Summon for:** "Review this component's styling / is this off-brand."

### SAMUEL · `admin-ia-builder` — Admin Architect
- **Why the name:** he set up the new order — anointed the structure that replaced the old one.
- **Does:** the active admin IA redesign — one sidebar + facility switcher + ⌘K palette.
- **Summon for:** "Admin nav / facility switcher / command palette work."

---

## Quick reference — name → id

| Name | id | Lane |
|---|---|---|
| Solomon | `growth-strategist` | GTM orchestrator |
| Joshua | `competitive-intel` | competitive intel |
| Esther | `investor-relations` | fundraising / pitch |
| Paul | `cold-outreach` | cold outbound |
| Matthew | `seo-content-engine` | blog / SEO |
| Andrew | `audit-funnel-optimizer` | audit funnel conversion |
| Noah | `landing-page-builder` | landing pages |
| John | `sales-enablement` | sales coaching |
| Ruth | `lifecycle-activation` | onboarding / retention |
| Abraham | `partnerships-channel` | white-label / channel |
| Daniel | `launch-readiness` | pre-launch QA |
| Thomas | `market-data-checker` | stat fact-checking |
| Peter | `api-route-auditor` | API / auth |
| Adam | `schema-guardian` | database / schema |
| Moses | `design-system-cop` | design system |
| Samuel | `admin-ia-builder` | admin IA redesign |

## House rules every agent follows
Operator voice for customers (`operator-copy`), pitch voice for investors (`pitch-voice.md`); stats only
from `market-data-2026.md`; sell what exists (no live PMS API; Twilio not wired); `main` and `db push`
both hit prod — no `db push` without approval; Angelo's ad/video domain is off-limits.
