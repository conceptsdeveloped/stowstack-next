# 06 · Frontend Information Architecture

> **The headline:** Four app surfaces under one `src/app/` tree — Marketing, Admin, Portal, Partner. Each gates *itself* (admin key / portal access code / partner session / public). Clerk marks everything public, so **the auth boundaries, not the URL nesting, are the real dividers.** Note: the live homepage chapters live in `src/components/home/`, not `src/components/marketing/`.

---

## 1. The four surfaces

```mermaid
graph TB
    ROOT["src/app/<br/>(one App Router tree)"]

    ROOT --> MKT["🌐 Marketing — PUBLIC<br/>page.tsx + components/home/"]
    ROOT --> ADM["🔐 Admin — x-admin-key<br/>components/admin/admin-shell.tsx"]
    ROOT --> PORT["🔐 Portal — access code<br/>portal/page.tsx (inline gate)"]
    ROOT --> PART["🔐 Partner — ss_ session<br/>components/partner/partner-shell.tsx"]
    ROOT --> API["⚙️ api/ — 187 routes"]

    classDef root fill:#1e1d1b,stroke:#141413,color:#faf9f5
    classDef pub fill:#e8e6dc,stroke:#141413,color:#141413
    classDef gated fill:#faf9f5,stroke:#141413,color:#141413
    class ROOT,API root
    class MKT pub
    class ADM,PORT,PART gated
```

| Surface | Wrapper / gate | Auth | Audience |
|---------|----------------|------|----------|
| **Marketing** | none (public) | — | Strangers, prospects |
| **Admin** | `admin-shell.tsx` `LoginGate` | `x-admin-key` → localStorage | Blake, Angelo, VAs |
| **Portal** | inline gate in `portal/page.tsx` | email + access code → localStorage | Signed customers |
| **Partner** | `partner-shell.tsx` | `ss_` session token | Resellers, referral partners |

---

## 2. Marketing site map

```mermaid
graph LR
    HOME["/ homepage<br/>page.tsx → components/home/*<br/>hero · problem · the-loop · system<br/>capabilities · comparison · results · calculator · faq · cta"]

    subgraph Funnel["Top-of-funnel"]
        AT["/audit-tool"]
        DG["/diagnostic"]
        AS["/audit/[slug]<br/>/audit/sample"]
        DEMO["/demo"]
    end
    subgraph Content["Content / SEO"]
        BLOG["/blog · /blog/[slug]<br/>/blog/feed.xml"]
        CS["/case-studies/[slug]"]
        CMP["/compare/[competitor]"]
        GUIDE["/guide · /docs · /help · /insights"]
    end
    subgraph Convert["Conversion / pricing"]
        PRICE["/pricing"]
        CALC["/calculator"]
        COI["/cost-of-inaction"]
        LP["/lp/[slug]<br/>DB-driven landing pages"]
        WALK["/walkin · /walkin/[code]"]
    end
    subgraph Account["Account / legal"]
        SU["/signup · /verify-email"]
        LEGAL["/privacy · /terms · /cookies<br/>/dpa · /data-deletion"]
        STAT["/changelog · /status · /offline"]
    end

    HOME --> Funnel & Content & Convert & Account

    classDef home fill:#1e1d1b,stroke:#141413,color:#faf9f5
    classDef grp fill:#e8e6dc,stroke:#141413,color:#141413
    class HOME home
    class AT,DG,AS,DEMO,BLOG,CS,CMP,GUIDE,PRICE,CALC,COI,LP,WALK,SU,LEGAL,STAT grp
```

> **Component gotcha:** the live homepage lazy-loads chapters from **`src/components/home/`** (`hero`, `problem`, `letterboard`, `the-loop`, `system`, `capabilities`, `comparison`, `results`, `numbers-strip`, `demand-triggers`, `calculator`, `faq`, `cta`, `footer`). `src/components/marketing/` is a second/legacy set, only partially still referenced (`sources-note`, `sticky-mobile-cta`). When editing homepage copy, edit `home/`, not `marketing/`.

---

## 3. Admin dashboard

```mermaid
graph TB
    SHELL["admin-shell.tsx<br/>LoginGate (x-admin-key)"]

    SHELL --> PIPE["Pipeline / CRM<br/>pipeline · kanban · consumer-leads<br/>recovery · onboarding"]
    SHELL --> FACMGR["⭐ facilities<br/>the facility manager"]
    SHELL --> CAMP["Campaigns / ads<br/>campaigns · funnels · channels<br/>calls · studio · style-references"]
    SHELL --> INTEL["Intelligence<br/>intelligence · insights · portfolio<br/>audits · reports · pms-queue"]
    SHELL --> OPS["Ops / config<br/>billing · partners · sequences<br/>activity · changelog · console · settings"]

    FACMGR --> TABS["components/admin/facility-tabs/<br/>~60 lazy-loaded tabs"]
    TABS --> FEAT["Feature subdirs:<br/>ad-studio · ad-publisher · creative-studio<br/>google-ads-lab · tiktok-creator 🔒<br/>+ GBP / PMS / tenant / LP suites"]

    classDef shell fill:#1e1d1b,stroke:#141413,color:#faf9f5
    classDef grp fill:#e8e6dc,stroke:#141413,color:#141413
    classDef star fill:#faf9f5,stroke:#141413,color:#141413
    class SHELL shell
    class PIPE,CAMP,INTEL,OPS,TABS,FEAT grp
    class FACMGR star
```

**Route segments under `src/app/admin/`:** `activity`, `audits`, `billing`, `calls`, `campaigns`, `changelog`, `channels`, `console`, `consumer-leads`, `facilities`, `funnels`, `insights`, `intelligence`, `kanban`, `onboarding`, `partners`, `pipeline`, `pms-queue`, `portfolio`, `recovery`, `reports`, `sequences`, `settings`, `studio`, `style-references`.

> **🔧 Active IA redesign:** moving to *one* task-first sidebar + global facility switcher + ⌘K palette, replacing the two competing menus. Already scaffolded in `src/components/admin/`: `facility-switcher.tsx`, `facility-badge.tsx`, `command-palette.tsx`, `facility-tool-page.tsx`. **Hard rule:** relocate/re-route freely, but never modify the tool pages themselves or Angelo's ad-platform / video-image-gen internals (`ad-studio`, `ad-publisher`, `creative-studio`, `google-ads-lab`, `tiktok-creator`). Plan: `docs/admin-ia-redesign-plan.md`.

---

## 4. Portal & Partner

```mermaid
graph TB
    subgraph Portal["🔐 Client Portal — portal/"]
        direction LR
        PG["portal/page.tsx<br/>inline login (email + access code)"]
        PG --> PC[campaigns]
        PG --> PB[billing]
        PG --> PR[reports]
        PG --> PM[messages]
        PG --> PS[settings]
        PG --> PO[onboarding]
        PG --> PGBP[gbp]
        PG --> PU[upload]
    end

    subgraph Partner["🔐 Partner Dashboard — partner/"]
        direction LR
        PA["partner-shell.tsx<br/>ss_ session (email+pw+slug)"]
        PA --> RF[facilities]
        PA --> RR[revenue]
        PA --> RT[team]
        PA --> RK[api-keys]
        PA --> RW[webhooks]
        PA --> RA[audit-log]
        PA --> RC[changelog]
        PA --> RS[settings]
    end

    classDef portal fill:#faf9f5,stroke:#788c5d,color:#141413
    classDef partner fill:#faf9f5,stroke:#6a9bcc,color:#141413
    class PG,PC,PB,PR,PM,PS,PO,PGBP,PU portal
    class PA,RF,RR,RT,RK,RW,RA,RC,RS partner
```

- **Portal** sub-pages: `campaigns`, `billing`, `reports`, `messages`, `settings`, `onboarding`, `gbp`, `upload`. The session carries `{ email, accessCode }`; data calls authenticate by passing the access code (see [01 · Auth](01-authentication.md)).
- **Partner** sub-pages: `facilities`, `revenue`, `team`, `api-keys`, `webhooks`, `audit-log`, `changelog`, `settings`. Auth hook: `src/components/partner/use-partner-auth.ts`. Partners are *both* resellers and referral partners; `api-keys` + `webhooks` feed the V1 external API.

---

## 5. How the four surfaces relate

```mermaid
journey
    title One customer's path across all four surfaces
    section Marketing (public)
      Lands on homepage: 5: Stranger
      Runs /diagnostic: 4: Stranger
    section Admin (Blake)
      Reviews lead, approves audit: 5: Blake
      Marks client_signed: 5: Blake
    section Portal (customer)
      Logs in with access code: 4: Customer
      Completes onboarding wizard: 3: Customer
      Views weekly reports: 4: Customer
    section Partner (reseller)
      White-labels for their facilities: 4: Partner
      Pulls revenue + API keys: 3: Partner
```

---

## Key files

| Surface | Anchor |
|---------|--------|
| Marketing homepage | `src/app/page.tsx` + `src/components/home/` |
| Admin shell + redesign | `src/components/admin/admin-shell.tsx`, `facility-switcher.tsx`, `command-palette.tsx` |
| Facility manager | `src/app/admin/facilities/` + `src/components/admin/facility-tabs/` |
| Portal | `src/app/portal/page.tsx` |
| Partner | `src/app/partner/` + `src/components/partner/partner-shell.tsx` |
| IA redesign plan | `docs/admin-ia-redesign-plan.md` |
