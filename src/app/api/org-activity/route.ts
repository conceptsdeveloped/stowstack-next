import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
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

  try {
    const isAdmin = isAdminRequest(req);
    const session = await getSession(req);
    const orgUser = session?.user || null;

    if (!isAdmin && !orgUser) return errorResponse("Unauthorized", 401, origin);

    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId") || orgUser?.organization_id;
    if (!orgId) return errorResponse("Organization ID required", 400, origin);

    const activities = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT al.id, al.type, al.facility_name, al.detail, al.created_at
       FROM activity_log al
       JOIN facilities f ON f.id = al.facility_id
       WHERE f.organization_id = $1
       ORDER BY al.created_at DESC
       LIMIT 50`,
      orgId
    );

    return jsonResponse({ activities }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const isAdmin = isAdminRequest(req);
    const session = await getSession(req);
    const orgUser = session?.user || null;

    if (!isAdmin && !orgUser) return errorResponse("Unauthorized", 401, origin);

    const body = await req.json();
    const { type, facilityId, facilityName, detail } = body;
    if (!type || !detail) return errorResponse("Type and detail required", 400, origin);

    const activity = await db.activity_log.create({
      data: {
        type,
        facility_id: facilityId || null,
        facility_name: facilityName || null,
        detail,
      },
    });

    return jsonResponse({ activity }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
