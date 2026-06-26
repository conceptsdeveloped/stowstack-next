# 12 · Google Business Profile & External API + Webhooks

> **The headline:** Two integration-facing systems. **GBP** is a connect → sync → AI-draft → safety-gate → publish loop over a facility's Google listing. The **V1 API + webhooks** is the partner-facing surface: scoped `sk_live_` keys, tenant-isolated resources, and HMAC-signed outbound webhooks that auto-disable after 10 failures.

---

# Part A · Google Business Profile (GBP)

## A1. The connect → sync → respond loop

```mermaid
flowchart TD
    CONNECT["/api/auth/gbp → Google OAuth<br/>→ /api/auth/gbp/callback"] --> CONN["gbp_connections<br/>tokens + location_id (status=connected)<br/>seedFacilityQuestions()"]
    CONN --> SYNC["cron process-gbp (daily 4 AM)<br/>or manual gbp-sync"]
    SYNC --> PULL["pull reviews / Q&A / insights<br/>(Google My Business v4 + Business Info APIs)"]
    PULL --> DRAFT["generateWithVoice (Anthropic)<br/>→ ai_drafted reply/answer"]
    DRAFT --> GATE{"reviewAutoPublishDecision<br/>+ checkBlocklist"}
    GATE -->|"clean 4-5★"| PUB["publish back to Google<br/>→ published"]
    GATE -->|"low rating / blocklist"| HOLD["stay ai_drafted<br/>+ logSafetyEvent → human approve in admin"]

    SOLICIT["cron review-solicitation (daily 10 AM)<br/>email recent move-ins for a Google review"] -.->|top of loop| PULL

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    classDef ok fill:#faf9f5,stroke:#788c5d,color:#141413
    classDef hold fill:#faf9f5,stroke:#6a9bcc,color:#141413
    class CONNECT,CONN,SYNC,PULL,DRAFT,SOLICIT c
    class PUB ok
    class HOLD hold
```

## A2. GBP data models

```mermaid
erDiagram
    facilities ||--o| gbp_connections : "1:1 (OAuth)"
    facilities ||--o{ gbp_insights : "per-period metrics"
    facilities ||--o{ gbp_posts : "local posts"
    facilities ||--o{ gbp_reviews : "reviews + AI replies"
    facilities ||--o{ gbp_questions : "Q&A + AI answers"
    facilities ||--o{ gbp_profile_sync_log : "audit trail"
    facilities ||--o{ photo_refresh_prompts : "monthly nudge"
    gbp_question_templates }o..o{ gbp_questions : "global seed library"
```

| Model | Status field → values |
|-------|----------------------|
| `gbp_connections` | `status`: disconnected → connected / pending_location_selection |
| `gbp_posts` | `status`: draft → scheduled → published / failed |
| `gbp_reviews` | `response_status`: pending → ai_drafted → published |
| `gbp_questions` | `answer_status`: pending → ai_drafted → published |
| `photo_refresh_prompts` | `status`: pending → sent (unique per facility+month) |

## A3. The three GBP crons

| Cron | When | Does |
|------|------|------|
| `process-gbp` | Daily 4 AM | The engine: publish due posts, sync reviews, auto-draft + safety-gated auto-respond (4-5★ only), sync hours, refresh expiring tokens |
| `review-solicitation` | Daily 10 AM | Email tenants 7-10 days post move-in asking for a Google review (dedup via `review_solicitation_sent`) |
| `photo-refresh-prompts` | 1st of month | Nudge operators to refresh GBP photos; upsert `photo_refresh_prompts` |

Admin tabs: `gbp-full`, `gbp-insights`, `gbp-posts`, `gbp-qa`, `gbp-reviews`, `gbp-settings`. Portal gets a read-only view via `portal-gbp`.

---

# Part B · V1 External API + Webhooks

## B1. Request flow with tenant isolation

```mermaid
flowchart TD
    PARTNER["Partner app"] --> KEY["Authorization: Bearer sk_live_…"]
    KEY --> AUTH["requireApiAuth (src/lib/v1-auth.ts)<br/>SHA-256 lookup in api_keys"]
    AUTH --> CHECKS{"revoked? expired?<br/>rate limit (v1:id)?"}
    CHECKS -->|fail| ERR["401 / 429"]
    CHECKS -->|ok| SCOPE["requireScope(apiKey, 'leads:write')<br/>→ 403 if missing"]
    SCOPE --> ISO["requireOrgFacility(facilityId, orgId)<br/>→ 404 if facility not owned by org"]
    ISO --> MUT["mutation succeeds"]
    MUT --> LOG["api_usage_log (deferred) + last_used_at"]
    MUT --> WH["dispatchWebhook(orgId, event, payload)"]

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    classDef bad fill:#faf9f5,stroke:#B04A3A,color:#B04A3A
    class PARTNER,KEY,AUTH,SCOPE,ISO,MUT,LOG,WH c
    class ERR bad
```

**V1 resources & scopes:**

| Route | Scopes |
|-------|--------|
| `v1/leads` | `leads:read` / `leads:write` (fires `lead.created`/`lead.updated`) |
| `v1/tenants` | `tenants:read` / `tenants:write` (triggers lead-matching) |
| `v1/facilities` | `facilities:read` / `facilities:write` (fires `facility.updated`) |
| `v1/facility-snapshots`, `-units`, `-availability`, `-specials` | `facilities:read` / `facilities:write` / `units:read` / `units:write` |
| `v1/call-logs` | `calls:read` |
| `v1/landing-pages` | `pages:read` |
| `v1/webhooks` | `webhooks:manage` |
| `v1/api-keys` | **admin-gated** (provisioning) |
| `v1/usage` | API-key auth, returns own usage |

Keys are `sk_live_` + 20 random bytes, stored as SHA-256 `key_hash` + 8-char `key_prefix`, shown once. `requireOrgFacility` enforces that a facility belongs to the calling org — the tenant-isolation boundary.

## B2. Outbound webhook delivery

```mermaid
sequenceDiagram
    autonumber
    participant API as v1 mutation
    participant D as dispatchWebhook
    participant W as webhooks (org's active)
    participant Ext as Partner endpoint
    participant Del as webhook_deliveries

    API->>D: event (e.g. lead.created)
    D->>W: SELECT active WHERE event = ANY(events)
    loop each webhook (Promise.allSettled, fire-and-forget)
        D->>Ext: POST {event, data, timestamp}<br/>X-StorageAds-Signature: sha256=HMAC(body, secret)<br/>5s timeout
        alt 2xx
            Ext-->>D: 200 → failure_count=0, last_status
        else non-2xx / timeout
            Ext-->>D: error → incrementFailure
            Note over W: failure_count >= 10 ⇒ active=FALSE (auto-disable)
        end
        D->>Del: INSERT delivery row (always)
    end
```

**Key behaviors:**
- `VALID_EVENTS`: `lead.created`, `lead.updated`, `unit.updated`, `facility.updated`, `special.created`, `special.updated`.
- Webhook URLs must be **HTTPS**; secret is 32-byte hex, returned once.
- Each delivery is HMAC-SHA256 signed (`X-StorageAds-Signature`), with `X-StorageAds-Event` and `X-StorageAds-Delivery` (uuid) headers, 5s timeout.
- **No retry/backoff** — single attempt per event; failed deliveries are not re-queued.
- **Auto-disable at 10 consecutive failures** (`active=FALSE`).
- Every attempt records a `webhook_deliveries` row (status, response body, duration).

Partner dashboard surfaces: `/partner/api-keys` (create/list/delete keys) and `/partner/webhooks` (register, view logs, send test).

---

## Key files

| Concern | File |
|---------|------|
| GBP OAuth | `src/app/api/auth/gbp/route.ts`, `callback/route.ts` |
| GBP data routes | `gbp-insights`, `gbp-posts`, `gbp-questions`, `gbp-reviews`, `gbp-sync`, `gbp-review-settings`, `review-request`, `portal-gbp` |
| GBP crons | `cron/process-gbp`, `review-solicitation`, `photo-refresh-prompts` |
| Voice generation + safety | `src/lib/voice/generate.ts`, `safety.ts`, `blocklist.ts` |
| V1 auth | `src/lib/v1-auth.ts` |
| V1 routes | `src/app/api/v1/*` |
| Webhook delivery | `src/lib/webhook.ts`, `src/app/api/v1/webhooks/route.ts` |
| Models | `gbp_*`, `photo_refresh_prompts`, `api_keys`, `api_usage_log`, `webhooks`, `webhook_deliveries` |
