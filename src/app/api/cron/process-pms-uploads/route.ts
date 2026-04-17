import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { notifyCronFailure } from "@/lib/cron-runner";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import {
  parseCSVText,
  autoMapColumns,
  mapRows,
  EXPECTED_COLUMNS,
  type UploadType,
} from "@/lib/pms-column-mapper";

export const maxDuration = 300;

const BATCH_SIZE = 10;

/**
 * Guess the upload type from the report_type string or by sniffing CSV headers.
 * Returns null if we can't confidently classify — caller should mark needs_review.
 */
function classifyReport(
  declaredType: string | null | undefined,
  headers: string[]
): UploadType | null {
  const declared = (declaredType || "").toLowerCase();
  if (declared.includes("rent")) return "rent_roll";
  if (declared.includes("aging") || declared.includes("receivable")) return "aging";
  if (declared.includes("revenue") || declared.includes("income")) return "revenue";

  // Header-based sniff
  const lower = headers.map((h) => h.toLowerCase().replace(/[_\s]/g, ""));
  const has = (needle: string) => lower.some((h) => h.includes(needle));

  if (has("daypastdue") || has("paidthru") || has("tenantname")) return "rent_roll";
  if (has("bucket030") || has("bucket3160") || has("bucket91")) return "aging";
  if (has("moveins") || has("moveouts") || (has("revenue") && has("month"))) return "revenue";

  return null;
}

async function ingestRentRoll(
  facilityId: string,
  snapshotDate: Date,
  rows: Record<string, string>[]
): Promise<number> {
  await db.facility_pms_rent_roll.deleteMany({
    where: { facility_id: facilityId, snapshot_date: snapshotDate },
  });

  await db.facility_pms_rent_roll.createMany({
    data: rows.map((r) => ({
      facility_id: facilityId,
      snapshot_date: snapshotDate,
      unit: String(r.unit || ""),
      size_label: r.size_label || null,
      tenant_name: r.tenant_name || null,
      account: r.account || null,
      rental_start: r.rental_start ? new Date(r.rental_start) : null,
      paid_thru: r.paid_thru ? new Date(r.paid_thru) : null,
      rent_rate: r.rent_rate ? Number(r.rent_rate) : null,
      insurance_premium: r.insurance_premium ? Number(r.insurance_premium) : null,
      total_due: r.total_due ? Number(r.total_due) : 0,
      days_past_due: r.days_past_due ? Number(r.days_past_due) : 0,
    })),
  });

  // Rollup into facility_pms_snapshots
  const totalUnits = rows.length;
  const occupied = rows.filter((r) => r.tenant_name && r.tenant_name.trim() !== "").length;
  const occupancyPct = totalUnits > 0 ? (occupied / totalUnits) * 100 : 0;
  const grossPotential = rows.reduce((sum, r) => sum + (Number(r.rent_rate) || 0), 0);
  const actualRevenue = rows.reduce((sum, r) => sum + (Number(r.total_due) || 0), 0);
  const delinquentUnits = rows.filter((r) => (Number(r.days_past_due) || 0) > 0).length;
  const delinquencyPct = totalUnits > 0 ? (delinquentUnits / totalUnits) * 100 : 0;

  await db.facility_pms_snapshots.upsert({
    where: {
      facility_id_snapshot_date: { facility_id: facilityId, snapshot_date: snapshotDate },
    },
    update: {
      total_units: totalUnits,
      occupied_units: occupied,
      occupancy_pct: occupancyPct,
      gross_potential: grossPotential,
      actual_revenue: actualRevenue,
      delinquency_pct: delinquencyPct,
      updated_at: new Date(),
    },
    create: {
      facility_id: facilityId,
      snapshot_date: snapshotDate,
      total_units: totalUnits,
      occupied_units: occupied,
      occupancy_pct: occupancyPct,
      gross_potential: grossPotential,
      actual_revenue: actualRevenue,
      delinquency_pct: delinquencyPct,
    },
  });

  return rows.length;
}

async function ingestAging(
  facilityId: string,
  snapshotDate: Date,
  rows: Record<string, string>[]
): Promise<number> {
  await db.facility_pms_aging.deleteMany({
    where: { facility_id: facilityId, snapshot_date: snapshotDate },
  });
  await db.facility_pms_aging.createMany({
    data: rows.map((r) => ({
      facility_id: facilityId,
      snapshot_date: snapshotDate,
      unit: String(r.unit || ""),
      tenant_name: r.tenant_name || null,
      bucket_0_30: r.bucket_0_30 ? Number(r.bucket_0_30) : 0,
      bucket_31_60: r.bucket_31_60 ? Number(r.bucket_31_60) : 0,
      bucket_61_90: r.bucket_61_90 ? Number(r.bucket_61_90) : 0,
      bucket_91_120: r.bucket_91_120 ? Number(r.bucket_91_120) : 0,
      bucket_120_plus: r.bucket_120_plus ? Number(r.bucket_120_plus) : 0,
      total: r.total ? Number(r.total) : 0,
    })),
  });
  return rows.length;
}

async function ingestRevenue(
  facilityId: string,
  rows: Record<string, string>[]
): Promise<number> {
  let count = 0;
  for (const r of rows) {
    const year = Number(r.year);
    const month = String(r.month || "").trim();
    if (!year || !month) continue;
    await db.facility_pms_revenue_history.upsert({
      where: { facility_id_year_month: { facility_id: facilityId, year, month } },
      update: {
        revenue: r.revenue ? Number(r.revenue) : 0,
        monthly_tax: r.monthly_tax ? Number(r.monthly_tax) : 0,
        move_ins: r.move_ins ? Number(r.move_ins) : 0,
        move_outs: r.move_outs ? Number(r.move_outs) : 0,
      },
      create: {
        facility_id: facilityId,
        year,
        month,
        revenue: r.revenue ? Number(r.revenue) : 0,
        monthly_tax: r.monthly_tax ? Number(r.monthly_tax) : 0,
        move_ins: r.move_ins ? Number(r.move_ins) : 0,
        move_outs: r.move_outs ? Number(r.move_outs) : 0,
      },
    });
    count++;
  }
  return count;
}

async function processReport(report: {
  id: string;
  facility_id: string;
  file_url: string | null;
  report_type: string | null;
  mime_type: string | null;
}): Promise<{ status: "processed" | "needs_review" | "failed"; note: string }> {
  // Non-CSV files need human review (PDF, XLSX parsing not implemented here)
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

  const { headers, rows } = parseCSVText(text);
  if (headers.length === 0 || rows.length === 0) {
    return { status: "failed", note: "CSV empty or unparseable" };
  }

  const kind = classifyReport(report.report_type, headers);
  if (!kind) {
    return {
      status: "needs_review",
      note: `Could not classify report type from declared="${report.report_type}" and headers=${headers.slice(0, 5).join(",")}`,
    };
  }

  const expected = EXPECTED_COLUMNS[kind];
  const columnMap = autoMapColumns(headers, expected);
  const missing = expected.filter((e) => !columnMap[e]);
  if (missing.length > 0) {
    return {
      status: "needs_review",
      note: `Auto-map missing ${kind} columns: ${missing.join(", ")}`,
    };
  }

  const mapped = mapRows(rows, columnMap, expected);
  const snapshotDate = new Date(); // today — rent roll + aging are point-in-time

  try {
    let count = 0;
    if (kind === "rent_roll") count = await ingestRentRoll(report.facility_id, snapshotDate, mapped);
    else if (kind === "aging") count = await ingestAging(report.facility_id, snapshotDate, mapped);
    else if (kind === "revenue") count = await ingestRevenue(report.facility_id, mapped);
    return {
      status: "processed",
      note: `Auto-processed ${kind}: ${count} rows`,
    };
  } catch (err) {
    return {
      status: "failed",
      note: `Ingest error (${kind}): ${err instanceof Error ? err.message : String(err)}`,
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

      if (status === "processed") results.processed++;
      else if (status === "needs_review") results.needsReview++;
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

