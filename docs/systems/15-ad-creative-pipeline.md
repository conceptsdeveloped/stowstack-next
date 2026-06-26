# 15 · Ad & Creative Generation + Publishing Pipeline

> **⚠️ Angelo's domain.** This document is **read-only study material** — it describes the system so the team can understand it. Per CLAUDE.md, do **not** modify the ad-platform or creative-generation internals without coordinating with Angelo.

> **The headline:** A funnel is the strategy object that owns everything. From a funnel, AI generates ad variations (copy via Anthropic, image/video via FAL.ai), each compliance-checked, then published to Meta/Google/TikTok (always **PAUSED** for manual review), with spend synced back and attributed to the originating creative.

---

## 1. The end-to-end pipeline

```mermaid
flowchart TB
    FUN["FUNNEL (strategy)<br/>archetype · config · budget"] --> BRIEF["creative_briefs"]
    BRIEF --> VAR["ad_variations<br/>(copy + image + video)"]
    VAR --> COMP{"validateCompliance()<br/>passed / flagged / failed"}
    COMP --> APPROVE["status: approved"]
    APPROVE --> CONN["platform_connections<br/>(Meta/Google/TikTok OAuth)"]
    CONN --> PUB["publish-ad → publish_log<br/>⚠️ campaigns created PAUSED"]
    PUB --> SPEND["campaign_spend (synced from platform)"]
    SPEND --> ATTR["creative_performance<br/>(spend attributed to variation)"]
    ATTR --> ALERT["alert_history<br/>(CPL spike, low ROAS, wins)"]
    ATTR -.->|feeds| SYNTH["synthesis → doctrine<br/>(see doc 14)"]

    classDef strat fill:#1e1d1b,stroke:#141413,color:#faf9f5
    classDef gen fill:#faf9f5,stroke:#788c5d,color:#141413
    classDef pub fill:#e8e6dc,stroke:#141413,color:#141413
    class FUN,SYNTH strat
    class BRIEF,VAR,APPROVE gen
    class CONN,PUB,SPEND,ATTR,ALERT pub
```

---

## 2. Funnels — the strategy layer that owns the graph

```mermaid
erDiagram
    facilities ||--o{ funnels : owns
    funnels ||--o{ ad_variations : owns
    funnels ||--o{ landing_pages : owns
    funnels ||--o{ drip_sequence_templates : owns
    funnels ||--o{ creative_performance : tracks
    funnels ||--o{ funnel_stage_metrics : tracks
    funnels ||--o{ partial_leads : captures
```

`funnels` carries `archetype` (social_proof, convenience, urgency, lifestyle, custom), `status` (draft → testing → live → paused → archived), `config` Json, `daily_budget`, `target_audience`. The funnel is the **cascade root** — `ad_variations`, `landing_pages`, and `drip_sequence_templates` all carry a nullable `funnel_id`.

### Status transitions have side effects

```mermaid
stateDiagram-v2
    direction LR
    draft --> testing
    testing --> live : publishes draft LPs + approves draft ad_variations
    live --> paused : reverts published LPs to draft
    paused --> live
    live --> archived
    note right of live
      PATCH to 'live':
      landing_pages → published (+published_at)
      ad_variations → approved
      re-syncs drip templates from config
    end note
```

`/api/funnels/generate` is the **orchestrator** — it creates a full funnel by internally calling the individual generation routes (`facility-creatives` → `generate-image` → `landing-pages/generate`) with the admin key, then wires post-conversion + recovery drip templates.

---

## 3. Creative generation — `ad_variations` is the hub object

```mermaid
graph TB
    CTX["buildFacilityContext()<br/>facilities + places_data + onboarding<br/>+ PMS units/snapshots/specials<br/>→ occupancy-aware STRATEGIC DIRECTIVE"]
    CTX --> INJECT["Inject: brand doctrine + market intel<br/>+ style refs + facility learnings + creative directive"]
    INJECT --> GEN{"platform"}
    GEN -->|meta_feed| M["4 variations<br/>(social_proof/convenience/urgency/lifestyle)"]
    GEN -->|google_search| G["1 RSA: 15 headlines / 4 descriptions"]
    GEN -->|email_drip| E["4-email sequence"]
    GEN -->|landing_page| L["page sections"]
    M & G & E & L --> COMP["validateCompliance() per variation"]
    COMP --> INS["ad_variations (status=draft,<br/>compliance_status + compliance_flags)"]

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    classDef ai fill:#faf9f5,stroke:#788c5d,color:#141413
    class CTX,INJECT,GEN,INS c
    class M,G,E,L,COMP ai
```

**`ad_variations`** is the central creative object — joined to `creative_briefs` (upstream) and `publish_log` + `creative_performance` + `drip_sequence_templates` (downstream). Fields: `platform`, `format`, `angle`, `content_json`, `asset_urls`, `status` (draft/review/approved/published/rejected), `compliance_status`, `funnel_id`, `brief_id`.

### Generation engines

| Asset | Engine | Route |
|-------|--------|-------|
| **Copy** | Anthropic `claude-sonnet-4-20250514` | `facility-creatives` |
| **Image** | Anthropic (prompt) → **FAL.ai Flux Realism** → Vercel Blob | `generate-image` |
| **Video** | Anthropic (brief) → **FAL.ai** PixVerse V6 / Wan2.2 / FFmpeg merge | `generate-video` |
| **Social** | Anthropic-only (seasonal-aware) | `generate-social-content`, `generate-social-post` |

Every copy generation injects **brand doctrine** (`@/lib/brand-doctrine`), **facility learnings** (`@/lib/facility-learnings`), market intel, and style references — this is the consumption side of the [Operator-OS feedback loop](14-operator-os-ai.md).

**Compliance** (`validateCompliance`) runs before every insert, storing `compliance_status`/`compliance_flags`. It's **advisory** — failure defaults to passed, so generation never blocks. See [11 · Security & Compliance](11-security-compliance.md) §6.

---

## 4. Platform connections (OAuth)

```mermaid
graph LR
    PC["platform_connections<br/>unique facility_id+platform<br/>status: disconnected/connected/error"]
    META["Meta → facebook.com/v21.0/dialog/oauth<br/>→ /api/auth/meta/callback"]
    GOOG["Google → accounts.google.com/o/oauth2<br/>access_type=offline → /api/auth/google/callback"]
    TT["TikTok → tiktok.com/v2/auth/authorize<br/>→ /api/auth/tiktok/callback"]
    META & GOOG & TT --> PC
    PC --> TOK["stores access_token, refresh_token,<br/>token_expires_at, account_id, page_id"]

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    class PC,META,GOOG,TT,TOK c
```

Signed OAuth state via `@/lib/oauth-state`. The callback routes exchange the code and write tokens back to `platform_connections`. One connection per `(facility, platform)`.

---

## 5. Publishing — two paths, always PAUSED for paid

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin
    participant Pub as /api/publish-ad
    participant Conn as platform_connections
    participant Plat as Meta / Google / TikTok
    participant Log as publish_log

    Admin->>Pub: {variationId, connectionId, imageUrl, landingUrl}
    Pub->>Conn: require status=connected
    Pub->>Log: row status=pending
    alt Meta
        Pub->>Plat: adimage → campaign(PAUSED) → adset(PAUSED)<br/>→ adcreative → ad(PAUSED)
    else Google Ads (API v17)
        Pub->>Plat: refresh token → budget → campaign(PAUSED)<br/>→ adGroup → RSA/RDA
    else TikTok
        Pub->>Plat: refresh token → PHOTO post (PULL_FROM_URL)
    end
    Plat-->>Pub: external_id + url
    Pub->>Log: status=published + external_id/url (transaction)
    Pub->>Pub: ad_variations.status = published
    Note over Plat: ⚠️ Every paid campaign created PAUSED — manual activation required
```

| Path | Route | Targets | Backing table |
|------|-------|---------|---------------|
| **Paid ads** | `publish-ad` | Meta / Google Ads / TikTok (campaigns, **PAUSED**) | `publish_log` |
| **Organic social** | `publish-social` | FB / IG / GBP posts | `social_posts` (Prisma model) |

Publishing UI lives in the `ad-publisher/`, `tiktok-creator/`, and `google-ads-lab/` facility tabs.

---

## 6. Spend → attribution → alerts

```mermaid
flowchart TD
    SYNC["/api/campaign-spend POST<br/>pulls Meta Graph Insights (daily)"] --> CS[("campaign_spend<br/>unique facility+platform+campaign+date")]
    CS --> ATTR["attributeSpendToVariations()<br/>JOIN publish_log.response_payload->>'campaignId'<br/>= campaign_spend.campaign_id"]
    ATTR --> CP[("creative_performance<br/>monthly per-variation: spend, CTR, CPC, leads, move_ins")]
    CP --> SYNTH["→ weekly synthesis (doc 14)"]

    CC["cron check-campaign-alerts (8 AM)"] --> GEN["generateAlerts():<br/>cpl_spike · low ROAS · zero-leads-with-spend<br/>· move-in drop · high-ROAS win"]
    GEN --> AH[("alert_history (raw SQL)<br/>dedup vs last 24h")]
    AH --> ACK["/api/alert-history PATCH → acknowledge"]

    SA["cron sync-audiences (Sun 1 AM)"] --> AS[("audience_syncs<br/>ready → synced (Meta custom audiences)")]

    classDef c fill:#e8e6dc,stroke:#141413,color:#141413
    classDef store fill:#1e1d1b,stroke:#141413,color:#faf9f5
    class SYNC,ATTR,CC,GEN,ACK,SA c
    class CS,CP,AH,AS store
```

> **⚠️ The attribution join is fragile and worth knowing:** spend ties back to a specific creative **only** via `publish_log.response_payload->>'campaignId' = campaign_spend.campaign_id`. That JSON-path equality is the single link between dollars and the ad that spent them.

`alert_history` is a **raw-SQL table** (like `sessions`/`alert_history`), written via raw `INSERT` and absent from `schema.prisma`. Note `social_posts` and `audience_syncs`, despite also being raw-SQL-written in places, **are** real Prisma models (`schema.prisma`) — don't assume "raw SQL write" means "not in the schema."

---

## 7. Google Ads / TikTok specifics

- `google-ads-keywords` — Anthropic generates keyword recommendations from facility context + PMS data → feeds the `google-ads-lab` UI.
- `google-conversion` — fires Google Ads conversion tracking (gclid + value) back to `googleadservices.com` (closes the Google-side conversion loop).
- `tiktok-creator` tab — builds photo slideshows (`slideshow-renderer.ts`), published via `publish-ad` as a TikTok PHOTO post.

---

## Models written at each stage

| Stage | Route | Writes |
|-------|-------|--------|
| Funnel | `funnels`, `funnels/generate` | `funnels`, `drip_sequence_templates` |
| Brief + copy | `facility-creatives` | `creative_briefs`, `ad_variations` |
| Image | `generate-image` | Vercel Blob → `ad_variations.asset_urls` |
| Video | `generate-video` | FAL output URLs |
| Social | `publish-social` | `social_posts` |
| Connect | `platform-connections` + `auth/*/callback` | `platform_connections` |
| Publish (paid) | `publish-ad` | `publish_log`, `ad_variations.status` |
| Spend | `campaign-spend` | `campaign_spend` |
| Attribution | `lib/attribution.ts` | `creative_performance` |
| Alerts | `cron/check-campaign-alerts` | `alert_history` |
| Audiences | `cron/sync-audiences` | `audience_syncs` |

---

## Key files (read-only)

| Concern | File |
|---------|------|
| Funnels | `src/app/api/funnels/route.ts`, `funnels/generate/route.ts`, `/admin/funnels` |
| Archetype defs | `src/components/admin/facility-tabs/ad-studio/types.ts` |
| Copy generation | `src/app/api/facility-creatives/route.ts` |
| Image/video | `generate-image`, `generate-video` routes |
| Platform OAuth | `src/app/api/platform-connections/route.ts`, `auth/{meta,google,tiktok}/callback` |
| Publishing | `src/app/api/publish-ad/route.ts`, `publish-social/route.ts` |
| Spend + attribution | `campaign-spend/route.ts`, `src/lib/attribution.ts` |
| Alerts | `cron/check-campaign-alerts`, `alert-history`, `campaign-alerts` routes |
| Creative tabs | `creative-studio/`, `ad-studio/`, `ad-publisher/`, `google-ads-lab/`, `tiktok-creator/` |
