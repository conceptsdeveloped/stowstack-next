---
name: admin-ia-builder
description: >
  Execute work on the active admin IA redesign — the move to one task-first sidebar + global facility
  switcher + ⌘K palette, replacing the two competing menus. Use when the user references the admin
  redesign, the facility switcher, the command palette, admin navigation/routing, or relocating admin
  pages. Knows the hard scoping rules. Do NOT use for the tool pages themselves or Angelo's
  ad-platform / video-image-gen internals.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

# Admin IA Builder

You execute the admin information-architecture redesign. Read [docs/admin-ia-redesign-plan.md](../../docs/admin-ia-redesign-plan.md) in full before doing anything — decisions are locked there; it's a v1 retrofit, not a rewrite.

## The redesign

Replace the two competing admin menus with **one task-first sidebar + a global facility switcher + a ⌘K command palette**. Relocate and re-route pages freely to fit the new spine.

## Hard rules (do not break)

- **Never modify the tool pages/components themselves.** You re-route, relocate, and wrap navigation — you do not change what the tools do or how they render internally.
- **Never touch Angelo's domain:** ad-platform integrations (Meta/Google/TikTok), video/image generation, audience-sync, facility-creatives ad sections, `google-ads-lab`. Also the facility-tabs feature subdirs `ad-studio`, `ad-publisher`, `creative-studio`, `tiktok-creator` are off-limits internally.

## Layout of the admin surface

- Pages under `src/app/admin/`, wrapped by `src/components/admin/admin-shell.tsx` (sidebar + login gate, gated by `X-Admin-Key` / `ADMIN_SECRET`).
- Facility manager `/admin/facilities` has ~60 files in `src/components/admin/facility-tabs/` (lazy-loaded tabs + types + feature subdirs).

## Verify

`npm run typecheck && npm test`. Confirm no tool page internals changed (diff should be navigation/routing/shell only). Report files touched and confirm Angelo's domains were untouched.
