# 01 — Life-Event Trigger Detection

**Pillar:** Demand Generation
**Strategic priority:** Defensible moat
**Build size:** 5 phases (~5 sessions)
**Depends on:** None for Phase 1. Phase 4 wants 10 (attribution) Phase 1 done first.
**Blocks:** None directly. Feeds 03, 04 once running.

---

## Schema Reality Check

**Before executing any phase, read [SCHEMA-RECONCILIATION.md](SCHEMA-RECONCILIATION.md).**

**Existing schema covers:**
- `audience_syncs` — downstream Meta/Google audience sync (`audience_type`, `meta_audience_id`, `record_count`, `status`). The Phase 4 ad push should write to this table, not create a parallel `trigger_audiences` model.
- `partial_leads` — existing lead capture with full UTM. Cross-reference for attribution closure.
- `platform_connections` — Meta/Google OAuth + access tokens already wired.

**Net-new to build:**
- `life_event_signals` — core ingestion table
- `trigger_source_config` — per-source enable/disable per facility
- `college_calendar` — synthetic college calendar source
- `trigger_attributions` — closes the loop with `tenants.id`

**Revised Phase 1 focus:** As written — USPS NCOA ingest. In Phase 4, write generated audiences into existing `audience_syncs` rather than a parallel table.

---

## Why This Exists

Self-storage demand is event-driven, not search-driven. People rent units because something just happened: they moved, they got divorced, a parent died, they downsized, the kid went to college, the business outgrew the garage. By the time they search Google for "storage near me," SpareFoot is bidding $40/click on their query.

The unfair advantage is being there 30 days earlier — when the change-of-address gets filed, when the house gets listed, when the lease expires. Operators who reach those households first, with a targeted offer, win the move at half the cost.

No competitor in self-storage marketing does this. The data is all public.

## What "Done" Looks Like

A daily pipeline pulls public life-event signals for every ZIP code within a configurable radius of each facility. Signals get scored, de-duplicated, and matched into a `trigger_audiences` table. Each facility sees a dashboard of "households likely to need storage in the next 30 days" with source signal, confidence score, and estimated value.

Phase 4 connects this to ad delivery — geo-fenced custom audiences pushed to Meta/Google. Phase 5 closes the loop by attributing move-ins back to trigger source.

## Strategic Value

- **Compounding data.** Every month of signal collection makes the matching model better. Replication cost for a competitor grows linearly with time.
- **Cost moat.** Triggered audiences convert at 2–4x the rate of broad geo-targeting. Lower CAC = ability to outbid on the few channels that matter.
- **Story.** "We knew they needed storage before they did" is a single-sentence sales pitch.

---

## Phased Build Plan

> **EXECUTION RULE:** One phase per session. Phase boundary = commit boundary = stop point. Do not combine phases.

### Phase 1 — USPS Change-of-Address Ingestion

**Goal:** Ingest USPS NCOA (National Change of Address) data into a normalized `life_event_signals` table for one test facility. No UI yet. No ad activation. Just clean data flowing in.

**Database changes (prisma/schema.prisma):**
```prisma
model life_event_signals {
  id           String   @id @default(uuid())
  source       String   // "usps_ncoa" | "mls" | "obituary" | "divorce" | "college" | "lease_end"
  source_id    String?  // upstream record id for dedupe
  event_date   DateTime
  event_type   String   // "move_in" | "move_out" | "divorce_filed" | "death" | "lease_expiring"
  household_hash String // SHA256 of name+address — never store raw PII unsalted
  zip          String
  city         String?
  state        String?
  lat          Float?
  lng          Float?
  confidence   Float    @default(0.5)
  metadata     Json?    // source-specific fields
  ingested_at  DateTime @default(now())

  @@index([zip, event_date])
  @@index([source, source_id])
  @@unique([source, source_id])
}
```

**API routes:**
- `POST /api/cron/ingest-usps-ncoa` — pulls NCOA feed, writes to `life_event_signals`. Admin/cron auth.
- `GET /api/admin-life-events?facility_id=&radius=&days=` — paginated read, admin auth.

**Integrations:**
- USPS NCOALink (requires licensed reseller — Melissa, SmartyStreets, or Experian). Phase 1 can mock with a CSV drop into `scripts/seed-ncoa.ts` if vendor onboarding takes weeks.

**UI surfaces:** None. Verify via DB query and admin API response.

**Verification:**
- [ ] `npx prisma validate && npx tsc --noEmit && npm run build` pass
- [ ] Cron route writes ≥100 rows from a sample feed
- [ ] Dedupe on `(source, source_id)` works — re-run cron, no duplicates
- [ ] PII check: no raw names or addresses in `metadata` JSON — only hashes

**Out of scope for Phase 1:** MLS, obituaries, college calendars, ad activation, UI, matching to facilities.

**Commit message:**
```
feat(triggers): USPS NCOA ingest into life_event_signals (roadmap 01 phase 1)
```

---

### Phase 2 — MLS, Divorce, Obituary Feeds

**Goal:** Add three more signal sources. Same table, same shape. Per-source confidence calibration.

**New ingestion routes:**
- `POST /api/cron/ingest-mls` — MLS new listings → `event_type = "move_out"` (seller will need storage during transition)
- `POST /api/cron/ingest-obituaries` — Legacy.com or local obit scraping → `event_type = "death"` (heir downsizing)
- `POST /api/cron/ingest-divorce-filings` — county court records where available → `event_type = "divorce_filed"`

**Source-specific notes:**
- MLS: Use Bridge Interactive or Trestle API. Per-MLS licensing. Start with one major metro for proof.
- Obituaries: ToS varies. Stick to syndicated sources (Legacy.com partner API) over scraping.
- Divorce filings: Public records but format varies wildly by county. Pick 3 counties with API-accessible records for Phase 2.

**Configuration:**
```prisma
model trigger_source_config {
  id            String   @id @default(uuid())
  source        String   @unique
  enabled       Boolean  @default(false)
  base_confidence Float   @default(0.5)
  decay_days    Int      @default(30)  // signal stops counting after N days
  metro_filter  Json?    // {"counties": [...], "states": [...]}
  updated_at    DateTime @updatedAt
}
```

**Verification:**
- [ ] Each source has its own cron route, all using `verifyCronSecret()`
- [ ] `trigger_source_config` controls enabled/disabled per source
- [ ] Three new sources each write ≥50 rows in dev
- [ ] No source crashes the others (one bad feed must not block ingestion)

**Out of scope:** Matching signals to facilities. Audience creation. Ad push.

**Commit message:**
```
feat(triggers): add MLS, obituary, divorce feeds (roadmap 01 phase 2)
```

---

### Phase 3 — College Move-In and Apartment Lease-End Patterns

**Goal:** Two harder-to-source signals that fill gaps in summer (college) and quarterly (apartment turnover) demand.

**College move-in:**
- Pull academic calendars for all colleges within 100 miles of each facility (`Common Data Set`, IPEDS, or manual seed).
- Generate synthetic signals 30 days before move-in date for the college's ZIP + adjacent ZIPs.
- `source = "college"`, `event_type = "move_in"`, confidence weighted by enrollment size.

**Apartment lease-end:**
- Scrape Apartment List, Zumper, Rent.com for "available [date]" listings — those listings represent units coming open, which means current tenants are moving out.
- Cross-reference with property tax records for multi-family buildings.
- `source = "lease_end"`, `event_type = "lease_expiring"`.

**New tables:**
```prisma
model college_calendar {
  id           String   @id @default(uuid())
  college_name String
  ipeds_id     String?  @unique
  lat          Float
  lng          Float
  fall_movein  DateTime?
  spring_movein DateTime?
  enrollment   Int?
  updated_at   DateTime @updatedAt
}
```

**Verification:**
- [ ] Colleges within 100mi of `facilities` get synthetic signals 30 days pre-move-in
- [ ] Apartment scraper handles 3 metros without rate-limit issues
- [ ] Total signals in `life_event_signals` exceed 10k for a 50-mile radius around test facility

**Out of scope:** Ad activation. Audience generation.

**Commit message:**
```
feat(triggers): college and apartment lease-end signals (roadmap 01 phase 3)
```

---

### Phase 4 — Facility Matching + Audience Generation

**Goal:** Turn raw signals into facility-specific custom audiences ready for ad push.

**Logic:**
- For each `facility`, query `life_event_signals` within configurable radius (default 5 miles), event_date within last 30 days.
- Score each signal: base confidence × source weight × decay × geo proximity.
- Group into `trigger_audiences` per facility per day.

**New tables:**
```prisma
model trigger_audiences {
  id           String   @id @default(uuid())
  facility_id  String
  generated_at DateTime @default(now())
  signal_count Int
  total_score  Float
  signal_ids   String[] // refs into life_event_signals
  pushed_to    Json?    // {"meta": {"audience_id": "...", "pushed_at": "..."}, "google": {...}}
  facility     facilities @relation(fields: [facility_id], references: [id])

  @@index([facility_id, generated_at])
}
```

**Ad push:**
- Generates the audience as a CSV ready for upload to Meta Custom Audience and Google Customer Match.
- **Does not auto-push.** Queues a task in an existing `tasks/` or `notifications` table for Angelo's pipeline to handle the upload. Angelo's code owns the platform API calls.

**Admin UI:**
- New page `/admin/triggers` — per-facility list of audience snapshots with signal counts, top sources, top ZIPs, "download CSV" button.

**Verification:**
- [ ] One audience generated per facility per day via cron
- [ ] CSV downloadable from admin UI matches what the audience IDs would expand to
- [ ] No PII leaves the DB unhashed without an explicit "export raw" admin-only action

**Out of scope:** Auto-push to ad platforms (Angelo's domain). Attribution back to move-ins.

**Commit message:**
```
feat(triggers): facility matching and audience generation (roadmap 01 phase 4)
```

---

### Phase 5 — Attribution + Loop Closure

**Goal:** When a move-in happens (via 10 — attribution), trace it back to whether the household was in a trigger audience at the time of the inquiry.

**Logic:**
- When `client.status` flips to a move-in equivalent, run reverse-match: was this household_hash in any `trigger_audiences` in the last 60 days for this facility?
- Write to `trigger_attributions` linking move-in → audience → originating signal.

**New table:**
```prisma
model trigger_attributions {
  id              String   @id @default(uuid())
  client_id       String
  facility_id     String
  audience_id     String
  signal_id       String
  match_confidence Float
  attributed_at   DateTime @default(now())

  @@index([facility_id, attributed_at])
}
```

**Reporting:**
- Add "Triggered Move-Ins" row to facility's monthly report and owner NOI report (file 13).
- Per-source ROI: cost-per-triggered-move-in by signal source.

**Verification:**
- [ ] At least one test move-in resolves back to a USPS NCOA signal
- [ ] Per-source attribution numbers appear in `/admin/triggers` dashboard
- [ ] Edge case: if no audience match, attribution is null, not a crash

**Out of scope:** Optimizing the signal scoring model (deferred to a later iteration after 6+ months of data).

**Commit message:**
```
feat(triggers): closed-loop attribution from move-in to signal (roadmap 01 phase 5)
```

---

## Open Questions

- **NCOA reseller choice.** Melissa, SmartyStreets, Experian, or Anchor Computer? Pricing and minimum commit varies. Need vendor evaluation before Phase 1.
- **PII storage policy.** Are we comfortable storing `household_hash` long-term, or do we age it out at 90 days? Affects analytics retention.
- **County selection for divorce filings.** Which 3 counties have the cleanest API access? Probably Cook (IL), Maricopa (AZ), and one in TX.
- **Synthetic vs. observed signals.** College move-in is generated from a calendar, not an observed event. Should it have a different `source` namespace (`synthetic_*`) for clarity in reporting?

## Anti-Goals

- Not building a generic "marketing data warehouse." This is signal → audience → ad → attribution, nothing else.
- Not buying paid third-party intent data (Bombora, 6sense). Public signals only.
- Not exposing raw PII through any UI. Hashed identifiers only, with one admin-only "export raw" action for ad audience CSV uploads.
- Not auto-pushing to ad platforms (Angelo's territory).
