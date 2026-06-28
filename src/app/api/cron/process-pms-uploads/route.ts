import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { notifyCronFailure } from "@/lib/cron-runner";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import {
  parseReport,
  detectAnomalies,
  importParsed,
  summarizeRentRoll,
  type UploadType,
} from "@/lib/pms-import";
import { notifyClientsReportReady } from "@/lib/report-notify";

export const maxDuration = 300;

const BATCH_SIZE = 10;

/**
 * Backward-compatible re-exports. The parsing/anomaly/summary logic now lives in
 * the single shared importer (`@/lib/pms-import`) so the portal sync-upload,
 * admin approval action, and this cron sweep all run identical code. These
 * aliases keep existing imports (and tests) pointed here working.
 */
export const detectPmsAnomalies = detectAnomalies;
export const computeRentRollSnapshot = summarizeRentRoll;

/** Map a declared report_type string to an UploadType hint, when meaningful. */
function classifyHint(declaredType: string | null | undefined): UploadType | undefined {
  const declared = (declaredType || "").toLowerCase();
  if (declared.includes("rent")) return "rent_roll";
  if (declared.includes("aging") || declared.includes("receivable")) return "aging";
  if (declared.includes("revenue") || declared.includes("income")) return "revenue";
  return undefined;
}

async function processReport(report: {
  id: string;
  facility_id: string;
  file_url: string | null;
  report_type: string | null;
  mime_type: string | null;
}): Promise<{ status: "processed" | "needs_review" | "failed"; note: string }> {
  // Non-CSV files need human review (PDF, XLSX parsing not implemented yet).
  const isCsv =
    report.mime_type === "text/csv" ||
    (report.file_url || "").toLowerCase().endsWith(".csv");

  if (!isCsv) {
    return {
      status: "needs_review",
      note: "Non-CSV upload — parse manually via admin queue",
    };
  }
  if (!report.file_url) {
    return { status: "failed", note: "No file_url on report" };
  }

  const res = await fetch(report.file_url);
  if (!res.ok) {
    return { status: "failed", note: `Fetch failed: HTTP ${res.status}` };
  }
  const text = await res.text();

  const parsed = parseReport(text, classifyHint(report.report_type));
  if (!parsed) {
    return {
      status: "needs_review",
      note: `Could not classify report type (declared="${report.report_type}")`,
    };
  }
  if (parsed.missingRequired.length > 0) {
    return {
      status: "needs_review",
      note: `Auto-map missing required ${parsed.type} columns: ${parsed.missingRequired.join(", ")}`,
    };
  }

  // Anomaly gate: hold suspicious data for human review rather than publishing
  // wrong occupancy/delinquency straight to the customer portal.
  const anomalies = detectAnomalies(parsed.type, parsed.mappedRows);
  if (anomalies.length > 0) {
    return {
      status: "needs_review",
      note: `Held for review (anomaly check): ${anomalies.join("; ")}`,
    };
  }

  try {
    // snapshot date = today; rent roll + aging are point-in-time. importParsed
    // also derives the unit mix into facility_pms_units for rent rolls.
    const result = await importParsed(
      report.facility_id,
      parsed.type,
      new Date(),
      parsed.mappedRows,
    );
    return {
      status: "processed",
      note: `Auto-processed ${parsed.type}: ${result.imported} rows`,
    };
  } catch (err) {
    return {
      status: "failed",
      note: `Ingest error (${parsed.type}): ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.WEBHOOK, "cron-process-pms-uploads");
  if (limited) return limited;
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    processed: 0,
    needsReview: 0,
    failed: 0,
    items: [] as Array<{ id: string; status: string; note: string }>,
  };

  try {
    const pending = await db.pms_reports.findMany({
      where: { status: "uploaded" },
      orderBy: { uploaded_at: "asc" },
      take: BATCH_SIZE,
      select: {
        id: true,
        facility_id: true,
        file_url: true,
        report_type: true,
        mime_type: true,
      },
    });

    for (const report of pending) {
      const { status, note } = await processReport(report);
      await db.pms_reports.update({
        where: { id: report.id },
        data: {
          status,
          notes: note,
          processed_at: new Date(),
          processed_by: "cron:process-pms-uploads",
        },
      });

      if (status === "processed") {
        results.processed++;
        // Fresh occupancy/delinquency is now live in the portal — tell the
        // client(s). Same "report ready" moment as the /api/pms-data import
        // paths; idempotency-keyed per client per day, so processing several of
        // a facility's reports in one sweep can't spam. Fire-and-forget.
        void notifyClientsReportReady(report.facility_id);
      } else if (status === "needs_review") results.needsReview++;
      else results.failed++;

      results.items.push({ id: report.id, status, note });
    }

    return NextResponse.json({
      success: true,
      ...results,
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    notifyCronFailure("process-pms-uploads", err, Date.now() - startTime);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Cron processing failed", message },
      { status: 500 }
    );
  }
}
