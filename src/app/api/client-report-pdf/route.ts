import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { authenticatePortalRequest } from "@/lib/portal-auth";
import { generateOccupancyPdf } from "@/lib/occupancy-pdf";

export const maxDuration = 60;

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/**
 * Self-serve occupancy report PDF download (M8) for /portal/reports. Mirrors the
 * data the reports page shows (latest snapshot + MTD move counts + unit mix).
 */
export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-report-pdf");
  if (limited) return limited;
  const origin = getOrigin(req);

  const scope = await authenticatePortalRequest(req);
  if (scope instanceof NextResponse) return scope;

  // A client is pinned to their own facility; an admin names ?clientId.
  let clientId: string;
  if (scope.kind === "admin") {
    const param = new URL(req.url).searchParams.get("clientId");
    if (!param) return errorResponse("Missing client identifier", 400, origin);
    clientId = param;
  } else {
    clientId = scope.clientId;
  }

  try {
    const client = await db.clients.findUnique({
      where: { id: clientId },
      select: { facility_id: true, signed_at: true },
    });
    if (!client?.facility_id) {
      return errorResponse("Client not found", 404, origin);
    }

    const facility = await db.facilities.findUnique({
      where: { id: client.facility_id },
      select: { name: true },
    });

    const latest = await db.facility_pms_snapshots.findFirst({
      where: { facility_id: client.facility_id },
      orderBy: { snapshot_date: "desc" },
      select: {
        total_units: true,
        occupied_units: true,
        occupancy_pct: true,
        delinquency_pct: true,
      },
    });

    let occupancy: NonNullable<
      Parameters<typeof generateOccupancyPdf>[0]["occupancy"]
    > | null = null;

    if (latest) {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const mtdWindow = { gte: monthStart, lt: nextMonthStart };
      const [moveIns, moveOuts] = await Promise.all([
        db.lead_status_events.count({
          where: {
            to_status: "moved_in",
            changed_at: mtdWindow,
            partial_leads: { is: { facility_id: client.facility_id } },
          },
        }),
        db.lead_status_events.count({
          where: {
            to_status: "moved_out",
            changed_at: mtdWindow,
            partial_leads: { is: { facility_id: client.facility_id } },
          },
        }),
      ]);
      const totalUnits = latest.total_units || 0;
      const occupiedUnits = latest.occupied_units || 0;
      occupancy = {
        total_units: totalUnits,
        occupied_units: occupiedUnits,
        occupancy_pct: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
        move_ins_mtd: moveIns,
        move_outs_mtd: moveOuts,
        delinquency_pct:
          latest.delinquency_pct != null ? Number(latest.delinquency_pct) : null,
      };
    }

    const units = await db.facility_pms_units.findMany({
      where: { facility_id: client.facility_id },
      select: {
        unit_type: true,
        size_label: true,
        total_count: true,
        occupied_count: true,
        street_rate: true,
      },
    });
    const unitMix = units.map((u) => ({
      type: u.unit_type || "Standard",
      size: u.size_label || "",
      total: u.total_count || 0,
      occupied: u.occupied_count || 0,
      rate: Number(u.street_rate) || 0,
    }));

    const pdf = await generateOccupancyPdf({
      facilityName: facility?.name || "Your Facility",
      generatedAt: new Date().toISOString(),
      signedAt: client.signed_at?.toISOString() ?? null,
      occupancy,
      unitMix,
    });

    const safeName = (facility?.name || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}-report.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return errorResponse("Failed to generate report", 500, origin);
  }
}
