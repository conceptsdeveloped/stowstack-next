import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

/**
 * Lightweight signed-client directory for admin tooling (e.g. the billing
 * invoice authoring form, which needs a real client id to POST against
 * /api/client-invoices). Admin-key gated, read-only. Returns every signed
 * client, not just those with message threads (so a brand-new client can be
 * invoiced before they've ever messaged).
 */

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(
    req,
    RATE_LIMIT_TIERS.AUTHENTICATED,
    "admin-clients",
  );
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const rows = await db.clients.findMany({
      orderBy: [{ facility_name: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, facility_name: true },
      take: 500,
    });
    const clients = rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      facilityName: c.facility_name ?? null,
    }));
    return jsonResponse({ clients }, 200, origin);
  } catch {
    return errorResponse("Failed to list clients", 500, origin);
  }
}
