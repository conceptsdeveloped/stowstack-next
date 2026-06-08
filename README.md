# StorageAds

Marketing automation SaaS for the self-storage industry. Turns ad spend into move-ins across the full acquisition funnel, with attribution as the measurement layer underneath.

**Status:** Pre-launch (alpha testing on Blake's own portfolio). Domain: [storageads.com](https://storageads.com). Deploys straight to production on Vercel — no staging.

## Stack

Next.js 16 (App Router) · React 19 · Prisma 5 (PostgreSQL/Neon) · Tailwind CSS 4 · Clerk · Stripe · Resend · Anthropic Claude API · Upstash Redis · Twilio · Sentry · Vercel Blob.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Copy `.env.example` to `.env.local` and fill in the required keys.

## Common commands

```bash
npm run dev          # Dev server
npm run build        # Production build (prisma generate && next build)
npm run typecheck    # tsc --noEmit
npm run test         # Vitest
npm run lint         # ESLint
npm run db:push      # Push Prisma schema to the DB
npx prisma generate  # Regenerate Prisma client
```

> Never run `prisma db push` / migrations against production without explicit approval — it can drop tables. `npm run lint:safety` guards against `--accept-data-loss`.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — architecture, auth systems, API patterns, integrations, build priorities. Start here.
- **[.claude/positioning.md](.claude/positioning.md)** — canonical positioning (source of truth for what StorageAds is and how it's sold).
- **[.claude/design-system.md](.claude/design-system.md)** — palette, typography, and visual rules.
- **[.claude/copy-voice.md](.claude/copy-voice.md)** / **[pitch-voice.md](.claude/pitch-voice.md)** — voice for customer- vs investor-facing copy.
- **[tasks/README.md](tasks/README.md)** — remediation task list and execution rules.
