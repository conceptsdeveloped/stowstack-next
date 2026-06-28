import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireFacilityAccess,
  isAdminRequest,
} from "@/lib/api-helpers";
import { getManageScope, manageScopeAllows } from "@/lib/manage-session";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import {
  type UploadType,
  importRentRoll,
  importAging,
  importRevenue,
  importParsed,
  parseReport,
  reportTypeLabel,
} from "@/lib/pms-import";
import { notifyClientsReportReady } from "@/lib/report-notify";

/* ── Auth helper: admin key OR client bearer token ── */
async function authorizeRequest(
  req: NextRequest,
  facilityId: string
): Promise<{ authorized: boolean; origin: string | null }> {
  const origin = getOrigin(req);

  // Admin key auth
  if (isAdminRequest(req)) {
    return { authorized: true, origin };
  }

  // Owner manage-session auth (scoped to this facility)
  if (manageScopeAllows(getManageScope(req), facilityId)) {
    return { authorized: true, origin };
  }

  // Client bearer token auth
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const accessCode = authHeader.slice(7);
    const client = await db.clients.findFirst({
      where: { access_code: accessCode },
      select: { id: true, facility_id: true },
    });
    if (client && client.facility_id === facilityId) {
      return { authorized: true, origin };
    }
  }

  return { authorized: false, origin };
}

/* ══════════════════════════════════════════════════════════
   GET — Fetch all PMS data for a facility
══════════════════════════════════════════════════════════ */
export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "pms-data");
  if (limited) return limited;
  const origin = getOrigin(req);
  const facilityId = req.nextUrl.searchParams.get("facilityId");

  if (!facilityId) {
    return errorResponse("facilityId is required", 400, origin);
  }

  const auth = await authorizeRequest(req, facilityId);
  if (!auth.authorized) {
    return errorResponse("Unauthorized", 401, origin);
  }

  try {
    // Latest snapshot
    const latestSnapshot = await db.facility_pms_snapshots.findFirst({
      where: { facility_id: facilityId },
      orderBy: { snapshot_date: "desc" },
    });

    // Last 12 snapshots for trend
    const snapshotTrend = await db.facility_pms_snapshots.findMany({
      where: { facility_id: facilityId },
      orderBy: { snapshot_date: "desc" },
      take: 12,
    });

    // Latest rent roll snapshot_date
    const latestRentRollDate = await db.facility_pms_rent_roll.findFirst({
      where: { facility_id: facilityId },
      orderBy: { snapshot_date: "desc" },
      select: { snapshot_date: true },
    });

    const rentRoll = latestRentRollDate
      ? await db.facility_pms_rent_roll.findMany({
          where: {
            facility_id: facilityId,
            snapshot_date: latestRentRollDate.snapshot_date,
          },
          orderBy: { unit: "asc" },
        })
      : [];

    // Latest aging snapshot_date
    const latestAgingDate = await db.facility_pms_aging.findFirst({
      where: { facility_id: facilityId },
      orderBy: { snapshot_date: "desc" },
      select: { snapshot_date: true },
    });

    const aging = latestAgingDate
      ? await db.facility_pms_aging.findMany({
          where: {
            facility_id: facilityId,
            snapshot_date: latestAgingDate.snapshot_date,
          },
          orderBy: { unit: "asc" },
        })
      : [];

    // Revenue history
    const revenueHistory = await db.facility_pms_revenue_history.findMany({
      where: { facility_id: facilityId },
      orderBy: [{ year: "desc" }, { month: "asc" }],
    });

    // Length of stay
    const lengthOfStay = await db.facility_pms_length_of_stay.findMany({
      where: { facility_id: facilityId },
      orderBy: { days_in_unit: "desc" },
    });

    // Last 10 raw PMS report uploads
    const pmsReports = await db.pms_reports.findMany({
      where: { facility_id: facilityId },
      orderBy: { uploaded_at: "desc" },
      take: 10,
      select: {
        id: true,
        report_type: true,
        file_name: true,
        uploaded_at: true,
        status: true,
        notes: true,
      },
    });

    return jsonResponse(
      {
        latestSnapshot,
        snapshotTrend: snapshotTrend.reverse(),
        rentRoll,
        aging,
        revenueHistory,
        lengthOfStay,
        pmsReports,
      },
      200,
      origin
    );
  } catch (err) {
    console.error("[pms-data] GET error:", err);
    return errorResponse("Internal server error", 500, origin);
  }
}

/* ══════════════════════════════════════════════════════════
   POST — Import PMS data (admin OR facility owner)
══════════════════════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "pms-data");
  if (limited) return limited;
  const origin = getOrigin(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const action = body.action as string;
  const facilityId = body.facility_id as string;

  if (!facilityId) {
    return errorResponse("facility_id is required", 400, origin);
  }

  // Importing a facility's own PMS data is open to that facility's owner or an
  // admin. Client portal Bearer tokens are deliberately NOT accepted here —
  // the portal is read-only for tenants.
  const denied = await requireFacilityAccess(req, facilityId);
  if (denied) return denied;

  try {
    /* ── Import Rent Roll ── (delegates to the shared importer in pms-import.ts,
       which also derives the unit mix into facility_pms_units) */
    if (action === "import_rent_roll") {
      const snapshotDate = body.snapshot_date as string;
      const rows = body.rows as Array<Record<string, unknown>>;

      if (!snapshotDate || !rows?.length) {
        return errorResponse("snapshot_date and rows[] are required", 400, origin);
      }

      const { imported } = await importRentRoll(
        facilityId,
        new Date(snapshotDate),
        rows,
      );

      // Fresh occupancy/unit-mix data is now live in the portal — tell the
      // client(s). Admin/owner-only path, so this never emails a self-upload.
      void notifyClientsReportReady(facilityId);

      return jsonResponse(
        { ok: true, imported, snapshot: "upserted" },
        200,
        origin
      );
    }

    /* ── Import Aging ── */
    if (action === "import_aging") {
      const snapshotDate = body.snapshot_date as string;
      const rows = body.rows as Array<Record<string, unknown>>;

      if (!snapshotDate || !rows?.length) {
        return errorResponse("snapshot_date and rows[] are required", 400, origin);
      }

      const { imported } = await importAging(
        facilityId,
        new Date(snapshotDate),
        rows,
      );

      return jsonResponse({ ok: true, imported }, 200, origin);
    }

    /* ── Import Revenue ── */
    if (action === "import_revenue") {
      const rows = body.rows as Array<Record<string, unknown>>;

      if (!rows?.length) {
        return errorResponse("rows[] is required", 400, origin);
      }

      const { upserted } = await importRevenue(facilityId, rows);

      return jsonResponse({ ok: true, upserted }, 200, origin);
    }

    /* ── Process Report (M7 founder-approval gate) ──
       Publish a previously-uploaded report into facility_pms_*. Used by the
       admin upload tab to approve files the portal auto-parser held for review
       (status "needs_review"), or to (re)process any uploaded CSV. Prefers the
       rows the portal already parsed and staged in pms_reports.report_data;
       falls back to re-fetching + parsing the stored Blob file. */
    if (action === "process_report") {
      const reportId = body.report_id as string;
      if (!reportId) {
        return errorResponse("report_id is required", 400, origin);
      }

      const report = await db.pms_reports.findUnique({
        where: { id: reportId },
      });
      if (!report || report.facility_id !== facilityId) {
        return errorResponse("Report not found", 404, origin);
      }

      // Source the rows: staged parse first, then the Blob file as a fallback.
      let type: UploadType | undefined;
      let snapshotDate: Date | undefined;
      let mappedRows: Array<Record<string, unknown>> | undefined;

      const staged = report.report_data as {
        type?: UploadType;
        snapshotDate?: string;
        mappedRows?: Array<Record<string, unknown>>;
      } | null;

      if (staged?.type && staged.mappedRows?.length) {
        type = staged.type;
        mappedRows = staged.mappedRows;
        snapshotDate = staged.snapshotDate
          ? new Date(staged.snapshotDate)
          : new Date();
      } else if (report.file_url && report.mime_type === "text/csv") {
        const text = await fetch(report.file_url).then((r) => r.text());
        const parsed = parseReport(text);
        if (!parsed || parsed.missingRequired.length) {
          return errorResponse(
            "Could not parse this report — required columns are missing.",
            422,
            origin,
          );
        }
        type = parsed.type;
        mappedRows = parsed.mappedRows;
        snapshotDate = report.uploaded_at ?? new Date();
      } else {
        return errorResponse(
          "This report has no parsable CSV data to process.",
          422,
          origin,
        );
      }

      const result = await importParsed(
        facilityId,
        type,
        snapshotDate ?? new Date(),
        mappedRows,
      );

      await db.pms_reports.update({
        where: { id: reportId },
        data: {
          status: "processed",
          processed_at: new Date(),
          processed_by: "admin",
          notes: `Approved & imported ${result.imported} rows (${reportTypeLabel(result.type)}).`,
        },
      });

      // Founder just approved & published this report → the client's portal now
      // has new data. Notify them (idempotency-keyed, so it won't double up with
      // a same-day rent-roll import notice).
      void notifyClientsReportReady(facilityId);

      return jsonResponse(
        { ok: true, imported: result.imported, type: result.type },
        200,
        origin
      );
    }

    return errorResponse(`Unknown action: ${action}`, 400, origin);
  } catch (err) {
    console.error("[pms-data] POST error:", err);
    return errorResponse("Internal server error", 500, origin);
  }
}

/* ── CORS preflight ── */
export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}
