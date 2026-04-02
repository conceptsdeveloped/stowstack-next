import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

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
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "consumer-leads");
  if (limited) return limited;
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
      const statsRows = facilityId
        ? await db.$queryRaw<Record<string, unknown>[]>`
            SELECT
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
            WHERE lead_status != 'partial' AND facility_id = ${facilityId}::uuid`
        : await db.$queryRaw<Record<string, unknown>[]>`
            SELECT
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
            WHERE lead_status != 'partial'`;

      return jsonResponse({ stats: statsRows[0] || null }, 200, origin);
    }

    const conditions: Prisma.Sql[] = [Prisma.sql`pl.lead_status != 'partial'`];

    if (facilityId) {
      conditions.push(Prisma.sql`pl.facility_id = ${facilityId}::uuid`);
    }

    if (status && VALID_STATUSES.includes(status)) {
      conditions.push(Prisma.sql`pl.lead_status = ${status}`);
    }

    if (days) {
      const daysNum = parseInt(days) || 30;
      conditions.push(Prisma.sql`pl.created_at >= NOW() - INTERVAL '1 day' * ${daysNum}`);
    }

    const limitNum = parseInt(rawLimit || "") || 100;
    const whereClause = Prisma.join(conditions, " AND ");

    const leads = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT pl.id, pl.email, pl.phone, pl.name, pl.unit_size,
             pl.lead_status, pl.monthly_revenue, pl.move_in_date, pl.lead_notes,
             pl.utm_source, pl.utm_medium, pl.utm_campaign, pl.utm_content,
             pl.fbclid, pl.gclid, pl.lead_score, pl.scroll_depth, pl.time_on_page,
             pl.facility_id, pl.landing_page_id,
             pl.created_at, pl.converted_at, pl.status_updated_at,
             lp.title AS page_title, lp.slug AS page_slug
      FROM partial_leads pl
      LEFT JOIN landing_pages lp ON pl.landing_page_id = lp.id
      WHERE ${whereClause}
      ORDER BY pl.created_at DESC
      LIMIT ${limitNum}
    `;

    return jsonResponse({ leads }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch consumer leads", 500, origin);
  }
}

export async function PATCH(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "consumer-leads");
  if (limited) return limited;
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

      if (note.length > 5000) {
        return errorResponse("Note too long (max 5000 characters)", 400, origin);
      }

      const existing = await db.$queryRaw<Record<string, unknown>[]>`
        SELECT id, lead_notes FROM partial_leads WHERE id = ${leadId}::uuid`;
      if (existing.length === 0) return errorResponse("Lead not found", 404, origin);

      const currentNotes = (existing[0].lead_notes as string) || "";
      const separator = currentNotes ? "\n" : "";
      const updatedNotes = currentNotes + separator + note.trim();

      await db.$executeRaw`
        UPDATE partial_leads SET lead_notes = ${updatedNotes}, updated_at = NOW() WHERE id = ${leadId}::uuid`;

      return jsonResponse({ success: true }, 200, origin);
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400,
        origin
      );
    }

    const setParts: Prisma.Sql[] = [];

    if (status) {
      setParts.push(Prisma.sql`lead_status = ${status}`);
      setParts.push(Prisma.sql`status_updated_at = NOW()`);
    }

    if (monthlyRevenue !== undefined) {
      setParts.push(Prisma.sql`monthly_revenue = ${monthlyRevenue}`);
    }

    if (moveInDate !== undefined) {
      setParts.push(Prisma.sql`move_in_date = ${moveInDate || null}`);
    }

    if (notes !== undefined) {
      setParts.push(Prisma.sql`lead_notes = ${notes}`);
    }

    if (setParts.length === 0)
      return errorResponse("No fields to update", 400, origin);

    setParts.push(Prisma.sql`updated_at = NOW()`);

    const setClause = Prisma.join(setParts, ", ");

    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      UPDATE partial_leads SET ${setClause} WHERE id = ${leadId}::uuid
      RETURNING id, lead_status, email, name, facility_id, monthly_revenue`;

    if (rows.length === 0)
      return errorResponse("Lead not found", 404, origin);

    const result = rows[0];

    if (status) {
      try {
        const detail = `Consumer lead status changed to ${status}${monthlyRevenue ? ` ($${monthlyRevenue}/mo)` : ""}`;
        const meta = JSON.stringify({
          lead_id: result.id,
          new_status: status,
          monthly_revenue: monthlyRevenue,
        });
        await db.$executeRaw`
          INSERT INTO activity_log (type, facility_id, lead_name, detail, meta)
          VALUES ('consumer_lead_status_change', ${result.facility_id}::uuid, ${(result.name as string) || (result.email as string) || "Unknown"}, ${detail}, ${meta}::jsonb)`;
      } catch {
        // fire-and-forget
      }
    }

    return jsonResponse({ success: true, lead: result }, 200, origin);
  } catch {
    return errorResponse("Failed to update consumer lead", 500, origin);
  }
}
