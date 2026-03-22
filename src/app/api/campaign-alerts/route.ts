import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";

interface CampaignData {
  month: string;
  spend: number;
  leads: number;
  cpl: number;
  moveIns: number;
  roas: number;
}

interface ClientData {
  facilityName: string;
  email: string;
  signedAt: string;
  campaigns?: CampaignData[];
}

interface Alert {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  metric: number;
  threshold?: number;
}

function getRedis(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN)
    return null;
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

function generateAlerts(client: ClientData, campaigns: CampaignData[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  if (!campaigns || campaigns.length === 0) {
    const signedAt = new Date(client.signedAt);
    const daysSinceSigned = Math.round(
      (now.getTime() - signedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceSigned > 14) {
      alerts.push({
        type: "no_campaigns",
        severity: "warning",
        title: "No campaigns launched",
        detail: `${client.facilityName} signed ${daysSinceSigned} days ago but has no campaign data yet.`,
        metric: daysSinceSigned,
      });
    }
    return alerts;
  }

  const latest = campaigns[campaigns.length - 1];
  const previous = campaigns.length >= 2 ? campaigns[campaigns.length - 2] : null;

  const avgCpl = campaigns.reduce((s, c) => s + c.cpl, 0) / campaigns.length;
  const avgRoas = campaigns.reduce((s, c) => s + c.roas, 0) / campaigns.length;
  const avgLeads = campaigns.reduce((s, c) => s + c.leads, 0) / campaigns.length;
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalMoveIns = campaigns.reduce((s, c) => s + c.moveIns, 0);

  // CPL Spike
  if (latest.cpl > avgCpl * 1.5 && latest.cpl > 15) {
    alerts.push({
      type: "cpl_spike",
      severity: latest.cpl > avgCpl * 2 ? "critical" : "warning",
      title: "CPL spike detected",
      detail: `Current CPL ($${latest.cpl.toFixed(2)}) is ${Math.round((latest.cpl / avgCpl - 1) * 100)}% above average ($${avgCpl.toFixed(2)}).`,
      metric: latest.cpl,
      threshold: avgCpl * 1.5,
    });
  }

  // ROAS Drop
  if (latest.roas < 2.0) {
    alerts.push({
      type: "roas_low",
      severity: latest.roas < 1.0 ? "critical" : "warning",
      title: "ROAS below target",
      detail: `Current ROAS (${latest.roas}x) is below the 2.0x minimum target.`,
      metric: latest.roas,
      threshold: 2.0,
    });
  }
  if (previous && previous.roas > 0 && latest.roas < previous.roas * 0.7) {
    alerts.push({
      type: "roas_drop",
      severity: "warning",
      title: "ROAS dropped significantly",
      detail: `ROAS fell from ${previous.roas}x to ${latest.roas}x (${Math.round((1 - latest.roas / previous.roas) * 100)}% drop).`,
      metric: latest.roas,
      threshold: previous.roas * 0.7,
    });
  }

  // Lead Drought
  if (latest.leads === 0 && latest.spend > 0) {
    alerts.push({
      type: "lead_drought",
      severity: "critical",
      title: "Zero leads this period",
      detail: `$${latest.spend.toLocaleString()} was spent but generated zero leads. Check targeting and creative.`,
      metric: 0,
      threshold: 1,
    });
  } else if (latest.leads < avgLeads * 0.5 && avgLeads > 2) {
    alerts.push({
      type: "low_leads",
      severity: "warning",
      title: "Lead volume down",
      detail: `Only ${latest.leads} leads this period vs. ${Math.round(avgLeads)} average. Volume is ${Math.round((1 - latest.leads / avgLeads) * 100)}% below normal.`,
      metric: latest.leads,
      threshold: Math.round(avgLeads * 0.5),
    });
  }

  // Budget Efficiency
  if (latest.spend > 2000 && latest.moveIns === 0 && latest.leads > 0) {
    alerts.push({
      type: "no_moveins",
      severity: "warning",
      title: "No move-ins despite spend",
      detail: `$${latest.spend.toLocaleString()} spent with ${latest.leads} leads but zero move-ins. Review lead quality and follow-up.`,
      metric: 0,
      threshold: 1,
    });
  }

  // Spend Pacing
  if (previous && previous.spend > 0) {
    const spendChange = (latest.spend - previous.spend) / previous.spend;
    if (spendChange > 0.5) {
      alerts.push({
        type: "spend_spike",
        severity: "info",
        title: "Spend increased significantly",
        detail: `Spend went from $${previous.spend.toLocaleString()} to $${latest.spend.toLocaleString()} (+${Math.round(spendChange * 100)}%).`,
        metric: latest.spend,
        threshold: previous.spend * 1.5,
      });
    } else if (spendChange < -0.4 && latest.spend > 0) {
      alerts.push({
        type: "spend_drop",
        severity: "warning",
        title: "Spend dropped significantly",
        detail: `Spend fell from $${previous.spend.toLocaleString()} to $${latest.spend.toLocaleString()} (-${Math.round(Math.abs(spendChange) * 100)}%). Check campaign delivery.`,
        metric: latest.spend,
        threshold: previous.spend * 0.6,
      });
    }
  }

  // Positive Milestones
  if (latest.roas >= 5.0) {
    alerts.push({
      type: "roas_excellent",
      severity: "info",
      title: "Exceptional ROAS",
      detail: `${latest.roas}x ROAS this period - outstanding performance.`,
      metric: latest.roas,
    });
  }
  if (totalMoveIns >= 10 && totalMoveIns % 10 === totalMoveIns) {
    alerts.push({
      type: "movein_milestone",
      severity: "info",
      title: `${totalMoveIns}+ total move-ins`,
      detail: `${client.facilityName} has generated ${totalMoveIns} move-ins across ${campaigns.length} months.`,
      metric: totalMoveIns,
    });
  }
  if (latest.cpl < avgCpl * 0.7 && campaigns.length >= 3) {
    alerts.push({
      type: "cpl_improved",
      severity: "info",
      title: "CPL significantly improved",
      detail: `Current CPL ($${latest.cpl.toFixed(2)}) is ${Math.round((1 - latest.cpl / avgCpl) * 100)}% below average ($${avgCpl.toFixed(2)}).`,
      metric: latest.cpl,
    });
  }

  void totalSpend;
  void avgRoas;

  return alerts;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const redis = getRedis();
  if (!redis) {
    return jsonResponse({ alerts: [], clientAlerts: {} }, 200, origin);
  }

  try {
    const clientKeys = await redis.keys("client:*");
    if (!clientKeys.length) {
      return jsonResponse({ alerts: [], clientAlerts: {} }, 200, origin);
    }

    const pipeline = redis.pipeline();
    clientKeys.forEach((k) => pipeline.get(k));
    const clientResults = await pipeline.exec();

    const allAlerts: Array<Alert & { accessCode: string; facilityName: string }> = [];
    const clientAlerts: Record<
      string,
      { facilityName: string; email: string; alerts: Alert[] }
    > = {};

    for (let i = 0; i < clientKeys.length; i++) {
      const raw = clientResults[i];
      if (!raw) continue;
      const client: ClientData =
        typeof raw === "string" ? JSON.parse(raw) : (raw as ClientData);
      const code = clientKeys[i].replace("client:", "");

      const campaigns = client.campaigns || [];
      const alerts = generateAlerts(client, campaigns);

      if (alerts.length > 0) {
        clientAlerts[code] = {
          facilityName: client.facilityName,
          email: client.email,
          alerts,
        };
        alerts.forEach((a) => {
          allAlerts.push({
            ...a,
            accessCode: code,
            facilityName: client.facilityName,
          });
        });
      }
    }

    const severityOrder: Record<string, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    allAlerts.sort(
      (a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
    );

    return jsonResponse(
      {
        alerts: allAlerts,
        clientAlerts,
        summary: {
          total: allAlerts.length,
          critical: allAlerts.filter((a) => a.severity === "critical").length,
          warning: allAlerts.filter((a) => a.severity === "warning").length,
          info: allAlerts.filter((a) => a.severity === "info").length,
        },
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Failed to generate alerts", 500, origin);
  }
}
