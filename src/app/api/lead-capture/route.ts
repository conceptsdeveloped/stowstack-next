import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, sanitizeString } from "@/lib/validation";

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit(`lead_capture:${ip}`, 10, 60);
  if (!rl.allowed) {
    return errorResponse("Too many requests", 429, origin);
  }

  try {
    const body = await req.json();
    const {
      phone,
      unitSize,
      timeline,
      facilityId,
      landingPageId,
      sessionId,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      referrer,
    } = body;

    const name = sanitizeString(body.name, 200);
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!name || !email || !phone || typeof phone !== "string") {
      return errorResponse("Name, email, and phone are required", 400, origin);
    }

    if (email.length > 254 || phone.length > 30) {
      return errorResponse("Field length exceeded", 400, origin);
    }

    if (!isValidEmail(email)) {
      return errorResponse("Invalid email", 400, origin);
    }

    const sid = sessionId || `lead-${Date.now()}`;
    await db.partial_leads.upsert({
      where: { session_id: sid },
      create: {
        session_id: sid,
        landing_page_id: landingPageId || null,
        facility_id: facilityId || null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        unit_size: unitSize || null,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        referrer: referrer || null,
        fields_completed: 5,
        total_fields: 5,
        recovery_status: "converted",
        lead_score: 80,
      },
      update: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        unit_size: unitSize || null,
        fields_completed: 5,
        recovery_status: "converted",
        converted: true,
        converted_at: new Date(),
        lead_score: 80,
        updated_at: new Date(),
      },
    });

    if (facilityId) {
      db.activity_log
        .create({
          data: {
            type: "lead_captured",
            facility_id: facilityId,
            lead_name: name.trim(),
            detail: `Lead from landing page: ${email.trim()}`,
          },
        })
        .catch((err) => console.error("[activity_log] Fire-and-forget failed:", err));
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && facilityId) {
      const facility = await db.facilities.findUnique({
        where: { id: facilityId },
        select: { name: true, contact_email: true },
      });
      const facilityName = facility?.name || "Unknown Facility";

      const notificationHtml = `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="margin: 0 0 16px; color: #1a1a1a;">New Lead from Landing Page</h2>
          <p style="color: #666; margin: 0 0 16px;">A visitor filled out the lead capture form on a ${esc(facilityName)} landing page.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666; width: 120px;">Name</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(name)}</td></tr>
            <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Email</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
            <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Phone</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(phone)}</td></tr>
            ${unitSize ? `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Unit Size</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(unitSize)}</td></tr>` : ""}
            ${timeline ? `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Timeline</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(timeline)}</td></tr>` : ""}
            ${utmCampaign ? `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Campaign</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(utmCampaign)}</td></tr>` : ""}
            ${utmSource ? `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Source</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(utmSource)}</td></tr>` : ""}
          </table>
          <p style="margin-top: 16px; font-size: 13px; color: #999;">Submitted: ${new Date().toISOString()}</p>
        </div>`;

      const recipients = (process.env.AUDIT_NOTIFICATION_EMAILS || "blake@storageads.com")
        .split(",")
        .map((e: string) => e.trim());

      if (facility?.contact_email) {
        recipients.push(facility.contact_email);
      }

      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: "StorageAds <notifications@storageads.com>",
          to: [...new Set(recipients)],
          subject: `New Lead: ${name.trim()} — ${facilityName}`,
          html: notificationHtml,
        }),
      }).catch((err) => console.error("[email] Fire-and-forget failed:", err));
    }

    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
