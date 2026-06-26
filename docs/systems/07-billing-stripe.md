# 07 · Billing & Stripe

> **The headline:** Billing is driven by the Stripe webhook keyed on `stripe_customer_id`. But there are **two unmapped plan namespaces** (marketing `Signal/System/Compound` vs backend `launch/growth/portfolio`), prices that disagree across four files, and a `stripe_subscription_id` that no application code ever writes. The live org-creation path today is `/api/signup` (trial), not Checkout.

---

## 1. Two plan namespaces that never meet

```mermaid
graph LR
    subgraph Marketing["🖥️ Customer-facing (pricing page)"]
        M1["Signal $299"]
        M2["System $749"]
        M3["Compound $1,249"]
    end
    subgraph Backend["⚙️ Backend logic (Stripe + DB + gating)"]
        B1["launch · facilityLimit 1"]
        B2["growth · facilityLimit 3"]
        B3["portfolio · unlimited (-1)"]
    end
    Marketing -.->|"❌ no mapping in code"| Backend

    classDef m fill:#e8e6dc,stroke:#b0aea5,color:#6a6560
    classDef b fill:#faf9f5,stroke:#141413,color:#141413
    class M1,M2,M3 m
    class B1,B2,B3 b
```

The pricing page (`src/app/pricing/page.tsx`, `pricing-calculator.tsx`) speaks `Signal/System/Compound`. Every backend system — checkout, webhook, `plan-limits.ts`, gating — speaks `launch/growth/portfolio`. **Nothing translates between them.** Prices also disagree by source:

| Source file | launch | growth | portfolio |
|-------------|--------|--------|-----------|
| `src/lib/stripe.ts` `PLANS` (canonical) | $750 | $1500 | $0 (custom) |
| `client-invoices` `PLAN_PRICES` | $499 | $999 | $1499 |
| `pricing/page.tsx` | Signal $299 | System $749 | Compound $1,249 |

> **Study takeaway:** treat `src/lib/stripe.ts` `PLANS` as the source of truth for *limits* and price-IDs. The dollar figures elsewhere are display artifacts and drift. "Enterprise" is accepted as a checkout string but has no price-ID entry → it 400s; `portfolio` is the de-facto 10+/unlimited tier.

---

## 2. The Stripe webhook — the real state engine

`src/app/api/stripe-webhook/route.ts`. Verified via `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`. CSRF-exempt by path (`isCsrfExempt` matches `/api/stripe-webhook`). Handler errors return 500 so Stripe retries. **All branches key on `stripe_customer_id`.**

```mermaid
flowchart TD
    EVT([Stripe event]) --> SW{event.type}

    SW -->|checkout.session.completed| CC["handleCheckoutComplete<br/>idempotent on stripe_customer_id<br/>$transaction: create organizations (active)<br/>+ org_users (org_admin, invite_token)<br/>+ activity_log org_created<br/>then customer.update signupComplete"]
    SW -->|customer.subscription.updated| SU["handleSubscriptionUpdate<br/>updateMany set subscription_status<br/>+ plan (if metadata.plan)"]
    SW -->|customer.subscription.deleted| SD["handleSubscriptionDeleted<br/>$transaction: status=canceled<br/>+ activity_log subscription_canceled"]
    SW -->|invoice.payment_failed| PF["updateMany → past_due"]
    SW -->|invoice.payment_succeeded| PS["updateMany WHERE past_due → active"]

    classDef ok fill:#faf9f5,stroke:#788c5d,color:#141413
    classDef warn fill:#faf9f5,stroke:#6a9bcc,color:#141413
    classDef bad fill:#faf9f5,stroke:#B04A3A,color:#B04A3A
    class CC,SU,PS ok
    class PF warn
    class SD bad
```

### Subscription status state machine (on `organizations.subscription_status`)

```mermaid
stateDiagram-v2
    direction LR
    [*] --> trialing : /api/signup (live path)
    [*] --> active : checkout.session.completed
    trialing --> active : subscription.updated
    active --> past_due : invoice.payment_failed
    past_due --> active : invoice.payment_succeeded
    active --> canceled : subscription.deleted
    past_due --> canceled : subscription.deleted
    canceled --> [*]

    note right of trialing
      isSubscriptionActive():
      trialing OK unless trial_ends_at < now
      → trial_expired (gate denies)
    end note
```

---

## 3. Two checkout paths (only one is wired)

```mermaid
sequenceDiagram
    autonumber
    participant U as Prospect
    participant Sign as /api/signup (LIVE)
    participant CO as /api/create-checkout-session (unwired)
    participant Stripe as Stripe
    participant WH as stripe-webhook
    participant DB as organizations

    Note over U,DB: Path 1 — the actually-used path
    U->>Sign: signup form
    Sign->>DB: org subscription_status=trialing<br/>trial_ends_at + facility_limit from PLANS

    Note over U,DB: Path 2 — exists, but no frontend calls it
    U->>CO: POST {plan, email, facilityCount}
    CO->>Stripe: checkout.sessions.create (subscription)
    Stripe-->>WH: checkout.session.completed
    WH->>DB: create org (active) + customer metadata signupComplete
    U->>U: /api/checkout-success reads orgSlug + setup token
```

> The marketing pricing-page CTAs route to a **sales call** (`CAL_BOOKING_URL`) or `/audit-tool`, not Stripe Checkout. So in practice orgs are born `trialing` via `/api/signup`; the Checkout→webhook→active path is built but secondary/unwired.

---

## 4. Gating — how plan limits are enforced

`src/lib/plan-limits.ts` builds on `PLANS`:

```mermaid
flowchart TD
    REQ([write request]) --> ACT{"isSubscriptionActive(status, trial_ends_at)?"}
    ACT -->|"active / valid trial"| LIM{"canAddFacility / canAddLandingPage?"}
    ACT -->|"past_due / canceled / trial_expired"| DENY1["❌ gate denied"]
    LIM -->|"under limit<br/>(org.facility_limit ?? plan default)"| OK["✅ allow"]
    LIM -->|"at limit"| DENY2["❌ over_limit"]

    classDef ok fill:#faf9f5,stroke:#788c5d,color:#141413
    classDef bad fill:#faf9f5,stroke:#B04A3A,color:#B04A3A
    class OK ok
    class DENY1,DENY2 bad
```

`subscription-usage` route surfaces usage-vs-limit + feature flags (`abTesting`/`callTracking` gated to non-launch; `churnPrediction`/`whiteLabel` to portfolio). **This is feature-gating, not Stripe metered billing** — there are no `usageRecords` calls anywhere.

---

## 5. The "invoices" that aren't Stripe invoices

Two portal-side billing surfaces are **not** Stripe Invoice objects:
- `client-billing` — invoices stored in **Upstash Redis** under `billing:{accessCode}` (draft/sent/paid/overdue).
- `client-invoices` — renders an HTML invoice, emails it via **Resend** (`billing@storageads.com`), and logs `activity_log` type `invoice_sent`. The portal "invoices" list reads those activity-log rows.

---

## 6. Org deletion → Stripe cancel

```mermaid
flowchart LR
    MARK["org status=pending_deletion<br/>+ scheduled_deletion_at"] --> CRON["cron cleanup-organizations<br/>3:30 AM daily"]
    CRON --> HAS{"stripe_subscription_id<br/>present?"}
    HAS -->|yes| CANCEL["DELETE api.stripe.com/v1/subscriptions/{id}<br/>(404 = already gone, proceed)"]
    HAS -->|"no (the common case ⚠️)"| SKIP["no-op cancel step"]
    CANCEL --> PURGE["$transaction: null partial_leads.facility_id<br/>→ delete facilities (cascade)<br/>→ delete organizations (cascade)"]
    SKIP --> PURGE

    classDef warn fill:#faf9f5,stroke:#B04A3A,color:#B04A3A
    class SKIP warn
```

> **⚠️ Known gap:** `stripe_subscription_id` is **never written by any application code** (the webhook stores `stripe_customer_id`, not the subscription id). So the cancel step only fires for orgs whose subscription id was populated out-of-band. See [13 · Gaps & Seams](13-gaps-and-seams.md).

---

## Key files

| Concern | File |
|---------|------|
| Stripe client + `PLANS` | `src/lib/stripe.ts` |
| Gating | `src/lib/plan-limits.ts` |
| Checkout | `src/app/api/create-checkout-session/route.ts`, `checkout-success/route.ts` |
| Webhook (state engine) | `src/app/api/stripe-webhook/route.ts` |
| Billing portal | `src/app/api/create-billing-portal/route.ts` |
| Usage / feature gates | `src/app/api/subscription-usage/route.ts` |
| Portal invoices | `src/app/api/client-billing/route.ts`, `client-invoices/route.ts` |
| Live signup path | `src/app/api/signup/route.ts` |
| Deletion cron | `src/app/api/cron/cleanup-organizations/route.ts` |
| Org billing fields | `organizations` in `prisma/schema.prisma` (~1056-1093) |
