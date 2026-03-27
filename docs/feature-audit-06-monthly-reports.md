# 06 — Automated Monthly Reports

**Priority:** BUILD SOON
**Why it matters:** Operators don't log into dashboards. The monthly email report is how most clients will judge whether StorageAds is working. If the report doesn't arrive or looks thin, they'll assume nothing's happening.

---

## What Exists

### Report Generation Cron (Working)

- **Schedule:** Mondays at 9am UTC (`0 9 * * 1` in vercel.json)
- **File:** `src/app/api/cron/send-client-reports/route.ts`
- **Max Duration:** 120 seconds
- **Frequency:** Supports monthly (first week of month) and weekly

### Report Content (Working)

The email report includes 6 key metrics:

| Metric | Source | Calculation |
|--------|--------|-------------|
| Ad Spend | `client_campaigns` | Sum of spend for period |
| Leads | `client_campaigns` | Lead count (digital tracked) |
| Move-Ins | `client_campaigns` | Conversion count |
| Cost per Move-In | Calculated | spend / move_ins |
| Estimated ROI (ROAS) | Calculated | (move_ins x $110 x 12) / spend |
| Period Comparison | Calculated | % change vs previous period (colored arrows) |

Additional data:
- Lead sources breakdown: digital (tracked), phone calls (from `call_logs`), walk-ins (from `walkin_attributions` — **table doesn't exist**)
- CTA button linking to client portal
- Facility branding (logo, name)

### Report Delivery (Working)

- **From:** reports@storageads.com (via Resend)
- **Template:** Responsive HTML email with inline CSS
- **Layout:** Card grid with gold/green accent colors
- **CTA:** "View Full Dashboard" → portal link

### Open Tracking (Working)

- **Endpoint:** `src/app/api/report-open/route.ts`
- **Mechanism:** 1x1 GIF pixel appended to email body
- **Tracks:** First open only (COALESCE on opened_at)
- **Updates:** `client_reports.status` from "sent" → "opened"

### Report Storage (Partial)

- **Table:** `client_reports` (queried via raw SQL)
- **Fields:** report_type, period_start, period_end, report_html, report_data (JSON), status, sent_at, opened_at
- **Problem:** Table is NOT in Prisma schema — exists only as raw SQL references

### Generation Flow

```
1. Cron fires (Monday 9am UTC)
2. Fetch all clients where report_enabled = true
3. For each client:
   a. Skip if already generated for this period
   b. Fetch client_campaigns for period
   c. Count calls from call_logs
   d. Count walk-ins from walkin_attributions (returns 0 — table missing)
   e. Render HTML email template
   f. INSERT into client_reports (status: generated)
   g. Send via Resend API
   h. UPDATE status → sent, set sent_at
   i. Log to activity_log
4. Return summary (processed/sent/skipped/errors)
```

---

## What's Missing

### Critical Gaps

1. **`client_reports` table not in Prisma schema**
   - All queries use `$queryRawUnsafe()` — fragile, no type safety
   - Table may not exist in all environments (no migration)
   - Should be added to Prisma schema with proper migration

2. **`walkin_attributions` table doesn't exist**
   - Cron code queries it but it was never created
   - Walk-in count always returns 0
   - Either create the table or remove the reference

3. **Report content is thin**
   - 6 metrics in a card layout is a good start but feels sparse
   - Missing: occupancy trend, best performing campaign, worst performing campaign, recommendation
   - Missing: comparison to industry benchmarks
   - Missing: what StorageAds did this month (actions taken, campaigns optimized, A/B tests run)

4. **No report preview/approval before sending**
   - Reports auto-send — Blake can't review before client sees it
   - If data is wrong or campaigns underperformed, client sees it first
   - Need: admin review queue or at minimum preview email to Blake before client delivery

5. **No PDF attachment**
   - Email-only — client can't save or forward a clean report
   - Operators often forward reports to partners, investors, or management companies
   - PDF attachment would add credibility and utility

6. **No "what we did" narrative**
   - Report shows numbers but not context
   - Client sees "15 leads, 4 move-ins" but not "We launched 2 new campaigns, A/B tested 3 headlines, optimized your Meta targeting to 15-mile radius"
   - This narrative is what justifies the management fee

### Secondary Gaps

7. **Resend free tier (100/day)** — fine for now but will hit limit at ~100 clients
8. **No client report preferences** — can't opt out or choose frequency
9. **No year-over-year comparison** — only period-over-period
10. **Open tracking has no follow-up** — if client doesn't open, nothing happens
11. **Weekly reports may be too frequent** — operators don't want weekly emails; monthly is probably right cadence

---

## What to Build (Prioritized)

### P0 — Report Quality

| Task | Effort | Impact |
|------|--------|--------|
| Add `client_reports` to Prisma schema with proper migration | Small | Stability + type safety |
| Add "what we did this month" section to report (AI-generated from activity_log) | Medium | Justifies management fee |
| Add best/worst campaign callout to report | Small | Actionable insight |
| Add admin preview email before client delivery (or review queue) | Medium | Prevents embarrassing sends |

### P1 — Report Utility

| Task | Effort | Impact |
|------|--------|--------|
| Generate PDF attachment alongside HTML email | Medium | Clients can save/forward |
| Add occupancy trend to report (if PMS data available) | Small | Strongest proof point |
| Add re-engagement follow-up if report not opened after 48hrs | Small | Ensures client sees results |
| Remove or implement `walkin_attributions` (clean up dead code) | Tiny | Prevents silent errors |

### P2 — Report Polish

| Task | Effort | Impact |
|------|--------|--------|
| Client report preferences (frequency, opt-out) | Small | Respect client preferences |
| Year-over-year comparison (when 12+ months of data) | Medium | Long-term trend proof |
| Industry benchmark comparison in report | Medium | Context for the numbers |
| Upgrade Resend plan before hitting 100 client limit | Tiny | Infrastructure readiness |

---

## Key Files

```
Report Generation:
  src/app/api/cron/send-client-reports/route.ts  (main cron job)
  vercel.json                                     (cron schedule: Mon 9am UTC)

Report Data:
  src/app/api/client-reports/route.ts             (retrieval API)
  src/app/api/report-open/route.ts                (pixel tracking)

Schema:
  prisma/schema.prisma → client_campaigns (data source)
  (client_reports NOT in schema — raw SQL only)
  (walkin_attributions NOT created — referenced but missing)
```
