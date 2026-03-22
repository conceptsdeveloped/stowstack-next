import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";

const VALID_STATUSES = [
  "new",
  "contacted",
  "toured",
  "reserved",
  "moved_in",
  "lost",
];

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const denied = requireAdminKey(request);
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get("facilityId");
  const status = request.nextUrl.searchParams.get("status");
  const days = request.nextUrl.searchParams.get("days");
  const rawLimit = request.nextUrl.searchParams.get("limit");
  const summary = request.nextUrl.searchParams.get("summary");

  try {
    if (summary === "true") {
      const facilityFilter = facilityId ? "AND facility_id = $1" : "";
      const params = facilityId ? [facilityId] : [];

      const statsRows = params.length > 0
        ? await db.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT
              COUNT(*) FILTER (WHERE lead_status = 'new') AS new_count,
              COUNT(*) FILTER (WHERE lead_status = 'contacted') AS contacted_count,
              COUNT(*) FILTER (WHERE lead_status = 'toured') AS toured_count,
              COUNT(*) FILTER (WHERE lead_status = 'reserved') AS reserved_count,
              COUNT(*) FILTER (WHERE lead_status = 'moved_in') AS moved_in_count,
              COUNT(*) FILTER (WHERE lead_status = 'lost') AS lost_count,
              COUNT(*) AS total,
              SUM(monthly_revenue) FILTER (WHERE lead_status = 'moved_in') AS total_revenue,
              ROUND(AVG(EXTRACT(EPOCH FROM (status_updated_at - created_at)) / 86400)::NUMERIC, 1)
                FILTER (WHERE lead_status = 'moved_in') AS avg_days_to_move_in
            FROM partial_leads
            WHERE lead_status != 'partial' ${facilityFilter}`,
            ...params
          )
        : await db.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT
              COUNT(*) FILTER (WHERE lead_status = 'new') AS new_count,
              COUNT(*) FILTER (WHERE lead_status = 'contacted') AS contacted_count,
              COUNT(*) FILTER (WHERE lead_status = 'toured') AS toured_count,
              COUNT(*) FILTER (WHERE lead_status = 'reserved') AS reserved_count,
              COUNT(*) FILTER (WHERE lead_status = 'moved_in') AS moved_in_count,
              COUNT(*) FILTER (WHERE lead_status = 'lost') AS lost_count,
              COUNT(*) AS total,
              SUM(monthly_revenue) FILTER (WHERE lead_status = 'moved_in') AS total_revenue,
              ROUND(AVG(EXTRACT(EPOCH FROM (status_updated_at - created_at)) / 86400)::NUMERIC, 1)
                FILTER (WHERE lead_status = 'moved_in') AS avg_days_to_move_in
            FROM partial_leads
            WHERE lead_status != 'partial'`
          );

      return jsonResponse({ stats: statsRows[0] || null }, 200, origin);
    }

    let sql = `
      SELECT pl.id, pl.email, pl.phone, pl.name, pl.unit_size,
             pl.lead_status, pl.monthly_revenue, pl.move_in_date, pl.lead_notes,
             pl.utm_source, pl.utm_medium, pl.utm_campaign, pl.utm_content,
             pl.fbclid, pl.gclid, pl.lead_score, pl.scroll_depth, pl.time_on_page,
             pl.facility_id, pl.landing_page_id,
             pl.created_at, pl.converted_at, pl.status_updated_at,
             lp.title AS page_title, lp.slug AS page_slug
      FROM partial_leads pl
      LEFT JOIN landing_pages lp ON pl.landing_page_id = lp.id
      WHERE pl.lead_status != 'partial'
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (facilityId) {
      sql += ` AND pl.facility_id = $${paramIdx++}`;
      params.push(facilityId);
    }

    if (status && VALID_STATUSES.includes(status)) {
      sql += ` AND pl.lead_status = $${paramIdx++}`;
      params.push(status);
    }

    if (days) {
      sql += ` AND pl.created_at >= NOW() - INTERVAL '1 day' * $${paramIdx++}`;
      params.push(parseInt(days) || 30);
    }

    sql += ` ORDER BY pl.created_at DESC`;
    sql += ` LIMIT $${paramIdx++}`;
    params.push(parseInt(rawLimit || "") || 100);

    const leads = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      sql,
      ...params
    );

    return jsonResponse({ leads }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch consumer leads", 500, origin);
  }
}

export async function PATCH(request: NextRequest) {
  const origin = getOrigin(request);
  const denied = requireAdminKey(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { leadId, status, monthlyRevenue, moveInDate, notes, action, note } = body || {};

    if (!leadId) return errorResponse("leadId is required", 400, origin);

    // Handle add_note action: append to lead_notes
    if (action === "add_note") {
      if (!note || typeof note !== "string" || !note.trim()) {
        return errorResponse("note is required", 400, origin);
      }

      const existing = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT id, lead_notes FROM partial_leads WHERE id = $1`,
        leadId
      );
      if (existing.length === 0) return errorResponse("Lead not found", 404, origin);

      const currentNotes = (existing[0].lead_notes as string) || "";
      const separator = currentNotes ? "\n" : "";
      const updatedNotes = currentNotes + separator + note.trim();

      await db.$queryRawUnsafe(
        `UPDATE partial_leads SET lead_notes = $2, updated_at = NOW() WHERE id = $1`,
        leadId,
        updatedNotes
      );

      return jsonResponse({ success: true }, 200, origin);
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400,
        origin
      );
    }

    const sets: string[] = [];
    const params: unknown[] = [leadId];
    let paramIdx = 2;

    if (status) {
      sets.push(`lead_status = $${paramIdx++}`);
      params.push(status);
      sets.push("status_updated_at = NOW()");
    }

    if (monthlyRevenue !== undefined) {
      sets.push(`monthly_revenue = $${paramIdx++}`);
      params.push(monthlyRevenue);
    }

    if (moveInDate !== undefined) {
      sets.push(`move_in_date = $${paramIdx++}`);
      params.push(moveInDate || null);
    }

    if (notes !== undefined) {
      sets.push(`lead_notes = $${paramIdx++}`);
      params.push(notes);
    }

    if (sets.length === 0)
      return errorResponse("No fields to update", 400, origin);

    sets.push("updated_at = NOW()");

    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE partial_leads SET ${sets.join(", ")} WHERE id = $1 RETURNING id, lead_status, email, name, facility_id, monthly_revenue`,
      ...params
    );

    if (rows.length === 0)
      return errorResponse("Lead not found", 404, origin);

    const result = rows[0];

    if (status) {
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO activity_log (type, facility_id, lead_name, detail, meta)
           VALUES ('consumer_lead_status_change', $1, $2, $3, $4)`,
          result.facility_id,
          result.name || result.email || "Unknown",
          `Consumer lead status changed to ${status}${monthlyRevenue ? ` ($${monthlyRevenue}/mo)` : ""}`,
          JSON.stringify({
            lead_id: result.id,
            new_status: status,
            monthly_revenue: monthlyRevenue,
          })
        );
      } catch {
        // fire-and-forget
      }
    }

    return jsonResponse({ success: true, lead: result }, 200, origin);
  } catch {
    return errorResponse("Failed to update consumer lead", 500, origin);
  }
}
