import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
  verifyCsrfOrigin,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "org-facilities");
  if (limited) return limited;
  const origin = getOrigin(req);

  try {
    const isAdmin = isAdminRequest(req);
    const session = !isAdmin ? await getSession(req) : null;
    if (!isAdmin && !session) return errorResponse("Unauthorized", 401, origin);

    const url = new URL(req.url);
    const orgId = isAdmin
      ? (url.searchParams.get("orgId") || session?.user.organization_id)
      : session?.user.organization_id;
    if (!orgId) return errorResponse("Organization ID required", 400, origin);

    const facilities = await db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT f.*,
        (SELECT json_agg(json_build_object(
          'month', cc.month, 'spend', cc.spend, 'leads', cc.leads, 'cpl', cc.cpl,
          'moveIns', cc.move_ins, 'roas', cc.roas, 'occupancyDelta', cc.occupancy_delta
        ) ORDER BY cc.month)
        FROM clients c JOIN client_campaigns cc ON cc.client_id = c.id
        WHERE c.facility_id = f.id) as campaigns,
        (SELECT COUNT(*) FROM landing_pages lp WHERE lp.facility_id = f.id AND lp.status = 'published') as live_pages,
        (SELECT COUNT(*) FROM ad_variations av WHERE av.facility_id = f.id AND av.status = 'published') as live_ads
       FROM facilities f
       WHERE f.organization_id = ${orgId}::uuid
       ORDER BY f.name
    `;

    const totals = (facilities as Array<Record<string, unknown>>).reduce(
      (acc: { spend: number; leads: number; moveIns: number }, f) => {
        const campaigns = (f.campaigns as Array<Record<string, unknown>>) || [];
        campaigns.forEach((c) => {
          acc.spend += Number(c.spend) || 0;
          acc.leads += Number(c.leads) || 0;
          acc.moveIns += Number(c.moveIns) || 0;
        });
        return acc;
      },
      { spend: 0, leads: 0, moveIns: 0 }
    );

    return jsonResponse({ facilities, totals }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "org-facilities");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);

  try {
    const isAdmin = isAdminRequest(req);
    const session = !isAdmin ? await getSession(req) : null;
    if (!isAdmin && !session) return errorResponse("Unauthorized", 401, origin);

    const orgUser = session?.user || null;
    const url = new URL(req.url);
    const orgId = isAdmin
      ? (url.searchParams.get("orgId") || orgUser?.organization_id)
      : orgUser?.organization_id;
    if (!orgId) return errorResponse("Organization ID required", 400, origin);

    if (!isAdmin && orgUser?.role !== "org_admin") {
      return errorResponse("Forbidden", 403, origin);
    }

    const body = await req.json();
    const { facilityId } = body;
    if (!facilityId) return errorResponse("Facility ID required", 400, origin);

    const existing = await db.facilities.findUnique({ where: { id: facilityId }, select: { organization_id: true } });
    if (existing?.organization_id && existing.organization_id !== orgId) {
      return errorResponse("Facility belongs to another organization", 403, origin);
    }

    const org = await db.organizations.findUnique({
      where: { id: orgId },
      select: { facility_limit: true },
    });
    const currentCount = await db.facilities.count({ where: { organization_id: orgId } });

    if (currentCount >= (org?.facility_limit || 10)) {
      return errorResponse("Facility limit reached for your plan", 400, origin);
    }

    const facility = await db.facilities.update({
      where: { id: facilityId },
      data: { organization_id: orgId },
    });

    return jsonResponse({ facility }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "org-facilities");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);

  try {
    const isAdmin = isAdminRequest(req);
    const session = !isAdmin ? await getSession(req) : null;
    if (!isAdmin && !session) return errorResponse("Unauthorized", 401, origin);

    const orgUser = session?.user || null;
    const url = new URL(req.url);
    const orgId = isAdmin
      ? (url.searchParams.get("orgId") || orgUser?.organization_id)
      : orgUser?.organization_id;
    if (!orgId) return errorResponse("Organization ID required", 400, origin);

    if (!isAdmin && orgUser?.role !== "org_admin") {
      return errorResponse("Forbidden", 403, origin);
    }

    const body = await req.json();
    const { facilityId, action } = body;

    if (action === "remove" && facilityId) {
      await db.facilities.updateMany({
        where: { id: facilityId, organization_id: orgId },
        data: { organization_id: null },
      });
      return jsonResponse({ success: true }, 200, origin);
    }

    return errorResponse("Invalid action", 400, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
