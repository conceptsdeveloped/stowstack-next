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
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "alert-history");
  if (limited) return limited;
  const origin = getOrigin(req);
  const params = req.nextUrl.searchParams;
  const clientId = params.get("clientId");
  const accessCode = params.get("accessCode");
  const email = params.get("email");
  const severity = params.get("severity");
  const acknowledged = params.get("acknowledged");
  const limit = params.get("limit");

  try {
    const conditions: Prisma.Sql[] = [Prisma.sql`1=1`];

    if (accessCode && email) {
      const clients = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM clients WHERE access_code = ${accessCode} AND LOWER(email) = LOWER(${email.trim()})
      `;
      if (!clients.length) return errorResponse("Unauthorized", 401, origin);
      conditions.push(Prisma.sql`client_id = ${clients[0].id}::uuid`);
    } else if (clientId) {
      if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);
      conditions.push(Prisma.sql`client_id = ${clientId}::uuid`);
    } else if (!isAdminRequest(req)) {
      return errorResponse("Unauthorized", 401, origin);
    }

    if (severity) {
      conditions.push(Prisma.sql`severity = ${severity}`);
    }

    if (acknowledged !== null && acknowledged !== undefined) {
      conditions.push(Prisma.sql`acknowledged = ${acknowledged === "true"}`);
    }

    const maxRows = Math.min(parseInt(limit || "50") || 50, 200);
    const whereClause = Prisma.join(conditions, " AND ");

    const alerts = await db.$queryRaw<unknown[]>`
      SELECT ah.*, c.facility_name, f.name AS fac_name
      FROM alert_history ah
      LEFT JOIN clients c ON ah.client_id = c.id
      LEFT JOIN facilities f ON ah.facility_id = f.id
      WHERE ${whereClause}
      ORDER BY ah.created_at DESC
      LIMIT ${maxRows}
    `;

    const summary = await db.$queryRaw<
      Array<{ severity: string; count: number }>
    >`
      SELECT severity, COUNT(*)::int AS count
      FROM alert_history
      WHERE ${whereClause}
      GROUP BY severity
    `;

    const unacknowledged = await db.$queryRaw<
      Array<{ count: number }>
    >`
      SELECT COUNT(*)::int AS count
      FROM alert_history
      WHERE ${whereClause} AND acknowledged = false
    `;

    return jsonResponse(
      {
        success: true,
        data: alerts,
        summary: Object.fromEntries(
          summary.map((s) => [s.severity, s.count]),
        ),
        unacknowledged: unacknowledged[0]?.count || 0,
      },
      200,
      origin,
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "alert-history");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const { id, acknowledgedBy } = await req.json();
    if (!id) return errorResponse("Missing alert id", 400, origin);

    await db.$executeRaw`
      UPDATE alert_history SET acknowledged = true, acknowledged_by = ${acknowledgedBy || "admin"}, acknowledged_at = NOW()
      WHERE id = ${id}::uuid
    `;

    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
