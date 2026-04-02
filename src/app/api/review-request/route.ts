import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "review-request");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const {
      facilityId,
      tenantName,
      tenantEmail,
      tenantPhone,
      channel,
    } = await req.json();

    if (!facilityId) return errorResponse("Missing facilityId", 400, origin);
    if (!tenantEmail && !tenantPhone) {
      return errorResponse("Need email or phone", 400, origin);
    }

    const fac = await db.facilities.findUnique({ where: { id: facilityId } });
    if (!fac) return errorResponse("Facility not found", 404, origin);

    const firstName =
      (tenantName || "").trim().split(" ")[0] || "there";
    const facilityName = fac.name;
    const googleMapsUrl =
      fac.google_maps_url ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facilityName + " " + (fac.location || ""))}`;
    const reviewUrl = googleMapsUrl;

    if ((!channel || channel === "email") && tenantEmail) {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: `${facilityName} <notifications@storageads.com>`,
            to: tenantEmail.trim(),
            subject: `How's your experience at ${facilityName}?`,
            html: `
              <div style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;line-height:1.7;color:#1a1a1a;">
                <p>Hey ${esc(firstName)},</p>
                <p>Thanks for choosing <strong>${esc(facilityName)}</strong> for your storage needs. We hope everything has been going well.</p>
                <p>If you have a minute, we would really appreciate a quick Google review. It helps other people in the area find us, and it means a lot to our team.</p>
                <p style="margin:24px 0;">
                  <a href="${reviewUrl}" style="display:inline-block;padding:14px 28px;background:#B58B3F;color:#faf9f5;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Leave a Review</a>
                </p>
                <p>Takes about 30 seconds. Thank you for being a great tenant.</p>
                <p style="margin-top:24px;color:#666;">
                  ${esc(facilityName)}<br/>
                  ${esc(fac.location || "")}
                </p>
              </div>`,
          }),
        });
      }
    }

    if (channel === "sms" && tenantPhone) {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

      if (twilioSid && twilioToken && twilioFrom) {
        const smsBody = `Hey ${firstName}! Thanks for storing with ${facilityName}. If you have 30 seconds, a quick Google review would mean a lot: ${reviewUrl}\n\nReply STOP to opt out.`;

        const formData = new URLSearchParams();
        formData.append("To", tenantPhone.trim());
        formData.append("From", twilioFrom);
        formData.append("Body", smsBody);

        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
            },
            body: formData.toString(),
          },
        );
      }
    }

    db.activity_log
      .create({
        data: {
          type: "review_request",
          facility_id: facilityId,
          facility_name: facilityName,
          lead_name: tenantName || "",
          detail: `Review request sent to ${tenantEmail || tenantPhone} via ${channel || "email"}`,
        },
      })
      .catch((err) => console.error("[activity_log] Fire-and-forget failed:", err));

    return jsonResponse(
      {
        success: true,
        sentTo: tenantEmail || tenantPhone,
        channel: channel || "email",
      },
      200,
      origin,
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
