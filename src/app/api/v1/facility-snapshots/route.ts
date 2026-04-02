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
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-facility-snapshots");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "facilities:read");
  if (scopeErr) return scopeErr;

  const url = new URL(request.url);
  const facilityId = url.searchParams.get("facilityId");
  const facility = await requireOrgFacility(facilityId, orgId);
  if (facility instanceof Response) return facility;

  const limit = Math.min(
    90,
    Math.max(1, parseInt(url.searchParams.get("limit") || "30"))
  );

  try {
    const snapshots = await db.$queryRaw`
      SELECT id, snapshot_date, total_units, occupied_units, occupancy_pct,
             total_sqft, occupied_sqft, delinquency_pct,
             move_ins_mtd, move_outs_mtd, notes, created_at
      FROM facility_pms_snapshots
      WHERE facility_id = ${facilityId}::uuid
      ORDER BY snapshot_date DESC
      LIMIT ${limit}
    `;
    return v1Json({ snapshots });
  } catch {
    return v1Error("Failed to fetch snapshots", 500);
  }
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-facility-snapshots");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "facilities:write");
  if (scopeErr) return scopeErr;

  const facilityId = new URL(request.url).searchParams.get("facilityId");
  const facility = await requireOrgFacility(facilityId, orgId);
  if (facility instanceof Response) return facility;

  const body = await request.json().catch(() => null);
  const {
    snapshotDate,
    totalUnits,
    occupiedUnits,
    occupancyPct,
    totalSqft,
    occupiedSqft,
    delinquencyPct,
    moveInsMtd,
    moveOutsMtd,
    notes,
  } = body || {};

  try {
    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      INSERT INTO facility_pms_snapshots
        (facility_id, snapshot_date, total_units, occupied_units, occupancy_pct,
         total_sqft, occupied_sqft, delinquency_pct, move_ins_mtd, move_outs_mtd, notes)
      VALUES (${facilityId}::uuid, COALESCE(${snapshotDate || null}::date, CURRENT_DATE),
              ${totalUnits || null}, ${occupiedUnits || null}, ${occupancyPct || null},
              ${totalSqft || null}, ${occupiedSqft || null}, ${delinquencyPct || null},
              ${moveInsMtd || 0}, ${moveOutsMtd || 0}, ${notes || null})
      ON CONFLICT (facility_id, snapshot_date) DO UPDATE SET
        total_units = EXCLUDED.total_units,
        occupied_units = EXCLUDED.occupied_units,
        occupancy_pct = EXCLUDED.occupancy_pct,
        total_sqft = EXCLUDED.total_sqft,
        occupied_sqft = EXCLUDED.occupied_sqft,
        delinquency_pct = EXCLUDED.delinquency_pct,
        move_ins_mtd = EXCLUDED.move_ins_mtd,
        move_outs_mtd = EXCLUDED.move_outs_mtd,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id, snapshot_date, total_units, occupied_units, occupancy_pct,
                total_sqft, occupied_sqft, delinquency_pct,
                move_ins_mtd, move_outs_mtd, notes, created_at
    `;

    db.$executeRaw`UPDATE facilities SET pms_uploaded = TRUE, updated_at = NOW() WHERE id = ${facilityId}::uuid`.catch(
      () => {}
    );

    return v1Json({ snapshot: rows[0] });
  } catch {
    return v1Error("Failed to save snapshot", 500);
  }
}
