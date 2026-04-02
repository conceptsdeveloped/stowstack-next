import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "moveout-remarketing");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const facilityId = req.nextUrl.searchParams.get("facilityId");
    const status = req.nextUrl.searchParams.get("status");

    const whereParts: Prisma.Sql[] = [Prisma.sql`1=1`];

    if (facilityId) {
      whereParts.push(Prisma.sql`mr.facility_id = ${facilityId}::uuid`);
    }
    if (status) {
      whereParts.push(Prisma.sql`mr.sequence_status = ${status}`);
    }

    const whereClause = Prisma.join(whereParts, " AND ");

    const sequences = await db.$queryRaw<unknown[]>`
      SELECT mr.*, t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
              t.unit_number, t.unit_size, t.monthly_rate, t.move_out_reason as tenant_move_out_reason,
              f.name as facility_name, f.location as facility_location
       FROM moveout_remarketing mr
       JOIN tenants t ON t.id = mr.tenant_id
       JOIN facilities f ON f.id = mr.facility_id
       WHERE ${whereClause}
       ORDER BY mr.moved_out_date DESC
    `;

    const facilityFilter = facilityId
      ? Prisma.sql`WHERE facility_id = ${facilityId}::uuid`
      : Prisma.empty;

    const stats = await db.$queryRaw<unknown[]>`
      SELECT
         COUNT(*) as total_sequences,
         COUNT(*) FILTER (WHERE sequence_status = 'active') as active_sequences,
         COUNT(*) FILTER (WHERE sequence_status = 'completed') as completed_sequences,
         COUNT(*) FILTER (WHERE converted = true) as converted_count,
         SUM(opened_count) as total_opens,
         SUM(clicked_count) as total_clicks,
         ROUND(COUNT(*) FILTER (WHERE converted = true)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE sequence_status IN ('completed', 'converted')), 0) * 100, 1) as conversion_rate,
         COUNT(DISTINCT move_out_reason) as reason_count,
         AVG(current_step)::NUMERIC(3,1) as avg_steps_completed
       FROM moveout_remarketing
       ${facilityFilter}
    `;

    const reasonBreakdown = await db.$queryRaw<unknown[]>`
      SELECT move_out_reason as reason,
              COUNT(*) as count,
              COUNT(*) FILTER (WHERE converted = true) as converted,
              ROUND(COUNT(*) FILTER (WHERE converted = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as conv_rate
       FROM moveout_remarketing
       ${facilityFilter}
       GROUP BY move_out_reason
       ORDER BY count DESC
    `;

    return jsonResponse(
      {
        sequences,
        stats: (stats as unknown[])[0],
        reasonBreakdown,
      },
      200,
      origin,
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "moveout-remarketing");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const {
      tenantId,
      facilityId,
      offer_type,
      offer_value,
      move_out_reason_filter,
      days_since_moveout,
    } = body;

    if (facilityId && !tenantId) {
      const maxDays = days_since_moveout || 90;

      let tenants: Array<{
        id: string;
        facility_id: string;
        moved_out_date: Date | null;
        move_out_reason: string | null;
      }>;

      if (facilityId !== "all") {
        tenants = await db.$queryRawUnsafe<typeof tenants>(
          `SELECT t.* FROM tenants t
           LEFT JOIN moveout_remarketing mr ON mr.tenant_id = t.id
           WHERE t.facility_id = $1::uuid AND t.status = 'moved_out' AND mr.id IS NULL
           AND t.moved_out_date >= NOW() - ($2 || ' days')::INTERVAL
           ${move_out_reason_filter && move_out_reason_filter !== "all" ? `AND t.move_out_reason = $3` : ""}`,
          ...[
            facilityId,
            maxDays.toString(),
            ...(move_out_reason_filter && move_out_reason_filter !== "all"
              ? [move_out_reason_filter]
              : []),
          ],
        );
      } else {
        tenants = await db.$queryRawUnsafe<typeof tenants>(
          `SELECT t.* FROM tenants t
           LEFT JOIN moveout_remarketing mr ON mr.tenant_id = t.id
           WHERE t.status = 'moved_out' AND mr.id IS NULL
           AND t.moved_out_date >= NOW() - ($1 || ' days')::INTERVAL
           ${move_out_reason_filter && move_out_reason_filter !== "all" ? `AND t.move_out_reason = $2` : ""}`,
          ...[
            maxDays.toString(),
            ...(move_out_reason_filter && move_out_reason_filter !== "all"
              ? [move_out_reason_filter]
              : []),
          ],
        );
      }

      let enrolled = 0;
      for (const t of tenants) {
        await db.$executeRaw`
          INSERT INTO moveout_remarketing (tenant_id, facility_id, moved_out_date, move_out_reason,
            sequence_status, next_send_at, offer_type, offer_value)
          VALUES (${t.id}::uuid, ${t.facility_id}::uuid, ${t.moved_out_date}, ${t.move_out_reason},
            'active', NOW() + INTERVAL '3 days', ${offer_type || "discount"}, ${offer_value || 0})
          ON CONFLICT (tenant_id) DO NOTHING
        `;
        enrolled++;
      }

      return jsonResponse(
        { enrolled, message: `Enrolled ${enrolled} former tenants` },
        200,
        origin,
      );
    }

    if (!tenantId)
      return errorResponse("tenantId or facilityId required", 400, origin);

    const tenant = await db.tenants.findUnique({ where: { id: tenantId } });
    if (!tenant) return errorResponse("Tenant not found", 404, origin);

    const seq = await db.$queryRaw<unknown[]>`
      INSERT INTO moveout_remarketing (tenant_id, facility_id, moved_out_date, move_out_reason,
        sequence_status, next_send_at, offer_type, offer_value)
      VALUES (${tenantId}::uuid, ${tenant.facility_id}::uuid,
        ${tenant.moved_out_date || new Date().toISOString().slice(0, 10)},
        ${tenant.move_out_reason}, 'active', NOW() + INTERVAL '3 days',
        ${offer_type || "discount"}, ${offer_value || 0})
      ON CONFLICT (tenant_id) DO UPDATE SET
        sequence_status = 'active', next_send_at = NOW() + INTERVAL '3 days',
        current_step = 0, updated_at = NOW()
      RETURNING *
    `;

    return jsonResponse({ sequence: (seq as unknown[])[0] }, 200, origin);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin,
    );
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "moveout-remarketing");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { id, ids, action, ...updates } = body;

    if (Array.isArray(ids) && ids.length > 0) {
      if (action === "batch_pause") {
        await db.$executeRaw`
          UPDATE moveout_remarketing SET sequence_status = 'paused', updated_at = NOW()
          WHERE id = ANY(${ids}::uuid[])
        `;
        return jsonResponse({ updated: ids.length }, 200, origin);
      }
      if (action === "batch_resume") {
        await db.$executeRaw`
          UPDATE moveout_remarketing SET sequence_status = 'active', next_send_at = NOW() + INTERVAL '1 day', updated_at = NOW()
          WHERE id = ANY(${ids}::uuid[])
        `;
        return jsonResponse({ updated: ids.length }, 200, origin);
      }
      if (action === "batch_advance") {
        await db.$executeRaw`
          UPDATE moveout_remarketing SET
            current_step = current_step + 1,
            last_sent_at = NOW(),
            next_send_at = NOW() + INTERVAL '7 days',
            sequence_status = CASE WHEN current_step + 1 >= total_steps THEN 'completed' ELSE sequence_status END,
            updated_at = NOW()
          WHERE id = ANY(${ids}::uuid[]) AND sequence_status = 'active'
        `;
        return jsonResponse({ updated: ids.length }, 200, origin);
      }
      return errorResponse("Unknown batch action", 400, origin);
    }

    if (!id) return errorResponse("id or ids required", 400, origin);

    if (action === "advance") {
      const rows = await db.$queryRaw<
        Array<{
          id: string;
          tenant_id: string;
          facility_id: string;
          current_step: number;
        }>
      >`
        UPDATE moveout_remarketing SET
          current_step = current_step + 1, last_sent_at = NOW(),
          next_send_at = NOW() + INTERVAL '7 days',
          sequence_status = CASE WHEN current_step + 1 >= total_steps THEN 'completed' ELSE sequence_status END,
          updated_at = NOW()
        WHERE id = ${id}::uuid RETURNING *
      `;

      if (rows.length) {
        const seq = rows[0];
        await db.tenant_communications.create({
          data: {
            tenant_id: seq.tenant_id,
            facility_id: seq.facility_id,
            channel: "email",
            type: "remarketing",
            subject: `Welcome back step ${seq.current_step}`,
            related_id: id,
            status: "sent",
          },
        });
      }

      return jsonResponse({ sequence: rows[0] || null }, 200, origin);
    }

    if (action === "convert") {
      const rows = await db.$queryRaw<unknown[]>`
        UPDATE moveout_remarketing SET converted = true, converted_at = NOW(), sequence_status = 'converted', updated_at = NOW()
        WHERE id = ${id}::uuid RETURNING *
      `;
      return jsonResponse(
        { sequence: (rows as unknown[])[0] || null },
        200,
        origin,
      );
    }

    if (action === "track_open") {
      await db.$executeRaw`UPDATE moveout_remarketing SET opened_count = opened_count + 1 WHERE id = ${id}::uuid`;
      return jsonResponse({ ok: true }, 200, origin);
    }

    if (action === "track_click") {
      await db.$executeRaw`UPDATE moveout_remarketing SET clicked_count = clicked_count + 1 WHERE id = ${id}::uuid`;
      return jsonResponse({ ok: true }, 200, origin);
    }

    const { sequence_status, offer_type, offer_value } = updates;
    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [id];
    let pIdx = 2;

    if (sequence_status) {
      params.push(sequence_status);
      sets.push(`sequence_status = $${pIdx++}`);
    }
    if (offer_type) {
      params.push(offer_type);
      sets.push(`offer_type = $${pIdx++}`);
    }
    if (offer_value !== undefined) {
      params.push(offer_value);
      sets.push(`offer_value = $${pIdx++}`);
    }

    const rows = await db.$queryRawUnsafe<unknown[]>(
      `UPDATE moveout_remarketing SET ${sets.join(", ")} WHERE id = $1::uuid RETURNING *`,
      ...params,
    );

    return jsonResponse(
      { sequence: (rows as unknown[])[0] || null },
      200,
      origin,
    );
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin,
    );
  }
}
