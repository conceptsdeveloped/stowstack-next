# [SEC-003] Unauthenticated cross-tenant facility overwrite via `facility-lookup` POST

Severity: High
Category: OWASP API1:2023 (BOLA) + API5:2023 (Broken Function Level Authorization) / CWE-639, CWE-306, CWE-770 (Allocation of Resources Without Limits)
Status: Open
Location: `src/app/api/facility-lookup/route.ts:65-198` (write sink: `141-191`; cost sink: `99-113`)

## Summary
`POST /api/facility-lookup` is an unauthenticated, public endpoint. When the request body includes a `facilityId`, the handler writes the Google-Places lookup result into that facility's row and **deletes and recreates** its `places_data` and `google_places` assets — with no check that the caller owns the facility. Any anonymous caller who knows a facility UUID can overwrite another operator's Google profile fields and wipe their stored Places assets. The same endpoint also fans out to multiple billed Google Places calls per request.

## Vulnerability
No auth guard runs before the write path; `facilityId` is taken from the body and used directly as the update key:

```ts
// src/app/api/facility-lookup/route.ts:141-187
if (facilityId) {
  await db.facilities.update({
    where: { id: facilityId },                       // attacker-supplied; no org/ownership check
    data: { place_id: placeId, google_address: place.formatted_address,
            google_phone: …, website: …, google_rating: …, google_maps_url: …, status: "scraped" },
  });
  await db.places_data.deleteMany({ where: { facility_id: facilityId } });   // wipes existing
  await db.places_data.create({ data: { facility_id: facilityId, photos, reviews } });
  if (photos.length > 0) {
    await db.assets.deleteMany({ where: { facility_id: facilityId, source: "google_places" } });
    await db.assets.createMany({ data: photos.map(p => ({ facility_id: facilityId, … })) });
  }
}
```

The handler imports no auth helper and calls none (only `applyRateLimit(req, EXTERNAL_API_HOURLY, "facility-lookup")` at `route.ts:66`). Every other facility-mutating route in the codebase gates on `requireAdminKey`/`getSession`; the v1 API even has `requireOrgFacility(facilityId, orgId)` for exactly this check. None of that is applied here.

Cost amplification: each request runs `findPlaceId` (1 textsearch) + `getPlaceDetails` (1 details) + up to 10 `resolvePhotoUrl` fetches (`route.ts:99-113`), all billed Google Places calls. The only limiter is `EXTERNAL_API_HOURLY` (20/hr/IP) via `checkRateLimit`, which fails **open** if Upstash Redis is unset or erroring (`src/lib/rate-limit.ts:33-36, 67-70`) and is keyed on the spoofable first `x-forwarded-for` hop.

## Exploit Scenario
Integrity attack:
1. Attacker harvests a victim facility UUID (exposed on `/lp/[slug]`, `/audit/[slug]`, call-tracking responses).
2. `POST /api/facility-lookup` with `{"facilityName":"Totally Wrong Storage","location":"Nowhere, AK","facilityId":"<victim-uuid>"}`.
3. The handler resolves Google data for the attacker's query string and overwrites the victim facility's `google_address`, `google_phone`, `website`, `google_rating`, `google_maps_url`, `hours`, sets `status="scraped"`, and **deletes** the victim's `places_data` and `google_places` assets, replacing them with attacker-chosen content.

Cost attack:
1. Loop `POST /api/facility-lookup` with varied `facilityName`/`location` (omit `facilityId`) from rotating IPs (or any IP if Redis is down) → unbounded Google Places spend, multiplied ~12× per request by the photo fan-out.

Precondition: a facility UUID for the integrity attack; none for the cost attack.

## Impact
Unauthenticated cross-tenant tampering with another operator's public-facing facility data and destruction/replacement of their stored Google assets (integrity + availability), plus uncapped Google Places API cost (financial). Marketing display data is corrupted and could surface attacker-controlled website/phone to the operator and downstream pages.

## Remediation
Gate the write path behind authentication and ownership:

```ts
// require admin OR an org session whose org owns the facility, before any write
if (facilityId) {
  const session = await getSession(req);
  const admin = isAdminRequest(req);
  if (!admin && !(session && await orgOwnsFacility(session.user.organization_id, facilityId)))
    return errorResponse("Forbidden", 403, origin);
}
```

Reuse the existing `requireOrgFacility(facilityId, organizationId)` helper (`src/lib/v1-auth.ts:110-128`) as the ownership check. If a public read-only lookup is still desired, keep the no-`facilityId` branch public but never write to a facility row without an ownership check. Cap the per-request photo resolutions (e.g. ≤5) and consider fail-closed rate limiting on this cost-bearing public route.

## Verification
- `POST /api/facility-lookup` with a `facilityId` not owned by the caller → expect `401`/`403`; confirm no row in `facilities`/`places_data`/`assets` changed.
- Confirm the read-only path (no `facilityId`) still returns lookup data.
- Load test confirms per-request Google Places call count is bounded.

## References
- OWASP API1:2023 BOLA, API5:2023 Broken Function Level Authorization
- CWE-639: Authorization Bypass Through User-Controlled Key
- CWE-306: Missing Authentication for Critical Function
- CWE-770: Allocation of Resources Without Limits or Throttling
