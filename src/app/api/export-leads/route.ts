import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  errorResponse,
  corsResponse,
  getCorsHeaders,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";

function escapeCsv(val: unknown): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADER =
  "Name,Email,Phone,Facility,Location,Occupancy,Units,Issue,Status,Created,Updated,Follow-Up,Notes Count";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const denied = requireAdminKey(request);
  if (denied) return denied;

  try {
    const facilities = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT f.*,
             (SELECT COUNT(*) FROM lead_notes WHERE facility_id = f.id) AS notes_count
      FROM facilities f
      ORDER BY f.created_at DESC
    `;

    const rows = facilities.map((f) =>
      [
        escapeCsv(f.contact_name),
        escapeCsv(f.contact_email),
        escapeCsv(f.contact_phone),
        escapeCsv(f.name),
        escapeCsv(f.location),
        escapeCsv(f.occupancy_range),
        escapeCsv(f.total_units),
        escapeCsv(f.biggest_issue),
        escapeCsv(f.pipeline_status),
        escapeCsv(
          f.created_at
            ? new Date(String(f.created_at)).toLocaleDateString()
            : ""
        ),
        escapeCsv(
          f.updated_at
            ? new Date(String(f.updated_at)).toLocaleDateString()
            : ""
        ),
        escapeCsv(f.follow_up_date || ""),
        escapeCsv(f.notes_count || 0),
      ].join(",")
    );

    const csv = [CSV_HEADER, ...rows].join("\n");
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=storageads-leads-${date}.csv`,
      },
    });
  } catch {
    return errorResponse("Failed to export leads", 500, origin);
  }
}
