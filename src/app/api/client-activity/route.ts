import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const CLIENT_VISIBLE_TYPES = [
  "lead_created",
  "lead_captured",
  "call_received",
  "walkin_logged",
  "report_sent",
  "onboarding_step",
  "campaign_added",
  "audit_generated",
  "audit_approved",
];

const TYPE_LABELS: Record<string, string> = {
  lead_created: "New lead submitted",
  lead_captured: "Lead captured from landing page",
  call_received: "Phone call received",
  walkin_logged: "Walk-in attribution logged",
  report_sent: "Performance report sent",
  onboarding_step: "Onboarding step completed",
  campaign_added: "Campaign data updated",
  audit_generated: "Facility audit generated",
  audit_approved: "Audit report sent",
};

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-activity");
  if (limited) return limited;

  const origin = getOrigin(req);

  try {
    const url = new URL(req.url);
    const accessCode = url.searchParams.get("accessCode");
    const email = url.searchParams.get("email");
    const facilityIdParam = url.searchParams.get("facilityId");
    const since = url.searchParams.get("since");
    const limitParam = url.searchParams.get("limit");

    let resolvedFacilityId = facilityIdParam;

    if (!resolvedFacilityId && accessCode && email) {
      const client = await db.clients.findFirst({
        where: {
          access_code: accessCode,
          email: { equals: email.trim(), mode: "insensitive" },
        },
        select: { facility_id: true },
      });
      if (!client) {
        return errorResponse("Unauthorized", 401, origin);
      }
      resolvedFacilityId = client.facility_id;
    }

    if (!resolvedFacilityId) {
      return errorResponse("Missing facility identifier", 400, origin);
    }

    const maxRows = Math.min(parseInt(limitParam || "30") || 30, 100);

    const where: Prisma.activity_logWhereInput = {
      facility_id: resolvedFacilityId,
      type: { in: CLIENT_VISIBLE_TYPES },
      ...(since ? { created_at: { gt: new Date(since) } } : {}),
    };

    const activities = await db.activity_log.findMany({
      where,
      select: {
        id: true,
        type: true,
        lead_name: true,
        facility_name: true,
        detail: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: maxRows,
    });

    const data = activities.map((a) => ({
      id: a.id,
      type: a.type,
      label: TYPE_LABELS[a.type] || a.type,
      detail: a.detail || "",
      leadName: a.lead_name || null,
      createdAt: a.created_at,
    }));

    return jsonResponse({ success: true, data }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
