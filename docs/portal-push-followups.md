# Portal push + dashboard gap follow-ups

Status as of 2026-06-27. Handoff doc — **this work is not finished.** The items
below remain before portal push notifications actually deliver and before the
last assessed dashboard gap (messaging durability) is closed.

## Done (committed, verified)

Commit `4352cac` — "Wire portal push notifications + fix portal nav gaps".
`npm run typecheck` clean, `npm run test` 609 passed / 1 skipped.

- GBP/"Reviews" added to portal mobile bottom tabs (`portal-bottom-tabs.tsx`).
- `/portal/gbp` + `/portal/upload` added to the header title map (`portal-shell.tsx`).
- New `POST/DELETE /api/portal-push-subscribe` — client-authenticated (access
  code + email in body), CSRF-exempt, writes the existing `push_subscriptions`
  table as `user_type='client'`, unsubscribe scoped to the client's own row.
- `usePushNotifications` extended with `endpoint` + `credentials` (admin path
  unchanged).
- Notifications enable/turn-off toggle in portal Settings.

## TODO — still needed to finish

### 1. Push delivery prerequisites (config + one code check)
- [ ] Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (and the matching private key the
      sender uses). Without it, `subscribe()` no-ops and the Settings toggle
      shows an error. Confirm `/api/push-vapid-key` is consistent with it.
- [ ] Verify `/api/push-send` targets `user_type='client'` rows. If it is
      hardcoded to admins, portal clients will subscribe but never receive a
      push. Add client targeting if missing.
- [ ] Decide which events trigger client pushes (new lead, new message,
      campaign alert) and wire the send calls. The subscription plumbing exists;
      nothing currently *sends* to clients.

### 2. Messaging durability (BLOCKED on approval — prod schema change)
Portal messaging is Redis-only (`/api/client-messages`); if `KV_REST_API_URL`
is unset the thread silently returns empty, and messages are not durable.
- [ ] Decide: add a `client_messages` table and migrate, or accept Redis-only.
- [ ] If migrating: add the Prisma model + a **safe** migration. Per prod-safety
      rules, do NOT run `db push` / `migrate deploy` against prod without Blake's
      explicit approval (no staging, no dev DB). Coordinate in the shared
      worktree so another agent doesn't push an unrelated schema state.

### 3. Nice-to-haves surfaced during assessment (not started)
- [ ] Reports "Download Report" exports raw JSON, not a formatted PDF.
- [ ] Reputation is read-only in the portal (no respond-to-review action).
- [ ] Settings only allows editing the monthly goal; other facility fields are
      read-only.

## Notes
- Reference: full customer-dashboard assessment lives in the conversation that
  produced commit `4352cac` (portal exists and is broadly feature-complete; the
  above are the remaining gaps).
- Do not push to `main` without intent — push deploys straight to prod (Vercel,
  no staging).
