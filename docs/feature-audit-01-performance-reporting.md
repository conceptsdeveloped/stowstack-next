# 01 — Performance Reporting Dashboard

**Priority:** BUILD NOW
**Why it matters:** This is the #1 sales tool. When a prospect asks "does this work?" Blake needs to show real numbers from his own facilities.

---

## What Exists

### Admin-Side Analytics (Working)

| Feature | Status | Location |
|---------|--------|----------|
| Sales funnel / lead pipeline | Working | `/admin/insights` — 6-stage funnel with conversion rates, weekly velocity bar chart (Recharts) |
| PMS dashboard (occupancy/revenue) | Working | Facility tab `pms-dashboard.tsx` — occupancy snapshot, rent roll, aging, revenue history from uploaded CSV/PDF |
| Revenue analytics | Working | Facility tab `revenue-analytics.tsx` — gross potential, ECRI analysis, rate distribution, seasonal patterns, health score |
| Occupancy intelligence | Working | Facility tab `occupancy-intelligence.tsx` — physical & economic occupancy, gap decomposition, delinquent tenant tracking |
| Landing page analytics | Working | `/api/page-interaction-stats` — sessions, scroll depth, CTA clicks, click heatmap |
| Report management UI | UI only | `/admin/reports` — shows report list with generate modal, but backend is missing |

### Data Being Tracked (Working)

| Data Source | Table | Sync Method |
|-------------|-------|-------------|
| Ad spend (Meta) | `campaign_spend` | Daily API sync |
| Campaign performance | `client_campaigns` | Monthly rollup (spend, leads, move-ins, CPL, ROAS) |
| Phone calls | `call_logs` | Twilio webhook (real-time) |
| Landing page interactions | `page_interactions` → `page_interaction_stats` | Event tracking + daily cron aggregation |
| GBP insights | `gbp_insights` | Weekly GBP API sync |
| PMS snapshots | `facility_pms_snapshots` (raw SQL) | Manual CSV/PDF upload |
| A/B test events | `ab_test_events` | Event tracking |

### Client-Side Reporting (Partial)

| Feature | Status | Location |
|---------|--------|----------|
| Campaign ROAS/CPL | Working | Portal `/campaigns` — real attribution from `campaign_spend` + `partial_leads` |
| Occupancy snapshot | Stubbed | Portal `/reports` — shows "No PMS data available yet" |
| Download report button | Non-functional | Portal `/reports` — button exists but does nothing |

---

## What's Missing

### Critical Gaps

1. **`/api/admin-reports` endpoint — NOT IMPLEMENTED**
   - The admin reports UI (`/admin/reports`) references this endpoint for generating Monthly Performance, Campaign Detail, Move-in Attribution, and Custom reports
   - The generate modal, date range picker, and facility selector all exist
   - But the API that actually generates reports does not exist
   - Export formats (PDF, CSV) are shown in UI but have no backend

2. **PDF generation library — NOT INSTALLED**
   - No PDF generation dependency in package.json
   - Can't produce downloadable reports for operators to share with partners/bosses
   - This is a sales blocker — operators need proof they can hand to someone

3. **Move-in attribution dashboard — INCOMPLETE**
   - `client_campaigns` tracks move-ins per campaign per month
   - But there's no dedicated "move-in attribution" view showing: which ad → which landing page → which lead → which move-in
   - The full-funnel attribution story isn't visualized anywhere

4. **Before/after baseline comparison — NOT BUILT**
   - No way to set a "pre-StorageAds" baseline for a facility
   - Can't show "before StorageAds: 71% occupancy → after: 84%"
   - This is the most compelling proof point and it doesn't exist as a feature

5. **Multi-facility rollup — NOT BUILT**
   - Reports are per-facility only
   - Management company prospects need portfolio-level views
   - Not blocking for first 5-10 customers but blocks management company deals

### Minor Gaps

6. **Chart library usage is minimal** — only Recharts bar chart in insights; no line charts for trends, no sparklines for KPI cards
7. **No real-time dashboard** — all data is historical/batch; no live updating
8. **No anomaly detection** — no alerts for unusual spend/lead patterns

---

## What to Build (Prioritized)

### P0 — Blocks Sales Demos

| Task | Effort | Impact |
|------|--------|--------|
| Implement `/api/admin-reports` endpoint (generate report from date range + facility) | Medium | Unlocks all report generation |
| Add PDF generation (e.g., `@react-pdf/renderer` or `puppeteer`) | Medium | Operators can share reports with partners/bosses |
| Build before/after baseline comparison view | Small | Most compelling proof point for sales calls |
| Add "cost per move-in" trend chart to facility dashboard | Small | Shows improvement over time |

### P1 — Improves Sales Conversion

| Task | Effort | Impact |
|------|--------|--------|
| Build dedicated move-in attribution view (ad → page → lead → move-in) | Medium | Full-funnel story for prospects |
| Add occupancy trend line chart (30/60/90 day) | Small | Visual proof of impact |
| Make portal "Download Report" button functional (PDF export) | Medium | Client self-service |
| Add CSV export for campaign data | Small | Operators want spreadsheets |

### P2 — Nice to Have

| Task | Effort | Impact |
|------|--------|--------|
| Multi-facility rollup reports | Large | Blocks mgmt company deals |
| Report scheduling (auto-generate on 1st of month) | Medium | Reduces admin work |
| Real-time dashboard updates | Large | Wow factor on demos |

---

## Key Files

```
Admin UI:
  src/app/admin/reports/page.tsx          (report management page)
  src/app/admin/insights/page.tsx         (sales funnel analytics)
  src/components/admin/facility-tabs/pms-dashboard.tsx
  src/components/admin/facility-tabs/revenue-analytics.tsx
  src/components/admin/facility-tabs/occupancy-intelligence.tsx

Client Portal:
  src/app/portal/campaigns/page.tsx       (ROAS/CPL data — working)
  src/app/portal/reports/page.tsx         (PMS data — stubbed)

API Routes:
  src/app/api/lead-analytics/route.ts     (funnel stats)
  src/app/api/campaign-spend/route.ts     (ad spend sync)
  src/app/api/client-campaigns/route.ts   (campaign rollup)
  src/app/api/revenue-intelligence/route.ts
  src/app/api/occupancy-intelligence/route.ts
  src/app/api/page-interaction-stats/route.ts
  src/app/api/admin-reports/              (MISSING — needs implementation)

Schema:
  prisma/schema.prisma (campaign_spend, client_campaigns, gbp_insights, etc.)
```
