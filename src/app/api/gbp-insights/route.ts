import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";

interface GbpConnection {
  id: string;
  location_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: Date | null;
}

async function getValidToken(
  connection: GbpConnection
): Promise<string | null> {
  if (
    connection.access_token &&
    connection.token_expires_at &&
    new Date(connection.token_expires_at) > new Date()
  ) {
    return connection.access_token;
  }
  if (!connection.refresh_token) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET || "",
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      const expiresAt = new Date(
        Date.now() + (data.expires_in || 3600) * 1000
      );
      await db.gbp_connections.update({
        where: { id: connection.id },
        data: {
          access_token: data.access_token,
          token_expires_at: expiresAt,
          status: "connected",
          updated_at: new Date(),
        },
      });
      return data.access_token;
    }
  } catch {
    // Token refresh failed
  }
  return null;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function syncInsights(
  facilityId: string,
  connection: GbpConnection
) {
  const token = await getValidToken(connection);
  if (!token)
    throw new Error("Unable to authenticate with Google Business Profile");

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const res = await fetch(
    `https://businessprofileperformance.googleapis.com/v1/${connection.location_id}:fetchMultiDailyMetricsTimeSeries?` +
      `dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS&dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_SEARCH&` +
      `dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_MAPS&dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_SEARCH&` +
      `dailyMetrics=CALL_CLICKS&dailyMetrics=WEBSITE_CLICKS&dailyMetrics=BUSINESS_DIRECTION_REQUESTS&` +
      `dailyRange.start_date.year=${startDate.getFullYear()}&dailyRange.start_date.month=${startDate.getMonth() + 1}&dailyRange.start_date.day=${startDate.getDate()}&` +
      `dailyRange.end_date.year=${endDate.getFullYear()}&dailyRange.end_date.month=${endDate.getMonth() + 1}&dailyRange.end_date.day=${endDate.getDate()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let searchViews = 0;
  let mapsViews = 0;
  let websiteClicks = 0;
  let directionClicks = 0;
  let phoneCalls = 0;

  if (res.ok) {
    const data = await res.json();
    const series = data.multiDailyMetricTimeSeries || [];

    for (const metric of series) {
      const metricName = metric.dailyMetric;
      const total = (metric.timeSeries?.datedValues || []).reduce(
        (sum: number, v: { value?: string }) =>
          sum + (parseInt(v.value || "0") || 0),
        0
      );

      if (metricName?.includes("SEARCH")) searchViews += total;
      else if (metricName?.includes("MAPS")) mapsViews += total;
      else if (metricName === "WEBSITE_CLICKS") websiteClicks = total;
      else if (metricName === "BUSINESS_DIRECTION_REQUESTS")
        directionClicks = total;
      else if (metricName === "CALL_CLICKS") phoneCalls = total;
    }

    await db.gbp_insights.upsert({
      where: {
        facility_id_period_start_period_end: {
          facility_id: facilityId,
          period_start: new Date(formatDate(startDate)),
          period_end: new Date(formatDate(endDate)),
        },
      },
      create: {
        facility_id: facilityId,
        period_start: new Date(formatDate(startDate)),
        period_end: new Date(formatDate(endDate)),
        search_views: searchViews,
        maps_views: mapsViews,
        website_clicks: websiteClicks,
        direction_clicks: directionClicks,
        phone_calls: phoneCalls,
        total_searches: searchViews + mapsViews,
        raw_data: data,
        synced_at: new Date(),
      },
      update: {
        search_views: searchViews,
        maps_views: mapsViews,
        website_clicks: websiteClicks,
        direction_clicks: directionClicks,
        phone_calls: phoneCalls,
        total_searches: searchViews + mapsViews,
        raw_data: data,
        synced_at: new Date(),
      },
    });

    return { searchViews, mapsViews, websiteClicks, directionClicks, phoneCalls };
  }

  const errData = await res.json().catch(() => ({}));
  throw new Error(
    errData.error?.message || `GBP Insights API error ${res.status}`
  );
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const facilityId = req.nextUrl.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const insights = await db.gbp_insights.findMany({
      where: { facility_id: facilityId },
      orderBy: { period_start: "desc" },
      take: 12,
    });

    const latest = insights[0] || null;
    const summary = latest
      ? {
          search_views: latest.search_views,
          maps_views: latest.maps_views,
          website_clicks: latest.website_clicks,
          direction_clicks: latest.direction_clicks,
          phone_calls: latest.phone_calls,
          total_impressions:
            (latest.search_views || 0) + (latest.maps_views || 0),
          total_actions:
            (latest.website_clicks || 0) +
            (latest.direction_clicks || 0) +
            (latest.phone_calls || 0),
          period: `${formatDate(latest.period_start)} to ${formatDate(latest.period_end)}`,
        }
      : null;

    return jsonResponse({ insights, summary }, 200, origin);
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const { facilityId } = await req.json();
    if (!facilityId) return errorResponse("facilityId required", 400, origin);

    const connection = await db.gbp_connections.findFirst({
      where: { facility_id: facilityId, status: "connected" },
    });
    if (!connection)
      return errorResponse("No GBP connection", 400, origin);

    try {
      const result = await syncInsights(facilityId, connection);
      return jsonResponse({ ok: true, ...result }, 200, origin);
    } catch (err: unknown) {
      return errorResponse(
        err instanceof Error ? err.message : "Sync failed",
        500,
        origin
      );
    }
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}
