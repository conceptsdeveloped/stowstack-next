import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const { accessCode, source, sawOnlineAd, tenantName, unitRented, loggedBy } = body;

    if (!accessCode || !source) {
      return errorResponse("Access code and source are required", 400, origin);
    }

    // Verify the access code belongs to an active facility
    const facility = await db.facilities.findFirst({
      where: { access_code: accessCode },
    });

    if (!facility) {
      return errorResponse("Invalid access code", 404, origin);
    }

    // Log the walk-in attribution
    await db.activity_log.create({
      data: {
        type: "walkin_attribution",
        facility_id: facility.id,
        lead_name: tenantName || "",
        facility_name: facility.name || "",
        detail: `Walk-in attribution: ${source}${sawOnlineAd ? " (saw online ad)" : ""}`,
        meta: {
          source,
          sawOnlineAd: sawOnlineAd || false,
          tenantName: tenantName || null,
          unitRented: unitRented || null,
          loggedBy: loggedBy || null,
        },
      },
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch (err) {
    console.error("Walk-in attribution error:", err);
    return errorResponse("Failed to record attribution", 500, origin);
  }
}
