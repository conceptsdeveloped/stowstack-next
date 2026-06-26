import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { ECRI_STATUSES, normalizeStatus, type EcriStatus } from "@/lib/ecri";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

/**
 * Record where a tenant sits in the ECRI lifecycle (pending → scheduled → sent
 * → done). Backed by a single `upsell_opportunities` row of type "ecri" per
 * tenant — no schema change. Admin-key requests are CSRF-exempt, so this POST
 * passes the proxy gate on the header exemption.
 */
export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(
    request,
    RATE_LIMIT_TIERS.AUTHENTICATED,
    "ecri-track",
  );
  if (limited) return limited;
  const origin = getOrigin(request);
  const denied = await requireAdminKey(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const tenantId = typeof body.tenantId === "string" ? body.tenantId : "";
  const status = typeof body.status === "string" ? body.status : "";

  if (!tenantId) return errorResponse("tenantId required", 400, origin);
  if (!(ECRI_STATUSES as string[]).includes(status)) {
    return errorResponse(
      `status must be one of: ${ECRI_STATUSES.join(", ")}`,
      400,
      origin,
    );
  }
  const nextStatus = status as EcriStatus;

  try {
    const tenant = await db.tenants.findFirst({
      where: { id: tenantId, deleted_at: null },
      select: { id: true, facility_id: true, monthly_rate: true },
    });
    if (!tenant) return errorResponse("Tenant not found", 404, origin);

    const currentRate =
      body.currentRate !== undefined
        ? Number(body.currentRate)
        : Number(tenant.monthly_rate);
    const newRate =
      body.newRate !== undefined ? Number(body.newRate) : undefined;
    const monthlyUplift =
      body.monthlyUplift !== undefined
        ? Number(body.monthlyUplift)
        : newRate !== undefined && Number.isFinite(currentRate)
          ? Math.max(0, newRate - currentRate)
          : undefined;

    const markSent = nextStatus === "sent" || nextStatus === "done";

    const existing = await db.upsell_opportunities.findFirst({
      where: { tenant_id: tenantId, type: "ecri" },
      orderBy: { created_at: "desc" },
    });

    let record;
    if (existing) {
      record = await db.upsell_opportunities.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          ...(Number.isFinite(currentRate) ? { current_value: currentRate } : {}),
          ...(newRate !== undefined && Number.isFinite(newRate)
            ? { proposed_value: newRate }
            : {}),
          ...(monthlyUplift !== undefined && Number.isFinite(monthlyUplift)
            ? { monthly_uplift: monthlyUplift }
            : {}),
          ...(markSent && !existing.sent_at ? { sent_at: new Date() } : {}),
        },
      });
    } else {
      record = await db.upsell_opportunities.create({
        data: {
          tenant_id: tenantId,
          facility_id: tenant.facility_id,
          type: "ecri",
          title: "ECRI rate increase",
          description: "Existing-customer rate increase opportunity",
          status: nextStatus,
          current_value: Number.isFinite(currentRate) ? currentRate : 0,
          proposed_value:
            newRate !== undefined && Number.isFinite(newRate) ? newRate : 0,
          monthly_uplift:
            monthlyUplift !== undefined && Number.isFinite(monthlyUplift)
              ? monthlyUplift
              : 0,
          outreach_method: "letter",
          sent_at: markSent ? new Date() : null,
        },
      });
    }

    return jsonResponse(
      {
        ok: true,
        tenantId,
        status: normalizeStatus(record.status),
        sentAt: record.sent_at ? record.sent_at.toISOString() : null,
      },
      200,
      origin,
    );
  } catch (err) {
    console.error("[ecri-track] failed", err);
    return errorResponse("Failed to update ECRI status", 500, origin);
  }
}
