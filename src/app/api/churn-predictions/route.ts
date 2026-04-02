import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

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

interface ChurnResult {
  score: number;
  riskLevel: string;
  factors: Array<{ factor: string; weight: number; detail: string }>;
  actions: Array<{
    action: string;
    priority: string;
    description: string;
  }>;
  predictedVacate: string | null;
}

function computeChurnScore(
  tenant: Record<string, unknown>,
  payments: Record<string, unknown>[]
): ChurnResult {
  const factors: ChurnResult["factors"] = [];
  const actions: ChurnResult["actions"] = [];
  let score = 0;

  const daysDelinquent = Number(tenant.days_delinquent || 0);
  if (daysDelinquent > 0) {
    const pts = Math.min(30, daysDelinquent);
    score += pts;
    factors.push({
      factor: "Payment delinquency",
      weight: pts,
      detail: `${daysDelinquent} days past due`,
    });
  }

  if (!tenant.autopay_enabled) {
    score += 10;
    factors.push({
      factor: "No autopay",
      weight: 10,
      detail: "Manual payment increases churn risk",
    });
  }

  const latePayments = payments.filter(
    (p) => Number(p.days_late || 0) > 0
  );
  if (latePayments.length > 0) {
    const pts = Math.min(20, latePayments.length * 5);
    score += pts;
    factors.push({
      factor: "Late payment history",
      weight: pts,
      detail: `${latePayments.length} late payments`,
    });
  }

  const tenureMonths = Math.floor(
    (Date.now() - new Date(String(tenant.move_in_date)).getTime()) /
      (30 * 86400000)
  );
  if (tenureMonths < 3) {
    const pts = 15 - tenureMonths * 5;
    score += pts;
    factors.push({
      factor: "Short tenure",
      weight: pts,
      detail: `${tenureMonths} month(s) tenure`,
    });
  }

  if (tenant.lease_end_date) {
    const daysToEnd = Math.floor(
      (new Date(String(tenant.lease_end_date)).getTime() - Date.now()) /
        86400000
    );
    if (daysToEnd <= 30 && daysToEnd > 0) {
      const pts = Math.min(15, Math.round(15 * (1 - daysToEnd / 30)));
      score += pts;
      factors.push({
        factor: "Lease expiring soon",
        weight: pts,
        detail: `${daysToEnd} days until lease end`,
      });
    } else if (daysToEnd <= 0) {
      score += 15;
      factors.push({
        factor: "Lease expired",
        weight: 15,
        detail: "Month-to-month, easy to leave",
      });
    }
  } else {
    score += 5;
    factors.push({
      factor: "No lease end date",
      weight: 5,
      detail: "Month-to-month tenant",
    });
  }

  if (!tenant.has_insurance) {
    score += 5;
    factors.push({
      factor: "No insurance",
      weight: 5,
      detail: "Less invested in unit",
    });
  }

  score = Math.min(100, score);
  const riskLevel =
    score >= 75
      ? "critical"
      : score >= 50
        ? "high"
        : score >= 25
          ? "medium"
          : "low";

  if (score >= 50) {
    actions.push({
      action: "personal_call",
      priority: "high",
      description: "Schedule a personal check-in call",
    });
  }
  if (score >= 25 && !tenant.autopay_enabled) {
    actions.push({
      action: "autopay_incentive",
      priority: "medium",
      description: "Offer autopay discount incentive",
    });
  }
  if (score >= 50 && tenant.lease_end_date) {
    actions.push({
      action: "renewal_offer",
      priority: "high",
      description: "Send early renewal offer with discount",
    });
  }
  if (daysDelinquent > 7) {
    actions.push({
      action: "payment_reminder",
      priority: "urgent",
      description: "Send payment reminder with flexible options",
    });
  }

  return {
    score,
    riskLevel,
    factors,
    actions,
    predictedVacate:
      riskLevel === "critical" || riskLevel === "high"
        ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
        : null,
  };
}

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "churn-predictions");
  if (limited) return limited;
  const origin = getOrigin(request);
  if (!isAdminRequest(request))
    return errorResponse("Unauthorized", 401, origin);

  const facilityId = request.nextUrl.searchParams.get("facilityId");
  const riskLevel = request.nextUrl.searchParams.get("riskLevel");
  const resource = request.nextUrl.searchParams.get("resource");

  try {
    if (resource === "campaigns") {
      const campaigns = facilityId
        ? await db.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT rc.*, f.name as facility_name,
              (SELECT COUNT(*) FROM churn_predictions cp WHERE cp.retention_campaign_id = rc.id) as current_enrolled
            FROM retention_campaigns rc
            LEFT JOIN facilities f ON f.id = rc.facility_id
            WHERE rc.facility_id = $1::uuid
            ORDER BY rc.created_at DESC`,
            facilityId
          )
        : await db.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT rc.*, f.name as facility_name,
              (SELECT COUNT(*) FROM churn_predictions cp WHERE cp.retention_campaign_id = rc.id) as current_enrolled
            FROM retention_campaigns rc
            LEFT JOIN facilities f ON f.id = rc.facility_id
            ORDER BY rc.created_at DESC`
          );
      return jsonResponse(serializeBigInts({ campaigns }), 200, origin);
    }

    let sql = `
      SELECT cp.*, t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
             t.unit_number, t.unit_size, t.unit_type, t.monthly_rate, t.move_in_date,
             t.days_delinquent, t.autopay_enabled, t.has_insurance, t.balance,
             f.name as facility_name, f.location as facility_location,
             rc.name as campaign_name
      FROM churn_predictions cp
      JOIN tenants t ON t.id = cp.tenant_id
      JOIN facilities f ON f.id = cp.facility_id
      LEFT JOIN retention_campaigns rc ON rc.id = cp.retention_campaign_id
      WHERE t.status = 'active'
    `;
    const params: unknown[] = [];
    if (facilityId) {
      params.push(facilityId);
      sql += ` AND cp.facility_id = $${params.length}`;
    }
    if (riskLevel) {
      params.push(riskLevel);
      sql += ` AND cp.risk_level = $${params.length}`;
    }
    sql += ` ORDER BY cp.risk_score DESC`;

    const predictions =
      params.length > 0
        ? await db.$queryRawUnsafe<Record<string, unknown>[]>(
            sql,
            ...params
          )
        : await db.$queryRawUnsafe<Record<string, unknown>[]>(sql);

    let statsSql = `
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
    `;
    if (facilityId) statsSql += ` AND cp.facility_id = $1::uuid`;

    const statsRows = facilityId
      ? await db.$queryRawUnsafe<Record<string, unknown>[]>(
          statsSql,
          facilityId
        )
      : await db.$queryRawUnsafe<Record<string, unknown>[]>(statsSql);
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
  if (!isAdminRequest(request))
    return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create_campaign") {
      const { facility_id, name, trigger_risk_level, sequence_steps } = body;
      if (!name || !sequence_steps)
        return errorResponse("name and sequence_steps required", 400, origin);

      const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        `INSERT INTO retention_campaigns (facility_id, name, trigger_risk_level, sequence_steps)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        facility_id || null,
        name,
        trigger_risk_level || "high",
        JSON.stringify(sequence_steps)
      );
      return jsonResponse({ campaign: rows[0] }, 200, origin);
    }

    if (action === "enroll_campaign") {
      const { campaign_id } = body;
      if (!campaign_id)
        return errorResponse("campaign_id required", 400, origin);

      const campaignRows = await db.$queryRawUnsafe<
        Record<string, unknown>[]
      >(
        "SELECT * FROM retention_campaigns WHERE id = $1",
        campaign_id
      );
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

      const enrolledRows = campaign.facility_id
        ? await db.$queryRawUnsafe<Record<string, unknown>[]>(
            `UPDATE churn_predictions SET
              retention_campaign_id = $1,
              retention_status = 'enrolled'
            WHERE retention_status = 'none'
              AND risk_level = ANY($2::text[])
              AND facility_id = $3
            RETURNING id`,
            campaign_id,
            riskLevels,
            campaign.facility_id
          )
        : await db.$queryRawUnsafe<Record<string, unknown>[]>(
            `UPDATE churn_predictions SET
              retention_campaign_id = $1,
              retention_status = 'enrolled'
            WHERE retention_status = 'none'
              AND risk_level = ANY($2::text[])
            RETURNING id`,
            campaign_id,
            riskLevels
          );

      await db.$executeRawUnsafe(
        "UPDATE retention_campaigns SET enrolled_count = enrolled_count + $2 WHERE id = $1",
        campaign_id,
        enrolledRows.length
      );

      return jsonResponse({ enrolled: enrolledRows.length }, 200, origin);
    }

    // Run churn scoring
    const { facilityId } = body;
    let tenants: Record<string, unknown>[];
    if (facilityId) {
      tenants = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        "SELECT * FROM tenants WHERE status = 'active' AND facility_id = $1::uuid",
        facilityId
      );
    } else {
      tenants = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        "SELECT * FROM tenants WHERE status = 'active'"
      );
    }

    let scored = 0;
    for (const tenant of tenants) {
      const payments = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        "SELECT * FROM tenant_payments WHERE tenant_id = $1 ORDER BY payment_date DESC LIMIT 12",
        tenant.id
      );

      const result = computeChurnScore(tenant, payments);

      await db.$executeRawUnsafe(
        `INSERT INTO churn_predictions (tenant_id, facility_id, risk_score, risk_level, predicted_vacate, factors, recommended_actions, last_scored_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (tenant_id) DO UPDATE SET
           risk_score = EXCLUDED.risk_score, risk_level = EXCLUDED.risk_level,
           predicted_vacate = EXCLUDED.predicted_vacate, factors = EXCLUDED.factors,
           recommended_actions = EXCLUDED.recommended_actions, last_scored_at = NOW()`,
        tenant.id,
        tenant.facility_id,
        result.score,
        result.riskLevel,
        result.predictedVacate,
        JSON.stringify(result.factors),
        JSON.stringify(result.actions)
      );

      scored++;
    }

    return jsonResponse(
      { scored, message: `Scored ${scored} tenants` },
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
  if (!isAdminRequest(request))
    return errorResponse("Unauthorized", 401, origin);

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
      if (action === "batch_enroll" && campaign_id) {
        await db.$executeRawUnsafe(
          `UPDATE churn_predictions SET retention_campaign_id = $2, retention_status = 'enrolled'
           WHERE id = ANY($1::uuid[])`,
          ids,
          campaign_id
        );
        await db.$executeRawUnsafe(
          "UPDATE retention_campaigns SET enrolled_count = enrolled_count + $2 WHERE id = $1",
          campaign_id,
          ids.length
        );
        return jsonResponse({ updated: ids.length }, 200, origin);
      }
      if (action === "batch_status" && retention_status) {
        await db.$executeRawUnsafe(
          "UPDATE churn_predictions SET retention_status = $2 WHERE id = ANY($1::uuid[])",
          ids,
          retention_status
        );
        if (retention_status === "retained") {
          const withCampaign = await db.$queryRawUnsafe<
            Record<string, unknown>[]
          >(
            "SELECT DISTINCT retention_campaign_id FROM churn_predictions WHERE id = ANY($1::uuid[]) AND retention_campaign_id IS NOT NULL",
            ids
          );
          for (const r of withCampaign) {
            const cntRows = await db.$queryRawUnsafe<
              Record<string, unknown>[]
            >(
              "SELECT COUNT(*) as c FROM churn_predictions WHERE retention_campaign_id = $1 AND retention_status = 'retained'",
              r.retention_campaign_id
            );
            await db.$executeRawUnsafe(
              "UPDATE retention_campaigns SET retained_count = $2 WHERE id = $1",
              r.retention_campaign_id,
              Number(cntRows[0]?.c || 0)
            );
          }
        }
        return jsonResponse({ updated: ids.length }, 200, origin);
      }
      return errorResponse("Unknown batch action", 400, origin);
    }

    if (!id) return errorResponse("id or ids required", 400, origin);

    if (action === "toggle_campaign") {
      const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        "UPDATE retention_campaigns SET active = NOT active, updated_at = NOW() WHERE id = $1 RETURNING *",
        id
      );
      return jsonResponse({ campaign: rows[0] }, 200, origin);
    }

    if (action === "update_campaign") {
      const { name, trigger_risk_level, sequence_steps } = body;
      const sets = ["updated_at = NOW()"];
      const params: unknown[] = [id];
      if (name) {
        params.push(name);
        sets.push(`name = $${params.length}`);
      }
      if (trigger_risk_level) {
        params.push(trigger_risk_level);
        sets.push(`trigger_risk_level = $${params.length}`);
      }
      if (sequence_steps) {
        params.push(JSON.stringify(sequence_steps));
        sets.push(`sequence_steps = $${params.length}`);
      }
      const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE retention_campaigns SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
        ...params
      );
      return jsonResponse({ campaign: rows[0] }, 200, origin);
    }

    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      "UPDATE churn_predictions SET retention_status = $2 WHERE id = $1 RETURNING *",
      id,
      retention_status
    );
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
  if (!isAdminRequest(request))
    return errorResponse("Unauthorized", 401, origin);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("id required", 400, origin);

  try {
    await db.$executeRawUnsafe(
      "UPDATE churn_predictions SET retention_campaign_id = NULL WHERE retention_campaign_id = $1",
      id
    );
    await db.$executeRawUnsafe(
      "DELETE FROM retention_campaigns WHERE id = $1",
      id
    );
    return jsonResponse({ ok: true }, 200, origin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500, origin);
  }
}
