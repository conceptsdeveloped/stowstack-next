# 05 — Reactivation + Referral Loop

**Pillar:** Demand Generation
**Strategic priority:** High leverage
**Build size:** 5 phases (~5 sessions)
**Depends on:** PMS upload data being present in DB (current state: manual PDF/CSV/XLSX upload, Phase 1 per CLAUDE.md)
**Blocks:** None.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**⚠️ MAJOR OVERLAP — most of this file's schema is already built.**

**Existing schema covers (DO NOT recreate):**
- `tenants` — has `move_in_date`, `moved_out_date`, `move_out_reason`, contact info, `monthly_rate`. **This is the `former_tenants` table** — filter by `moved_out_date IS NOT NULL`.
- `moveout_remarketing` — already has `sequence_status`, `current_step`, `total_steps`, `last_sent_at`, `next_send_at`, `opened_count`, `clicked_count`, `converted`, `new_tenant_id`, `offer_type`, `offer_value`. **This IS the win-back sequence engine.**
- `nurture_sequences` + `nurture_enrollments` + `nurture_messages` — generic multi-touch sequence engine usable for win-back content delivery.
- `referral_codes` — same name as roadmap-specced. Has `code`, `referrer_name/email`, `credit_balance`, `total_earned`, `referral_count`, `status`.
- `referrals` — has `referred_name/email/phone`, `status`, `credit_amount`, `credit_issued`, `signed_up_at`, `activated_at`.
- `referral_credits` — has `type`, `amount`, `description`, `balance_after`.

**Net-new to build:** Practically nothing on the schema side.

**Revised Phase 1 focus:** The work is **integration + UI**, not schema. Revised phasing:

- **Phase 1 (revised):** Wire trigger on PMS upload: when `tenants.moved_out_date` flips from NULL to a date, enroll into `moveout_remarketing` with sequence_status = "pending", schedule first touch.
- **Phase 2 (revised):** Build cron `POST /api/cron/moveout-remarketing-tick` that picks up rows where `next_send_at <= now()`, sends via Resend/Twilio, advances `current_step`.
- **Phase 3 (revised):** Build admin UI surfacing `moveout_remarketing` performance, `referral_codes` distribution, `referrals` conversion. Win-back conversion already tracked via `moveout_remarketing.converted` + `new_tenant_id`.
- **Phase 4 (revised):** Wire `?ref=CODE` URL capture into landing pages, audit tool intake, AI receptionist intake. All write to existing `referrals` table.
- **Phase 5 (revised):** Manager UI for `referral_credits` payouts (already tracked).

The specced new tables (`former_tenants`, `winback_*`, `referral_redemptions`, `referral_credits_pending`) are all redundant — use the existing equivalents.

---

## Why This Exists

Two of the cheapest move-ins a facility ever gets are:
1. A former tenant who churned 6–18 months ago and now needs storage again.
2. A current tenant's friend, neighbor, or family member.

Both have near-zero ad cost, high trust, and faster conversion. Most operators do neither systematically. Win-back is "we send a postcard every year if we remember." Referrals are "we have a flyer in the office."

## What "Done" Looks Like

**Win-back:** Every churned tenant gets a 4-touch sequence (email + SMS) starting 90 days after move-out and continuing at 180/270/365 days, each with a different offer escalation. Performance reported per facility.

**Referral:** Every current tenant has a unique referral code. When it's used, the referrer gets a credit applied to next month's rent, the referred gets a discount. Codes are auto-distributed in the existing post-move-in flow, displayed in the client portal, and trackable per facility.

## Strategic Value

- **Compounds with tenure.** A facility with 5 years of churn data has thousands of reactivation candidates. New entrants have zero.
- **Defensible retention.** Referral credits create lock-in for the referrer. Win-back data raises switching cost.
- **Low marginal cost.** Email is free, SMS is sub-cent, credits come out of margin not budget.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Win-back and referral are independent — Phase 1–3 build win-back end-to-end before Phase 4–5 start referrals.

### Phase 1 — Move-Out Audience Extraction

**Goal:** From uploaded PMS data, build a normalized `former_tenants` table with contact info, move-out date, last unit, last rate, reason if available.

**Database changes:**
```prisma
model former_tenants {
  id              String   @id @default(uuid())
  facility_id     String
  source_upload_id String? // ref to pms_uploads table if exists
  first_name      String?
  last_name       String?
  email           String?
  phone           String?
  email_hash      String?  // for dedupe + privacy
  phone_hash      String?
  unit_size       String?
  last_rate       Decimal? @db.Decimal(10, 2)
  moved_in_at     DateTime?
  moved_out_at    DateTime
  tenure_months   Int?
  move_out_reason String?  // if PMS captures
  do_not_contact  Boolean  @default(false)
  source_record_id String? // upstream tenant id for re-upload merging
  ingested_at     DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@index([facility_id, moved_out_at])
  @@unique([facility_id, source_record_id])
}
```

**Parser updates:**
- Update PMS upload parser to extract move-outs into this table (existing parser likely handles active tenants).
- Support storEDGE, Sitelink, Yardi Storage Suite, and Easy Storage Solutions report formats. One parser per format.

**Verification:**
- [ ] Upload a sample PMS report → 50+ former tenants populated
- [ ] Re-upload is idempotent (no duplicate rows for same `source_record_id`)
- [ ] DNC list respected — `do_not_contact` toggleable from admin UI
- [ ] PII hashed where used for dedupe

**Out of scope:** Sequence sending, referral codes.

**Commit message:**
```
feat(reactivation): former tenant audience extraction (roadmap 05 phase 1)
```

---

### Phase 2 — Win-Back Sequence Engine

**Goal:** 4-touch sequence (90/180/270/365 days post-move-out) via Resend (email) and Twilio (SMS).

**Sequence definition:**
- Phase 1 (90d): "Hope your move went well" — light reminder, no offer
- Phase 2 (180d): "Need storage again?" — 50% off first month
- Phase 3 (270d): personalized — references the unit size they had, current available rate
- Phase 4 (365d): final offer, "your old unit is open" if true

**Database changes (build on existing drip infrastructure if present):**
```prisma
model winback_sequences {
  id              String   @id @default(uuid())
  facility_id     String
  former_tenant_id String
  current_step    Int      // 1..4
  next_send_at    DateTime
  status          String   // "active" | "paused" | "complete" | "converted" | "opted_out"
  started_at      DateTime @default(now())
  completed_at    DateTime?

  facility        facilities @relation(fields: [facility_id], references: [id])
  former_tenant   former_tenants @relation(fields: [former_tenant_id], references: [id])

  @@index([next_send_at, status])
}

model winback_messages {
  id              String   @id @default(uuid())
  sequence_id     String
  step            Int
  channel         String   // "email" | "sms"
  sent_at         DateTime @default(now())
  opened          Boolean  @default(false)
  clicked         Boolean  @default(false)
  replied         Boolean  @default(false)
  resend_message_id String?
  twilio_sid      String?

  sequence        winback_sequences @relation(fields: [sequence_id], references: [id])
}
```

**Cron:**
- `POST /api/cron/winback-tick` — runs hourly. Picks up sequences where `next_send_at <= now() AND status = "active"`. Sends next message. Advances step.

**Templates:**
- Stored in `src/lib/templates/winback/` as separate files per step. Variables: `{first_name}`, `{unit_size}`, `{facility_name}`, `{offer_code}`.
- All emails from `*@storageads.com` per CLAUDE.md.

**Opt-out:**
- Every email has unsub link → flips `do_not_contact = true` on `former_tenants`.
- SMS replies "STOP" handled by Twilio webhook → same flip.

**Verification:**
- [ ] One test tenant enrolled, all 4 steps fire on schedule (use accelerated timestamps in test)
- [ ] Opt-out from email or SMS halts sequence within 5 minutes
- [ ] `winback_messages` records open/click events
- [ ] No more than one message per tenant per 24 hours

**Out of scope:** Conversion tracking, referrals.

**Commit message:**
```
feat(reactivation): win-back sequence engine (roadmap 05 phase 2)
```

---

### Phase 3 — Win-Back Conversion Attribution + Reporting

**Goal:** When a former tenant re-rents (detected via PMS re-upload or direct lead match), close the loop. Report conversion rate per step, per facility.

**Logic:**
- On PMS upload, match new tenants against `former_tenants` (by `email_hash`, `phone_hash`, name+last4-of-phone fuzzy).
- If matched and tenant is in an active `winback_sequences` row, mark `status = "converted"` and write to `winback_conversions`.

**Database:**
```prisma
model winback_conversions {
  id              String   @id @default(uuid())
  facility_id     String
  former_tenant_id String
  sequence_id     String
  converted_at    DateTime @default(now())
  step_at_conversion Int
  new_unit_size   String?
  new_rate        Decimal?
  attributed_message_id String? // last touched message before conversion

  facility        facilities @relation(fields: [facility_id], references: [id])
}
```

**Reporting:**
- `/admin/winback` per facility: enrolled, messages sent, opens, clicks, conversions, ROI estimate.
- Per-step conversion rate (which message converts best).

**Verification:**
- [ ] Re-uploading a former tenant as active triggers conversion match
- [ ] Conversion attribution credits the last-touched step
- [ ] Report renders with real numbers for at least one test facility

**Out of scope:** Auto-tuning offer amounts. Referrals.

**Commit message:**
```
feat(reactivation): win-back conversion attribution (roadmap 05 phase 3)
```

---

### Phase 4 — Referral Code Infrastructure

**Goal:** Every current tenant gets a unique referral code. Codes are usable on landing pages and audit/signup flow. Credits are tracked.

**Database:**
```prisma
model referral_codes {
  id            String   @id @default(uuid())
  facility_id   String
  tenant_id     String?  // ref to current tenants table when that exists
  external_tenant_id String? // PMS tenant id
  code          String   @unique  // 8-char alphanumeric
  referrer_credit_cents Int @default(2500)  // $25 default
  referred_discount_cents Int @default(2500)
  status        String   @default("active")
  created_at    DateTime @default(now())

  facility      facilities @relation(fields: [facility_id], references: [id])
  redemptions   referral_redemptions[]
}

model referral_redemptions {
  id              String   @id @default(uuid())
  code_id         String
  referred_lead_id String? // ref to leads table
  redeemed_at     DateTime @default(now())
  applied_credit_at DateTime?
  applied_discount_at DateTime?
  status          String   // "redeemed" | "converted" | "credited" | "reversed"

  code            referral_codes @relation(fields: [code_id], references: [id])

  @@index([code_id])
}
```

**Generation:**
- On PMS upload of an active tenant, create a code if one doesn't exist.
- Surface in client portal: "Your referral code: ABC12345"
- Auto-include in post-move-in email (existing flow if present, otherwise add to onboarding).

**Redemption surfaces:**
- `?ref=CODE` URL param on landing pages → cookie + carries to form/checkout.
- Audit tool intake form → "Were you referred? Enter code."
- AI receptionist asks "Did anyone refer you?" → captures.

**Verification:**
- [ ] Every active tenant has a code
- [ ] Code visible in client portal
- [ ] `?ref=CODE` URL persists through the funnel
- [ ] Invalid codes don't crash, just no credit

**Out of scope:** Credit application to PMS (manual for now — flag for facility manager). Auto-payout.

**Commit message:**
```
feat(referral): code infrastructure and redemption tracking (roadmap 05 phase 4)
```

---

### Phase 5 — Credit Application + Referral Portal Surface

**Goal:** When a referred lead converts to a move-in, both sides see their reward applied. Currently a flag for the facility manager to process (PMS write-back is future scope).

**Conversion match:**
- When a new tenant matches a `referral_redemptions` row (via the code in their lead record), flip to `converted`.
- Generate two tasks:
  1. Apply referrer credit (notify facility manager + log to `referral_credits_pending`)
  2. Apply referred discount (already factored at signup if discount was promo code)

**Portal surface:**
- New tab in client portal: "Refer + Earn"
- Shows: referral code, current credit balance, history of who you've referred and status

**New table:**
```prisma
model referral_credits_pending {
  id              String   @id @default(uuid())
  facility_id     String
  redemption_id   String
  referrer_external_id String  // PMS tenant id
  amount_cents    Int
  status          String   // "pending_manager" | "applied" | "voided"
  created_at      DateTime @default(now())
  applied_at      DateTime?
}
```

**Reporting:**
- `/admin/referrals` per facility: total codes, redemptions, conversions, credits pending, lifetime referred-revenue.

**Verification:**
- [ ] Test referral → conversion → credit row in `referral_credits_pending`
- [ ] Facility manager sees credit task in admin
- [ ] Tenant sees credit in portal
- [ ] Voiding a credit (e.g., referred moves out within 30 days) reverses the row

**Out of scope:** Auto-write-back to PMS (depends on PMS API, currently manual-upload only).

**Commit message:**
```
feat(referral): credit application and portal surface (roadmap 05 phase 5)
```

---

## Open Questions

- **TCPA compliance for win-back SMS.** Prior consent applies, but the prior-tenancy relationship may not be sufficient — need legal opinion before SMS to former tenants.
- **Offer amounts.** Default $25/$25 is a guess. Should be configurable per facility and A/B testable.
- **Conflict with platform-level promos.** What if facility runs a "50% off first month" already? Don't stack discounts past 50%.
- **PMS write-back.** Phase 5 leaves credit application as a manager task. When PMS APIs land (post-Phase-1), automate.

## Anti-Goals

- Not building a generic loyalty program.
- Not sending more than 4 win-back touches per tenant per year.
- Not requiring credit card to redeem a referral (friction kills it).
- Not exposing referrer's name to the referred without explicit opt-in (privacy).
