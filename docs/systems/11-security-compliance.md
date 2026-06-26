# 11 · Security & Compliance

> **The headline:** Defense is layered at the edge (`proxy.ts`) and per-route. Six self-gating auth perimeters, a CSRF double-submit gate, five security headers, and Upstash per-IP rate limiting. Three gaps worth knowing: **CSP is report-only with no report sink**, `applyRateLimit` is **fail-open**, and there's an orphaned `fb_deletion_requests` table.

---

## 1. The security layers

```mermaid
graph TB
    REQ([Request]) --> EDGE

    subgraph EDGE["Edge — src/proxy.ts (every request)"]
        L1["1 · Sentry route/method/user tagging"]
        L2["2 · CSRF double-submit gate (mutating /api/*)"]
        L3["3 · 5 security headers on every response"]
    end

    EDGE --> RL["4 · Upstash per-IP rate limiting<br/>(fail-open default; strict on 3 routes)"]
    RL --> PERIM

    subgraph PERIM["5 · Six self-gating auth perimeters"]
        P1["Clerk (inert — all public)"]
        P2["Admin key (safeCompare)"]
        P3["Portal access code"]
        P4["Partner ss_ session (hash)"]
        P5["Cron secret (fail-closed)"]
        P6["V1 API key (hash, scoped)"]
    end

    PERIM --> HANDLER([Route handler])

    classDef edge fill:#1e1d1b,stroke:#141413,color:#faf9f5
    classDef layer fill:#e8e6dc,stroke:#141413,color:#141413
    class L1,L2,L3 edge
    class RL,P1,P2,P3,P4,P5,P6 layer
```

The four data-facing perimeters (admin/portal/partner/V1) are documented in detail in [01 · Authentication](01-authentication.md). This doc covers the wrapping layers: headers, rate limiting, secrets-at-rest, and compliance.

---

## 2. Security headers & CSP

`applySecurityHeaders()` sets five headers on **every** response (including the 403 CSRF reject):

| Header | Value |
|--------|-------|
| `Content-Security-Policy-Report-Only` | full directive set (see below) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

```mermaid
graph LR
    CSP["CSP (Report-Only)"]
    CSP --> D1["default-src 'self'"]
    CSP --> D2["script-src 'self' 'unsafe-inline'<br/>+ 'unsafe-eval' (DEV only)<br/>+ stripe, facebook, clerk, cal"]
    CSP --> D3["frame-ancestors 'none'<br/>object-src 'none' · base-uri 'self'"]
    CSP --> D4["connect-src: stripe, sentry, upstash<br/>clerk, facebook, fal, cal"]
    CSP --> GAP["⚠️ Report-Only + NO report-uri/report-to<br/>→ violations silently dropped (console only)"]

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    classDef gap fill:#faf9f5,stroke:#B04A3A,color:#B04A3A
    class D1,D2,D3,D4 c
    class GAP gap
```

> **Report-Only means CSP observes but does not block.** Combined with no report sink, a CSP violation produces no telemetry and no enforcement — it's effectively a dry run. Flagged in [13 · Gaps & Seams](13-gaps-and-seams.md).

---

## 3. Rate limiting

Upstash Redis sliding window, keyed per-IP (`rl:{prefix}:{ip}`). Two entry points with different failure modes:

```mermaid
flowchart TD
    REQ([request]) --> WHICH{which helper?}
    WHICH -->|"applyRateLimit (~166 routes)"| OPEN["fail-OPEN:<br/>Redis down → allow (degraded:true)"]
    WHICH -->|"applyRateLimitStrict (3 routes)"| CLOSED["fail-CLOSED in prod:<br/>Redis down → 429"]
    OPEN --> CHECK{over limit?}
    CLOSED --> CHECK
    CHECK -->|yes| R429["429 + Retry-After + X-RateLimit-* headers"]
    CHECK -->|no| PASS([allow])

    classDef open fill:#faf9f5,stroke:#6a9bcc,color:#141413
    classDef closed fill:#faf9f5,stroke:#788c5d,color:#141413
    classDef bad fill:#faf9f5,stroke:#B04A3A,color:#B04A3A
    class OPEN open
    class CLOSED closed
    class R429 bad
```

The strict (fail-closed) variant guards the 3 expensive **unauthenticated** routes: `analyze-map`, `diagnostic-analyze`, `facility-lookup`.

**Tiers** (`RATE_LIMIT_TIERS`, requests / window):

| Tier | Limit | | Tier | Limit |
|------|-------|-|------|-------|
| EXPENSIVE_API | 10/60s | | WEBHOOK | 200/60s |
| BILLING | 5/60s | | EXPENSIVE_API_HOURLY | 5/hr |
| AUTHENTICATED | 60/60s | | BILLING_HOURLY | 10/hr |
| PUBLIC_WRITE | 10/60s | | SIGNUP_HOURLY | 5/hr |
| PUBLIC_READ | 120/60s | | EXTERNAL_API_HOURLY | 20/hr |

V1 API uses per-key limits keyed `v1:{apiKeyId}` (default 100/60s).

---

## 4. Secrets at rest & constant-time compares

Four independent constant-time implementations, all SHA-256-normalizing before compare (so length doesn't leak):

```mermaid
graph LR
    subgraph Compare["Constant-time verifiers"]
        C1["safeCompare → x-admin-key vs ADMIN_SECRET"]
        C2["verifyCronSecret → fail-closed"]
        C3["Meta callback → HMAC signed_request"]
        C4["validateCsrf → cookie vs header"]
    end
    subgraph Hashed["Hashed-at-rest tokens (raw never stored)"]
        H1["sessions.token_hash ← ss_ partner tokens"]
        H2["api_keys.key_hash ← sk_live_ V1 keys (+ scopes, expiry, revoked)"]
        H3["admin sa_adm_ keys ← validateAdminKey + scopes"]
    end

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    class C1,C2,C3,C4,H1,H2,H3 c
```

---

## 5. GDPR / data-deletion lifecycle

Single model `data_deletion_requests` backs the whole flow:

```mermaid
stateDiagram-v2
    direction LR
    [*] --> pending : public POST (scanForUserData)
    pending --> acknowledged : admin action=acknowledge
    acknowledged --> completed : admin action=execute
    completed --> [*]

    note right of pending
      scans clients, tenants, partial_leads, org_users
      promises: ack in 5 business days, delete in 30
    end note
    note right of completed
      $transaction cascade delete by email across
      clients/tenants/leads/sessions/org_users
      financial + call records RETAINED (tax policy)
    end note
```

```mermaid
flowchart LR
    META["Meta/Facebook<br/>signed_request"] --> CB["/api/data-deletion/meta-callback<br/>verify HMAC vs META_APP_SECRET"]
    CB --> RESOLVE["resolve user_id → platform_connections<br/>→ org → org_users email"]
    RESOLVE --> ROW["data_deletion_requests<br/>source=meta_callback"]
    ROW --> RET["return (url, confirmation_code)<br/>→ /data-deletion?confirmation=id"]

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    class META,CB,RESOLVE,ROW,RET c
```

> **⚠️ Orphan:** the `fb_deletion_requests` table exists in the schema but is referenced nowhere — the live Meta flow writes to `data_deletion_requests`.

**Retention cron** (`cron/data-retention`, fail-closed): `RETENTION_POLICIES` — `activity_log` 90d, `api_usage_log` 30d, `betapad_notes` 90d — batched 1000-row raw deletes on `created_at`.

**Legal pages:** `/privacy`, `/terms`, `/cookies`, `/dpa`, `/data-deletion` (the last is the public request form, required for Meta advertising compliance).

---

## 6. AI compliance & safety (two separate systems)

```mermaid
graph TB
    subgraph AdCompliance["Ad compliance — post-generation check"]
        AC1["validateCompliance(content, platform)<br/>Anthropic claude-haiku, rules from COMPLIANCE.md"]
        AC2["→ status: passed/flagged/failed<br/>persisted to ad_variations.compliance_status"]
        AC3["fail-SOFT: error/missing key → passed (never blocks)"]
    end
    subgraph VoiceSafety["Voice/GBP safety — auto-publish gate"]
        VS1["checkBlocklist + reviewAutoPublishDecision"]
        VS2["only clean 4-5★ auto-publish;<br/>else queued for human"]
        VS3["logSafetyEvent → ai_safety_events<br/>(human_decision: pending)"]
    end

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    class AC1,AC2,AC3,VS1,VS2,VS3 c
```

Ad compliance (`src/lib/compliance.ts`) is a **post-generation classifier** — it labels but never alters or blocks creative (fail-soft). Voice/GBP safety (`src/lib/voice/safety.ts`) is a stricter **auto-publish gate** with a human-review queue in `ai_safety_events`.

---

## Key files

| Concern | File |
|---------|------|
| Headers / CSP / CSRF gate | `src/proxy.ts` |
| CSRF mechanics | `src/lib/csrf.ts` |
| Rate limiting | `src/lib/rate-limit.ts`, `with-rate-limit.ts`, `rate-limit-tiers.ts` |
| Constant-time admin compare | `src/lib/api-helpers.ts` (`safeCompare`) |
| Cron / V1 / session auth | `cron-auth.ts`, `v1-auth.ts`, `session-auth.ts` |
| Data deletion | `src/app/api/data-deletion/route.ts`, `meta-callback/route.ts` |
| Retention cron | `src/app/api/cron/data-retention/route.ts` |
| Ad compliance | `src/lib/compliance.ts` |
| Voice safety | `src/lib/voice/safety.ts`, `blocklist.ts` |
