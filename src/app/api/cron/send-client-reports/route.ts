import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 120;

function esc(str: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCurrency(n: number): string {
  return (
    "$" +
    Number(n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function trendArrow(
  current: number,
  previous: number | null | undefined,
  lowerIsBetter: boolean
): string {
  if (!previous || previous === 0) return "";
  const pctChange = Math.round(((current - previous) / previous) * 100);
  if (pctChange === 0)
    return '<span style="color:#94a3b8;">&#8594; 0%</span>';
  const isGood = lowerIsBetter ? pctChange < 0 : pctChange > 0;
  const color = isGood ? "#16a34a" : "#dc2626";
  const arrow = pctChange > 0 ? "&#8593;" : "&#8595;";
  return `<span style="color:${color};">${arrow} ${Math.abs(pctChange)}%</span>`;
}

interface ReportData {
  periodLabel: string;
  current: {
    spend: number;
    leads: number;
    moveIns: number;
    cpl: number;
    roas: number;
    calls: number;
    walkins: number;
  };
  previous: {
    spend: number;
    leads: number;
    moveIns: number;
    cpl: number;
    roas: number;
  } | null;
  totals: { spend: number; leads: number; moveIns: number };
  aiNarrative?: string;
  bestCampaign?: { name: string; roas: number } | null;
  worstCampaign?: { name: string; roas: number } | null;
}

function renderReportHTML(
  data: ReportData,
  _clientName: string,
  facilityName: string,
  reportId: string
): string {
  const { current, previous, aiNarrative, bestCampaign, worstCampaign } = data;
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://storageads.com";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,system-ui,sans-serif;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;width:36px;height:36px;background:linear-gradient(135deg,#10b981,#16a34a);border-radius:8px;margin-bottom:8px;"></div>
    <h1 style="margin:0;font-size:20px;color:#0f172a;">Your ${esc(facilityName)} Report</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">${data.periodLabel}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tr>
      <td style="width:50%;padding:4px;"><div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Ad Spend</div>
        <div style="font-size:24px;font-weight:700;color:#0f172a;margin:4px 0;">${formatCurrency(current.spend)}</div>
        <div style="font-size:11px;">${trendArrow(current.spend, previous?.spend, false)}</div>
      </div></td>
      <td style="width:50%;padding:4px;"><div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Leads</div>
        <div style="font-size:24px;font-weight:700;color:#0f172a;margin:4px 0;">${current.leads}</div>
        <div style="font-size:11px;">${trendArrow(current.leads, previous?.leads, false)}</div>
      </div></td>
    </tr>
    <tr>
      <td style="width:50%;padding:4px;"><div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Move-Ins</div>
        <div style="font-size:24px;font-weight:700;color:#16a34a;margin:4px 0;">${current.moveIns}</div>
        <div style="font-size:11px;">${trendArrow(current.moveIns, previous?.moveIns, false)}</div>
      </div></td>
      <td style="width:50%;padding:4px;"><div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Cost / Move-In</div>
        <div style="font-size:24px;font-weight:700;color:#0f172a;margin:4px 0;">${current.moveIns > 0 ? formatCurrency(current.spend / current.moveIns) : "&#8212;"}</div>
        <div style="font-size:11px;">${current.moveIns > 0 && previous && previous.moveIns > 0 ? trendArrow(current.spend / current.moveIns, previous.spend / previous.moveIns, true) : ""}</div>
      </div></td>
    </tr>
  </table>
  <div style="background:linear-gradient(135deg,#020617,#0f172a);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
    <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Estimated ROI</div>
    <div style="font-size:32px;font-weight:700;color:#10b981;margin:4px 0;">${current.roas > 0 ? current.roas.toFixed(1) + "x" : "&#8212;"}</div>
    <div style="font-size:12px;color:#64748b;">Based on ${current.moveIns} move-ins x $110/mo avg rent x 12 months</div>
  </div>
  ${
    current.leads > 0
      ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:20px;">
    <h3 style="margin:0 0 12px;font-size:14px;color:#0f172a;">Lead Sources</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-size:13px;color:#64748b;">Digital (tracked)</td><td style="padding:8px 0;font-size:13px;font-weight:600;text-align:right;">${current.leads}</td></tr>
      ${current.calls > 0 ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-size:13px;color:#64748b;">Phone calls (tracked)</td><td style="padding:8px 0;font-size:13px;font-weight:600;text-align:right;">${current.calls}</td></tr>` : ""}
      ${current.walkins > 0 ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-size:13px;color:#64748b;">Walk-ins (reported)</td><td style="padding:8px 0;font-size:13px;font-weight:600;text-align:right;">${current.walkins}</td></tr>` : ""}
    </table>
  </div>`
      : ""
  }
  ${aiNarrative ? `<div style="background:#faf9f5;border:1px solid #e8e6dc;border-radius:12px;padding:16px;margin-bottom:20px;">
    <h3 style="margin:0 0 8px;font-size:13px;color:#B58B3F;text-transform:uppercase;letter-spacing:0.5px;">What We Did This Month</h3>
    <p style="margin:0;font-size:13px;color:#141413;line-height:1.6;">${esc(aiNarrative)}</p>
  </div>` : ""}
  ${bestCampaign || worstCampaign ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:20px;">
    <h3 style="margin:0 0 12px;font-size:14px;color:#0f172a;">Campaign Spotlight</h3>
    <table style="width:100%;border-collapse:collapse;">
      ${bestCampaign ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-size:13px;color:#16a34a;font-weight:600;">&#9733; Best</td><td style="padding:8px 0;font-size:13px;">${esc(bestCampaign.name)}</td><td style="padding:8px 0;font-size:13px;text-align:right;font-weight:600;">${bestCampaign.roas.toFixed(1)}x ROAS</td></tr>` : ""}
      ${worstCampaign && worstCampaign.name !== bestCampaign?.name ? `<tr><td style="padding:8px 0;font-size:13px;color:#dc2626;font-weight:600;">Needs Work</td><td style="padding:8px 0;font-size:13px;">${esc(worstCampaign.name)}</td><td style="padding:8px 0;font-size:13px;text-align:right;font-weight:600;">${worstCampaign.roas.toFixed(1)}x ROAS</td></tr>` : ""}
    </table>
  </div>` : ""}
  <div style="text-align:center;margin-bottom:24px;">
    <a href="${baseUrl}/portal" style="display:inline-block;padding:14px 32px;background:#B58B3F;color:#faf9f5;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View Full Dashboard</a>
  </div>
  <div style="text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px;">
    <p style="margin:0;">StorageAds by StorageAds.com</p>
    <p style="margin:4px 0 0;">This report tracks the digital path from ad click to move-in.</p>
  </div>
</div>
<img src="${baseUrl}/api/report-open?id=${reportId}" width="1" height="1" style="display:none;" alt="" />
</body></html>`;
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.WEBHOOK, "cron-send-client-reports");
  if (limited) return limited;
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const BATCH_SIZE = 20;
  const MAX_EXECUTION_TIME_MS = 90_000; // 90s (leave 30s buffer for 120s Vercel limit)
  const startTime = Date.now();

  const results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [] as string[],
    timedOut: false,
  };

  try {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const isFirstWeek = dayOfMonth <= 7;

    let cursor: string | undefined = undefined;

    while (true) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        console.warn(`[CRON:send-client-reports] Time limit reached. Processed: ${results.processed}, Sent: ${results.sent}. Remaining will be picked up next run.`);
        results.timedOut = true;
        break;
      }

      let clients: Record<string, unknown>[];
      if (cursor) {
        clients = await db.$queryRaw<Record<string, unknown>[]>`
            SELECT c.*, f.id AS fac_id, f.name AS fac_name
            FROM clients c
            JOIN facilities f ON c.facility_id = f.id
            WHERE c.report_enabled = true AND c.id > ${cursor}::uuid
            ORDER BY c.id ASC
            LIMIT ${BATCH_SIZE}
          `;
      } else {
        clients = await db.$queryRaw<Record<string, unknown>[]>`
            SELECT c.*, f.id AS fac_id, f.name AS fac_name
            FROM clients c
            JOIN facilities f ON c.facility_id = f.id
            WHERE c.report_enabled = true
            ORDER BY c.id ASC
            LIMIT ${BATCH_SIZE}
          `;
      }

      if (clients.length === 0) break;

    for (const client of clients) {
      try {
        results.processed++;

        if (client.report_frequency === "monthly" && !isFirstWeek) {
          results.skipped++;
          continue;
        }

        const isWeekly = client.report_frequency === "weekly";
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() - 1);
        const periodStart = new Date(periodEnd);
        if (isWeekly) {
          periodStart.setDate(periodStart.getDate() - 6);
        } else {
          periodStart.setMonth(periodStart.getMonth() - 1);
          periodStart.setDate(1);
        }

        const periodStartStr = periodStart.toISOString().slice(0, 10);
        const periodEndStr = periodEnd.toISOString().slice(0, 10);

        const existing = await db.$queryRaw<{ id: string }[]>`
          SELECT id FROM client_reports WHERE client_id = ${client.id}::uuid
          AND report_type = ${isWeekly ? "weekly" : "monthly"} AND period_start = ${periodStartStr}::date
        `;
        if (existing.length > 0) {
          results.skipped++;
          continue;
        }

        const campaigns = await db.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM client_campaigns WHERE client_id = ${client.id}::uuid ORDER BY month ASC
        `;

        if (campaigns.length === 0) {
          results.skipped++;
          continue;
        }

        const current = campaigns[campaigns.length - 1];
        const previous =
          campaigns.length >= 2 ? campaigns[campaigns.length - 2] : null;

        let callCount = 0;
        try {
          const calls = await db.$queryRaw<{ cnt: number }[]>`
            SELECT COUNT(*)::int AS cnt FROM call_logs WHERE facility_id = ${client.fac_id}::uuid
            AND started_at >= ${periodStartStr}::date AND started_at <= ${periodEndStr}::date
          `;
          callCount = calls[0]?.cnt || 0;
        } catch {
          // No call tracking
        }

        // Walk-in count from activity_log (walkin_attributions table was never created)
        let walkinCount = 0;
        try {
          const walkins = await db.activity_log.count({
            where: {
              type: "walkin",
              facility_id: client.fac_id as string,
              created_at: { gte: new Date(periodStartStr), lte: new Date(periodEndStr) },
            },
          });
          walkinCount = walkins;
        } catch {
          // No walkin data
        }

        const totals = campaigns.reduce(
          (acc: { spend: number; leads: number; moveIns: number }, c) => ({
            spend: acc.spend + Number(c.spend || 0),
            leads: acc.leads + Number(c.leads || 0),
            moveIns: acc.moveIns + Number(c.move_ins || 0),
          }),
          { spend: 0, leads: 0, moveIns: 0 }
        );

        // Best/worst campaigns by ROAS
        let bestCampaign: { name: string; roas: number } | null = null;
        let worstCampaign: { name: string; roas: number } | null = null;
        try {
          const campaignDetails = await db.$queryRaw<Array<{ campaign_name: string; spend: number; move_ins: number }>>`
            SELECT campaign_name, SUM(spend)::float AS spend, SUM(move_ins)::int AS move_ins
            FROM client_campaigns
            WHERE client_id = ${client.id}::uuid AND spend > 0
            GROUP BY campaign_name
          `;
          const withRoas = campaignDetails
            .filter((c) => c.spend > 0)
            .map((c) => ({
              name: c.campaign_name || "Unnamed",
              roas: c.move_ins > 0 ? (c.move_ins * 110 * 12) / c.spend : 0,
            }))
            .sort((a, b) => b.roas - a.roas);
          if (withRoas.length >= 1) bestCampaign = withRoas[0];
          if (withRoas.length >= 2) worstCampaign = withRoas[withRoas.length - 1];
        } catch { /* campaign details unavailable */ }

        // AI-generated narrative from activity log
        let aiNarrative = "";
        try {
          const activities = await db.activity_log.findMany({
            where: {
              facility_id: client.fac_id as string,
              created_at: { gte: new Date(periodStartStr), lte: new Date(periodEndStr) },
            },
            orderBy: { created_at: "desc" },
            take: 50,
            select: { type: true, detail: true },
          });

          // Generate fallback from raw activity counts if AI fails
          if (activities.length > 0) {
            const typeCounts = new Map<string, number>();
            for (const a of activities) {
              typeCounts.set(a.type, (typeCounts.get(a.type) || 0) + 1);
            }
            const fallbackParts: string[] = [];
            if (typeCounts.get("campaign_launched")) fallbackParts.push(`launched ${typeCounts.get("campaign_launched")} new campaigns`);
            if (typeCounts.get("gbp_post_published")) fallbackParts.push(`published ${typeCounts.get("gbp_post_published")} GBP posts`);
            if (typeCounts.get("gbp_review_responded")) fallbackParts.push(`responded to ${typeCounts.get("gbp_review_responded")} reviews`);
            if (typeCounts.get("landing_page_published")) fallbackParts.push(`published ${typeCounts.get("landing_page_published")} landing pages`);
            if (fallbackParts.length > 0) {
              aiNarrative = `This month we ${fallbackParts.join(", ")}.`;
            }
          }

          if (activities.length > 0 && process.env.ANTHROPIC_API_KEY) {
            const activitySummary = activities
              .map((a) => `${a.type}: ${a.detail}`)
              .join("\n");

            const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 150,
                messages: [{
                  role: "user",
                  content: `Summarize what StorageAds did this month for a self-storage facility in 2-3 sentences. Be specific and professional. Activities:\n${activitySummary}`,
                }],
              }),
            });
            if (claudeRes.ok) {
              const claudeData = await claudeRes.json();
              aiNarrative = claudeData.content?.[0]?.text || "";
            }
          }
        } catch { /* AI narrative is optional */ }

        const reportData: ReportData = {
          periodLabel: isWeekly
            ? `Week of ${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : periodStart.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              }),
          current: {
            spend: Number(current.spend || 0),
            leads: Number(current.leads || 0),
            moveIns: Number(current.move_ins || 0),
            cpl: Number(current.cpl || 0),
            roas: Number(current.roas || 0),
            calls: callCount,
            walkins: walkinCount,
          },
          previous: previous
            ? {
                spend: Number(previous.spend || 0),
                leads: Number(previous.leads || 0),
                moveIns: Number(previous.move_ins || 0),
                cpl: Number(previous.cpl || 0),
                roas: Number(previous.roas || 0),
              }
            : null,
          totals,
          aiNarrative: aiNarrative || undefined,
          bestCampaign,
          worstCampaign,
        };

        // Check if this is a preview-only request (admin previewing before send)
        const isPreview = client.report_preview_mode === true;

        const { reportId, html } = await db.$transaction(async (tx) => {
          const reportRow = await tx.$queryRaw<{ id: string }[]>`
            INSERT INTO client_reports (client_id, facility_id, report_type, period_start, period_end, report_html, report_data, status)
            VALUES (${client.id}::uuid, ${client.fac_id}::uuid, ${isWeekly ? "weekly" : "monthly"}, ${periodStartStr}::date, ${periodEndStr}::date, '', ${JSON.stringify(reportData)}::jsonb, ${isPreview ? "preview" : "generated"})
            RETURNING id
          `;
          const id = reportRow[0].id;

          const renderedHtml = renderReportHTML(
            reportData,
            client.name as string,
            (client.fac_name as string) || (client.facility_name as string),
            id
          );

          await tx.$executeRaw`UPDATE client_reports SET report_html = ${renderedHtml} WHERE id = ${id}::uuid`;

          return { reportId: id, html: renderedHtml };
        });

        // Preview mode: generate but don't send — admin reviews first
        if (isPreview) {
          results.skipped++;
          continue;
        }

        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          // Generate PDF attachment
          let pdfAttachment: { filename: string; content: string } | undefined;
          try {
            const { generatePdfReport } = await import("@/lib/pdf-report");
            const pdfBuffer = await generatePdfReport({
              type: "monthly_performance",
              summary: {
                facilityName: (client.fac_name as string) || (client.facility_name as string),
                period: { start: periodStartStr, end: periodEndStr },
                totalSpend: reportData.current.spend.toFixed(2),
                totalImpressions: 0,
                totalClicks: 0,
                ctr: "0.00",
                totalLeads: reportData.current.leads,
                totalCalls: reportData.current.calls,
                qualifiedCalls: reportData.current.calls,
                costPerLead: reportData.current.cpl > 0 ? reportData.current.cpl.toFixed(2) : "N/A",
              },
            });
            pdfAttachment = {
              filename: `report-${periodStartStr}.pdf`,
              content: pdfBuffer.toString("base64"),
            };
          } catch {
            // PDF generation failed — send without attachment
          }

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              from: "StorageAds <reports@storageads.com>",
              to: client.email,
              subject: `${client.fac_name || client.facility_name} — ${isWeekly ? "Weekly" : "Monthly"} Performance Report`,
              html,
              ...(pdfAttachment ? { attachments: [pdfAttachment] } : {}),
            }),
          });

          if (emailRes.ok) {
            await db.$executeRaw`UPDATE client_reports SET sent_at = NOW(), status = 'sent' WHERE id = ${reportId}::uuid`;
            results.sent++;
          } else {
            const errText = await emailRes.text();
            await db.$executeRaw`UPDATE client_reports SET status = 'failed' WHERE id = ${reportId}::uuid`;
            results.errors.push(
              `Email failed for ${client.email}: ${errText}`
            );
          }
        }

        db.$executeRaw`
          INSERT INTO activity_log (type, facility_id, facility_name, detail)
          VALUES ('report_sent', ${client.fac_id}::uuid, ${client.fac_name}, ${`${isWeekly ? "Weekly" : "Monthly"} report sent to ${client.email}`})
        `.catch((err) => console.error("[activity_log] Fire-and-forget failed:", err));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`${client.email}: ${message}`);
      }
    }

      // Set cursor for next batch
      cursor = clients[clients.length - 1].id as string;
      if (clients.length < BATCH_SIZE) break;
    }

    console.log(`[CRON:send-client-reports] Complete. Processed: ${results.processed}, Sent: ${results.sent}, Skipped: ${results.skipped}, Failed: ${results.errors.length}`);
    if (results.errors.length > 0) {
      console.error(`[CRON:send-client-reports] Failures:`, JSON.stringify(results.errors));
    }

    // Log cron completion
    db.activity_log.create({
      data: {
        type: "cron_completed",
        detail: `[send-client-reports] Processed: ${results.processed}, Sent: ${results.sent}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
        meta: JSON.parse(JSON.stringify(results)),
      },
    }).catch((err) => console.error("[activity_log] Cron log failed:", err));

    return NextResponse.json({ success: true, ...results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[CRON:send-client-reports] Fatal error:`, err);

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
          subject: `[CRON FAILURE] send-client-reports`,
          html: `<p>The <strong>send-client-reports</strong> cron job failed:</p><pre>${message}</pre><p>Time: ${new Date().toISOString()}</p>`,
        }),
      }).catch((err) => { console.error("[fire-and-forget error]", err instanceof Error ? err.message : err); });
    }

    return NextResponse.json({ error: "Cron processing failed", message }, { status: 500 });
  }
}
