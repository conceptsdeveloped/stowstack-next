import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
  captureRouteError,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/**
 * Read-only founder digest: top-line funnel counts for the daily briefing
 * (see docs/dispatch-playbooks.md PB-6). Aggregate counts only, no PII.
 * Auth: X-Admin-Key (shared ADMIN_SECRET or a scoped sa_adm_ key).
 */
export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(
    req,
    RATE_LIMIT_TIERS.AUTHENTICATED,
    "admin-founder-digest"
  );
  if (limited) return limited;

  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      auditLeads24h,
      auditLeads7d,
      auditConverted7d,
      signedClients24h,
      signedClients7d,
      leadStatusGroups,
    ] = await Promise.all([
      db.partial_leads.count({
        where: { deleted_at: null, created_at: { gte: since24h } },
      }),
      db.partial_leads.count({
        where: { deleted_at: null, created_at: { gte: since7d } },
      }),
      db.partial_leads.count({
        where: {
          deleted_at: null,
          converted: true,
          converted_at: { gte: since7d },
        },
      }),
      db.clients.count({
        where: { deleted_at: null, created_at: { gte: since24h } },
      }),
      db.clients.count({
        where: { deleted_at: null, created_at: { gte: since7d } },
      }),
      db.partial_leads.groupBy({
        by: ["lead_status"],
        where: { deleted_at: null, created_at: { gte: since7d } },
        _count: { _all: true },
      }),
    ]);

    const leadStatus7d: Record<string, number> = {};
    for (const group of leadStatusGroups) {
      leadStatus7d[group.lead_status ?? "unknown"] = group._count._all;
    }

    return jsonResponse(
      {
        generatedAt: now.toISOString(),
        windows: { day: since24h.toISOString(), week: since7d.toISOString() },
        auditFunnel: {
          newLeads24h: auditLeads24h,
          newLeads7d: auditLeads7d,
          converted7d: auditConverted7d,
        },
        signedClients: {
          new24h: signedClients24h,
          new7d: signedClients7d,
        },
        leadStatus7d,
      },
      200,
      origin
    );
  } catch (err) {
    captureRouteError(err, "admin-founder-digest");
    return errorResponse("Failed to build founder digest", 500, origin);
  }
}
