import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const facilityId = url.searchParams.get("facilityId");
    if (!facilityId) return errorResponse("facilityId required", 400, origin);

    const assets = await db.assets.findMany({
      where: { facility_id: facilityId },
      orderBy: { created_at: "desc" },
    });

    return jsonResponse({ assets }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch assets", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { facilityId, url, type, source, metadata } = body || {};
    if (!facilityId || !url) {
      return errorResponse("facilityId and url required", 400, origin);
    }

    const asset = await db.assets.create({
      data: {
        facility_id: facilityId,
        type: type || "photo",
        source: source || "uploaded",
        url,
        metadata: metadata || {},
      },
    });

    return jsonResponse({ asset }, 200, origin);
  } catch {
    return errorResponse("Failed to save asset", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { assetId } = body || {};
    if (!assetId) return errorResponse("assetId required", 400, origin);

    await db.assets.delete({ where: { id: assetId } });

    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to delete asset", 500, origin);
  }
}
