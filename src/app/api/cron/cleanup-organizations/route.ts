import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.WEBHOOK, "cron-cleanup-organizations");
  if (limited) return limited;
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find orgs past their scheduled deletion date
    const orgs = await db.organizations.findMany({
      where: {
        status: "pending_deletion",
        scheduled_deletion_at: { lt: new Date() },
      },
      select: {
        id: true,
        name: true,
        stripe_subscription_id: true,
      },
    });

    if (orgs.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    let deleted = 0;

    for (const org of orgs) {
      try {
        // Cancel Stripe subscription if active
        if (org.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
          try {
            await fetch(
              `https://api.stripe.com/v1/subscriptions/${org.stripe_subscription_id}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                },
              },
            );
          } catch (err) {
            console.error(`[cleanup-orgs] Stripe cancel failed for ${org.id}:`, err);
          }
        }

        // Nullify partial_leads FK (no cascade on this relation)
        await db.$executeRaw`
          UPDATE partial_leads SET facility_id = NULL
          WHERE facility_id IN (SELECT id FROM facilities WHERE organization_id = ${org.id}::uuid)
        `;

        // Delete facilities (no cascade from organizations, but child tables cascade from facilities)
        await db.$executeRaw`
          DELETE FROM facilities WHERE organization_id = ${org.id}::uuid
        `;

        // Delete the organization (cascades to org_users, sessions, api_keys,
        // notifications, audit_log, webhooks, rev_share_payouts, rev_share_referrals)
        await db.organizations.delete({ where: { id: org.id } });

        deleted++;
      } catch (err) {
        console.error(`[cleanup-orgs] Failed to delete org ${org.id}:`, err);
      }
    }

    // Log cron completion
    db.activity_log.create({
      data: {
        type: "cron_completed",
        detail: `[cleanup-organizations] Deleted: ${deleted} organizations`,
        meta: { deleted, attempted: orgs.length },
      },
    }).catch((err) => console.error("[activity_log] Cron log failed:", err));

    return NextResponse.json({ success: true, deleted, attempted: orgs.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[CRON:cleanup-organizations] Fatal error:`, err);

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
          subject: `[CRON FAILURE] cleanup-organizations`,
          html: `<p>The <strong>cleanup-organizations</strong> cron job failed:</p><pre>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre><p>Time: ${new Date().toISOString()}</p>`,
        }),
      }).catch((err) => console.error("[email] Cron failure notification failed:", err));
    }

    return NextResponse.json({ error: "Cron processing failed", message }, { status: 500 });
  }
}
