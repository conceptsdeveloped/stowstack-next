import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.WEBHOOK, "cron-weekly-digest");
  if (limited) return limited;
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const BATCH_SIZE = 20;
  const MAX_EXECUTION_TIME_MS = 45_000; // 45s (leave 15s buffer for 60s limit)
  const startTime = Date.now();

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let sent = 0;
    let processed = 0;
    let timedOut = false;
    let cursor: string | undefined = undefined;

    while (true) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        console.warn(`[CRON:weekly-digest] Time limit reached. Processed: ${processed}, Sent: ${sent}. Remaining will be picked up next run.`);
        timedOut = true;
        break;
      }

      const findArgs: Parameters<typeof db.clients.findMany>[0] = {
        select: {
          id: true,
          email: true,
          name: true,
          facility_id: true,
          facility_name: true,
        },
        take: BATCH_SIZE,
        orderBy: { id: "asc" as const },
      };
      if (cursor) {
        findArgs.skip = 1;
        findArgs.cursor = { id: cursor };
      }
      const clients = await db.clients.findMany(findArgs);

      if (!clients.length) break;

    for (const client of clients) {
      try {
        processed++;
        // Pull week's KPIs
        const [spendData, leadCount, callCount] = await Promise.all([
          db.campaign_spend.aggregate({
            where: {
              facility_id: client.facility_id,
              date: { gte: weekAgo, lte: now },
            },
            _sum: { spend: true },
          }),
          db.partial_leads.count({
            where: {
              facility_id: client.facility_id,
              created_at: { gte: weekAgo },
            },
          }),
          db.call_logs.count({
            where: {
              facility_id: client.facility_id,
              started_at: { gte: weekAgo },
              status: "completed",
              duration: { gte: 30 },
            },
          }),
        ]);

        const totalSpend = Number(spendData._sum?.spend || 0);

        // Skip if no activity this week
        if (totalSpend === 0 && leadCount === 0 && callCount === 0) continue;

        const portalUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storageads.com";

        if (!process.env.RESEND_API_KEY) continue;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "StorageAds <reports@storageads.com>",
            to: client.email,
            subject: `Weekly Update: ${client.facility_name || "Your Facility"}`,
            html: `
              <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto; color: #141413;">
                <div style="background: linear-gradient(135deg, #B58B3F, #9E7A36); padding: 20px 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: #faf9f5; margin: 0; font-size: 18px;">Weekly Performance Update</h1>
                  <p style="color: rgba(250,249,245,0.8); margin: 6px 0 0; font-size: 13px;">${client.facility_name || "Your Facility"}</p>
                </div>
                <div style="padding: 24px; border: 1px solid #e8e6dc; border-top: 0; border-radius: 0 0 12px 12px; background: #ffffff;">
                  <p style="color: #6a6560; font-size: 14px; margin: 0 0 16px;">Hi ${client.name || "there"}, here's your week at a glance:</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr>
                      <td style="padding: 12px; background: #faf9f5; border-radius: 8px 0 0 0; text-align: center; border-right: 1px solid #e8e6dc;">
                        <div style="font-size: 22px; font-weight: bold; color: #B58B3F;">$${totalSpend.toFixed(0)}</div>
                        <div style="font-size: 11px; color: #6a6560; margin-top: 4px;">Ad Spend</div>
                      </td>
                      <td style="padding: 12px; background: #faf9f5; text-align: center; border-right: 1px solid #e8e6dc;">
                        <div style="font-size: 22px; font-weight: bold; color: #B58B3F;">${leadCount}</div>
                        <div style="font-size: 11px; color: #6a6560; margin-top: 4px;">New Leads</div>
                      </td>
                      <td style="padding: 12px; background: #faf9f5; border-radius: 0 8px 0 0; text-align: center;">
                        <div style="font-size: 22px; font-weight: bold; color: #B58B3F;">${callCount}</div>
                        <div style="font-size: 11px; color: #6a6560; margin-top: 4px;">Qualified Calls</div>
                      </td>
                    </tr>
                  </table>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${portalUrl}/portal" style="display: inline-block; background: #B58B3F; color: #faf9f5; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                      View Full Dashboard
                    </a>
                  </div>
                  <p style="color: #b0aea5; font-size: 11px; text-align: center; margin-top: 16px;">
                    Sent weekly by StorageAds. Questions? Reply to this email.
                  </p>
                </div>
              </div>
            `,
          }),
        });
        sent++;
      } catch {
        // Skip failed client, continue
      }
    }

      cursor = clients[clients.length - 1].id;
      if (clients.length < BATCH_SIZE) break;
    }

    console.log(`[CRON:weekly-digest] Complete. Processed: ${processed}, Sent: ${sent}${timedOut ? " (timed out)" : ""}`);

    // Log cron completion
    db.activity_log.create({
      data: {
        type: "cron_completed",
        detail: `[weekly-digest] Processed: ${processed}, Sent: ${sent}, TimedOut: ${timedOut}`,
        meta: { processed, sent, timedOut },
      },
    }).catch((err) => console.error("[activity_log] Cron log failed:", err));

    return NextResponse.json({ success: true, sent, processed, timedOut });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[CRON:weekly-digest] Fatal error:`, err);

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
          subject: `[CRON FAILURE] weekly-digest`,
          html: `<p>The <strong>weekly-digest</strong> cron job failed:</p><pre>${message}</pre><p>Time: ${new Date().toISOString()}</p>`,
        }),
      }).catch((err) => { console.error("[fire-and-forget error]", err instanceof Error ? err.message : err); });
    }

    return NextResponse.json({ error: "Cron processing failed", message }, { status: 500 });
  }
}
