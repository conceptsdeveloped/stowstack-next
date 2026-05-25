import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type DbExecutor = PrismaClient | Prisma.TransactionClient;

export interface ChurnedOutcomeResult {
  updated: boolean;
  priorRiskLevel?: string;
}

/**
 * Called when a tenant transitions to moved_out. If a churn_prediction exists,
 * mark retention_status = "churned" so save-rate reports can attribute the
 * outcome.
 *
 * Roadmap 11 phase 3 (revised). No new schema — writes to existing
 * churn_predictions.retention_status.
 */
export async function markTenantChurned(
  client: DbExecutor,
  tenantId: string,
): Promise<ChurnedOutcomeResult> {
  const rows = await client.$queryRaw<Array<{ risk_level: string }>>`
    UPDATE churn_predictions
    SET retention_status = 'churned'
    WHERE tenant_id = ${tenantId}::uuid
      AND retention_status != 'churned'
    RETURNING risk_level
  `;

  if (rows.length === 0) {
    return { updated: false };
  }

  return { updated: true, priorRiskLevel: rows[0].risk_level };
}

export interface RetainedSweepResult {
  retained: number;
}

/**
 * Sweep for high/critical risk tenants flagged 60+ days ago who are still
 * active. Marks them as "retained" — the platform held the relationship.
 *
 * Idempotent: only updates rows still in eligible state. Tenants who
 * subsequently churn will be flipped back by markTenantChurned.
 */
export async function sweepRetainedTenants(
  client: DbExecutor,
  windowDays = 60,
): Promise<RetainedSweepResult> {
  const result = await client.$executeRaw`
    UPDATE churn_predictions cp
    SET retention_status = 'retained'
    FROM tenants t
    WHERE cp.tenant_id = t.id
      AND t.status = 'active'
      AND cp.risk_level IN ('high', 'critical')
      AND cp.retention_status IN ('none', 'enrolled')
      AND cp.last_scored_at <= NOW() - (${windowDays.toString()} || ' days')::INTERVAL
  `;

  return { retained: Number(result) };
}
