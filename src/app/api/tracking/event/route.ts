import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { db } from '@/lib/db';
import { corsResponse, getOrigin, getCorsHeaders } from '@/lib/api-helpers';
import { isValidUuid } from '@/lib/validation';

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/**
 * POST /api/tracking/event
 * Records storEDGE embed events (unit_selected, reservation_started, etc.)
 * for full-funnel attribution.
 */
export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_WRITE, "tracking-event");
  if (limited) return limited;

  const origin = getOrigin(req);

  try {
    const event = await req.json();

    // Reject oversized payloads
    const rawSize = JSON.stringify(event).length;
    if (rawSize > 100_000) {
      return NextResponse.json({ ok: true }, { status: 200, headers: getCorsHeaders(origin) });
    }

    const facilityId = event.facilityId && isValidUuid(event.facilityId)
      ? event.facilityId
      : null;

    const eventMeta = {
      event_type: event.type,
      tracking_params: event.trackingParams || {},
      unit_type: event.unitType || null,
      unit_size: event.unitSize || null,
      monthly_rate: event.monthlyRate || null,
      reservation_id: event.reservationId || null,
      tenant_name: event.tenantName || null,
      move_in_date: event.moveInDate || null,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    await db.activity_log.create({
      data: {
        type: `storedge_${event.type || 'unknown'}`,
        facility_id: facilityId,
        detail: `storEDGE event: ${event.type}${event.unitSize ? ` (${event.unitSize})` : ''}`,
        meta: eventMeta,
      },
    });

    return NextResponse.json(
      { success: true },
      { headers: getCorsHeaders(origin) }
    );
  } catch (err) {
    console.error('Tracking event error:', err);
    return NextResponse.json(
      { success: true },
      { headers: getCorsHeaders(origin) }
    );
  }
}
