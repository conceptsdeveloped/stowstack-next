# StorageAds Agent Fleet

Project subagents for taking StorageAds.com to market. Invoke implicitly (I route matching work
automatically) or explicitly ("use the growth-strategist…"). Each is grounded in this repo's real
assets: the voice docs, `market-data-2026.md`, the audit funnel, the blog, landing pages, and the
partner/portal systems.

## 🧭 Go-To-Market

| Agent | Owns | When |
|---|---|---|
| `growth-strategist` | GTM strategy, launch sequencing, funnel math, routing | "how do we get to launch / get customers" |
| `competitive-intel` | Competitor + market landscape, positioning | "who do we compete with / how do we position" |
| `investor-relations` | Pitch, deck, DD, market sizing (pitch register) | "write the pitch / raise / one-pager" |

## 📣 Demand & Funnel

| Agent | Owns | When |
|---|---|---|
| `cold-outreach` | Founder-led outbound email/DMs to operators + mgmt cos | "write a cold email / outreach sequence" |
| `seo-content-engine` | Blog + organic content (`/content/blog/`) | "write a blog post / plan content / improve SEO" |
| `audit-funnel-optimizer` | The free-audit wedge (`/audit-tool`, `/audit/[slug]`) | "improve the audit / lift audit→call conversion" |
| `landing-page-builder` | Campaign landing pages (`/lp/[slug]`) | "spin up an LP for this campaign/segment" |

## 🤝 Sell, Activate, Expand

| Agent | Owns | When |
|---|---|---|
| `sales-enablement` | Demo prep, scripts, objections, pricing, follow-up | "prep me for this call / handle this objection" |
| `lifecycle-activation` | Onboarding, drip/nurture, retention (portal) | "improve onboarding / build a nurture sequence" |
| `partnerships-channel` | Mgmt-co white-label, reseller, referral (partner dash) | "white-label for management companies" |

## 🚦 Launch Quality

| Agent | Owns | When |
|---|---|---|
| `launch-readiness` | End-to-end funnel QA + go-live punch list | "are we ready to launch / walk the funnel" |
| `market-data-checker` | Fact-gate for every market stat | (auto, before any stat ships) |

## 🛠️ Build (engineering)

| Agent | Owns | When |
|---|---|---|
| `api-route-auditor` | `src/app/api/` routes, 4 auth systems, CSRF gate | "add an API route / this 403s in prod" |
| `schema-guardian` | `prisma/schema.prisma`, prod-safety | "change the schema / add a model" |
| `design-system-cop` | Light-only design system enforcement | "review styling / off-brand?" |
| `admin-ia-builder` | The active admin IA redesign | admin nav / facility switcher / ⌘K |

## Shared guardrails every agent respects

- **Voice:** customer-facing → `operator-copy` skill / `copy-voice.md`; investor/acquirer → `pitch-voice.md`.
- **Facts:** market stats only from `market-data-2026.md` or our own data — never fabricated.
- **Product truth:** pre-launch; no live storEDGE/PMS API (CSV upload only); Twilio not wired. Sell what exists.
- **Prod safety:** no staging — `main` and `db push` both hit prod. No `db push` without approval.
- **Angelo's domain off-limits:** ad-platform integrations (Meta/Google/TikTok) and video/image generation.
