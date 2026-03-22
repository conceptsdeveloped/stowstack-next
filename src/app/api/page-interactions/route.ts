import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";

const VALID_EVENT_TYPES = ["click", "scroll", "section_view", "form_focus", "cta_hover", "page_load"];

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const { landingPageId, facilityId, sessionId, utmSource, events } = body;

    if (!landingPageId || !facilityId || !sessionId) {
      return errorResponse("Missing required fields", 400, origin);
    }

    if (!Array.isArray(events) || events.length === 0) {
      return errorResponse("No events provided", 400, origin);
    }

    const batch = events.slice(0, 50);

    const values: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    for (const evt of batch) {
      if (!VALID_EVENT_TYPES.includes(evt.event_type)) continue;

      values.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
      );
      params.push(
        landingPageId,
        facilityId,
        sessionId,
        evt.event_type,
        evt.element_id || null,
        evt.element_text?.slice(0, 100) || null,
        evt.section_index ?? null,
        evt.x_pct ?? null,
        evt.y_pct ?? null,
        evt.scroll_depth ?? null,
        evt.viewport_width ?? null,
        evt.viewport_height ?? null,
        evt.time_on_page ?? 0,
        utmSource || null
      );
    }

    if (values.length > 0) {
      await db.$executeRawUnsafe(
        `INSERT INTO page_interactions (landing_page_id, facility_id, session_id, event_type, element_id, element_text, section_index, x_pct, y_pct, scroll_depth, viewport_width, viewport_height, time_on_page, utm_source)
         VALUES ${values.join(", ")}`,
        ...params
      );
    }

    return jsonResponse({ success: true, recorded: values.length }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
