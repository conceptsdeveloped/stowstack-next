import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 60;

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSolicitationEmailHtml(
  facilityName: string,
  tenantName: string | null,
  reviewUrl: string
): string {
  const greeting = tenantName ? `Hi ${esc(tenantName)},` : "Hi there,";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#faf9f5;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="background:#ffffff;border:1px solid #e8e6dc;border-radius:8px;padding:28px 24px;">
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#141413;">${esc(facilityName)}</h1>

    <p style="margin:0 0 12px;font-size:15px;color:#141413;line-height:1.6;">${greeting}</p>

    <p style="margin:0 0 12px;font-size:15px;color:#141413;line-height:1.6;">
      Thank you for choosing ${esc(facilityName)} for your storage needs! We hope everything has been going smoothly since your move-in.
    </p>

    <p style="margin:0 0 24px;font-size:15px;color:#141413;line-height:1.6;">
      If you have a moment, we would really appreciate a quick Google review. Your feedback helps us improve and helps others find reliable storage in the area.
    </p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${esc(reviewUrl)}" style="display:inline-block;background:#B58B3F;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;">Leave a Google Review</a>
    </div>

    <p style="margin:0;font-size:14px;color:#6a6560;line-height:1.5;">
      Thank you for being a valued tenant. We are here if you need anything!
    </p>

    <p style="margin:16px 0 0;font-size:14px;color:#6a6560;">
      &mdash; The ${esc(facilityName)} Team
    </p>
  </div>
  <p style="text-align:center;margin-top:16px;font-size:11px;color:#b0aea5;">
    You received this because you recently moved into ${esc(facilityName)}.
  </p>
</div>
</body></html>`;
}

/**
 * Construct a Google Maps review URL from a place_id or google_maps_url.
 * Falls back to a plain Maps search if neither yields a usable link.
 */
function buildReviewUrl(
  googleMapsUrl: string | null,
  placeId: string | null,
  facilityName: string
): string {
  // If we have a place_id, direct review link works best
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }
  // If we have a google maps url, append the review anchor
  if (googleMapsUrl) {
    // Google Maps URLs — try to extract CID or use as-is
    const separator = googleMapsUrl.includes("?") ? "&" : "?";
    return `${googleMapsUrl}${separator}review=true`;
  }
  // Fallback: search for the facility on Google Maps
  return `https://www.google.com/maps/search/${encodeURIComponent(facilityName)}`;
}

interface MoveInEntry {
  id: string;
  facility_id: string;
  lead_name: string | null;
  meta: Record<string, unknown> | null;
  created_at: Date;
}

interface FacilityInfo {
  name: string;
  google_maps_url: string | null;
  place_id: string | null;
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.WEBHOOK, "cron-review-solicitation");
  if (limited) return limited;
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 }
    );
  }

  const MAX_EXECUTION_TIME_MS = 45_000; // 45s (leave 15s buffer for 60s limit)
  const startTime = Date.now();

  const results = {
    checked: 0,
    sent: 0,
    skipped_no_email: 0,
    skipped_already_sent: 0,
    failed: 0,
    timedOut: false,
  };

  try {
    // Find attributed move-ins from 7-10 days ago (sweet spot for solicitation)
    const moveIns = await db.$queryRaw<MoveInEntry[]>`
      SELECT id, facility_id, lead_name, meta, created_at
      FROM activity_log
      WHERE type = 'attributed_move_in'
        AND created_at >= NOW() - INTERVAL '10 days'
        AND created_at <= NOW() - INTERVAL '7 days'
        AND facility_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 50
    `;

    results.checked = moveIns.length;

    // Cache facility info to avoid repeated lookups
    const facilityCache = new Map<string, FacilityInfo | null>();

    for (const moveIn of moveIns) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        console.warn(`[CRON:review-solicitation] Time limit reached. Checked: ${results.checked}, Sent: ${results.sent}. Remaining will be picked up next run.`);
        results.timedOut = true;
        break;
      }
      const facilityId = moveIn.facility_id;

      // Check if we already sent a solicitation for this move-in
      const alreadySent = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM activity_log
        WHERE type = 'review_solicitation_sent'
          AND facility_id = ${facilityId}::uuid
          AND meta->>'source_activity_id' = ${moveIn.id}
        LIMIT 1
      `;

      if (alreadySent.length > 0) {
        results.skipped_already_sent++;
        continue;
      }

      // Try to find the tenant's email from the storedge webhook that created this move-in
      // The meta has reservation_id — match it against storedge_webhook entries
      const meta = moveIn.meta || {};
      const reservationId = meta.reservation_id as string | undefined;
      let tenantEmail: string | null = null;
      const tenantName = moveIn.lead_name;

      // Strategy 1: Look up email from the original storedge webhook via reservation_id
      if (reservationId) {
        const webhookRows = await db.$queryRaw<
          { meta: Record<string, unknown> }[]
        >`
          SELECT meta FROM activity_log
          WHERE type = 'storedge_webhook'
            AND meta->>'reservation_id' = ${reservationId}
          LIMIT 1
        `;
        if (webhookRows.length > 0 && webhookRows[0].meta) {
          tenantEmail = (webhookRows[0].meta.tenant_email as string) || null;
        }
      }

      // Strategy 2: Look up from partial_leads by name + facility
      if (!tenantEmail && tenantName) {
        const leadRows = await db.$queryRaw<{ email: string | null }[]>`
          SELECT email FROM partial_leads
          WHERE facility_id = ${facilityId}::uuid
            AND name ILIKE ${tenantName}
            AND email IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 1
        `;
        if (leadRows.length > 0 && leadRows[0].email) {
          tenantEmail = leadRows[0].email;
        }
      }

      // Strategy 3: Look up from clients by name + facility
      if (!tenantEmail && tenantName) {
        const clientRows = await db.$queryRaw<{ email: string }[]>`
          SELECT email FROM clients
          WHERE facility_id = ${facilityId}::uuid
            AND name ILIKE ${tenantName}
          ORDER BY created_at DESC
          LIMIT 1
        `;
        if (clientRows.length > 0 && clientRows[0].email) {
          tenantEmail = clientRows[0].email;
        }
      }

      if (!tenantEmail) {
        results.skipped_no_email++;
        continue;
      }

      // Get facility info (cached)
      if (!facilityCache.has(facilityId)) {
        const rows = await db.$queryRaw<FacilityInfo[]>`
          SELECT name, google_maps_url, place_id FROM facilities WHERE id = ${facilityId}::uuid
        `;
        facilityCache.set(facilityId, rows[0] || null);
      }
      const facility = facilityCache.get(facilityId);
      if (!facility) {
        results.skipped_no_email++;
        continue;
      }

      const reviewUrl = buildReviewUrl(
        facility.google_maps_url,
        facility.place_id,
        facility.name
      );

      const html = buildSolicitationEmailHtml(
        facility.name,
        tenantName,
        reviewUrl
      );

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: `${facility.name} <reviews@storageads.com>`,
            to: tenantEmail,
            subject: `How's your experience at ${facility.name}?`,
            html,
          }),
        });

        if (!emailRes.ok) {
          results.failed++;
          continue;
        }

        // Log the solicitation to activity_log
        await db.$executeRaw`
          INSERT INTO activity_log (type, facility_id, lead_name, detail, meta)
          VALUES (
            'review_solicitation_sent',
            ${facilityId}::uuid,
            ${tenantName},
            ${"Review solicitation email sent to " + tenantEmail},
            ${JSON.stringify({
              source_activity_id: moveIn.id,
              tenant_email: tenantEmail,
              review_url: reviewUrl,
            })}::jsonb
          )
        `;
        results.sent++;
      } catch {
        results.failed++;
      }
    }

    console.log(`[CRON:review-solicitation] Complete. Checked: ${results.checked}, Sent: ${results.sent}, Failed: ${results.failed}`);

    // Log cron completion
    db.activity_log.create({
      data: {
        type: "cron_completed",
        detail: `[review-solicitation] Checked: ${results.checked}, Sent: ${results.sent}, Failed: ${results.failed}`,
        meta: JSON.parse(JSON.stringify(results)),
      },
    }).catch((err) => console.error("[activity_log] Cron log failed:", err));

    return NextResponse.json({ ok: true, ...results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[CRON:review-solicitation] Fatal error:`, err);

    // Notify admin of cron failure
    if (process.env.RESEND_API_KEY) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "StorageAds <noreply@storageads.com>",
          to: process.env.ADMIN_EMAIL || "blake@storageads.com",
          subject: `[CRON FAILURE] review-solicitation`,
          html: `<p>The <strong>review-solicitation</strong> cron job failed:</p><pre>${message}</pre><p>Time: ${new Date().toISOString()}</p>`,
        }),
      }).catch((err) => {
        console.error("[cron:review-solicitation] Alert email failed:", err instanceof Error ? err.message : err);
      });
    }

    return NextResponse.json({ error: "Cron processing failed", message }, { status: 500 });
  }
}
