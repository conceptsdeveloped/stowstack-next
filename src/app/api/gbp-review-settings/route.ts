import { Prisma } from "@prisma/client";
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

  const facilityId = req.nextUrl.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("Missing facilityId", 400, origin);

  try {
    const conn = await db.gbp_connections.findUnique({
      where: { facility_id: facilityId },
      select: { sync_config: true },
    });

    const config = (conn?.sync_config as Record<string, unknown>) || {};
    return jsonResponse(
      {
        success: true,
        settings: {
          autoRespond: config.auto_respond || false,
          autoRespondMinRating: config.auto_respond_min_rating || 4,
          responseTone: config.response_tone || "friendly",
        },
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const { facilityId, autoRespond, autoRespondMinRating, responseTone } =
      await req.json();
    if (!facilityId) return errorResponse("Missing facilityId", 400, origin);

    const conn = await db.gbp_connections.findUnique({
      where: { facility_id: facilityId },
      select: { id: true, sync_config: true },
    });

    if (!conn) {
      return errorResponse(
        "No GBP connection found for this facility",
        404,
        origin
      );
    }

    const config = (conn.sync_config as Record<string, unknown>) || {};

    if (autoRespond !== undefined) config.auto_respond = !!autoRespond;
    if (autoRespondMinRating !== undefined) {
      const rating = parseInt(autoRespondMinRating);
      if (rating >= 1 && rating <= 5)
        config.auto_respond_min_rating = rating;
    }
    if (responseTone !== undefined) {
      if (["friendly", "professional", "casual"].includes(responseTone)) {
        config.response_tone = responseTone;
      }
    }

    await db.gbp_connections.update({
      where: { id: conn.id },
      data: { sync_config: config as unknown as Prisma.InputJsonValue, updated_at: new Date() },
    });

    return jsonResponse(
      {
        success: true,
        settings: {
          autoRespond: config.auto_respond || false,
          autoRespondMinRating: config.auto_respond_min_rating || 4,
          responseTone: config.response_tone || "friendly",
        },
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
