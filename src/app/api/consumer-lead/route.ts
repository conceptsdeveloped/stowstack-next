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
    const {
      sessionId, email, phone, name, unitSize, facilityId, landingPageId,
      fbclid, gclid, fbc: _fbc, fbp: _fbp,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term: _utm_term,
    } = body;

    if (!sessionId) {
      return errorResponse("Session ID is required", 400, origin);
    }
    if (!email && !phone) {
      return errorResponse("Email or phone is required", 400, origin);
    }

    // Try to update existing partial lead
    const existingPartial = await db.partial_leads.findFirst({
      where: { session_id: sessionId },
    });

    if (existingPartial) {
      const updated = await db.partial_leads.update({
        where: { id: existingPartial.id },
        data: {
          email: email || existingPartial.email,
          phone: phone || existingPartial.phone,
          name: name || existingPartial.name,
          unit_size: unitSize || existingPartial.unit_size,
          converted: true,
          lead_status: "new",
          fbclid: fbclid || existingPartial.fbclid,
          gclid: gclid || existingPartial.gclid,
          utm_source: utm_source || existingPartial.utm_source,
          utm_medium: utm_medium || existingPartial.utm_medium,
          utm_campaign: utm_campaign || existingPartial.utm_campaign,
          utm_content: utm_content || existingPartial.utm_content,
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
        email: email || null,
        phone: phone || null,
        name: name || null,
        unit_size: unitSize || null,
        converted: true,
        lead_status: "new",
        fbclid: fbclid || null,
        gclid: gclid || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_content: utm_content || null,
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
      }).catch(() => {});
    }

    return jsonResponse({ success: true, id: lead.id, status: "created" }, 200, origin);
  } catch (err) {
    console.error("Consumer lead error:", err);
    return errorResponse("Failed to process lead", 500, origin);
  }
}
