import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, requireAdminKey, safeCompare } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { isValidUuid } from "@/lib/validation";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "facility-pms");
  if (limited) return limited;
  const origin = getOrigin(req);

  // Accept either admin key or client Bearer token (for portal access)
  const adminKey = req.headers.get("x-admin-key");
  const authHeader = req.headers.get("authorization");
  const isAdminAuth = adminKey && process.env.ADMIN_SECRET && safeCompare(adminKey, process.env.ADMIN_SECRET);

  let clientFacilityId: string | null = null;
  if (!isAdminAuth && authHeader?.startsWith("Bearer ")) {
    const accessCode = authHeader.slice(7);
    if (accessCode) {
      const client = await db.clients.findFirst({ where: { access_code: accessCode } });
      if (client) clientFacilityId = client.facility_id;
    }
  }

  const isClientAuth = !!clientFacilityId;
  if (!isAdminAuth && !isClientAuth) {
    return errorResponse("Unauthorized", 401, origin);
  }

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);
  if (!isValidUuid(facilityId)) return errorResponse("Invalid facilityId format", 400, origin);

  // Verify client owns the requested facility
  if (isClientAuth && clientFacilityId !== facilityId) {
    return errorResponse("Forbidden", 403, origin);
  }

  try {
    const [snapshot, units, specials, rateHistory] = await Promise.all([
      db.facility_pms_snapshots.findFirst({
        where: { facility_id: facilityId },
        orderBy: { snapshot_date: "desc" },
      }),
      db.facility_pms_units.findMany({
        where: { facility_id: facilityId },
        orderBy: { unit_type: "asc" },
      }),
      db.facility_pms_specials.findMany({
        where: { facility_id: facilityId },
        orderBy: [{ active: "desc" }, { created_at: "desc" }],
      }),
      db.facility_pms_rate_history.findMany({
        where: { facility_id: facilityId },
        orderBy: { effective_date: "desc" },
        take: 50,
      }),
    ]);

    return jsonResponse({ snapshot, units, specials, rateHistory }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch PMS data", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "facility-pms");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action } = body || {};

    if (action === "save_snapshot") {
      const {
        facility_id,
        snapshot_date,
        total_units,
        occupied_units,
        occupancy_pct,
        total_sqft,
        occupied_sqft,
        gross_potential,
        actual_revenue,
        delinquency_pct,
        move_ins_mtd,
        move_outs_mtd,
        notes,
      } = body;
      if (!facility_id) return errorResponse("facility_id required", 400, origin);
      if (!isValidUuid(facility_id)) return errorResponse("Invalid facility_id format", 400, origin);

      const row = await db.$queryRaw<Array<Record<string, unknown>>>`
        INSERT INTO facility_pms_snapshots (facility_id, snapshot_date, total_units, occupied_units, occupancy_pct, total_sqft, occupied_sqft, gross_potential, actual_revenue, delinquency_pct, move_ins_mtd, move_outs_mtd, notes)
        VALUES (${facility_id}::uuid, COALESCE(${snapshot_date || null}, CURRENT_DATE), ${total_units || null}, ${occupied_units || null}, ${occupancy_pct || null}, ${total_sqft || null}, ${occupied_sqft || null}, ${gross_potential || null}, ${actual_revenue || null}, ${delinquency_pct || null}, ${move_ins_mtd || 0}, ${move_outs_mtd || 0}, ${notes || null})
        ON CONFLICT (facility_id, snapshot_date) DO UPDATE SET
          total_units = EXCLUDED.total_units,
          occupied_units = EXCLUDED.occupied_units,
          occupancy_pct = EXCLUDED.occupancy_pct,
          total_sqft = EXCLUDED.total_sqft,
          occupied_sqft = EXCLUDED.occupied_sqft,
          gross_potential = EXCLUDED.gross_potential,
          actual_revenue = EXCLUDED.actual_revenue,
          delinquency_pct = EXCLUDED.delinquency_pct,
          move_ins_mtd = EXCLUDED.move_ins_mtd,
          move_outs_mtd = EXCLUDED.move_outs_mtd,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *`;

      await db.facilities.update({
        where: { id: facility_id },
        data: { pms_uploaded: true, updated_at: new Date() },
      });

      return jsonResponse({ snapshot: row[0] }, 200, origin);
    }

    if (action === "save_unit") {
      const {
        facility_id,
        unit_type,
        size_label,
        width_ft,
        depth_ft,
        sqft,
        floor,
        features,
        total_count,
        occupied_count,
        street_rate,
        actual_avg_rate,
        web_rate,
        push_rate,
        ecri_eligible,
      } = body;
      if (!facility_id || !unit_type) return errorResponse("facility_id and unit_type required", 400, origin);
      if (!isValidUuid(facility_id)) return errorResponse("Invalid facility_id format", 400, origin);

      const row = await db.$queryRaw<Array<Record<string, unknown>>>`
        INSERT INTO facility_pms_units (facility_id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features, total_count, occupied_count, street_rate, actual_avg_rate, web_rate, push_rate, ecri_eligible)
        VALUES (${facility_id}, ${unit_type}, ${size_label || null}, ${width_ft || null}, ${depth_ft || null}, ${sqft || null}, ${floor || null}, ${features || []}, ${total_count || 0}, ${occupied_count || 0}, ${street_rate || null}, ${actual_avg_rate || null}, ${web_rate || null}, ${push_rate || null}, ${ecri_eligible || 0})
        ON CONFLICT (facility_id, unit_type) DO UPDATE SET
          size_label = EXCLUDED.size_label,
          width_ft = EXCLUDED.width_ft,
          depth_ft = EXCLUDED.depth_ft,
          sqft = EXCLUDED.sqft,
          floor = EXCLUDED.floor,
          features = EXCLUDED.features,
          total_count = EXCLUDED.total_count,
          occupied_count = EXCLUDED.occupied_count,
          street_rate = EXCLUDED.street_rate,
          actual_avg_rate = EXCLUDED.actual_avg_rate,
          web_rate = EXCLUDED.web_rate,
          push_rate = EXCLUDED.push_rate,
          ecri_eligible = EXCLUDED.ecri_eligible,
          last_updated = NOW()
        RETURNING *`;

      return jsonResponse({ unit: row[0] }, 200, origin);
    }

    if (action === "save_special") {
      const {
        id,
        facility_id,
        name,
        description,
        applies_to,
        discount_type,
        discount_value,
        min_lease_months,
        start_date,
        end_date,
        active,
      } = body;
      if (!facility_id || !name) return errorResponse("facility_id and name required", 400, origin);
      if (!isValidUuid(facility_id)) return errorResponse("Invalid facility_id format", 400, origin);

      let row: Array<Record<string, unknown>>;
      if (id) {
        row = await db.$queryRaw<Array<Record<string, unknown>>>`
          UPDATE facility_pms_specials SET
            name = ${name}, description = ${description || null}, applies_to = ${applies_to || []}, discount_type = ${discount_type || "fixed"},
            discount_value = ${discount_value || null}, min_lease_months = ${min_lease_months || 1}, start_date = ${start_date || null}, end_date = ${end_date || null}, active = ${active !== false}
          WHERE id = ${id}::uuid RETURNING *`;
      } else {
        row = await db.$queryRaw<Array<Record<string, unknown>>>`
          INSERT INTO facility_pms_specials (facility_id, name, description, applies_to, discount_type, discount_value, min_lease_months, start_date, end_date, active)
          VALUES (${facility_id}, ${name}, ${description || null}, ${applies_to || []}, ${discount_type || "fixed"}, ${discount_value || null}, ${min_lease_months || 1}, ${start_date || null}, ${end_date || null}, ${active !== false}) RETURNING *`;
      }
      return jsonResponse({ special: row[0] }, 200, origin);
    }

    if (action === "bulk_save_units") {
      const { facility_id, units } = body;
      if (!facility_id || !Array.isArray(units))
        return errorResponse("facility_id and units[] required", 400, origin);
      if (!isValidUuid(facility_id)) return errorResponse("Invalid facility_id format", 400, origin);

      const saved: Array<Record<string, unknown>> = [];
      for (const u of units) {
        const row = await db.$queryRaw<Array<Record<string, unknown>>>`
          INSERT INTO facility_pms_units (facility_id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features, total_count, occupied_count, street_rate, actual_avg_rate, web_rate, push_rate, ecri_eligible)
          VALUES (${facility_id}, ${u.unit_type}, ${u.size_label || null}, ${u.width_ft || null}, ${u.depth_ft || null}, ${u.sqft || null}, ${u.floor || null}, ${u.features || []}, ${u.total_count || 0}, ${u.occupied_count || 0}, ${u.street_rate || null}, ${u.actual_avg_rate || null}, ${u.web_rate || null}, ${u.push_rate || null}, ${u.ecri_eligible || 0})
          ON CONFLICT (facility_id, unit_type) DO UPDATE SET
            size_label = EXCLUDED.size_label, width_ft = EXCLUDED.width_ft, depth_ft = EXCLUDED.depth_ft,
            sqft = EXCLUDED.sqft, floor = EXCLUDED.floor, features = EXCLUDED.features,
            total_count = EXCLUDED.total_count, occupied_count = EXCLUDED.occupied_count,
            street_rate = EXCLUDED.street_rate, actual_avg_rate = EXCLUDED.actual_avg_rate,
            web_rate = EXCLUDED.web_rate, push_rate = EXCLUDED.push_rate,
            ecri_eligible = EXCLUDED.ecri_eligible, last_updated = NOW()
          RETURNING *`;
        saved.push(row[0]);
      }

      await db.facilities.update({
        where: { id: facility_id },
        data: { pms_uploaded: true, updated_at: new Date() },
      });

      return jsonResponse({ units: saved }, 200, origin);
    }

    return errorResponse("Unknown action", 400, origin);
  } catch {
    return errorResponse("Failed to save PMS data", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "facility-pms");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { type, id } = body || {};
    if (!id) return errorResponse("id required", 400, origin);
    if (!isValidUuid(id)) return errorResponse("Invalid id format", 400, origin);

    if (type === "unit") {
      await db.facility_pms_units.delete({ where: { id } });
    } else if (type === "special") {
      await db.facility_pms_specials.delete({ where: { id } });
    } else {
      return errorResponse('type must be "unit" or "special"', 400, origin);
    }

    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to delete", 500, origin);
  }
}
