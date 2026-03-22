import { NextRequest } from "next/server";
import twilio from "twilio";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured");
  return twilio(sid, token);
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const url = new URL(req.url);
  const landingPageId = url.searchParams.get("landingPageId");
  const facilityId = url.searchParams.get("facilityId");

  // Public endpoint: get tracking phone for a landing page
  if (landingPageId && !facilityId) {
    try {
      const number = await db.call_tracking_numbers.findFirst({
        where: { landing_page_id: landingPageId, status: "active" },
        select: { phone_number: true },
      });
      return jsonResponse(
        { trackingPhone: number?.phone_number || null },
        200,
        origin
      );
    } catch {
      return errorResponse("Failed to fetch tracking phone", 500, origin);
    }
  }

  // Admin endpoint: list tracking numbers for a facility
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const numbers = await db.call_tracking_numbers.findMany({
      where: {
        facility_id: facilityId,
        status: { not: "released" },
      },
      orderBy: { created_at: "desc" },
      include: {
        landing_pages: { select: { title: true } },
        utm_links: { select: { label: true } },
      },
    });

    const result = numbers.map((n) => ({
      ...n,
      landing_page_title: n.landing_pages?.title || null,
      utm_label: n.utm_links?.label || null,
      landing_pages: undefined,
      utm_links: undefined,
    }));

    return jsonResponse({ numbers: result }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch tracking numbers", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { facilityId, label, forwardTo, areaCode, landingPageId, utmLinkId } =
      body || {};

    if (!facilityId || !label || !forwardTo) {
      return errorResponse(
        "facilityId, label, and forwardTo required",
        400,
        origin
      );
    }

    const client = getTwilioClient();
    const webhookBase = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://stowstack.co");

    const searchParams: { limit: number; voiceEnabled: boolean; areaCode?: number } = {
      limit: 1,
      voiceEnabled: true,
    };
    if (areaCode) searchParams.areaCode = parseInt(areaCode, 10);

    const available = await client
      .availablePhoneNumbers("US")
      .local.list(searchParams);
    if (!available.length) {
      return errorResponse(
        "No numbers available for that area code",
        404,
        origin
      );
    }

    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: available[0].phoneNumber,
      voiceUrl: `${webhookBase}/api/call-webhook`,
      voiceMethod: "POST",
      statusCallback: `${webhookBase}/api/call-webhook?event=status`,
      statusCallbackMethod: "POST",
      friendlyName: `StowStack: ${label}`,
    });

    const number = await db.call_tracking_numbers.create({
      data: {
        facility_id: facilityId,
        landing_page_id: landingPageId || null,
        utm_link_id: utmLinkId || null,
        label,
        twilio_sid: purchased.sid,
        phone_number: purchased.phoneNumber,
        forward_to: forwardTo,
      },
    });

    return jsonResponse({ number }, 201, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to provision number";
    return errorResponse(message, 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return errorResponse("id required", 400, origin);

  try {
    const number = await db.call_tracking_numbers.findUnique({
      where: { id },
      select: { twilio_sid: true },
    });
    if (!number) return errorResponse("Number not found", 404, origin);

    try {
      const client = getTwilioClient();
      await client.incomingPhoneNumbers(number.twilio_sid).remove();
    } catch {
      // Twilio release may fail; continue with DB update
    }

    await db.call_tracking_numbers.update({
      where: { id },
      data: { status: "released" },
    });

    return jsonResponse({ ok: true }, 200, origin);
  } catch {
    return errorResponse("Failed to release number", 500, origin);
  }
}
