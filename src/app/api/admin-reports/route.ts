import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
  getCorsHeaders,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import type { ReportType, ExportFormat } from "@/types/reports";
import { generatePdfReport } from "@/lib/pdf-report";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/**
 * GET /api/admin-reports
 * List generated reports, optionally filtered by facility.
 */
export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "admin-reports");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authError = await requireAdminKey(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const downloadId = url.searchParams.get("download");
  const facilityId = url.searchParams.get("facilityId");

  try {
    // Download a specific report
    if (downloadId) {
      const report = await db.client_reports.findUnique({
        where: { id: downloadId },
        select: { id: true, report_html: true, report_data: true, report_type: true, period_start: true },
      });
      if (!report) return errorResponse("Report not found", 404, origin);

      const reportData = report.report_data as Record<string, unknown> | null;
      const format = (reportData?.format as string) || "html";

      if (format === "csv") {
        const csv = report.report_html || "";
        return new NextResponse(csv, {
          status: 200,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="report-${report.report_type}-${report.period_start.toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      if (format === "pdf") {
        try {
          const pdfBuffer = await generatePdfReport({
            type: report.report_type || "monthly_performance",
            summary: (reportData?.summary as Parameters<typeof generatePdfReport>[0]["summary"]) || undefined,
            campaigns: (reportData?.campaigns as Parameters<typeof generatePdfReport>[0]["campaigns"]) || undefined,
          });
          return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
              ...getCorsHeaders(origin),
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="report-${report.report_type}-${report.period_start.toISOString().slice(0, 10)}.pdf"`,
            },
          });
        } catch {
          return errorResponse("PDF generation failed", 500, origin);
        }
      }

      // Default: return HTML
      return new NextResponse(report.report_html || "", {
        status: 200,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "text/html",
          "Content-Disposition": `inline; filename="report-${report.report_type}.html"`,
        },
      });
    }

    const where: Record<string, unknown> = {};
    if (facilityId && facilityId !== "all") {
      where.facility_id = facilityId;
    }

    const dbReports = await db.client_reports.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 50,
      include: {
        facilities: { select: { name: true } },
      },
    });

    const reports = dbReports.map((r) => ({
      id: r.id,
      type: (r.report_type || "monthly_performance") as ReportType,
      facilityName: r.facilities?.name || "Unknown",
      dateRange: {
        start: r.period_start.toISOString().slice(0, 10),
        end: r.period_end.toISOString().slice(0, 10),
      },
      format: ((r.report_data as Record<string, unknown>)?.format || "csv") as ExportFormat,
      status: r.status === "generated" || r.status === "sent" ? "ready" as const : r.status as "generating" | "failed" | "expired",
      downloadUrl: r.status === "generated" || r.status === "sent"
        ? `/api/admin-reports?download=${r.id}`
        : undefined,
      generatedAt: r.created_at?.toISOString(),
      createdBy: "admin",
    }));

    return jsonResponse({ reports }, 200, origin);
  } catch (err) {
    console.error("Admin reports GET error:", err);
    return errorResponse("Failed to fetch reports", 500, origin);
  }
}

/**
 * POST /api/admin-reports
 * Generate a new report for a facility and date range.
 * Returns CSV data or stores for later download.
 */
export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "admin-reports");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authError = await requireAdminKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { type, facilityId, dateRange, format } = body as {
      type: ReportType;
      facilityId: string;
      dateRange: { start: string; end: string };
      format: ExportFormat;
    };

    if (!type || !facilityId || !dateRange?.start || !dateRange?.end) {
      return errorResponse("Missing required fields: type, facilityId, dateRange", 400, origin);
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Fetch facility
    const facility = await db.facilities.findUnique({
      where: { id: facilityId === "all" ? undefined : facilityId },
      select: { id: true, name: true, baseline_occupancy: true, baseline_date: true },
    });

    if (!facility && facilityId !== "all") {
      return errorResponse("Facility not found", 404, origin);
    }

    // Build report data based on type
    let reportData: Record<string, unknown> = {};

    if (type === "monthly_performance" || type === "custom") {
      // Campaign spend data
      const spendData = await db.campaign_spend.findMany({
        where: {
          facility_id: facilityId !== "all" ? facilityId : undefined,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: "asc" },
      });

      const totalSpend = spendData.reduce((sum, s) => sum + Number(s.spend), 0);
      const totalImpressions = spendData.reduce((sum, s) => sum + (s.impressions || 0), 0);
      const totalClicks = spendData.reduce((sum, s) => sum + (s.clicks || 0), 0);

      // Call data
      const callData = await db.call_logs.findMany({
        where: {
          facility_id: facilityId !== "all" ? facilityId : undefined,
          started_at: { gte: startDate, lte: endDate },
          status: "completed",
        },
      });
      const qualifiedCalls = callData.filter((c) => (c.duration || 0) >= 30).length;

      // Lead data
      const leads = await db.partial_leads.count({
        where: {
          facility_id: facilityId !== "all" ? facilityId : undefined,
          created_at: { gte: startDate, lte: endDate },
        },
      });

      // Move-in attribution count
      const moveInCount = await db.activity_log.count({
        where: {
          type: "attributed_move_in",
          facility_id: facilityId !== "all" ? facilityId : undefined,
          created_at: { gte: startDate, lte: endDate },
        },
      });

      // Cost per move-in trend (monthly aggregation for chart)
      const spendByMonth = new Map<string, { spend: number; moveIns: number }>();
      for (const s of spendData) {
        const month = s.date.toISOString().slice(0, 7);
        const existing = spendByMonth.get(month) || { spend: 0, moveIns: 0 };
        existing.spend += Number(s.spend);
        spendByMonth.set(month, existing);
      }
      // Get move-in counts per month
      const moveInsByMonth = facilityId !== "all"
        ? await db.$queryRaw<Array<{ month: string; count: number }>>`
            SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count
            FROM activity_log
            WHERE type = 'attributed_move_in' AND facility_id = ${facilityId}::uuid
              AND created_at >= ${startDate} AND created_at <= ${endDate}
            GROUP BY to_char(created_at, 'YYYY-MM') ORDER BY month
          `
        : await db.$queryRaw<Array<{ month: string; count: number }>>`
            SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count
            FROM activity_log
            WHERE type = 'attributed_move_in'
              AND created_at >= ${startDate} AND created_at <= ${endDate}
            GROUP BY to_char(created_at, 'YYYY-MM') ORDER BY month
          `;
      for (const m of moveInsByMonth) {
        const existing = spendByMonth.get(m.month);
        if (existing) existing.moveIns = m.count;
      }
      const costPerMoveInTrend = Array.from(spendByMonth.entries()).map(([month, d]) => ({
        month,
        spend: d.spend,
        moveIns: d.moveIns,
        costPerMoveIn: d.moveIns > 0 ? d.spend / d.moveIns : null,
      }));

      reportData = {
        format,
        summary: {
          period: { start: dateRange.start, end: dateRange.end },
          facilityName: facility?.name || "All Facilities",
          totalSpend: totalSpend.toFixed(2),
          totalImpressions,
          totalClicks,
          ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00",
          totalLeads: leads,
          totalCalls: callData.length,
          qualifiedCalls,
          costPerLead: leads > 0 ? (totalSpend / leads).toFixed(2) : "N/A",
          moveIns: moveInCount,
          costPerMoveIn: moveInCount > 0 ? (totalSpend / moveInCount).toFixed(2) : "N/A",
        },
        costPerMoveInTrend,
        campaigns: spendData.map((s) => ({
          date: s.date.toISOString().slice(0, 10),
          platform: s.platform,
          campaign: s.campaign_name || s.utm_campaign || "Unknown",
          spend: Number(s.spend).toFixed(2),
          impressions: s.impressions || 0,
          clicks: s.clicks || 0,
        })),
      };
    } else if (type === "campaign_detail") {
      const spendData = await db.campaign_spend.findMany({
        where: {
          facility_id: facilityId !== "all" ? facilityId : undefined,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: "asc" },
      });

      // Group by campaign
      const campaignMap = new Map<string, { spend: number; impressions: number; clicks: number; days: number }>();
      for (const s of spendData) {
        const key = s.campaign_name || s.utm_campaign || "Unknown";
        const existing = campaignMap.get(key) || { spend: 0, impressions: 0, clicks: 0, days: 0 };
        existing.spend += Number(s.spend);
        existing.impressions += (s.impressions || 0);
        existing.clicks += (s.clicks || 0);
        existing.days += 1;
        campaignMap.set(key, existing);
      }

      reportData = {
        format,
        campaigns: Array.from(campaignMap.entries()).map(([name, data]) => ({
          campaign: name,
          spend: data.spend.toFixed(2),
          impressions: data.impressions,
          clicks: data.clicks,
          ctr: data.impressions > 0 ? ((data.clicks / data.impressions) * 100).toFixed(2) : "0.00",
          avgDailySpend: (data.spend / data.days).toFixed(2),
        })),
      };
    } else if (type === "attribution") {
      // Move-in attribution from activity_log
      const moveIns = await db.activity_log.findMany({
        where: {
          type: "attributed_move_in",
          facility_id: facilityId !== "all" ? facilityId : undefined,
          created_at: { gte: startDate, lte: endDate },
        },
        orderBy: { created_at: "desc" },
      });

      reportData = {
        format,
        moveIns: moveIns.map((m) => ({
          date: m.created_at?.toISOString().slice(0, 10),
          detail: m.detail,
          leadName: m.lead_name,
          source: (m.meta as Record<string, unknown>)?.source || "unknown",
          campaign: (m.meta as Record<string, unknown>)?.campaign || "unknown",
          monthlyRate: (m.meta as Record<string, unknown>)?.monthly_rate || null,
        })),
        totalMoveIns: moveIns.length,
      };
    }

    // Find or create a client record for this facility (needed for client_reports FK)
    let clientId: string | null = null;
    if (facilityId !== "all") {
      const client = await db.clients.findFirst({
        where: { facility_id: facilityId },
        select: { id: true },
      });
      clientId = client?.id || null;
    }

    // Generate output based on format
    if (format === "pdf") {
      try {
        const pdfBuffer = await generatePdfReport({
          type,
          summary: reportData.summary as Parameters<typeof generatePdfReport>[0]["summary"],
          campaigns: (reportData.campaigns as Parameters<typeof generatePdfReport>[0]["campaigns"]) || undefined,
          baselineOccupancy: facility ? (facility as Record<string, unknown>).baseline_occupancy as number | null : null,
          baselineDate: facility ? ((facility as Record<string, unknown>).baseline_date as Date | null)?.toISOString().slice(0, 10) || null : null,
        });

        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="report-${type}-${dateRange.start}.pdf"`,
          },
        });
      } catch (pdfErr) {
        console.error("PDF generation error:", pdfErr);
        return errorResponse("PDF generation failed", 500, origin);
      }
    }

    let reportHtml = "";
    if (format === "csv") {
      reportHtml = generateCsv(type, reportData);
    } else {
      reportHtml = generateReportHtml(type, reportData);
    }

    // Store report in database
    if (clientId && facilityId !== "all") {
      await db.client_reports.create({
        data: {
          client_id: clientId,
          facility_id: facilityId,
          report_type: type,
          period_start: startDate,
          period_end: endDate,
          report_html: reportHtml,
          report_data: reportData as object,
          status: "generated",
        },
      });
    }

    return jsonResponse({
      success: true,
      report: {
        type,
        facilityName: facility?.name || "All Facilities",
        dateRange,
        format,
        data: reportData,
        content: reportHtml,
      },
    }, 200, origin);
  } catch (err) {
    console.error("Admin reports POST error:", err);
    return errorResponse("Failed to generate report", 500, origin);
  }
}

/**
 * PATCH /api/admin-reports
 * Approve or reject a preview report.
 * - approve: send the report email via Resend, update status to "sent"
 * - reject: delete the report row
 */
export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "admin-reports");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authError = await requireAdminKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, action } = body as { id?: string; action?: string };

    if (!id || !action) {
      return errorResponse("Missing required fields: id, action", 400, origin);
    }

    if (action !== "approve" && action !== "reject") {
      return errorResponse("Action must be 'approve' or 'reject'", 400, origin);
    }

    // Fetch the report with its client relation
    const report = await db.client_reports.findUnique({
      where: { id },
      include: {
        clients: { select: { email: true, name: true } },
        facilities: { select: { name: true } },
      },
    });

    if (!report) {
      return errorResponse("Report not found", 404, origin);
    }

    if (action === "reject") {
      await db.client_reports.delete({ where: { id } });
      return jsonResponse({ success: true, action: "rejected", id }, 200, origin);
    }

    // action === "approve"
    // Update status to generated first
    await db.client_reports.update({
      where: { id },
      data: { status: "generated" },
    });

    // Send the email via Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return errorResponse("RESEND_API_KEY not configured", 500, origin);
    }

    const clientEmail = report.clients?.email;
    if (!clientEmail) {
      return errorResponse("No client email found for this report", 400, origin);
    }

    const facilityName = report.facilities?.name || "Your Facility";
    const isWeekly = report.report_type === "weekly";
    const subject = `${facilityName} — ${isWeekly ? "Weekly" : "Monthly"} Performance Report`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "StorageAds <reports@storageads.com>",
        to: clientEmail,
        subject,
        html: report.report_html || "",
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      await db.client_reports.update({
        where: { id },
        data: { status: "failed" },
      });
      console.error("Report email send failed:", errText);
      return errorResponse(`Email send failed: ${errText}`, 500, origin);
    }

    // Mark as sent
    await db.client_reports.update({
      where: { id },
      data: { status: "sent", sent_at: new Date() },
    });

    // Log activity
    db.$executeRaw`
      INSERT INTO activity_log (type, facility_id, facility_name, detail)
      VALUES ('report_sent', ${report.facility_id}::uuid, ${facilityName}, ${`${isWeekly ? "Weekly" : "Monthly"} report approved and sent to ${clientEmail}`})
    `.catch((err) => console.error("[activity_log] Fire-and-forget failed:", err));

    return jsonResponse({
      success: true,
      action: "approved",
      id,
      sentTo: clientEmail,
    }, 200, origin);
  } catch (err) {
    console.error("Admin reports PATCH error:", err);
    return errorResponse("Failed to process report action", 500, origin);
  }
}

function generateCsv(type: ReportType, data: Record<string, unknown>): string {
  if (type === "monthly_performance" || type === "custom") {
    const campaigns = (data.campaigns as Record<string, unknown>[]) || [];
    const header = "Date,Platform,Campaign,Spend,Impressions,Clicks\n";
    const rows = campaigns.map((c) =>
      `${c.date},${c.platform},${String(c.campaign).replace(/,/g, " ")},${c.spend},${c.impressions},${c.clicks}`
    ).join("\n");
    return header + rows;
  }
  if (type === "campaign_detail") {
    const campaigns = (data.campaigns as Record<string, unknown>[]) || [];
    const header = "Campaign,Spend,Impressions,Clicks,CTR,Avg Daily Spend\n";
    const rows = campaigns.map((c) =>
      `${String(c.campaign).replace(/,/g, " ")},${c.spend},${c.impressions},${c.clicks},${c.ctr}%,${c.avgDailySpend}`
    ).join("\n");
    return header + rows;
  }
  if (type === "attribution") {
    const moveIns = (data.moveIns as Record<string, unknown>[]) || [];
    const header = "Date,Lead,Source,Campaign,Monthly Rate\n";
    const rows = moveIns.map((m) =>
      `${m.date},${String(m.leadName || "").replace(/,/g, " ")},${m.source},${String(m.campaign).replace(/,/g, " ")},${m.monthlyRate || ""}`
    ).join("\n");
    return header + rows;
  }
  return "";
}

function generateReportHtml(type: ReportType, data: Record<string, unknown>): string {
  const summary = data.summary as Record<string, unknown> | undefined;
  const title = type === "monthly_performance" ? "Monthly Performance Report"
    : type === "campaign_detail" ? "Campaign Detail Report"
    : type === "attribution" ? "Move-in Attribution Report"
    : "Custom Report";

  let html = `<h1>${title}</h1>`;

  if (summary) {
    html += `<h2>${summary.facilityName} — ${summary.period ? `${(summary.period as Record<string, string>).start} to ${(summary.period as Record<string, string>).end}` : ""}</h2>`;
    html += `<table><tr><th>Metric</th><th>Value</th></tr>`;
    html += `<tr><td>Total Spend</td><td>$${summary.totalSpend}</td></tr>`;
    html += `<tr><td>Impressions</td><td>${summary.totalImpressions}</td></tr>`;
    html += `<tr><td>Clicks</td><td>${summary.totalClicks}</td></tr>`;
    html += `<tr><td>CTR</td><td>${summary.ctr}%</td></tr>`;
    html += `<tr><td>Leads</td><td>${summary.totalLeads}</td></tr>`;
    html += `<tr><td>Qualified Calls</td><td>${summary.qualifiedCalls}</td></tr>`;
    html += `<tr><td>Cost per Lead</td><td>$${summary.costPerLead}</td></tr>`;
    html += `</table>`;
  }

  return html;
}
