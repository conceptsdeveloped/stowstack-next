import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, requireAdminKey } from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50"));
    const facilityId = url.searchParams.get("facility_id");

    const where: Record<string, unknown> = {};
    if (facilityId) where.facility_id = facilityId;

    const logs = await db.activity_log.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return jsonResponse({ logs }, 200, origin);
  } catch (err) {
    console.error("Activity log error:", err);
    return errorResponse("Failed to fetch activity log", 500, origin);
  }
}
