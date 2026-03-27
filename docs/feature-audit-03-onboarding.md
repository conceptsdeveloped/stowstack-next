# 03 — Onboarding Flow (<15 Minutes)

**Priority:** BUILD NOW
**Why it matters:** When someone says yes on a call, you need to get them live fast. Friction here kills deals. "We'll have your first campaigns live in 48 hours" only works if onboarding doesn't take a week.

---

## Current Onboarding Flow

### Step 1: Lead → Client Conversion (Admin Side)

1. Blake marks lead status as `client_signed` in admin leads management
2. System auto-generates 8-character access code (e.g., `ABC12XYZ`)
3. System creates `clients` record (email, name, facility, access code)
4. **Blake manually emails the access code to the client** — no automated delivery

### Step 2: Client First Login

1. Client goes to `/portal`
2. Enters email address
3. System sends 4-digit OTP via Resend email (10-minute expiry)
4. Client enters OTP → session stored in localStorage (24-hour TTL)
5. Legacy access code login also works as fallback

### Step 3: Portal Dashboard (First Visit)

Client sees:
- Welcome banner with facility name
- Onboarding progress bar (0% complete)
- "Continue Setup" link → `/portal/onboarding`
- Empty campaign data (no campaigns yet)
- Contact card: Blake's email + phone

### Step 4: Onboarding Wizard (5 Steps + Review)

| Step | Data Collected | Required Fields |
|------|---------------|-----------------|
| 1. Facility Details | Brand description (500 chars), brand colors, 1-5 selling points (200 chars each) | All fields + at least 1 selling point |
| 2. Target Demographics | Age range (18-99), radius (1-100 mi), income level, renter/homeowner targeting, notes | ageMin, ageMax, radius, incomeLevel |
| 3. Unit Mix & Pricing | 1-10 unit types (type, size, rate, available count), current specials/promotions | At least 1 unit with type, size, rate > 0 |
| 4. Competitor Intel | 1-5 competitors (name, distance, pricing notes), differentiation statement | Differentiation field |
| 5. Ad Preferences | Tone (Professional/Friendly/Urgent/Premium), budget ($1k-$10k+ ranges), goal (Fill Units/Lease-Up/Seasonal/Rebrand), past ad experience, notes | Tone, budget, goal |
| 6. Review | Read-only summary of all 5 steps, completion status per section | — |

- Steps can be completed in any order
- Steps can be skipped and returned to later
- Progress % shown on dashboard
- Data stored in `client_onboarding.onboarding_data` JSON column
- When all 5 complete → `completed_at` timestamp set

### Step 5: Post-Onboarding

- Message: "The StorageAds team is building your campaigns"
- Client waits for Blake to build campaigns manually
- No automated campaign creation

### Admin-Side Onboarding (Separate Flow)

A separate admin onboarding at `/admin/onboarding` with 4 steps:
1. Facility confirmation (review details, units, Google rating)
2. storEDGE connection (API key entry)
3. Ad accounts (Google Ads + Meta Business Manager connection, or "Blake manages")
4. Review

Post-setup checklist tracks: account created, facility confirmed, storEDGE connected, ad accounts connected, first campaign launched, first reservation, first move-in.

---

## What's Missing

### Critical Gaps

1. **No automated access code delivery**
   - When lead becomes `client_signed`, access code is generated but not emailed
   - Blake must manually send it
   - Should auto-send a welcome email with login instructions + access code
   - This adds unnecessary delay and manual work to every new customer

2. **No platform credential collection in client onboarding**
   - The client wizard collects brand/demographic/competitor data but NOT:
     - Google Ads account ID or OAuth connection
     - Meta Business Manager access
     - Google Business Profile access
   - These are collected separately on the admin side (`/admin/onboarding`)
   - Client must tell Blake their credentials out-of-band (email, call, screen share)
   - OAuth infrastructure exists (`platform_connections` table, Google/Meta callbacks) but isn't in the client flow

3. **No photo/creative upload step**
   - Wizard doesn't collect facility photos, logos, or existing marketing materials
   - Blake needs these to create ad creatives
   - Forces a follow-up request: "Can you send me photos of your facility?"
   - Should be a step in the wizard with drag-and-drop upload

4. **No Stripe payment setup during onboarding**
   - Payment info is collected after onboarding (separate flow)
   - Client can complete onboarding without adding a payment method
   - Risk: client completes onboarding, Blake builds campaigns, then has to chase for payment
   - Should collect payment method as part of onboarding (or at least prompt)

5. **No "time to first campaign" automation**
   - After onboarding completes, nothing happens automatically
   - Blake must manually review the onboarding data and build campaigns
   - No notification to Blake: "Client X completed onboarding — review their data"
   - No estimated timeline shown to client ("Campaigns go live in 48 hours")

6. **Onboarding takes ~20-25 minutes, not <15**
   - 5 detailed steps with text fields is thorough but slow
   - Some fields are nice-to-have, not need-to-have for launching campaigns
   - Consider: which fields are truly needed to launch the first campaign? Make those required, make the rest optional or "Phase 2" data collection

### Secondary Gaps

7. **No GBP connection in onboarding** — GBP OAuth flow isn't built (see audit 08)
8. **No storEDGE API key collection from client** — admin-only currently
9. **24-hour session TTL is short** — client may need to re-login frequently during onboarding
10. **No onboarding completion celebration** — just a message; could trigger confetti/success state + next steps

---

## Estimated Time Today

| Phase | Time | Notes |
|-------|------|-------|
| Lead → client_signed (Blake) | Variable | Depends on sales cycle |
| Blake emails access code | 5-15 min | Manual, could be instant |
| Client login (OTP) | 2-3 min | Email delivery + code entry |
| Onboarding wizard | 15-25 min | 5 text-heavy steps |
| Blake receives data, reviews | Hours-days | No notification trigger |
| Blake builds campaigns | Hours-days | Fully manual |
| **Total time to "campaigns live"** | **2-5 days** | **Target: 48 hours** |

---

## What to Build (Prioritized)

### P0 — Removes Manual Bottlenecks

| Task | Effort | Impact |
|------|--------|--------|
| Auto-send welcome email with login instructions when status → `client_signed` | Small | Eliminates manual access code delivery |
| Add onboarding completion notification to Blake (email + admin dashboard alert) | Small | Blake knows immediately when to start building |
| Add estimated timeline to post-onboarding: "Campaigns live within 48 hours" | Tiny | Sets client expectations |
| Slim onboarding to essential fields only (move nice-to-haves to "Phase 2 profile") | Medium | Gets to <15 min |

### P1 — Collects What Blake Actually Needs

| Task | Effort | Impact |
|------|--------|--------|
| Add photo/creative upload step (drag-and-drop, up to 10 photos) | Medium | Eliminates follow-up photo request |
| Add Stripe payment method collection to onboarding (or as Step 6 before review) | Medium | Payment captured before work begins |
| Add Google Ads / Meta OAuth connect buttons to client onboarding | Large | Eliminates credential exchange over email |
| Add GBP connection (requires OAuth flow — see audit 08) | Large | Blocked by missing OAuth implementation |

### P2 — Speed Improvements

| Task | Effort | Impact |
|------|--------|--------|
| Pre-populate onboarding from audit data (if lead had an audit) | Medium | Client sees data already filled in |
| Extend session TTL to 7 days during onboarding | Tiny | Less re-login friction |
| Add progress-saving auto-save (currently saves on step completion only) | Small | Less data loss if client navigates away |
| Post-onboarding checklist visible to client (campaign launch, first lead, first move-in) | Small | Engagement + transparency |

---

## Ideal Future State

```
1. Blake marks lead as client_signed (1 click)
2. System auto-sends welcome email with magic link (instant)
3. Client clicks link → lands on portal, already logged in
4. Onboarding wizard: 3 essential steps (facility, units, photos) — 10 min
5. "Add payment method" step via Stripe — 2 min
6. "Connect your accounts" step (GBP, Google Ads, Meta) — 3 min
7. Completion → Blake gets notification → reviews data → launches campaigns
8. Client sees: "Campaigns launching in 48 hours" with progress tracker
9. Total elapsed: <15 min client time, <48 hours to live campaigns
```

---

## Key Files

```
Client Portal:
  src/app/portal/page.tsx                    (dashboard with onboarding progress)
  src/app/portal/onboarding/page.tsx         (5-step wizard)
  src/components/portal/portal-shell.tsx     (auth wrapper + login)

Admin Onboarding:
  src/app/admin/onboarding/page.tsx          (admin-side setup flow)

API Routes:
  src/app/api/admin-leads/route.ts           (status → client_signed trigger)
  src/app/api/client-data/route.ts           (client profile + auth)
  src/app/api/client-onboarding/route.ts     (wizard data save/load)
  src/app/api/resend-access-code/route.ts    (OTP delivery)
  src/app/api/create-billing-portal/route.ts (Stripe portal)

Schema:
  prisma/schema.prisma → clients, client_onboarding, portal_login_codes, platform_connections
```
