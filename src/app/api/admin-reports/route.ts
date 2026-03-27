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
  const origin = getOrigin(req);
  const authError = requireAdminKey(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");

  try {
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
  const origin = getOrigin(req);
  const authError = requireAdminKey(req);
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
        },
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
