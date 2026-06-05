# [SEC-002] IDOR — unauthenticated cross-facility lead-activity read in `client-activity` GET

Severity: High
Category: OWASP API1:2023 (BOLA) / CWE-639 (Authorization Bypass Through User-Controlled Key), CWE-306 (Missing Authentication for Critical Function)
Status: Open
Location: `src/app/api/client-activity/route.ts:41-110` (sink: `55-95`)

## Summary
`GET /api/client-activity` accepts a `facilityId` query parameter and uses it directly as the query scope. The access-code authentication branch only runs when `facilityId` is **absent**, so supplying `facilityId` bypasses authentication entirely. Any anonymous caller who knows (or harvests) a facility UUID can read that facility's lead-activity feed, including prospect names.

## Vulnerability
The handler trusts the request-supplied `facilityId` and gates nothing on it:

```ts
// src/app/api/client-activity/route.ts:55-83
let resolvedFacilityId = facilityIdParam;                 // straight from ?facilityId=
if (!resolvedFacilityId && accessCode && email) {         // access-code path skipped if facilityId present
  const client = await db.clients.findFirst({ where: { access_code: accessCode, email: {…} }, select: { facility_id: true } });
  if (!client) return errorResponse("Unauthorized", 401, origin);
  resolvedFacilityId = client.facility_id;
}
if (!resolvedFacilityId) return errorResponse("Missing facility identifier", 400, origin);
const activities = await db.activity_log.findMany({
  where: { facility_id: resolvedFacilityId, type: { in: CLIENT_VISIBLE_TYPES } },
  select: { id:true, type:true, lead_name:true, facility_name:true, detail:true, created_at:true },
  take: maxRows,
});
```

There is no `isAdminRequest`/session check before the query. The route is unauthenticated (middleware skips Clerk for `/api/*`), and the returned rows include `lead_name` (prospect PII) and `detail`. The sibling route `client-reports/route.ts:42` shows the intended guard (`if (clientId && !isAdminRequest(req)) return 401`) which is missing here.

## Exploit Scenario
1. Attacker obtains a facility UUID. These are exposed on public surfaces: landing-page configs under `/lp/[slug]`, audit pages `/audit/[slug]`, and the `call-tracking` public response all reference facility IDs.
2. `GET /api/client-activity?facilityId=<victim-uuid>&limit=100`.
3. Response returns up to 100 recent activity rows for that facility — `lead_created`, `lead_captured`, `call_received`, `walkin_logged`, etc. — each with `leadName` and `detail`.
4. The `since` parameter (`route.ts:80`) allows incremental polling to capture every new lead in near-real-time.

Precondition: knowledge of a target facility UUID; no account or credential required.

## Impact
Cross-tenant disclosure of prospect/lead PII (names) and lead-flow activity for any facility whose UUID is known — competitor lead intelligence and a privacy breach of the operator's prospects. One facility per request, enumerable. Lower than SEC-001 only because it requires a facility UUID and exposes lead names rather than platform-wide billing records.

## Remediation
Mirror the correct sibling pattern: treat `facilityId` as admin-only, otherwise derive the facility from the verified access code.

```ts
// gate the param:
if (facilityIdParam && !isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);
// non-admin path: require accessCode+email and use the resolved client.facility_id only
```

The access-code branch already returns `401` on a bad lookup (`route.ts:65-67`); the fix is simply to stop honoring a caller-supplied `facilityId` without admin auth. Apply identically anywhere a portal route accepts a `facilityId`/`clientId` (see also SEC-001).

## Verification
- `curl -s 'https://<host>/api/client-activity?facilityId=<foreign-uuid>'` must return `401`, not activity rows.
- Access-code path still works: `?accessCode=<valid>&email=<valid>` returns only that client's facility activity.
- Regression test: a `facilityId` param without an admin key yields `401`.

## References
- OWASP API1:2023 Broken Object Level Authorization
- CWE-639: Authorization Bypass Through User-Controlled Key
- CWE-306: Missing Authentication for Critical Function
- Related: SEC-001 (same class on `client-invoices`)
