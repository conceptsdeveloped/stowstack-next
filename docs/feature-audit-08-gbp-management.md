# 08 — GBP Management Features

**Priority:** BUILD SOON
**Why it matters:** Google Business Profile is the #1 discovery channel for self-storage. Operators know reviews matter but hate managing them. If StorageAds handles GBP + reviews, it's another reason they can't leave.

---

## What Exists

### Database Schema (Complete — 6 Models)

| Model | Fields | Status |
|-------|--------|--------|
| `gbp_connections` | facility_id, access/refresh tokens, location_id, location_name, status (disconnected/connected/expired), sync_config JSON, last_sync_at | Schema ready |
| `gbp_insights` | facility_id, period metrics (search_views, maps_views, website_clicks, direction_clicks, phone_calls, photo_views, post_views, post_clicks), raw_data | Schema ready |
| `gbp_posts` | facility_id, post_type (update/offer/event/availability), title, body, cta, image_url, status (draft/scheduled/published/failed), ai_generated flag, scheduled_at | Schema ready |
| `gbp_reviews` | facility_id, external_review_id, author, rating, review_text, response_status (pending/ai_drafted/published/skipped), ai_draft, response_text, responded_at | Schema ready |
| `gbp_questions` | facility_id, external_question_id, author, question_text, answer_status (pending/ai_drafted/published), ai_draft, answer_text, upvote_count | Schema ready |
| `gbp_profile_sync_log` | facility_id, sync_type (hours/photos/full), status, changes, error_message | Schema ready |

### API Routes (6 Routes — All Implemented)

| Route | Capabilities |
|-------|-------------|
| `POST /api/gbp-posts` | CRUD posts, AI content generation (uses PMS data + Claude), schedule/publish |
| `POST /api/gbp-reviews` | Sync reviews from GBP, AI response generation, approve/publish, bulk generate |
| `POST /api/gbp-questions` | Sync Q&A, AI answer generation, approve/publish, bulk generate |
| `POST /api/gbp-insights` | Sync performance metrics from GBP API (30-day windows) |
| `POST /api/gbp-sync` | Sync hours, photos, profile data to GBP; update sync_config |
| `PATCH /api/gbp-review-settings` | Auto-respond toggle, min rating, response tone (friendly/professional/casual) |

### AI Features (Working)

- **Post generation:** Uses real PMS data (occupancy, pricing, available units) + Claude API. Strict rules against generic language.
- **Review responses:** Rating-aware tone (4-5 stars = gratitude, 3 = constructive, 1-2 = apology). Template fallback if Claude fails.
- **Q&A answers:** AI-generated, facility-context-aware answers.
- **Bulk operations:** Generate all pending review responses or Q&A answers in one click.

### Cron Job (Working)

- **File:** `src/app/api/cron/process-gbp/route.ts`
- **Schedule:** Daily
- **Operations:**
  1. Publish scheduled posts (status=scheduled, scheduled_at <= now)
  2. Sync reviews for all connected facilities
  3. Auto-respond to reviews (if config.auto_respond = true)
  4. Auto-sync hours (if config.sync_hours = true)
  5. Refresh expiring OAuth tokens (within 30 minutes of expiry)

### Admin UI (Complete — 2,337 Lines)

- **File:** `src/components/admin/facility-tabs/gbp-full.tsx`
- **6 tabs:** Posts, Reviews, Q&A, Insights, Profile Sync, Settings
- **Features:** Create/schedule/publish posts, view/respond to reviews, sync Q&A, performance dashboard, sync operations, auto-respond toggle

---

## What's Missing

### Critical Blocker

1. **GBP OAuth Flow — NOT IMPLEMENTED**
   - The admin UI has a "Connect GBP" button that calls `/api/gbp-sync?action=oauth`
   - **This endpoint does not exist.** No OAuth authorization route, no callback handler.
   - Google Ads OAuth callback exists at `/api/auth/google/callback` but GBP has its own API scope
   - **Without this, the ENTIRE GBP feature set is unreachable**
   - All 6 API routes, the cron job, and the admin UI are built but cannot function because no facility can connect to GBP
   - This is the single most impactful missing piece across the entire platform

### Needed for OAuth:
```
1. GET /api/auth/gbp/authorize
   - Generate Google OAuth URL with Business Profile scopes
   - Include facility_id in state parameter
   - Redirect user to Google consent screen

2. GET /api/auth/gbp/callback
   - Exchange authorization code for access + refresh tokens
   - Look up facility from state parameter
   - Fetch GBP locations for the account
   - Let admin select which location to connect
   - Create/update gbp_connections record
   - Redirect back to admin facility page

Required Google API scopes:
   - https://www.googleapis.com/auth/business.manage (manage business info)
   - https://www.googleapis.com/auth/businessprofileperformance.readonly (insights)
```

### Other Gaps

2. **No client portal GBP section**
   - All GBP features are admin-only
   - Clients can't see their reviews, response rate, or GBP performance
   - Adding a read-only GBP view to portal would add significant perceived value

3. **Response tone setting not connected to AI prompts**
   - Settings support "friendly," "professional," "casual" tones
   - But the Claude prompts for review/Q&A responses don't use this setting
   - All responses use the same tone regardless of configuration

4. **No review notification to client**
   - When a new review comes in, only the cron job processes it
   - No email/SMS notification to operator: "You got a new 5-star review!"
   - Operators love hearing about good reviews — this is a delight moment

5. **No review solicitation**
   - System responds to reviews but doesn't help generate them
   - No: post-move-in email asking for a review
   - No: review link generation for SMS/email campaigns
   - This would be a high-value feature for operators

6. **GBP post performance not tracked**
   - Posts are published but there's no feedback loop on which posts performed well
   - Can't A/B test post content or timing

---

## What to Build (Prioritized)

### P0 — Unblocks Everything

| Task | Effort | Impact |
|------|--------|--------|
| **Implement GBP OAuth flow** (authorize + callback endpoints) | Medium | Unlocks ALL GBP features |
| Add GBP location selector after OAuth (account may have multiple locations) | Small | Required for multi-location operators |
| Test end-to-end: connect → sync reviews → generate response → publish | Medium | Validates the full pipeline |

### P1 — Adds Client Value

| Task | Effort | Impact |
|------|--------|--------|
| Add GBP section to client portal (reviews, rating, response rate — read-only) | Medium | Clients see review management value |
| Connect response_tone setting to Claude prompts | Small | Tone customization actually works |
| Add new review notification email to operator | Small | Delight moment + engagement |
| Add GBP metrics to monthly email report | Small | More proof of value in every report |

### P2 — Growth Features

| Task | Effort | Impact |
|------|--------|--------|
| Review solicitation system (post-move-in email with review link) | Medium | Generates more reviews |
| GBP post performance tracking (impressions, clicks) | Medium | Data-driven content |
| Competitive review monitoring (track competitor ratings) | Large | Market intelligence |
| Auto-post from PMS events ("New special: 50% off first month") | Medium | Hands-free content |

---

## Architecture Note

The GBP feature set is the most "complete but inaccessible" part of the platform. The database, APIs, admin UI, AI integration, and cron automation are all built. The only missing piece is the OAuth connection flow. Once that's implemented, everything else lights up.

This should be a top-priority build item — it's high ROI (small effort, massive unlock).

---

## Key Files

```
API Routes:
  src/app/api/gbp-posts/route.ts          (post CRUD + AI generation)
  src/app/api/gbp-reviews/route.ts         (review sync + AI responses)
  src/app/api/gbp-questions/route.ts       (Q&A sync + AI answers)
  src/app/api/gbp-insights/route.ts        (performance metrics)
  src/app/api/gbp-sync/route.ts            (profile sync + config)
  src/app/api/gbp-review-settings/route.ts (auto-respond settings)

Admin UI:
  src/components/admin/facility-tabs/gbp-full.tsx (complete UI — 2,337 lines)

Cron:
  src/app/api/cron/process-gbp/route.ts    (daily: publish, sync, auto-respond, token refresh)

OAuth (EXISTS for Google Ads, MISSING for GBP):
  src/app/api/auth/google/callback/        (Google Ads — exists)
  src/app/api/auth/gbp/                    (DOES NOT EXIST — needs creation)

Schema:
  prisma/schema.prisma → gbp_connections, gbp_insights, gbp_posts, gbp_reviews, gbp_questions, gbp_profile_sync_log
```
