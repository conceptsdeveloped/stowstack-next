import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "sms-send");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { to, body: smsBody, from, facilityId } = body as {
    to?: string;
    body?: string;
    from?: string;
    facilityId?: string;
  };

  if (!to || !smsBody) {
    return errorResponse("to and body required", 400, origin);
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return errorResponse("Twilio credentials not configured", 500, origin);
  }

  try {
    let fromNumber = from;

    if (!fromNumber && facilityId) {
      const tracking = await db.call_tracking_numbers.findFirst({
        where: { facility_id: facilityId, status: "active" },
        select: { phone_number: true },
      });
      if (tracking) fromNumber = tracking.phone_number;
    }

    if (!fromNumber) fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!fromNumber) {
      return errorResponse(
        "No from number available. Set TWILIO_FROM_NUMBER or provision a tracking number.",
        500,
        origin
      );
    }

    const hour = new Date().getUTCHours() - 5;
    if (hour < 9 || hour >= 21) {
      return errorResponse(
        "SMS send window violation. Cannot send SMS before 9am or after 9pm.",
        400,
        origin
      );
    }

    const bodyWithOptOut = smsBody.includes("STOP")
      ? smsBody
      : `${smsBody}\n\nReply STOP to opt out`;

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: bodyWithOptOut,
        }),
      }
    );

    const result = await twilioRes.json();

    if (result.error_code || result.status === "failed") {
      throw new Error(result.message || `Twilio error: ${result.error_code}`);
    }

    return jsonResponse(
      {
        success: true,
        messageSid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
      },
      200,
      origin
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}
