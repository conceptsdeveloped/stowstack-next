import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 30;

/**
 * Hourly cron: finds facilities stuck at diagnostic_submitted with no
 * associated shared_audit_slug for > 10 minutes, and retriggers audit
 * generation. Catches fire-and-forget failures from diagnostic-intake.
 */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.WEBHOOK, "cron-retry-diagnostic-audits");
  if (limited) return limited;
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!adminSecret || !anthropicKey) {
    return NextResponse.json({ skipped: true, reason: "Missing ADMIN_SECRET or ANTHROPIC_API_KEY" });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || "http://localhost:3000";

  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Find stuck submissions: diagnostic_submitted, no audit slug, older than 10 min
    const stuck = await db.facilities.findMany({
      where: {
        pipeline_status: "diagnostic_submitted",
        shared_audit_slug: null,
        created_at: { lt: tenMinutesAgo },
      },
      select: {
        id: true,
        name: true,
        contact_email: true,
        contact_name: true,
        contact_phone: true,
        website: true,
        location: true,
        notes: true,
      },
      take: 5, // Process max 5 per run to avoid overwhelming the API
    });

    if (stuck.length === 0) {
      return NextResponse.json({ retried: 0, message: "No stuck diagnostics" });
    }

    let retried = 0;

    for (const facility of stuck) {
      try {
        // Parse pre-mapped diagnosticJson from notes (stored at intake time)
        let diagnosticJson = null;
        if (facility.notes) {
          try {
            const parsed = JSON.parse(facility.notes);
            diagnosticJson = parsed.diagnosticJson || null;
          } catch {
            // Notes not JSON — skip this facility
          }
        }

        if (!diagnosticJson) {
          console.error(`[retry-diagnostic-audits] No diagnosticJson in notes for facility ${facility.id}, skipping`);
          continue;
        }

        const res = await fetch(`${appUrl}/api/audit-generate-diagnostic`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminSecret,
          },
          body: JSON.stringify({
            diagnosticJson,
            facilityId: facility.id,
          }),
        });

        if (!res.ok) {
          console.error(`[retry-diagnostic-audits] Audit generation returned ${res.status} for facility ${facility.id}`);
        } else {
          retried++;
        }
      } catch (err) {
        console.error(`[retry-diagnostic-audits] Failed to retry facility ${facility.id}:`, err);
      }
    }

    // Log activity
    db.activity_log.create({
      data: {
        type: "cron_completed",
        detail: `[retry-diagnostic-audits] Found ${stuck.length} stuck, retried ${retried}`,
        meta: { stuck: stuck.length, retried },
      },
    }).catch((err) => console.error("[activity_log] Cron log failed:", err));

    return NextResponse.json({ retried, total_stuck: stuck.length });
  } catch (e) {
    console.error("[retry-diagnostic-audits] Cron error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
