# StorageAds — Design System (Light Only)

Canonical design-system reference. CLAUDE.md points here; this file is the source of truth for palette, typography, and visual rules. CSS custom properties are defined in `src/app/globals.css`.

Anthropic-inspired warm palette.

## Core palette

- `--color-dark` (#141413) — primary text, never pure black
- `--color-light` (#faf9f5) — backgrounds, never pure white
- `--color-body-text` (#6a6560) — body text
- `--color-mid-gray` (#b0aea5) — secondary/muted
- `--color-light-gray` (#e8e6dc) — card fills, borders, surfaces

## Accent — Charcoal-on-light / Light-on-dark (no primary color accent)

- CTAs use `--color-dark` (#141413) on light surfaces and `--color-light` (#faf9f5) on dark surfaces — contrast-based, not color-based.
- **Sienna gold (`#B58B3F`) is banned everywhere EXCEPT the logo `ads` lockup**, where `--brand-gold` is the only legal use (see Logo below). Do not use `--color-gold`, `--color-gold-hover`, `--color-gold-on-light`, `--color-gold-light`, or any near variant anywhere else — CTAs, links, metrics, charts, generated assets, etc. The older `--color-gold*` tokens still exist in `globals.css` for legacy compatibility but must not be referenced in new code. The A24/Kubrick editorial feel comes from typography and negative space, not a color accent.

**Secondary accents:** `--color-blue` (#6a9bcc, Google/informational), `--color-green` (#788c5d, success/growth) — use sparingly for categorical distinctions (chart series, informational callouts), never as a primary CTA color.
**Error only:** `--color-red` (#B04A3A) — NEVER for CTAs or decorative use
**Dashboard surfaces:** `--color-dark-surface` (#1e1d1b) for admin/partner dashboards

## Typography

**Manrope variable font** (Google Fonts, weights 200–800) for everything — marketing, admin, partner, portal, ad mockups. No second font.

- **Body / paragraphs:** weight 400, line-height 1.6
- **UI (buttons, inputs, labels, captions):** weight 500–600, line-height 1.4
- **Headings (h1–h6):** weight 600–700, line-height 1.2, letter-spacing -0.03em
- **Display / hero / `<Display>` component:** weight 700–800, line-height 1.05–1.2
- **Emphasis:** use weight changes (font-medium / font-semibold / font-bold). **Never use italic** — Manrope has no true italic glyphs. globals.css forces `em`, `i`, `cite`, and Tailwind's `.italic` utility to `font-style: normal`; the `Display` component's `italic` prop is accepted but ignored.

**CSS variable mapping** (so the 125+ inline `MONO.mono` / `MONO.serif` / `var(--font-jetbrains)` / `var(--font-archivo)` / `var(--font-inter)` refs in components all resolve to Manrope without per-file edits): `--mono`, `--serif`, `--font-jetbrains`, `--font-inter`, `--font-archivo`, `--font-primary`, `--font-warm`, `--font-heading`, `--font-body`, `--font-display`, `--font-mono-family`, `--font` (admin scope), and legacy `--font-poppins` / `--font-lora` are all aliased to `--font-manrope`.

**Line-height tokens:** `--leading-body` (1.6), `--leading-tight` (1.2), `--leading-snug` (1.3), `--leading-ui` (1.4), `--leading-display` (1.2).

**Tabular numerals:** `.urbit-landing` in globals.css applies `font-variant-numeric: tabular-nums` + `font-feature-settings: "tnum" 1` globally so numbers in the editorial chrome (status bar timestamps, live monitor data cells, sparkline labels, `§ 00 · NUMBERS` count-up cards, ticker tape) keep tabular column alignment despite Manrope being a proportional font. Manrope ships tabular figures via OpenType.

## Logo

`storageads` (`storageads/attr` in the marketing nav). Manrope 700, lowercase, no icon. **Two-tone color split is brand-mandatory** — "storage" renders in the surface text color (palette-aware: `--text-accent` / `--color-dark` / `#1A1A1A`), "ads" always renders in `var(--brand-gold)` (`#B58B3F`, the original StorageAds sienna gold). `--brand-gold` is defined in `:root` outside any palette scope so the gold survives palette swaps — it is a brand-locked exception to the otherwise palette-driven color system. Used in marketing nav, footer, admin sidebar, and admin login.

## Charts

Admin charts use **recharts**. Color convention: dark=Meta, blue=Google, green=retargeting.

## Icons

**`lucide-react` is the sanctioned icon library** (imported in 200+ files — e.g. `ArrowLeft`, `ArrowRight`, `Clock`). Use lucide-react for icons. Do not add other icon libraries, and do not hand-roll inline SVG icon sets where a lucide glyph exists.

## Rules

- Never use pure #000 or #fff — always brand tokens
- Never use Tailwind default grays — only brand tokens
- Never use gradients, stock photos, or AI images
- Icons: lucide-react only (see above) — no other icon libraries
- Sienna gold only in the logo `ads` lockup via `--brand-gold` — banned everywhere else (supersedes any older gold references in `globals.css`)
- Chart colors: dark=Meta, blue=Google, green=retargeting (recharts)
- All emails from *@storageads.com
