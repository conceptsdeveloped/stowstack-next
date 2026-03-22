import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, requireAdminKey } from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);

  // Accept either admin key or client Bearer token (for portal access)
  const adminKey = req.headers.get("x-admin-key");
  const authHeader = req.headers.get("authorization");
  const isAdminAuth = adminKey && adminKey === process.env.ADMIN_SECRET;

  let isClientAuth = false;
  if (!isAdminAuth && authHeader?.startsWith("Bearer ")) {
    const accessCode = authHeader.slice(7);
    if (accessCode) {
      const client = await db.clients.findFirst({ where: { access_code: accessCode } });
      isClientAuth = !!client;
    }
  }

  if (!isAdminAuth && !isClientAuth) {
    return errorResponse("Unauthorized", 401, origin);
  }

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

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
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
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

      const row = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `INSERT INTO facility_pms_snapshots (facility_id, snapshot_date, total_units, occupied_units, occupancy_pct, total_sqft, occupied_sqft, gross_potential, actual_revenue, delinquency_pct, move_ins_mtd, move_outs_mtd, notes)
        VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        RETURNING *`,
        facility_id,
        snapshot_date || null,
        total_units || null,
        occupied_units || null,
        occupancy_pct || null,
        total_sqft || null,
        occupied_sqft || null,
        gross_potential || null,
        actual_revenue || null,
        delinquency_pct || null,
        move_ins_mtd || 0,
        move_outs_mtd || 0,
        notes || null
      );

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

      const row = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `INSERT INTO facility_pms_units (facility_id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features, total_count, occupied_count, street_rate, actual_avg_rate, web_rate, push_rate, ecri_eligible)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        RETURNING *`,
        facility_id,
        unit_type,
        size_label || null,
        width_ft || null,
        depth_ft || null,
        sqft || null,
        floor || null,
        features || [],
        total_count || 0,
        occupied_count || 0,
        street_rate || null,
        actual_avg_rate || null,
        web_rate || null,
        push_rate || null,
        ecri_eligible || 0
      );

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

      let row: Array<Record<string, unknown>>;
      if (id) {
        row = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `UPDATE facility_pms_specials SET
            name = $2, description = $3, applies_to = $4, discount_type = $5,
            discount_value = $6, min_lease_months = $7, start_date = $8, end_date = $9, active = $10
          WHERE id = $1 RETURNING *`,
          id,
          name,
          description || null,
          applies_to || [],
          discount_type || "fixed",
          discount_value || null,
          min_lease_months || 1,
          start_date || null,
          end_date || null,
          active !== false
        );
      } else {
        row = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `INSERT INTO facility_pms_specials (facility_id, name, description, applies_to, discount_type, discount_value, min_lease_months, start_date, end_date, active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          facility_id,
          name,
          description || null,
          applies_to || [],
          discount_type || "fixed",
          discount_value || null,
          min_lease_months || 1,
          start_date || null,
          end_date || null,
          active !== false
        );
      }
      return jsonResponse({ special: row[0] }, 200, origin);
    }

    if (action === "bulk_save_units") {
      const { facility_id, units } = body;
      if (!facility_id || !Array.isArray(units))
        return errorResponse("facility_id and units[] required", 400, origin);

      const saved: Array<Record<string, unknown>> = [];
      for (const u of units) {
        const row = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `INSERT INTO facility_pms_units (facility_id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features, total_count, occupied_count, street_rate, actual_avg_rate, web_rate, push_rate, ecri_eligible)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (facility_id, unit_type) DO UPDATE SET
            size_label = EXCLUDED.size_label, width_ft = EXCLUDED.width_ft, depth_ft = EXCLUDED.depth_ft,
            sqft = EXCLUDED.sqft, floor = EXCLUDED.floor, features = EXCLUDED.features,
            total_count = EXCLUDED.total_count, occupied_count = EXCLUDED.occupied_count,
            street_rate = EXCLUDED.street_rate, actual_avg_rate = EXCLUDED.actual_avg_rate,
            web_rate = EXCLUDED.web_rate, push_rate = EXCLUDED.push_rate,
            ecri_eligible = EXCLUDED.ecri_eligible, last_updated = NOW()
          RETURNING *`,
          facility_id,
          u.unit_type,
          u.size_label || null,
          u.width_ft || null,
          u.depth_ft || null,
          u.sqft || null,
          u.floor || null,
          u.features || [],
          u.total_count || 0,
          u.occupied_count || 0,
          u.street_rate || null,
          u.actual_avg_rate || null,
          u.web_rate || null,
          u.push_rate || null,
          u.ecri_eligible || 0
        );
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
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { type, id } = body || {};
    if (!id) return errorResponse("id required", 400, origin);

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
