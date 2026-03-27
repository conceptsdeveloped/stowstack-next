# 05 — Client Portal with Results

**Priority:** BUILD SOON
**Why it matters:** Customers need to see their own performance data. If they can't see ROI in their portal, they'll ask Blake for reports every week — and eventually churn because they "can't tell if it's working."

---

## What Exists

### Portal Pages

| Page | Status | Data Source | Populated? |
|------|--------|------------|------------|
| Dashboard (`/portal`) | Working | attribution API, activity_log, alert_history | Yes — real data |
| Campaigns (`/portal/campaigns`) | Working | campaign_spend + partial_leads (SQL join) | Yes — real attribution |
| Reports (`/portal/reports`) | Stubbed | client-reports API (PMS data) | No — "No PMS data available yet" |
| Billing (`/portal/billing`) | Working | Stripe API / Redis cache | Yes — real invoices |
| Messages (`/portal/messages`) | Working | Redis KV (Upstash) | Yes — real messages |
| Onboarding (`/portal/onboarding`) | Working | client_onboarding JSON | Yes — wizard data |
| Settings (`/portal/settings`) | Working | clients table | Yes — profile + monthly goal |

### Dashboard KPIs (Working)

- Last 90-day leads count
- Last 90-day move-ins count
- Monthly goal progress bar (move-ins vs target)
- Campaign alerts (critical/warning/info)
- Recent activity feed (20 items: leads, calls, walk-ins, campaign changes)
- Onboarding completion progress
- Account manager contact card (Blake)

### Campaigns Page (Working — Best Feature)

- Date range selector: 7D, 30D, 90D, YTD
- 5 KPI cards: Total Spend, Leads, Move-Ins, CPL, ROAS
- Campaign performance table: name, spend, impressions, clicks, leads, move-ins, revenue, CPL, ROAS
- Monthly trend chart: dual bars (Spend gold, Revenue green) with lead counts
- Data computed in real-time from `campaign_spend` + `partial_leads` tables
- ROAS calculated as `(move_ins x $110 x 12) / spend`

### Billing Page (Working)

- Summary cards: Total Paid, Outstanding, Total Ad Spend
- Invoice list: month, ad spend, management fee, total, status (Paid/Sent/Overdue), due date
- "Manage Payment Method" → Stripe customer portal
- Billing explanation text

### Messages Page (Working)

- Chat-style thread (client = gold bubbles, admin = gray)
- Compose box with Shift+Enter support
- Messages stored in Redis (up to 200 per client)
- Auto-scroll to newest

### Settings Page (Working)

- Read-only: facility name, location, email, occupancy range, total units
- Editable: monthly move-in goal
- Account manager card with contact info
- Client since date
- Sign out

---

## What's Missing

### Critical Gaps

1. **Reports page shows no data**
   - PMS integration not connected → occupancy/unit mix is blank
   - "Download Report" button is a no-op
   - Clients have no way to see occupancy impact
   - This is the page that should prove "StorageAds increased your occupancy from X to Y"
   - Blocked by: PMS data ingestion (Phase 1 = manual CSV/PDF upload, Phase 2 = API)

2. **No occupancy trend visualization**
   - Even if PMS data were populated, there's no trend chart
   - Client can't see "occupancy over time" to correlate with campaign launches
   - This is the single most important proof point for retention

3. **No "before vs after" comparison**
   - When did the client sign up? What was occupancy at that point?
   - No visual marker showing "StorageAds started here → occupancy now"
   - Missing the emotional payoff that keeps clients paying

4. **No GBP data in portal**
   - Clients can't see their Google reviews, response rate, or GBP performance
   - Review management is admin-only
   - Clients care about reviews — showing this data adds perceived value

5. **No push notifications or email digests**
   - Client has to log in to see their data
   - Most operators won't check a dashboard weekly
   - Need: weekly email summary or at minimum "new lead" notifications

6. **Campaign page shows data but no actionable insights**
   - Raw numbers (spend, leads, ROAS) but no commentary
   - No: "Your best performing campaign this month was X"
   - No: "Recommendation: increase budget on Campaign Y"
   - No: "Alert: Campaign Z has high CPL — we're adjusting"

### Secondary Gaps

7. **No multi-facility view** — one portal per facility; management companies need portfolio view
8. **No document sharing** — no way to share contracts, reports, or creative assets with client
9. **No client-initiated campaign requests** — "I want to run a special for climate units" has to go through messages
10. **24-hour session TTL is short** — clients may get logged out between visits

---

## What to Build (Prioritized)

### P0 — Makes Portal Worth Logging Into

| Task | Effort | Impact |
|------|--------|--------|
| Populate reports page with data from manual PMS uploads (CSV/Excel) | Medium | Clients see their occupancy data |
| Add occupancy trend chart to dashboard or reports (30/60/90 day) | Medium | Visual proof StorageAds is working |
| Add "StorageAds started" marker on trend chart | Small | Before/after comparison |
| Weekly email digest with top KPIs (spend, leads, move-ins, occupancy) | Medium | Clients see value without logging in |

### P1 — Adds Perceived Value

| Task | Effort | Impact |
|------|--------|--------|
| Add GBP section (review count, avg rating, response rate, recent reviews) | Medium | Clients see review management value |
| Add AI-generated campaign insights ("Best campaign this month: X") | Medium | Makes data actionable |
| Add "new lead" email notification when partial_leads created | Small | Real-time value feeling |
| Make "Download Report" button generate actual PDF | Medium | Clients share with partners/bosses |

### P2 — Retention & Expansion

| Task | Effort | Impact |
|------|--------|--------|
| Multi-facility portal view (management companies) | Large | Unlocks enterprise deals |
| Client campaign request form ("Run a special for X") | Small | Better than chat for structured requests |
| Document/asset sharing area | Medium | Centralize contracts + creative |
| Extend session TTL to 7 days | Tiny | Less login friction |

---

## Key Files

```
Portal Pages:
  src/app/portal/page.tsx             (dashboard)
  src/app/portal/campaigns/page.tsx   (campaign performance — BEST PAGE)
  src/app/portal/reports/page.tsx     (PMS data — STUBBED)
  src/app/portal/billing/page.tsx     (invoices)
  src/app/portal/messages/page.tsx    (chat)
  src/app/portal/settings/page.tsx    (profile + goal)
  src/app/portal/onboarding/page.tsx  (wizard)

Shell/Auth:
  src/components/portal/portal-shell.tsx (login gate + nav)

API Routes:
  src/app/api/attribution/route.ts       (campaign performance SQL)
  src/app/api/client-data/route.ts       (profile + auth)
  src/app/api/client-reports/route.ts    (PMS reports)
  src/app/api/client-billing/route.ts    (invoices)
  src/app/api/client-messages/route.ts   (chat messages)
  src/app/api/client-activity/route.ts   (activity feed)
  src/app/api/alert-history/route.ts     (alerts)
```
