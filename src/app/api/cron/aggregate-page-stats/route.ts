import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.WEBHOOK, "cron-aggregate-page-stats");
  if (limited) return limited;
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const MAX_EXECUTION_TIME_MS = 45_000; // 45s (leave 15s buffer for 60s limit)
  const startTime = Date.now();

  const results = {
    aggregated: 0,
    pruned: 0,
    errors: [] as string[],
    timedOut: false,
  };

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    const pages = await db.$queryRaw<{ landing_page_id: string }[]>`
      SELECT DISTINCT landing_page_id FROM page_interactions
      WHERE created_at >= ${dateStr}::date AND created_at < ${dateStr}::date + INTERVAL '1 day'
      LIMIT 100
    `;

    for (const page of pages) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        console.warn(`[CRON:aggregate-page-stats] Time limit reached. Aggregated: ${results.aggregated}. Remaining will be picked up next run.`);
        results.timedOut = true;
        break;
      }
      try {
        const lpId = page.landing_page_id;

        const stats = await db.$queryRaw<
          {
            total_sessions: number;
            avg_scroll_depth: number;
            avg_time_on_page: number;
          }[]
        >`
          SELECT
            COUNT(DISTINCT session_id)::int AS total_sessions,
            COALESCE(AVG(CASE WHEN scroll_depth IS NOT NULL THEN scroll_depth END), 0)::int AS avg_scroll_depth,
            COALESCE(AVG(CASE WHEN time_on_page > 0 THEN time_on_page END), 0)::int AS avg_time_on_page
          FROM page_interactions
          WHERE landing_page_id = ${lpId}::uuid
          AND created_at >= ${dateStr}::date AND created_at < ${dateStr}::date + INTERVAL '1 day'
        `;

        const clicks = await db.$queryRaw<
          { x: number; y: number; count: number }[]
        >`
          SELECT
            ROUND(x_pct / 5) * 5 AS x,
            ROUND(y_pct / 5) * 5 AS y,
            COUNT(*)::int AS count
          FROM page_interactions
          WHERE landing_page_id = ${lpId}::uuid AND event_type = 'click'
          AND x_pct IS NOT NULL AND y_pct IS NOT NULL
          AND created_at >= ${dateStr}::date AND created_at < ${dateStr}::date + INTERVAL '1 day'
          GROUP BY ROUND(x_pct / 5) * 5, ROUND(y_pct / 5) * 5
          ORDER BY count DESC
          LIMIT 100
        `;

        const sections = await db.$queryRaw<
          { section_index: number; views: number }[]
        >`
          SELECT section_index, COUNT(DISTINCT session_id)::int AS views
          FROM page_interactions
          WHERE landing_page_id = ${lpId}::uuid AND event_type = 'section_view'
          AND section_index IS NOT NULL
          AND created_at >= ${dateStr}::date AND created_at < ${dateStr}::date + INTERVAL '1 day'
          GROUP BY section_index
        `;

        const ctas = await db.$queryRaw<
          { element_id: string; clicks: number }[]
        >`
          SELECT element_id, COUNT(*)::int AS clicks
          FROM page_interactions
          WHERE landing_page_id = ${lpId}::uuid AND event_type = 'click'
          AND element_id IS NOT NULL
          AND created_at >= ${dateStr}::date AND created_at < ${dateStr}::date + INTERVAL '1 day'
          GROUP BY element_id
          ORDER BY clicks DESC
          LIMIT 20
        `;

        const bounceData = await db.$queryRaw<
          { total: number; bounced: number }[]
        >`
          SELECT
            COUNT(DISTINCT session_id)::int AS total,
            COUNT(DISTINCT session_id) FILTER (
              WHERE session_id IN (
                SELECT session_id FROM page_interactions
                WHERE landing_page_id = ${lpId}::uuid
                AND created_at >= ${dateStr}::date AND created_at < ${dateStr}::date + INTERVAL '1 day'
                GROUP BY session_id HAVING COUNT(*) = 1
              )
            )::int AS bounced
          FROM page_interactions
          WHERE landing_page_id = ${lpId}::uuid
          AND created_at >= ${dateStr}::date AND created_at < ${dateStr}::date + INTERVAL '1 day'
        `;

        const totalSessions = stats[0]?.total_sessions || 0;
        const bounceRate =
          bounceData[0]?.total > 0
            ? Math.round(
                (bounceData[0].bounced / bounceData[0].total) * 10000
              ) / 100
            : 0;

        const clickZones = JSON.stringify(
          clicks.map((c) => ({ x: c.x, y: c.y, count: c.count }))
        );
        const sectionViews = JSON.stringify(
          Object.fromEntries(
            sections.map((s) => [s.section_index, s.views])
          )
        );
        const ctaClicks = JSON.stringify(
          Object.fromEntries(
            ctas.map((c) => [c.element_id, c.clicks])
          )
        );

        await db.$executeRaw`
          INSERT INTO page_interaction_stats
          (landing_page_id, period_date, total_sessions, avg_scroll_depth, avg_time_on_page, click_zones, section_views, cta_clicks, bounce_rate)
          VALUES (${lpId}::uuid, ${dateStr}::date, ${totalSessions}, ${stats[0]?.avg_scroll_depth || 0}, ${stats[0]?.avg_time_on_page || 0}, ${clickZones}::jsonb, ${sectionViews}::jsonb, ${ctaClicks}::jsonb, ${bounceRate})
          ON CONFLICT (landing_page_id, period_date) DO UPDATE SET
            total_sessions = EXCLUDED.total_sessions,
            avg_scroll_depth = EXCLUDED.avg_scroll_depth,
            avg_time_on_page = EXCLUDED.avg_time_on_page,
            click_zones = EXCLUDED.click_zones,
            section_views = EXCLUDED.section_views,
            cta_clicks = EXCLUDED.cta_clicks,
            bounce_rate = EXCLUDED.bounce_rate
        `;

        results.aggregated++;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        results.errors.push(
          `${page.landing_page_id}: ${message}`
        );
      }
    }

    if (!results.timedOut) {
      const pruned = await db.$executeRaw`
        DELETE FROM page_interactions WHERE created_at < NOW() - INTERVAL '30 days'
      `;
      results.pruned = pruned;
    }

    console.log(`[CRON:aggregate-page-stats] Complete. Aggregated: ${results.aggregated}, Pruned: ${results.pruned}, Errors: ${results.errors.length}`);

    // Log cron completion
    db.activity_log.create({
      data: {
        type: "cron_completed",
        detail: `[aggregate-page-stats] Aggregated: ${results.aggregated}, Pruned: ${results.pruned}, Errors: ${results.errors.length}`,
        meta: JSON.parse(JSON.stringify(results)),
      },
    }).catch((err) => console.error("[activity_log] Cron log failed:", err));

    return NextResponse.json({ success: true, ...results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[CRON:aggregate-page-stats] Fatal error:`, err);

    // Notify admin of cron failure
    if (process.env.RESEND_API_KEY) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "StorageAds <noreply@storageads.com>",
          to: process.env.ADMIN_EMAIL || "blake@storageads.com",
          subject: `[CRON FAILURE] aggregate-page-stats`,
          html: `<p>The <strong>aggregate-page-stats</strong> cron job failed:</p><pre>${message}</pre><p>Time: ${new Date().toISOString()}</p>`,
        }),
      }).catch((err) => { console.error("[fire-and-forget error]", err instanceof Error ? err.message : err); });
    }

    return NextResponse.json({ error: "Cron processing failed", message }, { status: 500 });
  }
}
