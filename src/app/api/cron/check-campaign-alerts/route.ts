import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 60;

function esc(str: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface CampaignRow {
  cpl: string | number;
  roas: string | number;
  leads: string | number;
  spend: string | number;
  move_ins: string | number;
}

interface Alert {
  type: string;
  severity: string;
  title: string;
  detail: string;
  metric: number | null;
  threshold?: number | null;
}

function generateAlerts(
  client: Record<string, unknown>,
  campaigns: CampaignRow[]
): Alert[] {
  const alerts: Alert[] = [];

  if (!campaigns || campaigns.length === 0) {
    const signedAt = new Date(
      (client.signed_at as string) || (client.created_at as string)
    );
    const daysSinceSigned = Math.round(
      (Date.now() - signedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceSigned > 14) {
      alerts.push({
        type: "no_campaigns",
        severity: "warning",
        title: "No campaigns launched",
        detail: `${client.facility_name} signed ${daysSinceSigned} days ago but has no campaign data yet.`,
        metric: daysSinceSigned,
      });
    }
    return alerts;
  }

  const latest = campaigns[campaigns.length - 1];
  const previous =
    campaigns.length >= 2 ? campaigns[campaigns.length - 2] : null;
  const avgCpl =
    campaigns.reduce((s, c) => s + Number(c.cpl || 0), 0) /
    campaigns.length;

  if (Number(latest.cpl) > avgCpl * 1.5 && Number(latest.cpl) > 15) {
    alerts.push({
      type: "cpl_spike",
      severity: Number(latest.cpl) > avgCpl * 2 ? "critical" : "warning",
      title: "CPL spike detected",
      detail: `Current CPL ($${Number(latest.cpl).toFixed(0)}) is ${Math.round((Number(latest.cpl) / avgCpl - 1) * 100)}% above average ($${avgCpl.toFixed(0)}).`,
      metric: Number(latest.cpl),
      threshold: avgCpl * 1.5,
    });
  }

  if (Number(latest.roas) < 2.0 && Number(latest.roas) > 0) {
    alerts.push({
      type: "roas_drop",
      severity: Number(latest.roas) < 1.0 ? "critical" : "warning",
      title: "ROAS below target",
      detail: `Current ROAS (${Number(latest.roas).toFixed(1)}x) is below the 2.0x target.`,
      metric: Number(latest.roas),
      threshold: 2.0,
    });
  }

  if (Number(latest.leads) === 0 && Number(latest.spend) > 0) {
    alerts.push({
      type: "lead_drought",
      severity: "critical",
      title: "Zero leads with active spend",
      detail: `$${Number(latest.spend).toLocaleString()} spent with zero leads this period.`,
      metric: 0,
    });
  }

  if (
    previous &&
    Number(previous.move_ins) > 0 &&
    Number(latest.move_ins) < Number(previous.move_ins) * 0.5
  ) {
    alerts.push({
      type: "movein_drop",
      severity: "warning",
      title: "Move-in volume dropped",
      detail: `Move-ins dropped from ${previous.move_ins} to ${latest.move_ins} (${Math.round((1 - Number(latest.move_ins) / Number(previous.move_ins)) * 100)}% decline).`,
      metric: Number(latest.move_ins),
      threshold: Number(previous.move_ins) * 0.5,
    });
  }

  if (Number(latest.roas) >= 5.0) {
    alerts.push({
      type: "milestone_roas",
      severity: "info",
      title: "ROAS milestone reached",
      detail: `${Number(latest.roas).toFixed(1)}x return on ad spend. The system is compounding.`,
      metric: Number(latest.roas),
    });
  }

  return alerts;
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.WEBHOOK, "cron-check-campaign-alerts");
  if (limited) return limited;
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const BATCH_SIZE = 20;
  const MAX_EXECUTION_TIME_MS = 45_000; // 45s (leave 15s buffer for 60s limit)
  const startTime = Date.now();

  const results = {
    checked: 0,
    alertsCreated: 0,
    emailsSent: 0,
    errors: [] as string[],
    timedOut: false,
  };

  try {
    let cursor: string | undefined = undefined;

    while (true) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        console.warn(`[CRON:check-campaign-alerts] Time limit reached. Checked: ${results.checked}. Remaining will be picked up next run.`);
        results.timedOut = true;
        break;
      }

      let clients: Record<string, unknown>[];
      if (cursor) {
        clients = await db.$queryRaw<Record<string, unknown>[]>`
            SELECT c.*, f.name AS fac_name, f.id AS fac_id
            FROM clients c
            JOIN facilities f ON c.facility_id = f.id
            WHERE c.id > ${cursor}::uuid
            ORDER BY c.id ASC
            LIMIT ${BATCH_SIZE}
          `;
      } else {
        clients = await db.$queryRaw<Record<string, unknown>[]>`
            SELECT c.*, f.name AS fac_name, f.id AS fac_id
            FROM clients c
            JOIN facilities f ON c.facility_id = f.id
            ORDER BY c.id ASC
            LIMIT ${BATCH_SIZE}
          `;
      }

      if (clients.length === 0) break;

    for (const client of clients) {
      try {
        results.checked++;

        const campaigns = await db.$queryRaw<CampaignRow[]>`
          SELECT * FROM client_campaigns WHERE client_id = ${client.id}::uuid ORDER BY month ASC
        `;

        const alerts = generateAlerts(client, campaigns);

        for (const alert of alerts) {
          const existing = await db.$queryRaw<{ id: string }[]>`
            SELECT id FROM alert_history
            WHERE client_id = ${client.id}::uuid AND alert_type = ${alert.type} AND created_at > NOW() - INTERVAL '24 hours'
          `;
          if (existing.length) continue;

          await db.$executeRaw`
            INSERT INTO alert_history (client_id, facility_id, alert_type, severity, title, detail, metric, threshold)
            VALUES (${client.id}::uuid, ${client.fac_id}::uuid, ${alert.type}, ${alert.severity}, ${alert.title}, ${alert.detail}, ${alert.metric}, ${alert.threshold || null})
          `;
          results.alertsCreated++;

          if (alert.severity === "critical") {
            const apiKey = process.env.RESEND_API_KEY;
            if (apiKey) {
              const recipients = (
                process.env.AUDIT_NOTIFICATION_EMAILS ||
                "blake@storageads.com"
              )
                .split(",")
                .map((e) => e.trim());

              fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  from: "StorageAds <alerts@storageads.com>",
                  to: recipients,
                  subject: `${alert.title} — ${client.fac_name || client.facility_name}`,
                  html: `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:16px;">
    <h2 style="margin:0 0 8px;color:#dc2626;font-size:16px;">${esc(alert.title)}</h2>
    <p style="margin:0;color:#7f1d1d;font-size:14px;">${esc(alert.detail)}</p>
  </div>
  <p style="color:#666;font-size:13px;">Facility: ${esc(String(client.fac_name || client.facility_name))}</p>
  <a href="https://storageads.com/admin" style="display:inline-block;padding:10px 20px;background:#B58B3F;color:#faf9f5;text-decoration:none;border-radius:6px;font-size:13px;margin-top:12px;">View in Dashboard</a>
</div>`,
                }),
              }).catch((err) => console.error("[email] Fire-and-forget failed:", err));

              results.emailsSent++;
            }
          }
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        results.errors.push(
          `${client.email}: ${message}`
        );
      }
    }

      cursor = clients[clients.length - 1].id as string;
      if (clients.length < BATCH_SIZE) break;
    }

    console.log(`[CRON:check-campaign-alerts] Complete. Checked: ${results.checked}, Alerts: ${results.alertsCreated}, Emails: ${results.emailsSent}, Errors: ${results.errors.length}`);
    if (results.errors.length > 0) {
      console.error(`[CRON:check-campaign-alerts] Failures:`, JSON.stringify(results.errors));
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
