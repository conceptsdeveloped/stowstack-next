import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "attribution");
  if (limited) return limited;
  const origin = getOrigin(req);
  const isAdmin = isAdminRequest(req);

  let facilityId = req.nextUrl.searchParams.get("facilityId");

  if (!isAdmin) {
    const accessCode = req.nextUrl.searchParams.get("accessCode");
    if (!accessCode) return errorResponse("Unauthorized", 401, origin);

    const client = await db.clients.findUnique({
      where: { access_code: accessCode },
      select: { facility_id: true },
    });
    if (!client) return errorResponse("Invalid access code", 401, origin);
    facilityId = client.facility_id;
  }

  if (!facilityId)
    return errorResponse("facilityId is required", 400, origin);

  try {
    const startDate =
      req.nextUrl.searchParams.get("startDate") ||
      new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
    const endDate =
      req.nextUrl.searchParams.get("endDate") ||
      new Date().toISOString().split("T")[0];

    const campaigns = await db.$queryRaw<
      Array<{
        campaign: string | null;
        spend: number;
        impressions: number;
        clicks: number;
        leads: number;
        move_ins: number;
        revenue: number;
        cpl: number;
        cost_per_move_in: number;
        roas: number;
      }>
    >(Prisma.sql`
      WITH spend AS (
        SELECT utm_campaign,
          SUM(spend) AS total_spend,
          SUM(impressions) AS total_impressions,
          SUM(clicks) AS total_clicks
        FROM campaign_spend
        WHERE facility_id = ${facilityId}::uuid AND date BETWEEN ${startDate}::date AND ${endDate}::date
        GROUP BY utm_campaign
      ),
      leads AS (
        SELECT utm_campaign,
          COUNT(*) FILTER (WHERE lead_status NOT IN ('partial', 'lost')) AS total_leads,
          COUNT(*) FILTER (WHERE lead_status = 'moved_in') AS move_ins,
          COALESCE(SUM(monthly_revenue) FILTER (WHERE lead_status = 'moved_in'), 0) AS total_revenue
        FROM partial_leads
        WHERE facility_id = ${facilityId}::uuid AND created_at::date BETWEEN ${startDate}::date AND ${endDate}::date AND lead_status != 'partial'
        GROUP BY utm_campaign
      )
      SELECT
        COALESCE(s.utm_campaign, l.utm_campaign) AS campaign,
        COALESCE(s.total_spend, 0)::float AS spend,
        COALESCE(s.total_impressions, 0)::int AS impressions,
        COALESCE(s.total_clicks, 0)::int AS clicks,
        COALESCE(l.total_leads, 0)::int AS leads,
        COALESCE(l.move_ins, 0)::int AS move_ins,
        COALESCE(l.total_revenue, 0)::float AS revenue,
        CASE WHEN COALESCE(l.total_leads, 0) > 0 THEN ROUND(COALESCE(s.total_spend, 0) / l.total_leads, 2)::float ELSE 0 END AS cpl,
        CASE WHEN COALESCE(l.move_ins, 0) > 0 THEN ROUND(COALESCE(s.total_spend, 0) / l.move_ins, 2)::float ELSE 0 END AS cost_per_move_in,
        CASE WHEN COALESCE(s.total_spend, 0) > 0 THEN ROUND((COALESCE(l.total_revenue, 0) * 12) / s.total_spend, 2)::float ELSE 0 END AS roas
      FROM spend s
      FULL OUTER JOIN leads l ON s.utm_campaign = l.utm_campaign
      ORDER BY COALESCE(s.total_spend, 0) DESC
    `);

    const totals = campaigns.reduce(
      (acc, c) => {
        acc.spend += Number(c.spend) || 0;
        acc.impressions += Number(c.impressions) || 0;
        acc.clicks += Number(c.clicks) || 0;
        acc.leads += Number(c.leads) || 0;
        acc.move_ins += Number(c.move_ins) || 0;
        acc.revenue += Number(c.revenue) || 0;
        return acc;
      },
      {
        spend: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        move_ins: 0,
        revenue: 0,
        cpl: 0,
        cost_per_move_in: 0,
        roas: 0,
      }
    );

    totals.cpl =
      totals.leads > 0
        ? Math.round((totals.spend / totals.leads) * 100) / 100
        : 0;
    totals.cost_per_move_in =
      totals.move_ins > 0
        ? Math.round((totals.spend / totals.move_ins) * 100) / 100
        : 0;
    totals.roas =
      totals.spend > 0
        ? Math.round(((totals.revenue * 12) / totals.spend) * 100) / 100
        : 0;

    const monthlyTrend = await db.$queryRaw<
      Array<{
        month: string;
        spend: number;
        leads: number;
        move_ins: number;
        revenue: number;
        cpl: number;
        roas: number;
      }>
    >(Prisma.sql`
      WITH monthly_spend AS (
        SELECT DATE_TRUNC('month', date)::date AS month, SUM(spend) AS spend
        FROM campaign_spend
        WHERE facility_id = ${facilityId}::uuid AND date BETWEEN ${startDate}::date AND ${endDate}::date
        GROUP BY DATE_TRUNC('month', date)
      ),
      monthly_leads AS (
        SELECT DATE_TRUNC('month', created_at)::date AS month,
          COUNT(*) FILTER (WHERE lead_status NOT IN ('partial', 'lost')) AS leads,
          COUNT(*) FILTER (WHERE lead_status = 'moved_in') AS move_ins,
          COALESCE(SUM(monthly_revenue) FILTER (WHERE lead_status = 'moved_in'), 0) AS revenue
        FROM partial_leads
        WHERE facility_id = ${facilityId}::uuid AND created_at::date BETWEEN ${startDate}::date AND ${endDate}::date AND lead_status != 'partial'
        GROUP BY DATE_TRUNC('month', created_at)
      )
      SELECT
        TO_CHAR(COALESCE(s.month, l.month), 'YYYY-MM') AS month,
        COALESCE(s.spend, 0)::float AS spend,
        COALESCE(l.leads, 0)::int AS leads,
        COALESCE(l.move_ins, 0)::int AS move_ins,
        COALESCE(l.revenue, 0)::float AS revenue,
        CASE WHEN COALESCE(l.leads, 0) > 0 THEN ROUND(COALESCE(s.spend, 0) / l.leads, 2)::float ELSE 0 END AS cpl,
        CASE WHEN COALESCE(s.spend, 0) > 0 THEN ROUND((COALESCE(l.revenue, 0) * 12) / s.spend, 2)::float ELSE 0 END AS roas
      FROM monthly_spend s
      FULL OUTER JOIN monthly_leads l ON s.month = l.month
      ORDER BY COALESCE(s.month, l.month)
    `);

    return jsonResponse(
      {
        campaigns,
        totals,
        monthlyTrend,
        dateRange: { start: startDate, end: endDate },
        hasData: campaigns.length > 0,
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Failed to compute attribution", 500, origin);
  }
}
