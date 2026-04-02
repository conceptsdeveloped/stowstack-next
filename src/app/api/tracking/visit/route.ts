import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { db } from '@/lib/db';
import { corsResponse, getOrigin, getCorsHeaders } from '@/lib/api-helpers';

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/**
 * POST /api/tracking/visit
 * Records a landing page visit with tracking parameters.
 * Fire-and-forget from the client — failure should never block the page.
 */
export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_READ, "tracking-visit");
  if (limited) return limited;
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const {
      tracking_params,
      landing_page_id,
      facility_id,
      url,
    } = body;

    // Validate facility_id is a valid UUID or set to null
    const validFacilityId = facility_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facility_id)
      ? facility_id
      : null;

    // Store in activity_log for now — proper tracking table can be added later
    const visitMeta = JSON.parse(JSON.stringify({
      tracking_params: tracking_params || {},
      landing_page_id: landing_page_id || null,
      url: url || null,
      source: tracking_params?.utm_source || 'direct',
      timestamp: new Date().toISOString(),
    }));

    await db.activity_log.create({
      data: {
        type: 'landing_page_visit',
        facility_id: validFacilityId,
        detail: `LP visit: ${url || 'unknown'}`,
        meta: visitMeta,
      },
    });

    return NextResponse.json(
      { success: true },
      { headers: getCorsHeaders(origin) }
    );
  } catch (err) {
    // Never fail loudly — tracking should be best-effort
    console.error('Tracking visit error:', err);
    return NextResponse.json(
      { success: true },
      { headers: getCorsHeaders(origin) }
    );
  }
}
