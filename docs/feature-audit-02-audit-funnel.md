# 02 — Audit Tool → Call Booking Funnel

**Priority:** BUILD NOW
**Why it matters:** This is the entire top-of-funnel. Every paying customer starts here. If it leaks, revenue never arrives.

---

## Current Funnel Flow

```
Entry Points:
  /audit-tool (Quick Google Audit — instant, no lead capture)
  /diagnostic (Deep AI Diagnostic — 5-step form)
  /#cta on homepage (Free Audit Request form + Cal.com embed)

Lead Capture:
  Homepage CTA form → POST /api/audit-form → creates facility record (status: intake)
  → Admin notification email sent immediately

Admin Processing (Manual):
  1. Admin runs POST /api/facility-lookup (Google Places scrape)
  2. Admin triggers POST /api/audit-generate (Claude AI analysis + competitor data)
  3. Admin reviews generated audit
  4. Admin approves via POST /api/audit-approve
     → Generates unique slug (e.g., facility-name-a1b2)
     → Creates shared_audits record (90-day expiration)
     → Emails lead with link + Calendly booking link
     → Updates pipeline_status to audit_sent

Prospect Views Audit:
  /audit/[slug] — comprehensive diagnostic report
  → View count tracked
  → 1st view → admin email: "Audit Opened"
  → 3+ views → admin email: "Hot Lead Alert"

Booking:
  CTA buttons on audit page → cal.com/storageads/30min
  Cal.com embed on homepage CTA section
```

---

## What Exists

### Quick Google Audit (`/audit-tool`) — Working

| Feature | Status |
|---------|--------|
| Google Places lookup (name + location) | Working |
| Instant score (0-100) on 6 dimensions | Working |
| Google rating, review volume, photos, website, phone, status | Working |
| Photo carousel from Google Places | Working |
| Customer review display | Working |
| Letter grade (Excellent/Strong/Moderate/Needs Work) | Working |

**Gap:** No lead capture on this page. CTA says "Want a full marketing audit?" and links to `/#cta`. A prospect who uses this tool and doesn't scroll down to the homepage CTA is lost.

### Deep Diagnostic (`/diagnostic`) — Working

5-step form collecting:
1. Facility info (name, address, contact, website)
2. Occupancy data (current %, momentum, move-ins/outs, unit count)
3. Marketing (channels, ad spend, Google Ads performance, who manages)
4. Digital presence (reviews, GBP, website age, PMS platform)
5. Priorities (biggest issue, fix first, aggressiveness, urgency, notes)

**Gap:** Unclear if this auto-generates an audit or still requires admin review. The form submits to `/api/diagnostic-intake` but the connection to audit generation isn't obvious.

### Homepage CTA Section — Working

| Feature | Status |
|---------|--------|
| Left panel: audit request form | Working — 10 fields, creates facility record |
| Right panel: Cal.com calendar embed | Working — 30-min booking with Blake |
| Admin notification on form submit | Working — email with all form data |
| Trust signals (no contracts, storEDGE integrated, etc.) | Working |

### AI Audit Generation — Working

| Feature | Status |
|---------|--------|
| Google Places data fetch | Working |
| Competitor research (5 nearby) | Working |
| Claude API analysis → structured JSON | Working |
| Admin review before sending | Working (manual) |

### Shared Audit Page (`/audit/[slug]`) — Working & Compelling

This page is the strongest conversion asset in the funnel. Sections include:

| Section | Impact |
|---------|--------|
| Overall score (0-100) with animated ring | High — immediate diagnostic feel |
| Vacancy cost alert (monthly/annual $ loss) | Very high — makes inaction expensive |
| Industry benchmark comparison table | High — shows gaps vs peers |
| Revenue optimization opportunity ($) | High — quantifies upside |
| 90-day projection (Act vs Don't Act) | Very high — urgency creation |
| Cost of waiting (6/12 month projections) | High — loss aversion |
| Category breakdown (8 areas with red/yellow/green flags) | High — thorough diagnostic feel |
| StorageAds platform capabilities (6-panel) | Medium — soft sell |
| "Book a Walkthrough" CTA | Critical — conversion point |

**Vacancy cost math:** Total Units x (1 - Occupancy%) x $110/mo = Monthly loss. Example: 200 units at 80% = $4,400/mo = $52,800/yr at risk. This is shown prominently.

### View Tracking — Working

| Trigger | Action |
|---------|--------|
| First view | Email to admin: "Audit Opened: [Facility] (Score: X/100)" |
| 3+ views | Email to admin: "Hot Lead Alert: [Facility] has viewed 3+ times" |
| Every view | Increment view count on shared_audits record |

---

## What's Missing

### Critical Gaps

1. **No lead capture on `/audit-tool`**
   - Quick audit page has no email/name collection
   - Prospect gets their score and leaves
   - Should at minimum gate the full results behind email, or add inline form
   - This is the highest-traffic entry point and it captures zero leads

2. **No automated follow-up if prospect doesn't book**
   - After audit is sent, if prospect views but doesn't book a call, nothing happens
   - No drip email sequence: "Here's what you're missing" → "Cost of waiting" → "Book a call"
   - Drip infrastructure exists (`drip_sequences` table) but isn't connected to audit funnel
   - Huge leak — prospect sees audit, thinks "I'll do it later," and forgets

3. **Cal.com booking doesn't update pipeline**
   - When someone books a call, facility `pipeline_status` stays at `audit_sent`
   - Blake has no automated way to know a booking came from a specific lead
   - No pre-call context email to Blake with lead details
   - Should auto-update to `call_booked` and send Blake a prep email

4. **Manual admin approval loop is slow**
   - Every audit requires: lookup → generate → review → approve (4 manual steps)
   - Time from form submit to prospect receiving audit could be hours/days
   - Speed matters — prospect is most engaged immediately after submitting
   - Consider: auto-approve for audits above a quality threshold, or queue for review with 2-hour SLA

5. **90-day audit expiration with no re-engagement**
   - After 90 days, link dies
   - No email warning before expiration: "Your audit expires in 7 days — book a call before it's gone"
   - Wasted opportunity for urgency-based re-engagement

### Secondary Gaps

6. **No UTM tracking on audit emails** — can't track which email CTA drove the booking
7. **No A/B testing on audit page CTAs** — only one version of CTA copy
8. **Audit page has no social proof** — no testimonials or case study results
9. **No SMS follow-up option** — email-only; many operators prefer text

---

## What to Build (Prioritized)

### P0 — Stops the Biggest Leaks

| Task | Effort | Impact |
|------|--------|--------|
| Add email capture to `/audit-tool` (gate full results or add inline form) | Small | Captures leads from highest-traffic page |
| Build 3-email drip after audit sent (day 1, day 3, day 7) | Medium | Re-engages prospects who didn't book |
| Connect Cal.com webhook → update pipeline_status to `call_booked` | Small | Blake knows which leads booked |
| Send Blake pre-call context email when booking happens | Small | Better sales call prep |

### P1 — Speeds Up the Funnel

| Task | Effort | Impact |
|------|--------|--------|
| Auto-approve audits above quality threshold (score > 50) | Small | Cuts hours off response time |
| Add expiration warning email (7 days before audit expires) | Small | Urgency-based re-engagement |
| Add UTM parameters to audit email links | Small | Track email → booking conversion |
| Add facility case study results to audit page footer | Small | Social proof at conversion point |

### P2 — Optimization

| Task | Effort | Impact |
|------|--------|--------|
| A/B test audit page CTA copy/placement | Medium | Optimize booking rate |
| Add SMS follow-up option (Twilio) | Medium | Reach operators who don't check email |
| Deep diagnostic → auto-generate audit (skip manual review) | Medium | Faster time to value |
| Add referral mechanism ("Know another operator?") to audit page | Small | Organic growth |

---

## Key Files

```
Entry Points:
  src/app/audit-tool/page.tsx + audit-client.tsx   (quick Google audit)
  src/app/diagnostic/page.tsx + diagnostic-form.tsx (deep diagnostic)
  src/components/marketing/cta-section.tsx          (homepage form + Cal.com)

Audit Generation:
  src/app/api/facility-lookup/route.ts    (Google Places scrape)
  src/app/api/audit-generate/route.ts     (Claude AI analysis)
  src/app/api/audit-approve/route.ts      (approve + email to lead)
  src/app/api/audit-form/route.ts         (homepage form handler)

Shared Audit Display:
  src/app/audit/[slug]/page.tsx           (full diagnostic report)
  src/app/api/audit-load/route.ts         (load audit + view tracking)

Schema:
  prisma/schema.prisma → facilities, audits, shared_audits, places_data
```
