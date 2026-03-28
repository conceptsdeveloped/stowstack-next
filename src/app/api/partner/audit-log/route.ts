import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import {
  corsResponse,
  jsonResponse,
  errorResponse,
  getOrigin,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

interface AuditRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  user_name: string | null;
  user_email: string | null;
}

interface CountRow {
  count: bigint;
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  if (session.user.role !== "org_admin" && !session.user.is_superadmin) {
    return errorResponse("Forbidden", 403, origin);
  }

  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get("limit") || "50", 10);
  const offsetParam = parseInt(url.searchParams.get("offset") || "0", 10);
  const actionFilter = url.searchParams.get("action") || null;
  const userIdFilter = url.searchParams.get("userId") || null;

  const limit = Math.min(Math.max(1, limitParam), 200);
  const offset = Math.max(0, offsetParam);
  const orgId = session.organization.id;

  try {
    let entries: AuditRow[];
    let countResult: CountRow[];

    if (actionFilter && userIdFilter) {
      entries = await db.$queryRaw<AuditRow[]>`
        SELECT al.id, al.organization_id, al.user_id, al.action,
               al.resource_type, al.resource_id, al.metadata,
               al.ip_address, al.user_agent, al.created_at,
               ou.name as user_name, ou.email as user_email
        FROM audit_log al
        LEFT JOIN org_users ou ON ou.id = al.user_id
        WHERE al.organization_id = ${orgId}
          AND al.action = ${actionFilter}
          AND al.user_id = ${userIdFilter}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await db.$queryRaw<CountRow[]>`
        SELECT COUNT(*) as count FROM audit_log
        WHERE organization_id = ${orgId}
          AND action = ${actionFilter}
          AND user_id = ${userIdFilter}
      `;
    } else if (actionFilter) {
      entries = await db.$queryRaw<AuditRow[]>`
        SELECT al.id, al.organization_id, al.user_id, al.action,
               al.resource_type, al.resource_id, al.metadata,
               al.ip_address, al.user_agent, al.created_at,
               ou.name as user_name, ou.email as user_email
        FROM audit_log al
        LEFT JOIN org_users ou ON ou.id = al.user_id
        WHERE al.organization_id = ${orgId}
          AND al.action = ${actionFilter}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await db.$queryRaw<CountRow[]>`
        SELECT COUNT(*) as count FROM audit_log
        WHERE organization_id = ${orgId}
          AND action = ${actionFilter}
      `;
    } else if (userIdFilter) {
      entries = await db.$queryRaw<AuditRow[]>`
        SELECT al.id, al.organization_id, al.user_id, al.action,
               al.resource_type, al.resource_id, al.metadata,
               al.ip_address, al.user_agent, al.created_at,
               ou.name as user_name, ou.email as user_email
        FROM audit_log al
        LEFT JOIN org_users ou ON ou.id = al.user_id
        WHERE al.organization_id = ${orgId}
          AND al.user_id = ${userIdFilter}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await db.$queryRaw<CountRow[]>`
        SELECT COUNT(*) as count FROM audit_log
        WHERE organization_id = ${orgId}
          AND user_id = ${userIdFilter}
      `;
    } else {
      entries = await db.$queryRaw<AuditRow[]>`
        SELECT al.id, al.organization_id, al.user_id, al.action,
               al.resource_type, al.resource_id, al.metadata,
               al.ip_address, al.user_agent, al.created_at,
               ou.name as user_name, ou.email as user_email
        FROM audit_log al
        LEFT JOIN org_users ou ON ou.id = al.user_id
        WHERE al.organization_id = ${orgId}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await db.$queryRaw<CountRow[]>`
        SELECT COUNT(*) as count FROM audit_log
        WHERE organization_id = ${orgId}
      `;
    }

    const total = Number(countResult[0]?.count ?? 0);

    return jsonResponse(
      {
        entries: entries.map((e) => ({
          id: e.id,
          userId: e.user_id,
          userName: e.user_name,
          userEmail: e.user_email,
          action: e.action,
          resourceType: e.resource_type,
          resourceId: e.resource_id,
          metadata: e.metadata,
          ipAddress: e.ip_address,
          userAgent: e.user_agent,
          createdAt: e.created_at.toISOString(),
        })),
        total,
      },
      200,
      origin,
    );
  } catch (err) {
    console.error("Audit log error:", err);
    return errorResponse("Failed to fetch audit log", 500, origin);
  }
}
