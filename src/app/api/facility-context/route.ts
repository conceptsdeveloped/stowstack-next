import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, requireAdminKey } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const docs = await db.facility_context.findMany({
      where: { facility_id: facilityId },
      orderBy: { created_at: "desc" },
    });
    return jsonResponse({ docs }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "facility-context");
  if (limited) return limited;

  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { facilityId, type, title, content, fileUrl, metadata } = body || {};
    if (!facilityId || !type || !title) {
      return errorResponse("facilityId, type, and title required", 400, origin);
    }

    const doc = await db.facility_context.create({
      data: {
        facility_id: facilityId,
        type,
        title,
        content: content || null,
        file_url: fileUrl || null,
        metadata: metadata || {},
      },
    });
    return jsonResponse({ doc }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { docId } = body || {};
    if (!docId) return errorResponse("docId required", 400, origin);

    await db.facility_context.delete({ where: { id: docId } });
    return jsonResponse({ success: true }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}
