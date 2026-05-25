import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type DbExecutor = PrismaClient | Prisma.TransactionClient;

export interface ChurnFactor {
  factor: string;
  weight: number;
  detail: string;
}

export interface ChurnRecommendedAction {
  action: string;
  priority: string;
  description: string;
}

export interface ChurnScoreResult {
  score: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: ChurnFactor[];
  actions: ChurnRecommendedAction[];
  predictedVacate: string | null;
}

/**
 * Heuristic churn risk score for a single tenant based on payment history,
 * tenure, autopay status, and lease state. Score is clamped to [0, 100].
 *
 * Roadmap 11 Phase 2 (revised): the canonical scoring function. Used by both
 * the on-demand admin endpoint and the weekly cron.
 */
export function computeChurnScore(
  tenant: Record<string, unknown>,
  payments: Record<string, unknown>[],
): ChurnScoreResult {
  const factors: ChurnFactor[] = [];
  const actions: ChurnRecommendedAction[] = [];
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

  const latePayments = payments.filter((p) => Number(p.days_late || 0) > 0);
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
      (30 * 86400000),
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
        86400000,
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

export interface ScoreTenantsResult {
  scored: number;
  facilitiesProcessed: number;
  errors: number;
}

/**
 * Score all active tenants (optionally filtered to one facility), upserting
 * results into churn_predictions. Suitable for use from cron and admin POST.
 */
export async function scoreActiveTenants(
  client: DbExecutor,
  opts: { facilityId?: string } = {},
): Promise<ScoreTenantsResult> {
  const facilityFilter = opts.facilityId
    ? Prisma.sql`AND facility_id = ${opts.facilityId}::uuid`
    : Prisma.empty;

  const tenants = await client.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM tenants WHERE status = 'active' ${facilityFilter}
  `;

  const facilitySet = new Set<string>();
  let scored = 0;
  let errors = 0;

  for (const tenant of tenants) {
    try {
      const payments = await client.$queryRaw<Record<string, unknown>[]>`
        SELECT * FROM tenant_payments
        WHERE tenant_id = ${tenant.id}::uuid
        ORDER BY payment_date DESC LIMIT 12
      `;

      const result = computeChurnScore(tenant, payments);

      await client.$executeRaw`
        INSERT INTO churn_predictions
          (tenant_id, facility_id, risk_score, risk_level, predicted_vacate,
           factors, recommended_actions, last_scored_at)
        VALUES
          (${tenant.id}::uuid, ${tenant.facility_id}::uuid, ${result.score},
           ${result.riskLevel}, ${result.predictedVacate},
           ${JSON.stringify(result.factors)}::jsonb,
           ${JSON.stringify(result.actions)}::jsonb, NOW())
        ON CONFLICT (tenant_id) DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          risk_level = EXCLUDED.risk_level,
          predicted_vacate = EXCLUDED.predicted_vacate,
          factors = EXCLUDED.factors,
          recommended_actions = EXCLUDED.recommended_actions,
          last_scored_at = NOW()
      `;

      facilitySet.add(String(tenant.facility_id));
      scored++;
    } catch {
      errors++;
    }
  }

  return { scored, facilitiesProcessed: facilitySet.size, errors };
}
