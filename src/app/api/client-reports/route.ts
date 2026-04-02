import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-reports");
  if (limited) return limited;
  const origin = getOrigin(req);

  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId");
    const accessCode = url.searchParams.get("accessCode");
    const email = url.searchParams.get("email");
    const limit = parseInt(url.searchParams.get("limit") || "12") || 12;

    let resolvedClientId = clientId;

    if (!resolvedClientId && accessCode && email) {
      const client = await db.clients.findFirst({
        where: {
          access_code: accessCode,
          email: { equals: email.trim(), mode: "insensitive" },
        },
        select: { id: true },
      });
      if (client) resolvedClientId = client.id;
    }

    if (clientId && !isAdminRequest(req)) {
      return errorResponse("Unauthorized", 401, origin);
    }

    if (!resolvedClientId) {
      return errorResponse("Missing client identifier", 400, origin);
    }

    // Get client's facility for PMS data
    const client = await db.clients.findUnique({
      where: { id: resolvedClientId },
      select: { facility_id: true, signed_at: true },
    });

    // Fetch PMS snapshots for occupancy trend chart
    let occupancyTrend: { date: string; occupancy_pct: number }[] = [];
    let occupancy: { total_units: number; occupied_units: number; occupancy_pct: number; move_ins_mtd: number; move_outs_mtd: number; delinquency_pct: number } | null = null;
    let unitMix: { type: string; size: string; total: number; occupied: number; rate: number }[] = [];

    if (client?.facility_id) {
      // Occupancy trend from PMS snapshots (last 90 days)
      const snapshots = await db.facility_pms_snapshots.findMany({
        where: { facility_id: client.facility_id },
        orderBy: { snapshot_date: "asc" },
        take: 90,
        select: { snapshot_date: true, occupancy_pct: true, total_units: true, occupied_units: true },
      });

      if (snapshots.length > 0) {
        occupancyTrend = snapshots.map((s) => ({
          date: s.snapshot_date.toISOString().slice(0, 10),
          occupancy_pct: Number(s.occupancy_pct) || 0,
        }));

        // Latest snapshot as current occupancy
        const latest = snapshots[snapshots.length - 1];
        const totalUnits = latest.total_units || 0;
        const occupiedUnits = latest.occupied_units || 0;
        occupancy = {
          total_units: totalUnits,
          occupied_units: occupiedUnits,
          occupancy_pct: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
          move_ins_mtd: 0,
          move_outs_mtd: 0,
          delinquency_pct: 0,
        };
      }

      // Unit mix from PMS units
      const units = await db.facility_pms_units.findMany({
        where: { facility_id: client.facility_id },
        select: { unit_type: true, size_label: true, total_count: true, occupied_count: true, street_rate: true },
      });
      if (units.length > 0) {
        unitMix = units.map((u) => ({
          type: u.unit_type || "Standard",
          size: u.size_label || "",
          total: u.total_count || 0,
          occupied: u.occupied_count || 0,
          rate: Number(u.street_rate) || 0,
        }));
      }
    }

    // Fetch report history
    const reports = await db.$queryRaw<
      Array<{
        id: string;
        report_type: string;
        period_start: Date;
        period_end: Date;
        report_data: unknown;
        sent_at: Date | null;
        opened_at: Date | null;
        status: string;
        created_at: Date;
      }>
    >`
      SELECT id, report_type, period_start, period_end, report_data, sent_at, opened_at, status, created_at
      FROM client_reports WHERE client_id = ${resolvedClientId}::uuid
      ORDER BY period_start DESC
      LIMIT ${limit}
    `;

    return jsonResponse({
      occupancy,
      unitMix,
      occupancyTrend,
      signedAt: client?.signed_at?.toISOString() || null,
      reports,
    }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-reports");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { clientId } = body || {};
    if (!clientId) return errorResponse("Missing clientId", 400, origin);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const cronSecret = process.env.CRON_SECRET || "";

    const cronRes = await fetch(`${baseUrl}/api/cron/send-client-reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const cronData = await cronRes.json();
    return jsonResponse({ success: true, result: cronData }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
