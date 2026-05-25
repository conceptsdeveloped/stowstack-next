# 06 — Reputation Funnel

**Pillar:** Demand Generation
**Strategic priority:** Critical path
**Build size:** 5 phases (~5 sessions)
**Depends on:** Existing PMS upload pipeline. Phase 4 wants GBP OAuth (per `feature-audit-08-gbp-management.md`).
**Blocks:** None.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**Existing schema covers:**
- `gbp_reviews` — has `external_review_id`, `author_name`, `rating`, `review_text`, `response_text`, `response_status`, **`ai_draft` field already present**, `responded_at`. **Phase 4's draft-response infrastructure largely exists** — needs generation logic + UI, not schema.
- `gbp_connections`, `gbp_posts`, `gbp_insights`, `gbp_questions`, `gbp_profile_sync_log` — full GBP integration scaffold.
- `tenant_communications` — generic comms log per tenant. Could host negative feedback rather than dedicated `negative_feedback` table.
- `tenants` — `moved_in_at` (in `tenants.move_in_date`) is the trigger source for Phase 1.

**Net-new to build:**
- `review_request_queue` — outbound queue per move-in
- `review_request_responses` — sentiment selector responses

**Revised Phase 1 focus:** As written. Detection logic reads from `tenants` table on PMS upload diff. For Phase 4, use existing `gbp_reviews.ai_draft` field instead of creating `facility_reviews`. For Phase 3 negative feedback, decide: dedicated `negative_feedback` table OR `tenant_communications.type = "negative_feedback"`.

---

## Why This Exists

Star rating is the single biggest local-search ranking factor and conversion lever for self-storage. The gap between a 4.2 and 4.6 facility average is the difference between page-1 and page-2 in Google Maps results. Yet most operators have no systematic review acquisition; they get reviews from angry customers and nothing from happy ones.

A simple sentiment-branched funnel — happy → Google, unhappy → private resolution — moves a typical facility from 4.2 to 4.7 within 90 days.

## What "Done" Looks Like

Every new move-in triggers a 3-touch sequence:
1. **Day 5:** "How's everything?" SMS with a 1-tap sentiment selector (👍 / 👎).
2. **Happy path (👍):** Deep link to Google review page with prefilled context.
3. **Unhappy path (👎):** Short form asking what went wrong. Routes to facility manager via SMS + dashboard.
4. **Day 30:** Reminder for non-responders.
5. **Day 90:** Long-tenure tenants get a "still happy?" pulse.

Negative reviews that land on Google despite the funnel get auto-flagged with a draft reply (Anthropic-generated, manager-approved) within 1 hour.

## Strategic Value

- **Compounding ranking.** Every star-rating delta compounds in local search visibility.
- **Defensible — slowly.** Once a facility has 200 reviews at 4.7, that's 24 months for a competitor to overtake.
- **Operator pain killer.** Most owners hate review management. Doing it for them is a retention story.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Sentiment branching (Phase 3) cannot ship until basic send (Phase 2) is solid.

### Phase 1 — Trigger System (Move-In Detection)

**Goal:** Detect new move-ins from PMS uploads. Queue review request entries in a `review_request_queue` table. No sending yet.

**Database changes:**
```prisma
model review_request_queue {
  id              String   @id @default(uuid())
  facility_id     String
  tenant_external_id String? // PMS tenant id
  tenant_first_name String?
  tenant_email    String?
  tenant_phone    String?
  moved_in_at     DateTime
  send_step       String   // "day_5" | "day_30" | "day_90"
  scheduled_for   DateTime
  status          String   // "queued" | "sent" | "responded" | "skipped" | "opted_out"
  channel         String   // "sms" | "email"
  created_at      DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@index([scheduled_for, status])
  @@index([facility_id, status])
}
```

**Detection logic:**
- On PMS upload, diff against last upload. New active tenants whose `moved_in_at` is within last 14 days → queue Day 5, Day 30, Day 90 entries.
- Skip if tenant has `do_not_contact = true` or no contact method.

**Verification:**
- [ ] Upload sample PMS data → queue populated with 3 entries per new tenant
- [ ] Re-upload doesn't duplicate (dedupe by `tenant_external_id + send_step`)
- [ ] DNC respected
- [ ] `npm run build` passes

**Out of scope:** Sending, response handling.

**Commit message:**
```
feat(reputation): move-in detection and request queue (roadmap 06 phase 1)
```

---

### Phase 2 — SMS Sending + Tracking Link

**Goal:** Cron sends queued SMS at scheduled time. Recipient gets a short link to `/r/[token]` that captures the response.

**Sending:**
- `POST /api/cron/review-requests-tick` — hourly, picks up queued entries where `scheduled_for <= now()`.
- Twilio SMS via existing integration. Email fallback via Resend if no phone.

**Tracking page:**
- New route `/r/[token]` — minimal page, brand-styled, asks "How's everything at {facility_name}?" with two emoji buttons.
- Token resolves to `review_request_queue.id` via signed JWT or DB lookup.

**Database:**
```prisma
model review_request_responses {
  id              String   @id @default(uuid())
  queue_id        String   @unique
  sentiment       String   // "positive" | "negative"
  responded_at    DateTime @default(now())
  user_agent      String?
  ip_hash         String?
}
```

**Verification:**
- [ ] Queued entry sends SMS within 1 hour of `scheduled_for`
- [ ] Recipient clicks link, sees branded sentiment selector
- [ ] Selection records in `review_request_responses`
- [ ] STOP reply opts tenant out across all sequences

**Out of scope:** Sentiment branching (just records, no follow-up logic).

**Commit message:**
```
feat(reputation): SMS sending and sentiment capture (roadmap 06 phase 2)
```

---

### Phase 3 — Sentiment Branching

**Goal:** 👍 → Google review deep link. 👎 → private resolution form, routed to facility manager.

**Happy path:**
- After 👍, redirect to Google Maps review URL pre-filled for the facility's GBP listing.
- URL format: `https://search.google.com/local/writereview?placeid={place_id}`
- Track click-through: row in `review_request_responses` updated with `google_redirect_at`.

**Unhappy path:**
- After 👎, show form: "What went wrong?" — 200 char text + optional category dropdown (cleanliness, billing, access, staff, security, other).
- On submit:
  - Notify facility manager via SMS within 60s with summary
  - Create row in `negative_feedback` table
  - Show tenant: "Thanks — {manager_name} will reach out within 24 hours."

**Database:**
```prisma
model negative_feedback {
  id              String   @id @default(uuid())
  facility_id     String
  queue_id        String?
  tenant_external_id String?
  category        String?
  message         String
  manager_notified_at DateTime?
  resolved_at     DateTime?
  resolution_notes String?
  created_at      DateTime @default(now())

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@index([facility_id, resolved_at])
}
```

**Manager dashboard:**
- New tab in facility admin: "Reputation" — unresolved negative feedback list, resolution log.

**Verification:**
- [ ] 👍 redirects to correct Google review URL
- [ ] 👎 routes to form, SMS fires to manager
- [ ] Resolved feedback removable from active queue
- [ ] Click-through tracked

**Out of scope:** Google review scraping (next phase), draft responses.

**Commit message:**
```
feat(reputation): sentiment branching and negative routing (roadmap 06 phase 3)
```

---

### Phase 4 — Google Review Monitoring + Draft Responses

**Goal:** Monitor each facility's GBP for new reviews. Generate a draft response (manager-approved) within 1 hour of any review under 5 stars.

**Source:**
- Once GBP OAuth lands (`feature-audit-08-gbp-management.md`), use GBP API to pull reviews. Until then, scrape via SerpApi.

**Database:**
```prisma
model facility_reviews {
  id              String   @id @default(uuid())
  facility_id     String
  source          String   // "google" | "yelp" | "bbb"
  source_review_id String  @unique
  author_name     String
  rating          Int
  text            String?
  posted_at       DateTime
  scraped_at      DateTime @default(now())
  facility_response String?
  facility_response_posted_at DateTime?
  draft_response  String?  // LLM-generated, manager-approved before post

  facility        facilities @relation(fields: [facility_id], references: [id])

  @@index([facility_id, posted_at])
}
```

**Draft generation:**
- On any new review with rating ≤ 4, trigger Anthropic Haiku with:
  - Review text + rating + facility context + brand voice (from `.claude/copy-voice.md`)
  - Output: 60–120 word professional response, no defensiveness, acknowledges issue, offers offline resolution
- Save as `draft_response`.

**Manager UI:**
- `/admin/reputation` — list of reviews with drafts, edit + approve + post action.

**Verification:**
- [ ] New low-star review generates draft within 1 hour
- [ ] Manager can edit + approve → posts to GBP via API (or surfaces copy-paste for manual post if no OAuth yet)
- [ ] 5-star reviews don't trigger draft

**Out of scope:** Auto-posting without manager approval (risk too high).

**Commit message:**
```
feat(reputation): Google review monitoring and draft responses (roadmap 06 phase 4)
```

---

### Phase 5 — Long-Term Pulse + Reputation Score

**Goal:** Day-90 pulse for long-tenure tenants. Per-facility reputation dashboard with trend.

**Day-90 logic:**
- Queue entry from Phase 1 fires at 90 days post-move-in.
- Same sentiment branching as Day-5.
- Catches tenants whose experience degraded post-honeymoon (billing surprise, gate issue).

**Dashboard:**
- `/admin/reputation` adds "Trend" view per facility:
  - Star rating 90-day rolling
  - Review velocity (reviews/month)
  - Sentiment from queue responses (👍 / 👎 ratio)
  - Negative feedback resolved vs unresolved
- Cross-facility view for multi-facility owners.

**Alerting:**
- If star rating drops ≥0.2 in 30 days OR negative feedback >3 unresolved, notify owner.

**Verification:**
- [ ] Day-90 fires for test tenant
- [ ] Dashboard renders with real trends
- [ ] Alert fires on synthetic rating drop

**Out of scope:** Yelp and BBB monitoring (deferred unless operator requests).

**Commit message:**
```
feat(reputation): long-term pulse and reputation dashboard (roadmap 06 phase 5)
```

---

## Open Questions

- **CAN-SPAM + TCPA.** Review-request SMS may need explicit prior consent in lease. Add a checkbox at move-in (lease addendum). Legal review required.
- **Google review-gating policy.** Google explicitly prohibits "review gating" (filtering out negative reviewers from Google solicitation). Sentiment branching is borderline — need to ensure both paths *can* go to Google if the tenant chooses, we just don't actively route negatives there.
- **Yelp review terms.** Yelp prohibits any review solicitation. Don't include Yelp in the happy-path link.
- **Owner vs facility resolution.** Negative feedback from a multi-facility operator — does it go to facility manager or corporate? Operator config.

## Anti-Goals

- Not gating reviews (legal risk).
- Not auto-posting GBP replies without manager approval.
- Not soliciting reviews on platforms that prohibit it (Yelp).
- Not building a generic survey tool.
