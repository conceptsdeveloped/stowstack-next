# 07 — Call Tracking Attribution

**Priority:** BUILD SOON
**Why it matters:** Most self-storage leads come by phone. If you can't prove which ad drove which call, you're missing 50-70% of the attribution story. Operators will look at move-ins and say "those would have come anyway" unless you can trace the full path.

---

## What Exists

### Call Forwarding (Working)

- **Webhook:** `src/app/api/call-webhook/route.ts`
- **Flow:** Twilio receives call → webhook fires → logs call → generates TwiML → forwards to facility phone
- **Status tracking:** ringing → completed (with duration + timestamps)

### Call Tracking Numbers (Working)

- **Provisioning:** `POST /api/call-tracking` (admin auth required)
  - Searches Twilio for available numbers (optional area code)
  - Sets webhook URLs for voice + status callback
  - Stores in `call_tracking_numbers` table
- **Assignment:** Numbers can be linked to:
  - A specific facility (always)
  - A specific landing page (`landing_page_id`)
  - A specific UTM link (`utm_link_id`)
- **Management:** List (GET), release (DELETE) with Twilio cleanup
- **Aggregates:** `call_count` and `total_duration` updated after each call

### Call Logging (Working)

- **Table:** `call_logs`
- **Data captured per call:**
  - `tracking_number_id` (which number was called)
  - `facility_id` (which facility)
  - `twilio_call_sid` (unique, indexed)
  - `caller_number` (ANI)
  - `caller_city`, `caller_state` (geo)
  - `duration` (seconds)
  - `status` (ringing → completed)
  - `started_at`, `ended_at`
  - `recording_url` (field exists, never populated)

### Call Statistics API (Working)

- **Endpoint:** `GET /api/call-logs?summary=true`
- Returns: total calls, completed calls, avg duration, unique callers
- Calls today (24h), calls this week (7d)
- Breakdown by tracking number with 7-day counts
- Paginated detail mode also available

### Where Call Data Appears

- **Admin:** Call logs visible in facility overview, call stats in summary
- **Client reports:** Monthly email includes call count in "Lead Sources" breakdown
- **Client portal:** Activity feed shows call events

---

## What's Missing

### Critical Gaps

1. **No campaign-level attribution**
   - Calls are tracked at facility level, not campaign level
   - `call_logs` has no `campaign_id` field
   - Tracking numbers CAN be linked to landing pages or UTM links, but:
     - No code connects UTM parameters from a page visit to a subsequent phone call
     - No cross-session tracking (visitor lands on LP → calls hours later)
   - **Result:** Report says "12 calls this month" but NOT "8 calls from Meta campaign X, 4 from Google campaign Y"
   - This is the biggest attribution gap in the platform

2. **No call recording**
   - `recording_url` field exists but is never populated
   - Twilio webhook does NOT include `Record` directive in TwiML
   - Without recordings, can't determine: was this a real inquiry? Did it convert?
   - Recordings are also valuable for quality assurance and training

3. **No call transcription**
   - No integration with transcription services (Twilio, Deepgram, etc.)
   - Can't auto-classify calls: new inquiry, existing tenant, spam, wrong number
   - Can't auto-extract: unit size requested, move-in timeline, competitor mention

4. **No call-to-move-in attribution**
   - System tracks that a call happened but not whether it became a move-in
   - No way to close the loop: ad → page → call → visit → lease → move-in
   - Without this, call tracking is just "a number went up" — not proof of ROI

5. **Dynamic number insertion (DNI) not implemented**
   - Landing pages could dynamically show different phone numbers per visitor session
   - This would enable per-visit attribution (which ad → which number → which call)
   - Currently, one tracking number per landing page (coarse attribution only)

### Secondary Gaps

6. **No spam/duplicate call filtering** — all calls counted equally
7. **No call duration threshold** — a 5-second hangup counts the same as a 10-minute inquiry
8. **No missed call handling** — no voicemail transcription or callback notification
9. **No call outcome tagging** — no admin UI to mark calls as "qualified lead," "existing tenant," "spam"
10. **Twilio not set up yet** — CLAUDE.md notes Twilio is "not set up yet," so call tracking may not be actively collecting data

---

## Attribution Architecture Gap

### What You Can Answer Today
- "How many calls did facility X get this month?" — Yes
- "Which tracking number got the most calls?" — Yes
- "Where did callers come from geographically?" — Yes

### What You Can't Answer
- "Which ad campaign drove the most calls?" — No
- "How many calls became move-ins?" — No
- "What's my cost per call by campaign?" — No
- "Was this call a real inquiry or spam?" — No
- "What's the phone-to-lease conversion rate?" — No

### What's Needed for Full Attribution
```
Option A: Per-campaign tracking numbers
  - 1 unique number per campaign/ad set
  - Expensive (Twilio charges per number) but simple
  - Best for: small campaigns (<10 active)

Option B: Dynamic Number Insertion (DNI)
  - Pool of numbers, dynamically assigned per visitor session
  - Landing page JS swaps displayed number based on UTM
  - Matches call back to session → campaign → ad
  - Best for: scale (many campaigns, limited numbers)

Option C: Third-party call attribution (CallRail, CallTrackingMetrics)
  - Full-featured DNI, recording, transcription, AI classification
  - Integrates with Google Ads, Meta
  - $45-145/mo per tracking number pool
  - Best for: fastest path to full attribution without building it yourself
```

---

## What to Build (Prioritized)

### P0 — Basic Attribution

| Task | Effort | Impact |
|------|--------|--------|
| Add call duration threshold (ignore calls <30s as probable non-inquiries) | Small | Cleaner data |
| Add campaign attribution via tracking number → landing page → UTM → campaign | Medium | Links calls to specific campaigns |
| Add call outcome tagging in admin UI (qualified lead, existing tenant, spam) | Small | Manual but accurate classification |
| Enable Twilio call recording (add `Record` to TwiML) | Small | Proof + quality assurance |

### P1 — Closes the Loop

| Task | Effort | Impact |
|------|--------|--------|
| Add call-to-move-in linking in admin (mark which calls became move-ins) | Medium | Full-funnel attribution |
| Add call transcription (Twilio built-in or Deepgram) | Medium | Auto-classification potential |
| Add missed call notification to admin (email or SMS) | Small | Never miss a lead |
| Add "cost per call" metric to campaign reports | Small | Adds call data to ROAS calculation |

### P2 — Scale

| Task | Effort | Impact |
|------|--------|--------|
| Implement Dynamic Number Insertion (DNI) on landing pages | Large | Per-session call attribution |
| AI call classification (inquiry vs spam vs existing tenant) | Large | Automated qualification |
| Evaluate third-party call attribution (CallRail) vs build | Research | Build-vs-buy decision |
| Add voicemail transcription + auto-response | Medium | Captures after-hours leads |

---

## Key Files

```
Call Tracking:
  src/app/api/call-tracking/route.ts     (number provisioning)
  src/app/api/call-webhook/route.ts      (Twilio webhook — forwarding + logging)
  src/app/api/call-logs/route.ts         (stats + detail retrieval)

Schema:
  prisma/schema.prisma → call_tracking_numbers, call_logs

Report Integration:
  src/app/api/cron/send-client-reports/route.ts (includes call count in reports)
```
