# Attribution Gap Analysis: The Industry-Wide Problem StorageAds Solves

## Executive Summary

The self-storage industry has a critical blind spot: no vendor meaningfully connects marketing spend to actual move-ins. Operators spend $500-3,000+ per month on marketing with virtually no visibility into which ads, campaigns, or creatives produce tenants. This gap forces decision-making based on vanity metrics (clicks, leads, impressions) rather than business metrics (cost-per-move-in, revenue-per-dollar, tenant lifetime value by channel).

StorageAds' differentiation is not in running ads better—it's in solving this attribution gap end-to-end: connecting specific ad creative → click → landing page → lead capture → phone call → PMS reservation → actual move-in with full cost accounting.

---

## Competitor Attribution Landscape: What Each One Actually Does (and Doesn't)

### Storagely Attribution (The Closest Competitor)

**What It Does:**
- Marketing Attribution Report combines marketing data + revenue data
- Phone call tracking identifies marketing source of each inbound call
- Integrations: SiteLink, storEDGE, Self Storage Manager, Google Analytics, Google Tag Manager, Google Ads, Google Business Profile, Facebook Ads
- Tracks to lead/rental level
- Dashboard shows "which channels drove calls," "which calls converted to leases"

**Real Capability:**
- Can tell you: "Google produced 10 calls this month; 4 became leases"
- Can show: "Meta produced 8 calls; 3 became leases"
- Phone call tracking is sophisticated—identifies marketing source of each call

**Critical Limitations:**
- Tracks to lead/rental level, NOT to specific ad creative
- Cannot answer: "This specific Google Ad (headline 'Climate Controlled', image 'door open') produced 3 move-ins at $47 each"
- No dedicated landing pages per campaign—all traffic goes to same website pages
- Can't tell you: "Video creative #3 cost $41 per move-in; carousel creative #7 cost $68"
- No UTM-to-PMS pipeline for direct attribution
- Doesn't track cost-per-move-in across entire funnel; relies on operator math (divide ad spend by move-ins)

**Why Storagely Stops Short:**
- Built as marketing analytics layer on top of PMS, not as end-to-end lead generation platform
- Assumes operator already manages landing pages and ad platforms separately
- Lacks dedicated landing page infrastructure (required for proper UTM tracking per creative)

---

### Adverank Attribution (Channel-Level Only)

**What It Does:**
- Cloud product analyzes FMS data + Google ad performance
- Recommends daily budget adjustments based on occupancy trends
- Cubby integration: Pulls move-in data, occupancy, tenant length-of-stay from Cubby PMS + combines with live Google ad metrics
- Self Storage Manager Web Platform partnership: Shows "which channels drive most revenue"
- Dashboard shows channel performance (Google vs Social vs Direct)

**Real Capability:**
- Can tell you: "Google drove 12 move-ins this month; Social drove 6"
- Automates budget reallocation: "Reduce Google by 5%, increase Social by 5% based on ROI"
- Pulls operational data (move-ins, occupancy, LOS) alongside ad metrics
- Better than most because it actually looks at move-in data

**Critical Limitations:**
- Channel-level attribution ONLY (Google vs Social vs Direct vs Organic)
- Cannot answer: "Which Google campaign?" or "Which Meta ad creative?"
- No creative-level performance data (video vs carousel vs static)
- No dedicated landing pages per campaign
- No call tracking integration
- Can't track: "Budget allocation to Campaign A vs Campaign B; which was more profitable?"
- Cubby integration is powerful but proprietary to Cubby PMS (doesn't work with SiteLink, storEDGE, Self Storage Manager users without separate integration)
- No UTM-to-move-in direct attribution

**Why Adverank Stops Short:**
- Started as data analytics product (occupancy trends + marketing); never built end-to-end lead gen infrastructure
- Channel-level attribution is relatively easy; campaign and creative level require dedicated landing pages
- Focus is operational insights ("occupancy is up Tuesday-Thursday"), not marketing attribution

---

### G5 Attribution (Enterprise Only, Closest to Complete Solution)

**What It Does:**
- Intelligent Marketing Cloud with "call scoring"
- Claims "2.5x improvement in marketing conversions"
- Portfolio-level analytics across multiple facilities
- SiteLink integration (deep): Captures move-in, lease data, resident records
- Call tracking and recording at scale
- Claims: American Self Storage NC achieved 112% conversion increase and lead-to-lease under 1 day with full G5 + SiteLink integration

**Real Capability:**
- Likely the most sophisticated attribution in the market for portfolio operators
- Can connect: Call → PMS lease → move-in across portfolio
- Portfolio-level roll-up: "Across our 50 facilities, Google drove $2.1M in revenue; Meta drove $1.4M"
- Automated bid management and budget allocation across portfolio

**Critical Limitations:**
- Enterprise-only (minimum 20-50 facilities); doesn't serve small operators (<10 facilities)
- Portfolio-level analytics, not facility-level or campaign-level
- Pricing likely $5,000-15,000/month minimum (not publicly disclosed); ROI threshold too high for single-facility operators
- No public documentation of attribution methodology
- Likely still channel-level (Google vs Meta vs Direct), not creative-level
- Limited documentation on "how 112% conversion increase was measured"

**Why G5 Stops Short:**
- Built for enterprise portfolios, not individual facility operators
- Portfolio-level roll-up is valuable but loses facility-specific strategy
- Pricing model ensures enterprise-only market capture

---

### Marketing.Storage Attribution (Undocumented)

**What It Does:**
- Claims "click-to-lease attribution tracking"
- Claims "direct access to team who does the work"
- Likely UTM-based tracking: clicks → website events → (implied) PMS integration

**Real Capability:**
- Unknown; no public documentation available

**Critical Limitations:**
- Methodology completely undocumented
- Likely website-level tracking (click → form submit), not actual PMS move-in data
- No dedicated landing pages per campaign (operators manage their own landing pages)
- No direct ad platform integration (operator must set up UTMs manually)
- No independent verification of "click-to-lease attribution"
- Claim of "direct team access" suggests agency-level service, not self-serve platform

**Why Marketing.Storage Stops Short:**
- Service is opaque; marketing claims exceed documented capability
- No PMS integration announced
- Appears to be agency service, not attribution platform

---

### The Storage Group Attribution (Call Tracking, No Move-In Connection)

**What It Does:**
- Call tracking and recording on all inbound calls
- Can identify which calls came from marketing vs direct/organic
- Agency provides performance reporting

**Real Capability:**
- Can show: "40 calls this month from our marketing efforts; 8 were from Google, 12 from Meta, 20 from Direct"
- Call recordings identify prospect quality

**Critical Limitations:**
- Call tracking shows marketing calls but DOESN'T connect to PMS move-in records
- Cannot answer: "Those 40 calls produced how many move-ins?"
- No visibility into conversion rate from call → reservation → move-in
- Agency reports "leads generated" (40 calls) without actual business outcome
- Manual correlation required: operator must check which call leads became move-ins in PMS

**Why The Storage Group Stops Short:**
- Full-service agency model; doesn't own the data pipeline
- Call tracking is one piece; moving data to PMS is operator's responsibility
- No financial incentive to close the loop (more calls = more billable activity)

---

### StoragePug Attribution (Website Analytics Only)

**What It Does:**
- Lead tracking dashboards
- Claims "unprecedented insights into what leads are looking for"
- Website analytics (bounce rate, session duration, device type)

**Real Capability:**
- Can show website behavior: "Visitors from mobile bounced 40% more than desktop"
- Can show lead submission timing: "Most leads submitted between 6-9pm"

**Critical Limitations:**
- Website analytics level only; no connection to ad platforms
- No attribution to ad source, campaign, or creative
- No PMS move-in data integration
- "Lead tracking" is just form submissions; doesn't connect to reservations or move-ins
- No channel-level attribution (can't tell you "Google drove more leads than Meta")

**Why StoragePug Stops Short:**
- Built as analytics dashboard for what already happens on website
- Never integrated with ad platforms or PMS systems
- Lacks fundamental infrastructure for attribution

---

## The Technical Attribution Gap: The Complete Picture

### The Five-System Attribution Chain (Where Everything Breaks Down)

```
Ad Platform → Website/Landing Page → Lead Capture → PMS Record → Revenue/Move-In
    ↓               ↓                   ↓              ↓            ↓
  Google Ads    storageads.com/       HTML form        SiteLink    Move-in date
  Meta Ads      campaign/creative#    + phone call     storEDGE    Rent rate
  TikTok Ads    + pixel tracking      + email          Self Storage  Tenant LOS
                + UTM params          + contact info   Manager      Revenue
```

Each hand-off is a potential point of data loss. Industry competitors fail at different hand-offs.

---

### System 1: Ad Platform (Google Ads, Meta, TikTok)

**What It Tracks:**
- Ad impression (user sees ad)
- Ad click (user clicks ad)
- Landing page visit (attributed if pixel fires)
- Website conversion event (form submit, page visit, video watch)

**Data Available:**
- ad_id, campaign_id, creative_id
- user_id (hashed)
- click timestamp
- conversion timestamp (if pixel installed)
- conversion_value (if configured)
- source (Google, Meta, TikTok)

**Limitation:** Conversion pixel shows "form submitted" or "page visited," not "became a tenant." Gap between website conversion and business outcome (move-in).

---

### System 2: Website & Landing Page

**What It Tracks:**
- Page visit (if GA/GTM installed)
- Form submission (if form tracked)
- CTAs clicked
- Time on page
- Scroll depth
- Call button clicks

**Data Available (if proper infrastructure installed):**
- utm_source, utm_medium, utm_campaign, utm_content, utm_term
- Referrer URL
- Session ID
- User device/browser
- Form submission data (name, email, phone, unit size preference)
- Call tracking number dialed (if unique per campaign)

**Industry Gap:** Most storage operators DON'T set up UTM parameters on ad platform campaigns. Landing pages are shared across campaigns (no dedicated landing page per campaign/creative). No connection between UTM parameters and PMS records.

**Real Industry Example:**
- storEDGE embed widget CAN be placed on third-party landing pages. But storEDGE widget DOESN'T pass UTM data through to the move-in record. Result: operator knows "Google drove a reservation" but not "Google Campaign A at $2 CPC drove it vs. Google Campaign B at $8 CPC."

---

### System 3: Lead Capture & CRM

**What It Captures:**
- Name, email, phone
- Unit size preference
- Move-in date preference
- Contact time preference
- Message/inquiry
- Lead source (if manually set)

**Data Available:**
- lead_id
- timestamp
- contact info
- inquiry details
- preference data

**Industry Gap:** Most storage operators don't feed leads into a CRM. Leads sit in email inbox or are manually entered into PMS. Phone calls go directly to facility staff (no CRM record until after conversation). No systematic linkage between lead capture system and PMS.

---

### System 4: PMS System (Property Management Software)

**What It Tracks:**
- Lead record (inquiry)
- Tour record (showing)
- Lease record (signed)
- Move-in record (actual occupancy)
- Resident record (post-move-in)
- Rent, lease term, move-out date

**Data Available:**
- lead_id or contact_id
- status (inquiry → tour → lease → move-in)
- move-in_date
- move-out_date
- monthly_rent
- lease_term
- tenant_name
- unit_size
- unit_number

**PMS APIs Available:**
- **SiteLink:** Limited API (can query move-ins, residents, but limited marketing source fields; requires custom integration to populate from ad platforms)
- **storEDGE:** REST API with some marketing source tracking capabilities (move-ins, occupancy, contact records); can be configured with custom marketing source field
- **Self Storage Manager:** Limited API; tightly integrated with Adverank partnership for channel-level attribution
- **Tenant Inc / Hummingbird (Storelocal's PMS):** Open API and Power BI dashboard integration; most modern for data accessibility but smallest market share
- **Yardi:** Enterprise API (powerful but expensive, designed for portfolio companies, not individual operators)

**Industry Gap:** Most PMS systems have NO native "marketing source" or "utm_parameters" field. Configuring custom fields requires technical work. Even with custom fields, no automatic population from ad platforms. Operator must manually enter "this lead came from Google" in PMS while managing ads in separate system.

**Real Industry Example:**
- One operator manages Google Ads in Google Ads Manager, receives call at facility, facility staff answers "How did you hear about us?", staff logs name/number in SiteLink. At end of month, operator must manually check: "Which of these 15 SiteLink records match leads/calls from this month's Google spend?" Answer: no reliable method.

---

### System 5: Revenue & Business Metrics

**What Exists:**
- Monthly occupancy rate
- Revenue per unit
- Average rent rate
- Move-in count
- Move-out count

**Data NOT Typically Tracked:**
- Revenue by marketing channel
- Move-in source attribution
- Cost-per-move-in
- Channel ROI
- Tenant LTV by acquisition source
- Cost per move-in by creative

**Reason:** PMS and accounting/marketing analytics software are separate systems. No integration exists between "marketing led to move-in" and "move-in generated revenue."

---

## StorageAds Technical Solution: How We Close All Five Gaps

### 1. Ad Platform → Website: Dedicated Landing Pages + Unique Call Tracking

**What We Do:**
- Create dedicated landing page for each campaign/creative combination
- Each landing page has unique URL (with embedded UTM parameters)
- Each landing page has unique call tracking number (e.g., +1-512-555-0147 for Campaign A, +1-512-555-0148 for Campaign B)
- First-party pixel on landing page tracks user behavior (clicks, scrolls, form interaction)

**Data Captured:**
- campaign_id (in URL)
- creative_id (in URL)
- utm_source, utm_medium, utm_campaign, utm_content (in URL and tracked)
- call_tracking_number (unique per campaign/creative)
- timestamp of click/landing page visit
- user behavior on page (click-to-call, form submission, page scroll)

**Result:** Every click is tagged with exact campaign and creative.

---

### 2. Website → Lead Capture: PMS-Embedded Rental Widget

**What We Do:**
- storEDGE/SiteLink rental widget embedded directly on StorageAds landing page
- Lead submits form directly on landing page (not redirected elsewhere)
- Form submission triggers PMS lead record creation (with UTM parameters stored)
- Call button on page is unique per campaign; when clicked, dials campaign-specific call tracking number
- UTM parameters passed directly to PMS lead record

**Data Captured:**
- lead_id (created in PMS)
- utm_source, utm_medium, utm_campaign, utm_content (stored in PMS custom fields)
- campaign_id, creative_id (stored in PMS custom fields)
- contact_info (name, email, phone)
- unit_size_preference
- call_tracking_number_dialed (campaign/creative identifier)
- timestamp

**Result:** Every lead has full campaign/creative attribution in PMS from the moment of capture.

---

### 3. Lead Capture → PMS Record: Automatic Sync

**What We Do:**
- StorageAds backend syncs with SiteLink/storEDGE API immediately upon lead creation
- All UTM parameters, campaign_id, creative_id written to PMS custom fields
- Phone calls logged with call tracking number (which identifies campaign/creative)
- Lead record in PMS includes full marketing source attribution

**Data Captured:**
- All lead data written to PMS with campaign/creative identifiers
- No manual entry required
- No data loss in handoff

**Result:** PMS lead record is a complete picture of lead origin.

---

### 4. PMS Record → Move-In: Direct Correlation

**What We Do:**
- Backend tracks lead from creation → tour scheduled → lease signed → move-in
- Every stage in the funnel tagged with campaign/creative
- PMS move-in record includes original campaign/creative attribution
- Reservation data includes rent amount, lease term, unit size

**Data Captured:**
- lead_to_tour conversion (which lead IDs toured, which didn't)
- tour_to_lease conversion (which tours converted to leases, which didn't)
- lease_to_movein confirmation (which leases converted to actual occupancy)
- rent_amount (from PMS lease record)
- lease_term (from PMS lease record)
- unit_size (from PMS lease record)

**Result:** Complete funnel visibility from ad click to actual move-in.

---

### 5. Move-In → Revenue: Cost Attribution

**What We Do:**
- Backend pulls move-in data from PMS (move-in date, rent amount, lease term, tenant info)
- Cross-references with campaign/creative attribution stored in lead record
- Calculates cost-per-move-in: (Total campaign spend) / (Number of move-ins attributed to campaign)
- Calculates revenue-per-move-in: (Monthly rent amount) × (Average tenant LOS in months)

**Data Captured:**
- move-in_date
- monthly_rent
- lease_term (or historical LOS data for similar units/demographics)
- campaign_id
- creative_id
- total_campaign_spend
- cost_per_move_in = total_campaign_spend / move_ins_attributed
- revenue_per_move_in = monthly_rent × avg_los

**Result:** Operator sees: "Facebook Campaign 'Climate Controlled Spring Push' → Ad Set 'Radius 10mi Homeowners' → Creative 'Video Tour 30s' → 847 impressions → 23 clicks → 8 landing page leads → 5 calls → 4 reservations → 3 move-ins → $390/mo avg rent → Cost per move-in: $41"

---

## StorageAds vs. Industry: Attribution Capability Comparison

| Capability | Storagely | Adverank | G5 | Marketing.Storage | The Storage Group | StoragePug | StorageAds |
|-----------|-----------|----------|----|----|-------------------|-----------|-----------|
| **Channel-level attribution** | Yes | Yes | Yes | Claimed | Partial | No | Yes |
| **Campaign-level attribution** | No | No | No | Unknown | No | No | Yes |
| **Creative-level attribution** | No | No | No | Unknown | No | No | Yes |
| **Dedicated landing pages per campaign** | No | No | Unclear | No | No | No | Yes |
| **Call tracking per campaign/creative** | Yes | No | Yes | No | Yes | No | Yes |
| **Cost-per-move-in by channel** | Partial | No | Partial | Unknown | No | No | Yes |
| **Cost-per-move-in by campaign** | No | No | No | Unknown | No | No | Yes |
| **Cost-per-move-in by creative** | No | No | No | Unknown | No | No | Yes |
| **PMS integration** | Yes | Yes (Cubby only) | Yes | Unknown | No | No | Yes (SiteLink, storEDGE) |
| **Revenue per move-in tracking** | No | No | Partial | Unknown | No | No | Yes |
| **Tenant LTV by acquisition source** | No | No | No | Unknown | No | No | Yes |
| **Facility-level attribution** | Yes | Yes | Portfolio-level | Unknown | Operator-level | Website-level | Yes |
| **Small operator accessible** | Yes | Yes | No (20+ facility min) | Unknown | Yes | Yes | Yes |
| **Self-serve platform** | Yes | Yes | No (Enterprise) | Unclear | No (Agency) | Yes | Yes |

---

## The StorageAds Difference

StorageAds closes ALL five gaps simultaneously:

1. **Ad Platform → Website:** Dedicated landing pages with unique URLs and call tracking numbers
2. **Website → Lead Capture:** PMS-embedded rental widget with direct UTM-to-PMS sync
3. **Lead Capture → PMS:** Automatic API sync; no manual data entry
4. **PMS → Move-In:** Complete funnel tracking from lead creation to occupancy
5. **Move-In → Revenue:** Cost-per-move-in attribution by channel, campaign, and creative

Result: Operator sees full picture from ad creative to move-in to revenue, with exact cost accounting at every level.
