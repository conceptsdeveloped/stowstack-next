import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

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
   POST — Import PMS data (admin only)
══════════════════════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "pms-data");
  if (limited) return limited;
  const origin = getOrigin(req);
  const adminErr = requireAdminKey(req);
  if (adminErr) return adminErr;

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

  try {
    /* ── Import Rent Roll ── */
    if (action === "import_rent_roll") {
      const snapshotDate = body.snapshot_date as string;
      const rows = body.rows as Array<Record<string, unknown>>;

      if (!snapshotDate || !rows?.length) {
        return errorResponse("snapshot_date and rows[] are required", 400, origin);
      }

      // Delete existing rows for this facility + date, then bulk create
      await db.facility_pms_rent_roll.deleteMany({
        where: {
          facility_id: facilityId,
          snapshot_date: new Date(snapshotDate),
        },
      });

      await db.facility_pms_rent_roll.createMany({
        data: rows.map((r) => ({
          facility_id: facilityId,
          snapshot_date: new Date(snapshotDate),
          unit: String(r.unit || ""),
          size_label: r.size_label ? String(r.size_label) : null,
          tenant_name: r.tenant_name ? String(r.tenant_name) : null,
          account: r.account ? String(r.account) : null,
          rental_start: r.rental_start ? new Date(r.rental_start as string) : null,
          paid_thru: r.paid_thru ? new Date(r.paid_thru as string) : null,
          rent_rate: r.rent_rate != null ? Number(r.rent_rate) : null,
          insurance_premium: r.insurance_premium != null ? Number(r.insurance_premium) : null,
          total_due: r.total_due != null ? Number(r.total_due) : 0,
          days_past_due: r.days_past_due != null ? Number(r.days_past_due) : 0,
        })),
      });

      // Generate snapshot summary from rent roll
      const totalUnits = rows.length;
      const occupied = rows.filter(
        (r) => r.tenant_name && String(r.tenant_name).trim() !== ""
      ).length;
      const occupancyPct = totalUnits > 0 ? (occupied / totalUnits) * 100 : 0;
      const grossPotential = rows.reduce(
        (sum, r) => sum + (Number(r.rent_rate) || 0),
        0
      );
      const actualRevenue = rows.reduce(
        (sum, r) => sum + (Number(r.total_due) || 0),
        0
      );
      const delinquentUnits = rows.filter(
        (r) => (Number(r.days_past_due) || 0) > 0
      ).length;
      const delinquencyPct =
        totalUnits > 0 ? (delinquentUnits / totalUnits) * 100 : 0;

      await db.facility_pms_snapshots.upsert({
        where: {
          facility_id_snapshot_date: {
            facility_id: facilityId,
            snapshot_date: new Date(snapshotDate),
          },
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
          snapshot_date: new Date(snapshotDate),
          total_units: totalUnits,
          occupied_units: occupied,
          occupancy_pct: occupancyPct,
          gross_potential: grossPotential,
          actual_revenue: actualRevenue,
          delinquency_pct: delinquencyPct,
        },
      });

      return jsonResponse(
        { ok: true, imported: rows.length, snapshot: "upserted" },
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

      // Delete existing rows for this facility + date, then bulk insert
      await db.facility_pms_aging.deleteMany({
        where: {
          facility_id: facilityId,
          snapshot_date: new Date(snapshotDate),
        },
      });

      await db.facility_pms_aging.createMany({
        data: rows.map((r) => ({
          facility_id: facilityId,
          snapshot_date: new Date(snapshotDate),
          unit: String(r.unit || ""),
          tenant_name: r.tenant_name ? String(r.tenant_name) : null,
          bucket_0_30: r.bucket_0_30 != null ? Number(r.bucket_0_30) : 0,
          bucket_31_60: r.bucket_31_60 != null ? Number(r.bucket_31_60) : 0,
          bucket_61_90: r.bucket_61_90 != null ? Number(r.bucket_61_90) : 0,
          bucket_91_120: r.bucket_91_120 != null ? Number(r.bucket_91_120) : 0,
          bucket_120_plus: r.bucket_120_plus != null ? Number(r.bucket_120_plus) : 0,
          total: r.total != null ? Number(r.total) : 0,
        })),
      });

      return jsonResponse(
        { ok: true, imported: rows.length },
        200,
        origin
      );
    }

    /* ── Import Revenue ── */
    if (action === "import_revenue") {
      const rows = body.rows as Array<Record<string, unknown>>;

      if (!rows?.length) {
        return errorResponse("rows[] is required", 400, origin);
      }

      // Upsert each row (unique on facility_id + year + month)
      let upserted = 0;
      for (const r of rows) {
        const year = Number(r.year);
        const month = String(r.month);
        await db.facility_pms_revenue_history.upsert({
          where: {
            facility_id_year_month: {
              facility_id: facilityId,
              year,
              month,
            },
          },
          update: {
            revenue: r.revenue != null ? Number(r.revenue) : 0,
            monthly_tax: r.monthly_tax != null ? Number(r.monthly_tax) : 0,
            move_ins: r.move_ins != null ? Number(r.move_ins) : 0,
            move_outs: r.move_outs != null ? Number(r.move_outs) : 0,
          },
          create: {
            facility_id: facilityId,
            year,
            month,
            revenue: r.revenue != null ? Number(r.revenue) : 0,
            monthly_tax: r.monthly_tax != null ? Number(r.monthly_tax) : 0,
            move_ins: r.move_ins != null ? Number(r.move_ins) : 0,
            move_outs: r.move_outs != null ? Number(r.move_outs) : 0,
          },
        });
        upserted++;
      }

      return jsonResponse(
        { ok: true, upserted },
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
