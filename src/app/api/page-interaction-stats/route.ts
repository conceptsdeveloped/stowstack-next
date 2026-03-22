import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, requireAdminKey } from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const landingPageId = url.searchParams.get("landingPageId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!landingPageId) {
      return errorResponse("Missing landingPageId", 400, origin);
    }

    const statsParams: unknown[] = [landingPageId];
    let statsQuery = `SELECT * FROM page_interaction_stats WHERE landing_page_id = $1`;
    let paramIdx = 2;

    if (startDate) {
      statsQuery += ` AND period_date >= $${paramIdx++}`;
      statsParams.push(startDate);
    }
    if (endDate) {
      statsQuery += ` AND period_date <= $${paramIdx++}`;
      statsParams.push(endDate);
    }
    statsQuery += ` ORDER BY period_date DESC LIMIT 90`;

    const stats = await db.$queryRawUnsafe(statsQuery, ...statsParams);

    const today = new Date().toISOString().slice(0, 10);
    const todayRaw = await db.$queryRawUnsafe<
      Array<{ sessions: number; avg_scroll: number; avg_time: number; total_clicks: number }>
    >(
      `SELECT
         COUNT(DISTINCT session_id)::int AS sessions,
         AVG(CASE WHEN scroll_depth IS NOT NULL THEN scroll_depth END)::int AS avg_scroll,
         AVG(CASE WHEN time_on_page > 0 THEN time_on_page END)::int AS avg_time,
         COUNT(*) FILTER (WHERE event_type = 'click')::int AS total_clicks
       FROM page_interactions
       WHERE landing_page_id = $1 AND created_at >= $2`,
      landingPageId,
      today
    );

    const clicks = await db.$queryRawUnsafe(
      `SELECT x_pct, y_pct, COUNT(*)::int AS count
       FROM page_interactions
       WHERE landing_page_id = $1 AND event_type = 'click'
       AND x_pct IS NOT NULL AND y_pct IS NOT NULL
       AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY ROUND(x_pct / 5) * 5, ROUND(y_pct / 5) * 5, x_pct, y_pct
       ORDER BY count DESC
       LIMIT 200`,
      landingPageId
    );

    const ctaClicks = await db.$queryRawUnsafe(
      `SELECT element_id, element_text, COUNT(*)::int AS clicks
       FROM page_interactions
       WHERE landing_page_id = $1 AND event_type = 'click'
       AND element_id IS NOT NULL
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY element_id, element_text
       ORDER BY clicks DESC
       LIMIT 20`,
      landingPageId
    );

    const sectionViews = await db.$queryRawUnsafe(
      `SELECT section_index, COUNT(DISTINCT session_id)::int AS unique_views
       FROM page_interactions
       WHERE landing_page_id = $1 AND event_type = 'section_view'
       AND section_index IS NOT NULL
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY section_index
       ORDER BY section_index`,
      landingPageId
    );

    return jsonResponse(
      {
        success: true,
        dailyStats: stats,
        today: (todayRaw as Array<Record<string, unknown>>)[0] || { sessions: 0, avg_scroll: 0, avg_time: 0, total_clicks: 0 },
        clickHeatmap: clicks,
        ctaPerformance: ctaClicks,
        sectionViews,
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
