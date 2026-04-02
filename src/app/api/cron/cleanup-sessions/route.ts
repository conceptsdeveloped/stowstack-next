import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.WEBHOOK, "cron-cleanup-sessions");
  if (limited) return limited;
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db.$executeRaw`DELETE FROM sessions WHERE expires_at < NOW()`;

    // Log cron completion
    db.activity_log.create({
      data: {
        type: "cron_completed",
        detail: `[cleanup-sessions] Deleted: ${result} expired sessions`,
        meta: { deleted: result },
      },
    }).catch((err) => console.error("[activity_log] Cron log failed:", err));

    return NextResponse.json({ success: true, deleted: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[CRON:cleanup-sessions] Fatal error:`, err);

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
          subject: `[CRON FAILURE] cleanup-sessions`,
          html: `<p>The <strong>cleanup-sessions</strong> cron job failed:</p><pre>${message}</pre><p>Time: ${new Date().toISOString()}</p>`,
        }),
      }).catch((err) => {
        console.error("[cron:cleanup-sessions] Alert email failed:", err instanceof Error ? err.message : err);
      });
    }

    // Retry: Vercel cron will re-invoke on next schedule.
    // Items not processed in this run will be picked up by the cursor-based pagination.
    console.warn(`[CRON:cleanup-sessions] Will retry remaining items on next scheduled run.`);

    return NextResponse.json({ error: "Cron processing failed", message }, { status: 500 });
  }
}
