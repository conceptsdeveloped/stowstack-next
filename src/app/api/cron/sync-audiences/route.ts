import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    checked: 0,
    refreshed: 0,
    errors: [] as string[],
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
    `;

    for (const sync of syncs) {
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

    return NextResponse.json({ success: true, ...results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message, ...results },
      { status: 500 }
    );
  }
}
