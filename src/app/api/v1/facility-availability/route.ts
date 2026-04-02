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
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS() {
  return v1CorsResponse();
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-facility-availability");
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
    const [units, specials] = await Promise.all([
      db.$queryRaw<Record<string, unknown>[]>`
        SELECT unit_type, size_label, sqft, features, vacant_count AS available_count,
               street_rate, web_rate
        FROM facility_pms_units
        WHERE facility_id = ${facilityId}::uuid AND vacant_count > 0
        ORDER BY unit_type
      `,
      db.$queryRaw<Record<string, unknown>[]>`
        SELECT id, name, description, applies_to, discount_type, discount_value,
               min_lease_months, start_date, end_date
        FROM facility_pms_specials
        WHERE facility_id = ${facilityId}::uuid AND active = TRUE
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        ORDER BY name
      `,
    ]);

    const availability = units.map((unit) => ({
      ...unit,
      specials: specials
        .filter((s) => {
          const appliesTo = s.applies_to as string[] | null;
          return (
            !appliesTo?.length || appliesTo.includes(unit.unit_type as string)
          );
        })
        .map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          discountType: s.discount_type,
          discountValue: s.discount_value,
          minLeaseMonths: s.min_lease_months,
        })),
    }));

    return v1Json({ availability });
  } catch {
    return v1Error("Failed to fetch availability", 500);
  }
}
