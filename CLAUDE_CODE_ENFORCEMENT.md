# Engineering Standards

Acquisition-track codebase. Treat every commit like it's going into due diligence.

---

## Non-Negotiables

**Ship complete code.** No stubs, no `// TODO`, no `// ... rest remains the same`, no `/* implement later */`. If you're touching a file, the output compiles and works. If you can't finish it in one pass, say so — don't ship half.

**Do the work yourself.** Never say "you'll want to update X" or "don't forget to add Y." If it needs doing and you can do it, do it. You have full file access — use it.

**Read before you write.** Before changing any file: read it, read what imports it, read what it imports. Understand the dependency graph. Blind edits break things downstream. On multi-file changes, outline the approach first.

**Run the build.** `npm run build` is the verification step. Run it. Fix what breaks. Run it again. Don't hand back code with type errors.

**Match existing patterns.** Before creating a new convention, check how the codebase already does it. API routes use `corsResponse()` and `requireAdminKey()`. Components follow the design system tokens. Admin pages use the shell layout. When in doubt, grep for a similar feature and follow that pattern.

---

## Code Quality

**TypeScript:** No `any` unless you're wrapping a third-party lib that forces it (and leave a comment explaining why). Typed props, typed API responses, typed payloads. Prefer inference where it's clear; explicit types where it's not.

**Error handling:** `try/catch` on async operations. API routes return proper status codes with typed error responses. Components have error boundaries where a crash would break the page. No silent failures, no swallowed promises.

**State coverage:** Loading, error, empty, success. Every component that fetches data handles all four. Skeleton loaders on admin/portal pages. Empty states with helpful messaging, not blank screens.

**Responsive:** Mobile-first. Every layout works on phone, tablet, desktop. Don't ship desktop-only components.

**Accessibility:** Semantic HTML over div soup. Button elements for actions, anchor elements for navigation. ARIA labels on icon-only buttons. Keyboard navigation on interactive components.

---

## Design System

All values come from `globals.css` tokens. No raw hex. No Tailwind default colors.

- Text: `--color-dark` (primary), `--color-body-text` (body), `--color-mid-gray` (muted)
- Surfaces: `--color-light` (bg), `--color-light-gray` (cards/borders)
- Accent: `--color-gold` (CTAs, links, key metrics) — this is the only primary accent
- Secondary: `--color-blue` (informational), `--color-green` (success)
- Error: `--color-red` — errors only, never decorative
- Fonts: Poppins 500-600 for headings, Lora 400 for body. No other fonts. No weight above 600.
- No gradients. No icon libraries. No stock photos.

---

## What "Done" Means

A feature is done when:

1. It compiles — `npm run build` passes clean
2. It handles failure — errors don't crash the page or return 500s with no context
3. It handles nothing — empty states look intentional, not broken
4. It handles loading — the user sees feedback, not a frozen screen
5. It matches the system — uses brand tokens, follows existing layout patterns, feels like the same app
6. It works on mobile — not just "doesn't break" but actually usable

If you're adding a table, it should sort and handle empty data. If you're adding a form, it should validate and show feedback. If you're adding an API route, it should validate input and return typed errors. Don't gold-plate, but don't ship the skeleton either.

---

## Boundaries

- **Angelo's domain:** Ad platform integrations (Meta/Google/TikTok) and video/image generation (FAL.ai/Runway). Don't modify without coordination.
- **Auth is split four ways:** Clerk middleware, admin key header, client portal access codes, partner org sessions. See CLAUDE.md for details. Don't unify them.
- **No staging.** Vercel deploys straight to production. Act accordingly.
