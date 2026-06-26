# [SEC-001] Unauthenticated cross-tenant invoice disclosure in `client-invoices` GET

Severity: Critical
Category: OWASP API1:2023 (BOLA) + API2:2023 (Broken Authentication) / CWE-306 (Missing Authentication for Critical Function), CWE-639 (Authorization Bypass Through User-Controlled Key), CWE-200 (Exposure of Sensitive Information)
Status: Open
Location: `src/app/api/client-invoices/route.ts:281-329` (sink: `316-323`)

## Summary
The `GET /api/client-invoices` handler is reachable with no authentication and, when it cannot resolve a `facilityId` from the request, runs its `activity_log` query with the facility filter omitted. Because `activity_log` rows are scoped only by `facility_id` (the table has no `organization_id` column), the query returns the 24 most recent `invoice_sent` records **across every tenant on the platform** — client emails, invoice numbers, dollar amounts, and facility names — to any anonymous caller.

## Vulnerability
Entry point → sink: an unauthenticated `GET` request reaches the handler (middleware `src/proxy.ts:120-123` returns `NextResponse.next()` for all `/api/*`, and this route calls no guard). `isAdmin` is computed but never enforced, and a missing/invalid credential leaves `facilityId === null`, which the Prisma `where` spread silently turns into an unscoped query.

```ts
// src/app/api/client-invoices/route.ts:285, 293-323
const isAdmin = isAdminRequest(req);              // computed, never required
let facilityId: string | null = null;
if (clientId && isAdmin) { /* ...admin path... */ }
else if (accessCode && email) {
  const client = await db.clients.findFirst({ where: { access_code: accessCode, email: {…} }, select: { facility_id: true } });
  if (client) facilityId = client.facility_id;    // on miss: facilityId stays null, NO 401
}
const invoices = await db.activity_log.findMany({
  where: { type: "invoice_sent", ...(facilityId ? { facility_id: facilityId } : {}) }, // empty filter when null
  orderBy: { created_at: "desc" }, take: 24,
});
return jsonResponse({ success: true, data: invoices }, 200, origin);
```

The `detail` string written at `POST` time (`client-invoices/route.ts:266`) is literally `` `Invoice ${invoiceNumber} for $${total} sent to ${row.email}` `` and the row also carries `facility_name`, so the leaked records expose customer email, invoice number, amount, and facility.

Existing guards do not cover it: there is no `requireAdminKey`/`getSession`/access-code enforcement before the query, and unlike the sibling `client-reports` GET (`route.ts:42`, which does `if (clientId && !isAdminRequest(req)) return 401`) there is no early return when no tenant identity resolves.

## Exploit Scenario
1. Attacker sends `GET https://storageads.com/api/client-invoices` with no headers, no `clientId`, no `accessCode`. (A `GET` needs no CSRF token; the route has no auth.)
2. `facilityId` is `null` → the `where` filter drops to `{ type: "invoice_sent" }`.
3. Response returns the 24 most recent invoices platform-wide: `{"data":[{"detail":"Invoice SS-ABC-202605-X9K2 for $1,499 sent to owner@competitor.com","facility_name":"Competitor Self Storage",…}]}`.
4. Polling over time as new invoices are created harvests billing data for every operator. Supplying a deliberately wrong `accessCode`+`email` also falls through to the same unscoped result.

Precondition: none. No account, no credential, no knowledge of any internal ID.

## Impact
Platform-wide cross-tenant disclosure of billing/customer data: client email addresses, invoice numbers, invoice amounts, and facility names for **all** operators. This is a confidentiality breach of customer PII (emails) and competitively sensitive revenue data, with regulatory exposure (GDPR/CCPA). Blast radius = every tenant with at least one sent invoice.

## Remediation
Require a resolved tenant identity before querying, and never execute the query with an empty filter:

```ts
// after resolving facilityId:
if (!facilityId) return errorResponse("Unauthorized", 401, origin);
```

Adopt the sibling pattern that is already correct in this codebase:
- `client-reports/route.ts:42` — `if (clientId && !isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);`
- `pms-data/route.ts:15-58` — `authorizeRequest(req, facilityId)` resolves admin-or-access-code and verifies ownership.
- On a failed `access_code`+`email` lookup, return `401` (as `client-activity/route.ts:65-67` does) rather than falling through.

Apply the same "derive the id from a verified credential; treat the `clientId`/`facilityId` query param as admin-only" shape used by `alert-history`, `client-reports`, `pms-data`, and `facility-pms`.

## Verification
- `curl -s 'https://<host>/api/client-invoices'` (no auth) must return `401` or `{"data":[]}`, never cross-tenant rows.
- `curl -s 'https://<host>/api/client-invoices?accessCode=wrong&[email protected]'` must return `401`/empty.
- Add a regression test: GET with `facilityId === null` resolution returns `401` (assert `db.activity_log.findMany` is never called with a `where` lacking `facility_id`).

## References
- OWASP API Security Top 10 (2023): API1 Broken Object Level Authorization, API2 Broken Authentication
- CWE-306: Missing Authentication for Critical Function
- CWE-639: Authorization Bypass Through User-Controlled Key
- CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
- Related: SEC-002 (same class on `client-activity`)
