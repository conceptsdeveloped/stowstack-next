# Task 29: Migrate client-onboarding + portal-upload onto the shared portal auth helper

## Status: DONE (`faaaec8`) — both routes migrated, +11 tests, build green. Decisions: portal-upload resolves email via clientId (option 2b); client-onboarding PATCH credentials moved to the query and the onboarding page updated to match. **One open item:** the manual portal walk in Step 5 (upload a CSV, save an onboarding step with a real session) is still recommended before relying on it in alpha — mock tests can't catch a prod param mismatch.

## Goal

Finish portal-client auth consolidation. As of `b70440a`, every **query-based**
portal data route uses the canonical `authenticatePortalRequest` from
`src/lib/portal-auth.ts` (returns `{kind:"admin"} | {kind:"client",facilityId,clientId}`
or a 401 `NextResponse`; reads `accessCode` or legacy `code` + `email` from the
query). The two routes below are the **last** portal-client routes still
hand-rolling auth. Both work today; this is dedup + single-surface-to-audit, not
a bug fix — so the bar is "zero behavior change," verified manually.

See [docs/portal-redesign-rollout.md](../docs/portal-redesign-rollout.md) (R4)
and the `project_portal_auth_consolidation` memory.

## Scope (exactly two routes)

- `src/app/api/portal-upload/route.ts`
- `src/app/api/client-onboarding/route.ts`

Do **not** touch `client-data` (login exchange — consumes single-use 4-digit
`portal_login_codes`; intentionally separate) or `client-campaigns`
(admin-gated; attribution is Angelo's domain).

## Why it's risky (read before starting)

1. **Alpha-critical.** PMS upload and the onboarding wizard are Build Priority #1.
   A broken auth param = a dead alpha flow.
2. **portal-upload is not a drop-in.** Its local `resolveClient()` returns
   `{ facilityId, clientEmail }`. The shared helper returns
   `{ facilityId, clientId }` with **no email**, but the POST needs the email for
   `pms_reports.email` and the admin notification. Either (a) read the validated
   `email` query param after auth, or (b) `db.clients.findUnique` by
   `scope.clientId` to get `email`. Option (b) preserves the exact stored value.
3. **client-onboarding PATCH is body-based.** The wizard
   (`src/app/portal/onboarding/page.tsx:381`) sends `code` in the **JSON body**,
   not the query. The query-based helper cannot read it without also changing the
   page to send `?code=&email=` (or moving auth ahead of the body parse). The GET
   (`:230`) is query-based and migrates cleanly; the PATCH does not.
4. **Login-code path is dead per-request, but confirm.** Both routes currently
   accept a 4-digit `portal_login_codes` code. The portal session replays the
   **permanent** `clients.access_code` (set by `client-data` at login), so no
   caller sends a login code to these routes per-request. The shared helper does
   NOT check login codes. Dropping that path should be behavior-neutral — verify
   no caller relies on it before removing.
5. **No real auth tests.** Route tests mock the DB and cannot catch a prod
   param-name mismatch. Manual end-to-end verification is mandatory.

## Steps

1. **Confirm callers + params.** Run:
   ```
   grep -rn "client-onboarding\|portal-upload" src/app --include="*.tsx"
   ```
   Verify GET callers send `?code=` or `?accessCode=` + `email`, and that
   `upload/page.tsx` uses `authFetch` (which appends `code`+`accessCode`+`email`).
2. **portal-upload:** replace `resolveClient(req)` calls in POST and GET with
   `authenticatePortalRequest(req)`. For the client branch use `scope.facilityId`;
   resolve `email` via option 2b above. Keep the admin `?facilityId` branch in GET
   (currently `isAdminRequest`) — the helper's `{kind:"admin"}` covers it. Delete
   the now-unused `resolveClient`. Remove now-unused imports.
3. **client-onboarding:** migrate GET to the helper. For PATCH, decide:
   either change `onboarding/page.tsx:381` to send `?code=&email=` in the query
   (then use the helper) OR leave PATCH hand-rolled and document why. Do NOT half-
   migrate silently.
4. **Tests.** Add route tests mirroring `client-billing/__tests__/route.test.ts`
   (401 unauth, client via `code` alias, admin via X-Admin-Key). Mock-only; they
   prove the wiring, not prod params.
5. **Manual verification (REQUIRED).** With a real portal session: upload a CSV
   in `/portal/upload` and confirm it lands + the history list refreshes; open
   `/portal/onboarding`, load state (GET) and save a step (PATCH).

## Verification

```bash
npx prisma validate
npx tsc --noEmit
npm run test
npm run build
```
Plus the manual portal walk in Step 5.

## Commit message

```
portal: migrate onboarding + upload onto shared auth (finish R1 unification)
```
