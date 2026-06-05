# [SEC-004] OAuth callbacks trust an unsigned `state` and are unauthenticated → cross-tenant platform-connection token fixation

Severity: High
Category: OWASP API8:2023 (Security Misconfiguration) / CWE-352 (CSRF), CWE-345 (Insufficient Verification of Data Authenticity), CWE-306 (Missing Authentication for Critical Function)
Status: Open
Location (all four providers):
- `src/app/api/auth/gbp/callback/route.ts:44-174`
- `src/app/api/auth/google/callback/route.ts:39-125`
- `src/app/api/auth/meta/callback/route.ts:40-133`
- `src/app/api/auth/tiktok/callback/route.ts:40-135`
- State minted unsigned at `src/app/api/auth/gbp/route.ts:48-50`

## Summary
Each OAuth connect callback derives the target facility from a `state` parameter that is a plain base64 of `{ facilityId }` — no signature, no nonce, no binding to the session that started the flow. The callbacks themselves enforce no authentication. After exchanging the `code`, each callback upserts the provider's `access_token`/`refresh_token` into `platform_connections`/`gbp_connections` keyed on the attacker-controllable `facilityId`. This enables cross-tenant connection fixation: an attacker can bind their own provider tokens onto a victim facility (or a victim's tokens onto an attacker facility).

## Vulnerability
State is minted without integrity protection and consumed without verification:

```ts
// auth/gbp/route.ts:48-50 (initiation) — no HMAC, no nonce, no session binding
const state = Buffer.from(JSON.stringify({ facilityId })).toString("base64url");

// auth/meta/callback/route.ts:44-49 (identical shape in gbp/google/tiktok callbacks)
let facilityId: string;
try { facilityId = JSON.parse(Buffer.from(state, "base64url").toString()).facilityId; }
catch { return redirectError("Invalid state parameter"); }
```

The callback then writes provider tokens to the facility-keyed row with no ownership/auth check:

```ts
// auth/meta/callback/route.ts:120-133 (google:113-125, tiktok:123-135, gbp:147-174 analogous)
await db.$executeRaw`
  INSERT INTO platform_connections (facility_id, platform, status, access_token, …)
  VALUES (${facilityId}::uuid, 'meta', 'connected', ${accessToken}, …)
  ON CONFLICT (facility_id, platform) DO UPDATE SET access_token = ${accessToken}, … `;
```

The four callback routes call no `requireAdminKey`/`getSession` (only `applyRateLimit`). While the GBP *initiation* route checks `isAdminRequest` (`auth/gbp/route.ts:15`), the *callbacks* — the security-relevant write path — do not, and `state` is fully attacker-forgeable.

## Exploit Scenario
Token injection into a victim facility (primary):
1. Attacker (any anonymous party) begins the provider OAuth using their **own** Google/Meta/TikTok ad or GBP account, setting `redirect_uri` to the StorageAds callback and `state = base64url(JSON.stringify({facilityId: "<victim-uuid>"}))`.
2. Attacker consents; the provider redirects to e.g. `/api/auth/meta/callback?code=<valid>&state=<crafted>`.
3. The callback exchanges the code and upserts the **attacker's** `access_token`/`refresh_token` onto the victim facility's `platform_connections` row.
4. The victim operator's subsequent Meta/Google/TikTok ad publishing and GBP posts/insights for that facility now execute against the attacker's connected account — the attacker can capture the victim's content/leads or redirect ad operations.

Inverse (classic OAuth CSRF): lure a logged-in admin to a pre-crafted consent flow whose `state` points at an attacker-owned facility, binding the victim's tokens to the attacker's record.

Precondition: a facility UUID (leaks from public surfaces) and an attacker-completed provider consent. No StorageAds credential needed at the callback.

## Impact
Cross-tenant compromise of social/advertising platform connections across all four providers (GBP, Google Ads, Meta, TikTok): hijack of ad publishing and GBP management, and exposure of connected-account data and stored OAuth tokens. Affects any facility whose UUID is known. Four instances, one shared root cause.

## Remediation
1. **Sign and bind `state`.** Mint `state` as an HMAC (server secret) over `{ facilityId, nonce, exp }`, or store a random `state` in a short-lived signed cookie / DB row tied to the initiating admin session. On callback, verify the signature/nonce, reject expired or mismatched values.
2. **Authenticate the callback.** Require the same authenticated admin session that initiated the flow to be present on the callback, and verify that session's org owns `facilityId` before the upsert (reuse `requireOrgFacility`).
3. Gate all four initiation routes (Google/Meta/TikTok currently have no admin-checked initiation comparable to GBP's) behind admin auth so `state` can only be minted for facilities the initiator owns.

## Verification
- Hand-craft `GET /api/auth/meta/callback?code=x&state=<base64 {facilityId:foreign}>` → expect rejection (invalid/again unsigned state) and confirm no `platform_connections` row is written/updated.
- Confirm a legitimate admin-initiated connect still succeeds end-to-end.
- Regression test: callback with a `state` lacking a valid signature/nonce returns an error and performs no DB write.

## References
- CWE-352: Cross-Site Request Forgery
- CWE-345: Insufficient Verification of Data Authenticity
- CWE-306: Missing Authentication for Critical Function
- OWASP API8:2023 Security Misconfiguration; OAuth 2.0 `state` / RFC 6749 §10.12
