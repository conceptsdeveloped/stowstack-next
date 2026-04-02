import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.WEBHOOK, "cron-sync-audiences");
  if (limited) return limited;
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const MAX_EXECUTION_TIME_MS = 45_000; // 45s (leave 15s buffer for 60s limit)
  const startTime = Date.now();

  const results = {
    checked: 0,
    refreshed: 0,
    errors: [] as string[],
    timedOut: false,
  };

  try {
    const syncs = await db.$queryRaw<
      {
        id: string;
        facility_id: string;
        audience_name: string;
        connection_id: string;
      }[]
    >`
      SELECT as2.*, pc.access_token, pc.account_id
      FROM audience_syncs as2
      JOIN platform_connections pc ON as2.connection_id = pc.id
      WHERE as2.status = 'ready'
      AND as2.audience_type = 'custom'
      AND (as2.last_synced_at IS NULL OR as2.last_synced_at < NOW() - INTERVAL '7 days')
      AND pc.status = 'connected'
      ORDER BY as2.id ASC
      LIMIT 20
    `;

    for (const sync of syncs) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        console.warn(`[CRON:sync-audiences] Time limit reached. Checked: ${results.checked}. Remaining will be picked up next run.`);
        results.timedOut = true;
        break;
      }
      results.checked++;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
          || (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000");
        const adminKey = process.env.ADMIN_SECRET;

        const refreshRes = await fetch(`${baseUrl}/api/audience-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey || "",
          },
          body: JSON.stringify({
            facilityId: sync.facility_id,
            action: "refresh",
            audienceSyncId: sync.id,
          }),
        });

        if (refreshRes.ok) {
          results.refreshed++;
        } else {
          const errData = await refreshRes.json().catch(() => ({}));
          results.errors.push(
            `${sync.audience_name}: ${errData.error || "refresh failed"}`
          );
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`${sync.audience_name}: ${message}`);
      }
    }

    console.log(`[CRON:sync-audiences] Complete. Checked: ${results.checked}, Refreshed: ${results.refreshed}, Errors: ${results.errors.length}`);

    return NextResponse.json({ success: true, ...results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message, ...results },
      { status: 500 }
    );
  }
}
