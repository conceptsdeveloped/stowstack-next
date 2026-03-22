import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const params = req.nextUrl.searchParams;
  const clientId = params.get("clientId");
  const accessCode = params.get("accessCode");
  const email = params.get("email");
  const severity = params.get("severity");
  const acknowledged = params.get("acknowledged");
  const limit = params.get("limit");

  try {
    const whereParts: string[] = ["1=1"];
    const queryParams: unknown[] = [];
    let idx = 1;

    if (accessCode && email) {
      const clients = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM clients WHERE access_code = ${accessCode} AND LOWER(email) = LOWER(${email.trim()})
      `;
      if (!clients.length) return errorResponse("Unauthorized", 401, origin);
      queryParams.push(clients[0].id);
      whereParts.push(`client_id = $${idx++}`);
    } else if (clientId) {
      if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);
      queryParams.push(clientId);
      whereParts.push(`client_id = $${idx++}`);
    } else if (!isAdminRequest(req)) {
      return errorResponse("Unauthorized", 401, origin);
    }

    if (severity) {
      queryParams.push(severity);
      whereParts.push(`severity = $${idx++}`);
    }

    if (acknowledged !== null && acknowledged !== undefined) {
      queryParams.push(acknowledged === "true");
      whereParts.push(`acknowledged = $${idx++}`);
    }

    const maxRows = Math.min(parseInt(limit || "50") || 50, 200);
    queryParams.push(maxRows);

    const whereClause = whereParts.join(" AND ");

    const alerts = await db.$queryRawUnsafe<unknown[]>(
      `SELECT ah.*, c.facility_name, f.name AS fac_name
       FROM alert_history ah
       LEFT JOIN clients c ON ah.client_id = c.id
       LEFT JOIN facilities f ON ah.facility_id = f.id
       WHERE ${whereClause}
       ORDER BY ah.created_at DESC
       LIMIT $${idx}`,
      ...queryParams,
    );

    const summary = await db.$queryRawUnsafe<
      Array<{ severity: string; count: number }>
    >(
      `SELECT severity, COUNT(*)::int AS count
       FROM alert_history
       WHERE ${whereClause}
       GROUP BY severity`,
      ...queryParams.slice(0, -1),
    );

    const unacknowledged = await db.$queryRawUnsafe<
      Array<{ count: number }>
    >(
      `SELECT COUNT(*)::int AS count
       FROM alert_history
       WHERE ${whereClause} AND acknowledged = false`,
      ...queryParams.slice(0, -1),
    );

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
