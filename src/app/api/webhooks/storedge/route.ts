import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import type { StorEdgeWebhookPayload } from '@/types/storedge';
import { applyRateLimit } from '@/lib/with-rate-limit';
import { RATE_LIMIT_TIERS } from '@/lib/rate-limit-tiers';

const WEBHOOK_SECRET = process.env.STOREDGE_WEBHOOK_SECRET;

/**
 * Verify storEDGE webhook signature using HMAC-SHA256.
 * Rejects unsigned or forged requests to prevent attribution poisoning.
 */
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET) {
    // Fail-open only in dev when secret is not configured
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }
  if (!signature) return false;

  const expected = createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/storedge
 * Receives webhook events from storEDGE for reservations and move-ins.
 * This is the critical server-side attribution endpoint.
 *
 * Events:
 * - reservation.created: new online reservation
 * - reservation.cancelled: reservation was cancelled
 * - move_in.completed: tenant moved in (revenue realized)
 * - move_in.cancelled: move-in was reversed
 */
export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.WEBHOOK, "wh-storedge");
  if (limited) return limited;
  try {
    const rawBody = await req.text();

    // Verify webhook signature
    const signature = req.headers.get('x-storedge-signature') || req.headers.get('x-webhook-signature');
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload: StorEdgeWebhookPayload = JSON.parse(rawBody);

    // Idempotency: check for duplicate webhook_id
    if (payload.webhook_id) {
      const existing = await db.activity_log.findFirst({
        where: {
          type: 'storedge_webhook',
          meta: { path: ['webhook_id'], equals: payload.webhook_id },
        },
      });
      if (existing) {
        return NextResponse.json({ success: true, duplicate: true });
      }
    }

    // Log the webhook event
    const webhookMeta = JSON.parse(JSON.stringify({
      webhook_id: payload.webhook_id,
      event: payload.event,
      reservation_id: payload.reservation_id,
      unit_type: payload.unit_type || null,
      unit_size: payload.unit_size || null,
      monthly_rate: payload.monthly_rate || null,
      tenant_name: payload.tenant_name || null,
      tenant_email: payload.tenant_email || null,
      tenant_phone: payload.tenant_phone || null,
      move_in_date: payload.move_in_date || null,
      tracking_params: payload.tracking_params || {},
      timestamp: payload.timestamp || new Date().toISOString(),
    }));

    // Validate facility_id is a valid UUID or set to null
    const facilityId = payload.facility_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.facility_id)
      ? payload.facility_id
      : null;

    await db.activity_log.create({
      data: {
        type: 'storedge_webhook',
        facility_id: facilityId,
        detail: `storEDGE webhook: ${payload.event}${payload.tenant_name ? ` — ${payload.tenant_name}` : ''}`,
        meta: webhookMeta,
      },
    });

    // For move_in.completed events, update lead attribution if tracking params exist
    if (
      payload.event === 'move_in.completed' &&
      payload.tracking_params &&
      (payload.tracking_params.utm_source ||
        payload.tracking_params.fbclid ||
        payload.tracking_params.gclid)
    ) {
      // Log the attributed move-in
      const moveInMeta = JSON.parse(JSON.stringify({
        reservation_id: payload.reservation_id,
        source: payload.tracking_params.utm_source || null,
        campaign: payload.tracking_params.utm_campaign || null,
        fbclid: payload.tracking_params.fbclid || null,
        gclid: payload.tracking_params.gclid || null,
        monthly_rate: payload.monthly_rate || null,
        move_in_date: payload.move_in_date || null,
      }));

      await db.activity_log.create({
        data: {
          type: 'attributed_move_in',
          facility_id: facilityId,
          lead_name: payload.tenant_name || null,
          detail: `Attributed move-in from ${payload.tracking_params.utm_source || 'paid'}: ${payload.tracking_params.utm_campaign || 'unknown campaign'}`,
          meta: moveInMeta,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('storEDGE webhook error:', err);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
