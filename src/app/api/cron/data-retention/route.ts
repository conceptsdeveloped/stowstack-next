import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const RETENTION_POLICIES = [
  {
    table: "activity_log",
    retentionDays: 90,
    dateField: "created_at",
  },
  {
    table: "api_usage_log",
    retentionDays: 30,
    dateField: "created_at",
  },
  {
    table: "betapad_notes",
    retentionDays: 90,
    dateField: "created_at",
  },
] as const;

const BATCH_SIZE = 1000;

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.WEBHOOK, "cron-data-retention");
  if (limited) return limited;
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Array<{ table: string; deleted: number; error?: string }> = [];
  let totalDeleted = 0;

  for (const policy of RETENTION_POLICIES) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    let tableDeleted = 0;

    try {
      // Delete in batches using a subquery to avoid long locks.
      // PostgreSQL does not support LIMIT directly in DELETE statements.
      let deletedInBatch = 0;

      do {
        deletedInBatch = await db.$executeRawUnsafe(
          `DELETE FROM "${policy.table}"
           WHERE id IN (
             SELECT id FROM "${policy.table}"
             WHERE "${policy.dateField}" < $1
             LIMIT ${BATCH_SIZE}
           )`,
          cutoffDate
        );
        tableDeleted += deletedInBatch;
      } while (deletedInBatch >= BATCH_SIZE);

      totalDeleted += tableDeleted;
      results.push({ table: policy.table, deleted: tableDeleted });

      console.log(
        `[data-retention] ${policy.table}: deleted ${tableDeleted} rows older than ${policy.retentionDays} days`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[data-retention] ${policy.table} error:`, message);
      results.push({ table: policy.table, deleted: tableDeleted, error: message });
    }
  }

  // Log cron completion
  db.activity_log
    .create({
      data: {
        type: "cron_completed",
        detail: `[data-retention] Deleted ${totalDeleted} total expired rows`,
        meta: { totalDeleted, results },
      },
    })
    .catch((err) => console.error("[activity_log] Cron log failed:", err));

  const hasErrors = results.some((r) => r.error);

  if (hasErrors && process.env.RESEND_API_KEY) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "StorageAds <noreply@storageads.com>",
        to: process.env.ADMIN_EMAIL || "blake@storageads.com",
        subject: "[CRON PARTIAL FAILURE] data-retention",
        html: `<p>The <strong>data-retention</strong> cron job had errors:</p><pre>${JSON.stringify(results, null, 2)}</pre><p>Time: ${new Date().toISOString()}</p>`,
      }),
    }).catch((err) => {
      console.error(
        "[cron:data-retention] Alert email failed:",
        err instanceof Error ? err.message : err
      );
    });
  }

  return NextResponse.json({
    success: !hasErrors,
    totalDeleted,
    results,
  });
}
