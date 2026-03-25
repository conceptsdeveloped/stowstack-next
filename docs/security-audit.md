# Security Audit

Date: 2026-03-20

## Authentication Systems

StorageAds.com uses four independent auth systems. Each was reviewed for common vulnerabilities.

### 1. Admin Key Auth (`src/lib/api-helpers.ts`)

| Check | Status | Notes |
|-------|--------|-------|
| Timing-safe comparison | PASS | Uses `crypto.timingSafeEqual()` |
| Empty key rejection | PASS | Returns false if either key is empty/undefined |
| Length check before compare | PASS | Returns false if lengths differ |
| Key not logged | PASS | No console output contains admin key |

### 2. Partner Session Auth (`src/lib/session-auth.ts`)

| Check | Status | Notes |
|-------|--------|-------|
| Token generation | PASS | `crypto.randomBytes(32)` — 256 bits of entropy |
| Token storage | PASS | SHA-256 hash stored, not plaintext |
| Session expiry | PASS | 30-day TTL, checked on every lookup |
| Session fixation | PASS | `createSession()` always generates fresh token on login |
| Token prefix | PASS | `ss_` prefix prevents ambiguity with other token types |
| Active status check | PASS | Verifies both user and org status = 'active' |
| Token not in responses | PASS | Only returned once at login, never echoed back |

**Legacy Token Issue:**
- `lookupLegacyToken()` accepts base64-encoded `orgId:email` with **no expiry or signature**
- Anyone who knows an org UUID and user email can forge a valid session
- **Risk level**: Medium — requires knowing internal UUIDs, but no brute-force protection
- **Mitigation**: Deprecation warning added. Plan to remove after all clients migrate to `ss_` tokens
- **Recommendation**: Add a deadline (e.g., 90 days) after which legacy tokens are rejected

### 3. Cron Auth (`src/lib/cron-auth.ts`)

| Check | Status | Notes |
|-------|--------|-------|
| Fail-closed | PASS | Returns false when `CRON_SECRET` is unset or empty |
| Bearer format | PASS | Requires exact `Bearer {secret}` format |
| Secret not logged | PASS | No console output |

### 4. V1 API Key Auth (`src/lib/v1-auth.ts`)

| Check | Status | Notes |
|-------|--------|-------|
| Key hashing | PASS | SHA-256 hash stored, not plaintext |
| Revocation check | PASS | Revoked keys rejected immediately |
| Expiration check | PASS | Expired keys rejected |
| Usage logging | PASS | All API calls logged to `api_usage_log` |
| Org scoping | PASS | `organization_id` extracted from key, used in all queries |
| Facility ownership | PASS | `requireOrgFacility()` verifies facility belongs to org |
| Rate limiting | INFO | `rate_limit` field exists but not enforced in code |

### 5. Client Portal Auth (access code)

| Check | Status | Notes |
|-------|--------|-------|
| Access code lookup | PASS | Case-insensitive email match + access code |
| No session server-side | INFO | Session stored in localStorage only |
| No brute-force protection | INFO | No rate limiting on portal login attempts |

## SQL Injection

See `docs/raw-query-audit.md` for the full catalog.

**Summary**: All 25+ routes using `$queryRawUnsafe` use positional `$N` parameters. No user input is interpolated into SQL strings. Two routes migrated to `$queryRaw` tagged templates.

## Token Leakage

| Check | Status | Notes |
|-------|--------|-------|
| Tokens in console.log | PASS | No token values logged anywhere |
| Tokens in error responses | PASS | Error responses contain messages, not tokens |
| Tokens in activity_log | PASS | Activity log stores names/details, not auth data |
| Password hashes in responses | PASS | password_hash never included in API responses |

## Session Fixation

| Check | Status | Notes |
|-------|--------|-------|
| Login creates new token | PASS | `createSession()` generates fresh `crypto.randomBytes(32)` |
| Old sessions not invalidated | INFO | Login does not destroy previous sessions for the user |

**Note**: Not invalidating old sessions on new login is acceptable for this app (users may be logged in from multiple devices). If single-session enforcement is desired later, call `destroyAllSessions(userId)` before `createSession()`.

## Password Hashing

| Check | Status | Notes |
|-------|--------|-------|
| Current algorithm | PASS | scrypt with random 16-byte salt, 64-byte key |
| Legacy format support | INFO | SHA-256(password + userId) still accepted for old accounts |
| Legacy migration | TODO | Rehash legacy passwords on successful login |

**Recommendation**: When a user with a legacy hash logs in successfully, rehash with scrypt and update the stored hash. This gradually migrates all users without forcing password resets.

## Recommendations Summary

| Priority | Item | Status |
|----------|------|--------|
| HIGH | Remove legacy base64 token auth | Deprecation warning added, plan removal deadline |
| MEDIUM | Add rate limiting to portal login | Not yet implemented |
| MEDIUM | Rehash legacy passwords on login | TODO |
| LOW | Enforce V1 API rate limits | Field exists, enforcement not built |
| LOW | Add session invalidation on password change | Not yet implemented |
