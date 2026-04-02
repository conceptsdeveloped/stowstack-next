import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  v1CorsResponse,
  v1Json,
  v1Error,
  requireApiAuth,
  isErrorResponse,
  requireScope,
  requireOrgFacility,
} from "@/lib/v1-auth";
import { dispatchWebhook } from "@/lib/webhook";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS() {
  return v1CorsResponse();
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-facility-specials");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "units:read");
  if (scopeErr) return scopeErr;

  const facilityId = new URL(request.url).searchParams.get("facilityId");
  const facility = await requireOrgFacility(facilityId, orgId);
  if (facility instanceof Response) return facility;

  try {
    const specials = await db.$queryRaw`
      SELECT id, name, description, applies_to, discount_type, discount_value,
             min_lease_months, start_date, end_date, active, created_at
      FROM facility_pms_specials WHERE facility_id = ${facilityId}::uuid
      ORDER BY active DESC, created_at DESC
    `;
    return v1Json({ specials });
  } catch {
    return v1Error("Failed to fetch specials", 500);
  }
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-facility-specials");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "units:write");
  if (scopeErr) return scopeErr;

  const facilityId = new URL(request.url).searchParams.get("facilityId");
  const facility = await requireOrgFacility(facilityId, orgId);
  if (facility instanceof Response) return facility;

  const body = await request.json().catch(() => null);
  const {
    id,
    name,
    description,
    appliesTo,
    discountType,
    discountValue,
    minLeaseMonths,
    startDate,
    endDate,
    active,
  } = body || {};

  if (!name) return v1Error("name is required");

  try {
    let special: Record<string, unknown> | null;
    const isUpdate = !!id;

    if (isUpdate) {
      const rows = await db.$queryRaw<Record<string, unknown>[]>`
        UPDATE facility_pms_specials SET
          name = ${name}, description = ${description || null},
          applies_to = ${appliesTo || []}::text[], discount_type = ${discountType || "fixed"},
          discount_value = ${discountValue || null}, min_lease_months = ${minLeaseMonths || 1},
          start_date = ${startDate || null}::date, end_date = ${endDate || null}::date,
          active = ${active !== false}
        WHERE id = ${id}::uuid AND facility_id = ${facilityId}::uuid
        RETURNING *
      `;
      if (!rows.length) return v1Error("Special not found", 404);
      special = rows[0];
    } else {
      const rows = await db.$queryRaw<Record<string, unknown>[]>`
        INSERT INTO facility_pms_specials (facility_id, name, description, applies_to, discount_type, discount_value, min_lease_months, start_date, end_date, active)
        VALUES (${facilityId}::uuid, ${name}, ${description || null}, ${appliesTo || []}::text[], ${discountType || "fixed"},
                ${discountValue || null}, ${minLeaseMonths || 1}, ${startDate || null}::date, ${endDate || null}::date, ${active !== false})
        RETURNING *
      `;
      special = rows[0];
    }

    const event = isUpdate ? "special.updated" : "special.created";
    dispatchWebhook(orgId, event, { facilityId, special }).catch((err) => console.error("[webhook] Fire-and-forget failed:", err));

    return v1Json({ special });
  } catch {
    return v1Error("Failed to save special", 500);
  }
}
