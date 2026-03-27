# StorageAds Feature Audit — Overview

**Date:** 2026-03-26
**Purpose:** Full codebase audit of "Build Now" and "Build Soon" features to identify what's built, what's missing, and what to prioritize.

## Audit Structure

| # | Area | Priority | File |
|---|------|----------|------|
| 01 | Performance Reporting Dashboard | BUILD NOW | `feature-audit-01-performance-reporting.md` |
| 02 | Audit Tool → Call Booking Funnel | BUILD NOW | `feature-audit-02-audit-funnel.md` |
| 03 | Onboarding Flow (<15 min) | BUILD NOW | `feature-audit-03-onboarding.md` |
| 04 | Marketing Site | BUILD NOW | `feature-audit-04-marketing-site.md` |
| 05 | Client Portal with Results | BUILD SOON | `feature-audit-05-client-portal.md` |
| 06 | Automated Monthly Reports | BUILD SOON | `feature-audit-06-monthly-reports.md` |
| 07 | Call Tracking Attribution | BUILD SOON | `feature-audit-07-call-tracking.md` |
| 08 | GBP Management Features | BUILD SOON | `feature-audit-08-gbp-management.md` |

## Strategic Context

StorageAds needs to prove ROI at Blake's own facilities, then close 5-10 beta customers. Every feature should either:
1. **Prove ROI** — show real numbers that convince prospects
2. **Close deals** — make the sales process frictionless
3. **Retain customers** — deliver visible, ongoing value

Features that don't directly serve one of these three goals should wait.

## Critical Path Summary

### Blocking Revenue (Fix First)
1. `/api/admin-reports` endpoint is referenced in UI but **not implemented** — PDF/CSV export is dead
2. GBP OAuth flow is **not implemented** — entire GBP feature set is unreachable
3. Call tracking has **no campaign attribution** — can't prove which ad drove which call
4. Access code delivery is **manual** — Blake emails it by hand

### Working but Incomplete
5. Automated email reports work but `client_reports` table isn't in Prisma schema
6. Client portal campaigns page shows real ROAS/CPL data but PMS data (occupancy) is stubbed
7. Onboarding wizard collects good data but doesn't collect platform credentials

### Working Well
8. Marketing site copy is excellent — operator-focused, credible, clear
9. Audit tool → shared audit page is compelling with AI-generated diagnostics
10. Pricing page shows transparent ROI math
11. Client portal campaigns page has real attribution data
12. Blog has 6 high-quality posts ready
