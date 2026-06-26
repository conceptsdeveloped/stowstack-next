import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireFacilityAccess,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { scoreActiveTenants } from "@/lib/churn-scoring";

function serializeBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = serializeBigInts(v);
    }
    return result;
  }
  return obj;
}

// Scoring logic lives in @/lib/churn-scoring (shared with the weekly cron at
// /api/cron/score-churn-risk). See roadmap 11 phase 2 (revised).

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "churn-predictions");
  if (limited) return limited;
  const origin = getOrigin(request);

  const facilityId = request.nextUrl.searchParams.get("facilityId");
  const riskLevel = request.nextUrl.searchParams.get("riskLevel");
  const resource = request.nextUrl.searchParams.get("resource");

  const denied = await requireFacilityAccess(request, facilityId);
  if (denied) return denied;

  try {
    if (resource === "campaigns") {
      const campaignFacilityFilter = facilityId
        ? Prisma.sql`WHERE rc.facility_id = ${facilityId}::uuid`
        : Prisma.empty;

      const campaigns = await db.$queryRaw<Record<string, unknown>[]>`
        SELECT rc.*, f.name as facility_name,
          (SELECT COUNT(*) FROM churn_predictions cp WHERE cp.retention_campaign_id = rc.id) as current_enrolled
        FROM retention_campaigns rc
        LEFT JOIN facilities f ON f.id = rc.facility_id
        ${campaignFacilityFilter}
        ORDER BY rc.created_at DESC
      `;
      return jsonResponse(serializeBigInts({ campaigns }), 200, origin);
    }

    const predictionFilters: Prisma.Sql[] = [Prisma.sql`t.status = 'active'`];
    if (facilityId) {
      predictionFilters.push(Prisma.sql`cp.facility_id = ${facilityId}::uuid`);
    }
    if (riskLevel) {
      predictionFilters.push(Prisma.sql`cp.risk_level = ${riskLevel}`);
    }
    const predictionWhere = Prisma.join(predictionFilters, " AND ");

    const predictions = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT cp.*, t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
             t.unit_number, t.unit_size, t.unit_type, t.monthly_rate, t.move_in_date,
             t.days_delinquent, t.autopay_enabled, t.has_insurance, t.balance,
             f.name as facility_name, f.location as facility_location,
             rc.name as campaign_name
      FROM churn_predictions cp
      JOIN tenants t ON t.id = cp.tenant_id
      JOIN facilities f ON f.id = cp.facility_id
      LEFT JOIN retention_campaigns rc ON rc.id = cp.retention_campaign_id
      WHERE ${predictionWhere}
      ORDER BY cp.risk_score DESC
    `;

    const statsFacilityFilter = facilityId
      ? Prisma.sql`AND cp.facility_id = ${facilityId}::uuid`
      : Prisma.empty;

    const statsRows = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT
        COUNT(*) as total_scored,
        COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high_count,
        COUNT(*) FILTER (WHERE risk_level = 'medium') as medium_count,
        COUNT(*) FILTER (WHERE risk_level = 'low') as low_count,
        COUNT(*) FILTER (WHERE retention_status = 'enrolled') as enrolled_count,
        COUNT(*) FILTER (WHERE retention_status = 'retained') as retained_count,
        COUNT(*) FILTER (WHERE retention_status = 'churned') as churned_count,
        AVG(risk_score)::INTEGER as avg_risk_score,
        COUNT(*) FILTER (WHERE retention_campaign_id IS NOT NULL) as in_campaign_count
      FROM churn_predictions cp
      JOIN tenants t ON t.id = cp.tenant_id
      WHERE t.status = 'active'
      ${statsFacilityFilter}
    `;
    const stats = statsRows[0] || null;

    return jsonResponse(serializeBigInts({ predictions, stats }), 200, origin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "churn-predictions");
  if (limited) return limited;
  const origin = getOrigin(request);

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create_campaign") {
      const { facility_id, name, trigger_risk_level, sequence_steps } = body;
      if (!name || !sequence_steps)
        return errorResponse("name and sequence_steps required", 400, origin);

      const createDenied = await requireFacilityAccess(request, facility_id);
      if (createDenied) return createDenied;

      const rows = await db.$queryRaw<Record<string, unknown>[]>`
        INSERT INTO retention_campaigns (facility_id, name, trigger_risk_level, sequence_steps)
         VALUES (${facility_id || null}::uuid, ${name}, ${trigger_risk_level || "high"}, ${JSON.stringify(sequence_steps)}::jsonb)
         RETURNING *
      `;
      return jsonResponse({ campaign: rows[0] }, 200, origin);
    }

    if (action === "enroll_campaign") {
      const { campaign_id } = body;
      if (!campaign_id)
        return errorResponse("campaign_id required", 400, origin);

      const existingCampaign = await db.retention_campaigns.findUnique({
        where: { id: campaign_id },
        select: { facility_id: true },
      });
      if (!existingCampaign) return errorResponse("Not found", 404, origin);
      const enrollDenied = await requireFacilityAccess(request, existingCampaign.facility_id);
      if (enrollDenied) return enrollDenied;

      const campaignRows = await db.$queryRaw<
        Record<string, unknown>[]
      >`SELECT * FROM retention_campaigns WHERE id = ${campaign_id}::uuid`;
      if (campaignRows.length === 0)
        return errorResponse("Campaign not found", 404, origin);
      const campaign = campaignRows[0];

      const triggerLevel = String(campaign.trigger_risk_level || "high");
      const riskLevels =
        triggerLevel === "medium"
          ? ["medium", "high", "critical"]
          : triggerLevel === "high"
            ? ["high", "critical"]
            : ["critical"];

      const enrollFacilityFilter = campaign.facility_id
        ? Prisma.sql`AND facility_id = ${campaign.facility_id}::uuid`
        : Prisma.empty;

      const enrolledRows = await db.$queryRaw<Record<string, unknown>[]>`
        UPDATE churn_predictions SET
          retention_campaign_id = ${campaign_id}::uuid,
          retention_status = 'enrolled'
        WHERE retention_status = 'none'
          AND risk_level = ANY(${riskLevels}::text[])
          ${enrollFacilityFilter}
        RETURNING id
      `;

      await db.$executeRaw`
        UPDATE retention_campaigns SET enrolled_count = enrolled_count + ${enrolledRows.length} WHERE id = ${campaign_id}::uuid
      `;

      return jsonResponse({ enrolled: enrolledRows.length }, 200, origin);
    }

    // Run churn scoring
    const { facilityId } = body;
    const scoreDenied = await requireFacilityAccess(request, facilityId);
    if (scoreDenied) return scoreDenied;
    const result = await scoreActiveTenants(db, {
      facilityId: facilityId || undefined,
    });

    return jsonResponse(
      { ...result, message: `Scored ${result.scored} tenants` },
      200,
      origin
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500, origin);
  }
}

export async function PATCH(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "churn-predictions");
  if (limited) return limited;
  const origin = getOrigin(request);

  try {
    const body = await request.json();
    const {
      id,
      ids,
      action,
      retention_status,
      campaign_id,
    } = body;

    if (Array.isArray(ids) && ids.length > 0) {
      const idPredictions = await db.churn_predictions.findMany({
        where: { id: { in: ids } },
        select: { facility_id: true },
      });
      if (idPredictions.length === 0) return errorResponse("Not found", 404, origin);
      const idFacilityIds = [...new Set(idPredictions.map((p) => p.facility_id))];
      for (const fid of idFacilityIds) {
        const batchDenied = await requireFacilityAccess(request, fid);
        if (batchDenied) return batchDenied;
      }

      if (action === "batch_enroll" && campaign_id) {
        await db.$executeRaw`
          UPDATE churn_predictions SET retention_campaign_id = ${campaign_id}::uuid, retention_status = 'enrolled'
           WHERE id = ANY(${ids}::uuid[])
        `;
        await db.$executeRaw`
          UPDATE retention_campaigns SET enrolled_count = enrolled_count + ${ids.length} WHERE id = ${campaign_id}::uuid
        `;
        return jsonResponse({ updated: ids.length }, 200, origin);
      }
      if (action === "batch_status" && retention_status) {
        await db.$executeRaw`
          UPDATE churn_predictions SET retention_status = ${retention_status} WHERE id = ANY(${ids}::uuid[])
        `;
        if (retention_status === "retained") {
          const withCampaign = await db.$queryRaw<
            Record<string, unknown>[]
          >`
            SELECT DISTINCT retention_campaign_id FROM churn_predictions WHERE id = ANY(${ids}::uuid[]) AND retention_campaign_id IS NOT NULL
          `;
          for (const r of withCampaign) {
            const cntRows = await db.$queryRaw<
              Record<string, unknown>[]
            >`
              SELECT COUNT(*) as c FROM churn_predictions WHERE retention_campaign_id = ${r.retention_campaign_id}::uuid AND retention_status = 'retained'
            `;
            await db.$executeRaw`
              UPDATE retention_campaigns SET retained_count = ${Number(cntRows[0]?.c || 0)} WHERE id = ${r.retention_campaign_id}::uuid
            `;
          }
        }
        return jsonResponse({ updated: ids.length }, 200, origin);
      }
      return errorResponse("Unknown batch action", 400, origin);
    }

    if (!id) return errorResponse("id or ids required", 400, origin);

    if (action === "toggle_campaign" || action === "update_campaign") {
      const existingCampaign = await db.retention_campaigns.findUnique({
        where: { id },
        select: { facility_id: true },
      });
      if (!existingCampaign) return errorResponse("Not found", 404, origin);
      const campaignDenied = await requireFacilityAccess(request, existingCampaign.facility_id);
      if (campaignDenied) return campaignDenied;
    } else {
      const existingPrediction = await db.churn_predictions.findUnique({
        where: { id },
        select: { facility_id: true },
      });
      if (!existingPrediction) return errorResponse("Not found", 404, origin);
      const predictionDenied = await requireFacilityAccess(request, existingPrediction.facility_id);
      if (predictionDenied) return predictionDenied;
    }

    if (action === "toggle_campaign") {
      const rows = await db.$queryRaw<Record<string, unknown>[]>`
        UPDATE retention_campaigns SET active = NOT active, updated_at = NOW() WHERE id = ${id}::uuid RETURNING *
      `;
      return jsonResponse({ campaign: rows[0] }, 200, origin);
    }

    if (action === "update_campaign") {
      const { name, trigger_risk_level, sequence_steps } = body;
      const setParts: Prisma.Sql[] = [Prisma.sql`updated_at = NOW()`];
      if (name) {
        setParts.push(Prisma.sql`name = ${name}`);
      }
      if (trigger_risk_level) {
        setParts.push(Prisma.sql`trigger_risk_level = ${trigger_risk_level}`);
      }
      if (sequence_steps) {
        setParts.push(Prisma.sql`sequence_steps = ${JSON.stringify(sequence_steps)}::jsonb`);
      }
      const setClause = Prisma.join(setParts, ", ");
      const rows = await db.$queryRaw<Record<string, unknown>[]>`
        UPDATE retention_campaigns SET ${setClause} WHERE id = ${id}::uuid RETURNING *
      `;
      return jsonResponse({ campaign: rows[0] }, 200, origin);
    }

    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      UPDATE churn_predictions SET retention_status = ${retention_status} WHERE id = ${id}::uuid RETURNING *
    `;
    return jsonResponse({ prediction: rows[0] }, 200, origin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500, origin);
  }
}

export async function DELETE(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "churn-predictions");
  if (limited) return limited;
  const origin = getOrigin(request);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("id required", 400, origin);

  try {
    const existing = await db.retention_campaigns.findUnique({
      where: { id },
      select: { facility_id: true },
    });
    if (!existing) return errorResponse("Not found", 404, origin);
    const denied = await requireFacilityAccess(request, existing.facility_id);
    if (denied) return denied;

    await db.$executeRaw`
      UPDATE churn_predictions SET retention_campaign_id = NULL WHERE retention_campaign_id = ${id}::uuid
    `;
    await db.$executeRaw`
      DELETE FROM retention_campaigns WHERE id = ${id}::uuid
    `;
    return jsonResponse({ ok: true }, 200, origin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500, origin);
  }
}
