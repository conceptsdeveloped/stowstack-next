# 02 — AI Voice + Chat Receptionist

**Pillar:** Demand Generation
**Strategic priority:** Critical path
**Build size:** 5 phases (~5 sessions)
**Depends on:** Existing `call_tracking_numbers` and `call_logs` tables (already built — see `docs/feature-audit-07-call-tracking.md`)
**Blocks:** 10 (attribution) Phase 1 needs receptionist as a unified lead source

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**Existing schema covers:**
- `call_logs` — already tracks `twilio_call_sid`, caller info, `duration`, `status`, `recording_url`, `call_outcome`, `campaign_source`, `move_in_linked`. Extend with `ai_handled` boolean rather than parallel table.
- `call_tracking_numbers` — already has `twilio_sid`, `phone_number`, `forward_to`, links to `landing_page_id` and `utm_link_id`.

**Net-new to build:**
- `ai_call_sessions` — links 1:1 with `call_logs.id`, holds transcript + intent + cost
- `facility_tour_slots` — operator-defined availability
- `tour_bookings` — confirmed tours from voice/chat
- `ai_chat_sessions` — chat-side equivalent of ai_call_sessions
- `ai_receptionist_config` — or extend `facilities.metadata` JSON (decide before Phase 1)

**Revised Phase 1 focus:** As written. Add `ai_handled` boolean to `call_logs` rather than duplicating.

---

## Why This Exists

60%+ of self-storage inquiries happen outside business hours. Most facilities have no after-hours coverage, which means SpareFoot's 24/7 call center captures every evening and weekend lead — for half the first month's rent.

An AI receptionist that answers in two rings, quotes pricing, qualifies the prospect, and books a tour eliminates that arbitrage. It also pays for the entire platform on its own — one captured after-hours move-in per month covers a Best-tier subscription.

## What "Done" Looks Like

Every facility has a tracking number that routes incoming calls to an AI agent. The agent:
- Greets by facility name
- Answers questions about pricing, hours, unit sizes, gate access
- Quotes from current rate sheet (pulled from Phase 1 of file 07 if available, else static fallback)
- Books a tour into the facility manager's calendar
- Sends an SMS confirmation
- Logs the full transcript with intent classification

After-hours and overflow calls (manager doesn't pick up in 4 rings) hit the AI. Business-hours calls forward to the facility first, fall back to AI on no answer.

## Strategic Value

- **Demo-able in 60 seconds.** The single best sales tool: call the demo number on a sales call, let the prospect hear the agent answer.
- **High switching cost.** Once a facility's number is on the AI, replacing it means manual call handling again.
- **Data flywheel.** Every transcript feeds training and intent classification for future calls.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Do not stack phases. Each phase requires a working demo at its end.

### Phase 1 — Basic Inbound Call Handling

**Goal:** A call to a test number is answered by an AI agent that can say facility name, answer "what are your hours" and "do you have any 10x10s available," and log the transcript. No booking, no SMS, no overflow logic yet.

**Stack:**
- Twilio Programmable Voice (already an integration per CLAUDE.md, not yet wired)
- Deepgram or AssemblyAI for streaming STT
- Anthropic `claude-haiku-4-5-20251001` for response generation (fast, cheap, good enough for FAQ)
- ElevenLabs or Twilio TTS for voice output

**Database changes:**
```prisma
model ai_call_sessions {
  id              String   @id @default(uuid())
  call_log_id     String   @unique  // ties to existing call_logs
  facility_id     String
  started_at      DateTime @default(now())
  ended_at        DateTime?
  transcript      Json     // [{role: "agent"|"caller", text, ts}]
  intent          String?  // "pricing" | "hours" | "tour_request" | "existing_tenant" | "other"
  sentiment       Float?
  audio_url       String?
  outcome         String?  // "answered" | "booked_tour" | "transferred" | "abandoned"
  cost_cents      Int?     // STT + LLM + TTS for unit economics tracking
  facility        facilities @relation(fields: [facility_id], references: [id])
}
```

**API routes:**
- `POST /api/voice/incoming` — Twilio webhook. Replaces or augments existing `/api/call-webhook`. Returns TwiML to start a `<Stream>` to our agent WebSocket.
- `GET /ws/voice-agent` — WebSocket endpoint. Streams audio to STT, runs LLM, streams TTS back.
- `POST /api/voice/session-end` — finalize `ai_call_sessions` row with transcript and cost.

**Configuration:**
- New `ai_receptionist_config` per facility: greeting script, FAQ overrides, escalation rules, voice persona.

**Verification:**
- [ ] Call test number, hear AI greeting with correct facility name
- [ ] Ask "what are your hours" — get a coherent response from FAQ
- [ ] Ask "do you have any 10x10 units?" — agent answers based on stubbed unit data
- [ ] `ai_call_sessions` row written with full transcript
- [ ] Cost per call logged and under $0.30 for a 90-second call

**Out of scope:** Tour booking, SMS, overflow routing, business-hours forwarding logic.

**Commit message:**
```
feat(receptionist): basic AI inbound call handling (roadmap 02 phase 1)
```

---

### Phase 2 — Tour Booking + SMS Confirmation

**Goal:** When the caller says "I want to come see a unit," the agent collects name, callback number, preferred time. Books into a calendar. Sends SMS confirmation.

**Booking layer:**
- Per-facility availability config (or Cal.com integration if facility uses it).
- Internal calendar fallback: simple `facility_tour_slots` table with operator-defined daily slots.

**New tables:**
```prisma
model facility_tour_slots {
  id          String   @id @default(uuid())
  facility_id String
  slot_start  DateTime
  slot_end    DateTime
  status      String   // "open" | "booked" | "blocked"
  booked_by_call_id String?
  facility    facilities @relation(fields: [facility_id], references: [id])

  @@index([facility_id, slot_start])
}

model tour_bookings {
  id              String   @id @default(uuid())
  facility_id     String
  slot_id         String?
  contact_name    String
  contact_phone   String
  contact_email   String?
  source          String   // "ai_voice" | "ai_chat" | "manual"
  source_call_id  String?
  scheduled_for   DateTime
  status          String   // "confirmed" | "showed" | "no_show" | "cancelled"
  notes           String?
  created_at      DateTime @default(now())
}
```

**SMS:**
- Use existing Resend... no, Twilio for SMS. Template includes facility address, time, manager contact.
- Two messages: immediate confirmation + reminder 2 hours before.

**Agent flow update:**
- LLM tool definitions: `check_availability(date_range)`, `book_tour(name, phone, email, slot_id)`, `send_sms(to, body)`.

**Verification:**
- [ ] Caller can say "book me for tomorrow morning" and end up in `tour_bookings`
- [ ] SMS confirmation arrives at caller's number
- [ ] Reminder SMS fires 2 hours before slot
- [ ] Double-booking is impossible (slot status check)

**Out of scope:** Overflow routing, chat widget, sentiment-based escalation.

**Commit message:**
```
feat(receptionist): tour booking + SMS confirmation (roadmap 02 phase 2)
```

---

### Phase 3 — Business-Hours Forwarding + Overflow

**Goal:** During business hours, calls ring the facility first. If no answer in 4 rings, fall back to AI. After hours, AI answers immediately. Operators can override per facility.

**Logic:**
- `ai_receptionist_config` adds: `business_hours` (JSON per-day), `forward_to_phone`, `ring_count_before_ai`.
- Twilio webhook checks current time against config, returns appropriate TwiML.
- If forwarding fails (no answer or busy), continue to AI agent.

**Operator dashboard:**
- New tab in facility manager: "Receptionist" — toggle on/off, set business hours, set forward number, view recent call transcripts.

**Verification:**
- [ ] During business hours, call rings facility phone first
- [ ] No answer in 4 rings → AI picks up, transcript shows "overflow_from_human"
- [ ] After hours, AI answers immediately
- [ ] Operator can flip receptionist off entirely (calls then ring facility, no fallback)

**Out of scope:** Chat widget, intent classification refinement.

**Commit message:**
```
feat(receptionist): business-hours forwarding and overflow (roadmap 02 phase 3)
```

---

### Phase 4 — Chat Widget for Landing Pages

**Goal:** Same agent, different surface. Embeddable chat widget for landing pages and demo site. Reuses the same intent + booking logic.

**New surfaces:**
- `/api/chat/message` — POST endpoint, streams response back via SSE.
- Embeddable script at `public/widget.js` — operators paste one snippet into any page.
- Per-facility config: chat_color, greeting, position (bottom-right default).

**New table:**
```prisma
model ai_chat_sessions {
  id          String   @id @default(uuid())
  facility_id String?
  landing_page_id String?
  visitor_id  String   // localStorage UUID
  started_at  DateTime @default(now())
  ended_at    DateTime?
  messages    Json     // same shape as voice transcript
  intent      String?
  outcome     String?
  utm         Json?
}
```

**Verification:**
- [ ] Widget loads on landing page, greeting fires within 3 seconds
- [ ] Same booking flow works through chat
- [ ] Chat session links to landing page for attribution
- [ ] Mobile-responsive

**Out of scope:** Multi-language support. Voice + chat handoff.

**Commit message:**
```
feat(receptionist): chat widget for landing pages (roadmap 02 phase 4)
```

---

### Phase 5 — Intent Classification + Human Handoff

**Goal:** Auto-classify every session's intent and route urgent ones (existing tenant complaints, billing disputes, emergency access) to a human via SMS or call back to the facility manager.

**Classification:**
- Post-call (or post-chat) LLM pass labels the session: `pricing_inquiry`, `tour_request`, `existing_tenant_billing`, `existing_tenant_access`, `complaint`, `spam`, `wrong_number`.
- Updates `ai_call_sessions.intent` / `ai_chat_sessions.intent`.

**Escalation rules:**
- `complaint` or `existing_tenant_*` → notify facility manager via SMS within 60 seconds.
- `spam` or `wrong_number` → mark in DB, exclude from attribution.
- `tour_request` not converted → flag for sales follow-up.

**Quality monitoring:**
- Admin page `/admin/receptionist-quality` shows random sample of calls per facility with transcript, intent, and a thumbs-up/down review action for ongoing prompt tuning.

**Verification:**
- [ ] 90% of test calls get correct intent label
- [ ] Complaint call triggers SMS to facility manager within 60s
- [ ] Spam call excluded from `call_logs` aggregates
- [ ] QA page lets admin flag bad responses for review

**Out of scope:** Auto-prompt-tuning based on feedback (manual iteration is fine for now).

**Commit message:**
```
feat(receptionist): intent classification and human escalation (roadmap 02 phase 5)
```

---

## Open Questions

- **Voice provider.** ElevenLabs (best quality, $$$) vs. Twilio Polly (cheap, robotic) vs. PlayHT. Need to A/B with real prospects.
- **Latency tolerance.** Target end-to-end response time under 1.5s. STT + LLM + TTS all need to be streamed, not request/response. Sets architecture constraints.
- **Compliance.** Two-party consent states require notice that the call is being recorded. Need a default greeting that satisfies CA, FL, IL, MA, MD, MT, NH, PA, WA.
- **Spanish-language support.** Significant in TX, CA, FL self-storage markets. Phase 1 is English-only — when does Spanish ship?
- **Cost per call ceiling.** Need internal target. Suggest $0.30 max for a 90s call. Above that, unit economics break for sub-$50 unit rentals.

## Anti-Goals

- Not building a generic IVR. No "press 1 for billing." Conversation only.
- Not replacing the facility manager. Existing-tenant issues escalate. Tour bookings hand off to the manager for the actual showing.
- Not training a custom voice model. Use off-the-shelf TTS.
- Not building outbound calling in this feature. Outbound (cold callbacks, win-back voice) is a separate roadmap item.
