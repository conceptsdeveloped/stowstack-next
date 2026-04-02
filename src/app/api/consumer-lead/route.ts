import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { isValidEmail, sanitizeString } from "@/lib/validation";

/** Clamp optional string fields from untrusted input */
function clean(val: unknown, max: number): string | null {
  const s = sanitizeString(val, max);
  return s || null;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_WRITE, "consumer-lead");
  if (limited) return limited;
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const {
      sessionId, email, phone, name, unitSize, facilityId, landingPageId,
      fbclid, gclid, fbc: _fbc, fbp: _fbp,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term: _utm_term,
    } = body;

    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 200) {
      return errorResponse("Valid session ID is required", 400, origin);
    }
    if (!email && !phone) {
      return errorResponse("Email or phone is required", 400, origin);
    }
    if (email && !isValidEmail(String(email).trim())) {
      return errorResponse("Invalid email format", 400, origin);
    }

    // Sanitize all string inputs before storage
    const cleanEmail = clean(email, 254);
    const cleanPhone = clean(phone, 30);
    const cleanName = clean(name, 200);
    const cleanUnitSize = clean(unitSize, 50);
    const cleanUtmSource = clean(utm_source, 200);
    const cleanUtmMedium = clean(utm_medium, 200);
    const cleanUtmCampaign = clean(utm_campaign, 200);
    const cleanUtmContent = clean(utm_content, 200);

    // Try to update existing partial lead
    const existingPartial = await db.partial_leads.findFirst({
      where: { session_id: sessionId },
    });

    if (existingPartial) {
      const updated = await db.partial_leads.update({
        where: { id: existingPartial.id },
        data: {
          email: cleanEmail || existingPartial.email,
          phone: cleanPhone || existingPartial.phone,
          name: cleanName || existingPartial.name,
          unit_size: cleanUnitSize || existingPartial.unit_size,
          converted: true,
          lead_status: "new",
          fbclid: fbclid || existingPartial.fbclid,
          gclid: gclid || existingPartial.gclid,
          utm_source: cleanUtmSource || existingPartial.utm_source,
          utm_medium: cleanUtmMedium || existingPartial.utm_medium,
          utm_campaign: cleanUtmCampaign || existingPartial.utm_campaign,
          utm_content: cleanUtmContent || existingPartial.utm_content,
        },
      });
      return jsonResponse({ success: true, id: updated.id, status: "updated" }, 200, origin);
    }

    // Create new partial lead
    const lead = await db.partial_leads.create({
      data: {
        session_id: sessionId,
        facility_id: facilityId || null,
        landing_page_id: landingPageId || null,
        email: cleanEmail,
        phone: cleanPhone,
        name: cleanName,
        unit_size: cleanUnitSize,
        converted: true,
        lead_status: "new",
        fbclid: fbclid || null,
        gclid: gclid || null,
        utm_source: cleanUtmSource,
        utm_medium: cleanUtmMedium,
        utm_campaign: cleanUtmCampaign,
        utm_content: cleanUtmContent,
      },
    });

    // Fire-and-forget activity log
    if (facilityId) {
      db.activity_log.create({
        data: {
          type: "consumer_lead",
          facility_id: facilityId,
          lead_name: name || email || phone || "",
          detail: `New consumer lead from landing page`,
          meta: { sessionId, source: fbclid ? "meta" : gclid ? "google" : "direct" },
        },
      }).catch((err) => console.error("[activity_log] Fire-and-forget failed:", err));
    }

    return jsonResponse({ success: true, id: lead.id, status: "created" }, 200, origin);
  } catch (err) {
    console.error("Consumer lead error:", err);
    return errorResponse("Failed to process lead", 500, origin);
  }
}
