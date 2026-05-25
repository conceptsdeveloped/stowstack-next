import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type DbExecutor = PrismaClient | Prisma.TransactionClient;

export type SensitivityBucket = "very_low" | "low" | "medium" | "high";

export interface SensitivityFactors {
  tenure_component: number;
  payment_component: number;
  autopay_component: number;
  rate_gap_component: number;
  small_unit_component: number;
}

export interface SensitivityResult {
  tenant_id: string;
  facility_id: string;
  tenure_months: number;
  months_since_last_increase: number | null;
  payment_health_score: number;
  late_payment_count_12mo: number;
  autopay_flag: boolean;
  current_rate: number | null;
  market_rate: number | null;
  rate_gap_pct: number | null;
  unit_size: string | null;
  has_insurance: boolean;
  sensitivity_score: number;
  bucket: SensitivityBucket;
  factors: SensitivityFactors;
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v) || 0;
  const obj = v as { toNumber?: () => number };
  if (typeof obj.toNumber === "function") return obj.toNumber();
  return Number(v) || 0;
}

function bucketFor(score: number): SensitivityBucket {
  if (score < 0.25) return "very_low";
  if (score < 0.5) return "low";
  if (score < 0.75) return "medium";
  return "high";
}

function isSmallUnit(unitSize: string | null): boolean {
  if (!unitSize) return false;
  // 5x5, 5x10, 4x4, etc. are "small" — easier for tenant to vacate
  const normalized = unitSize.toLowerCase().replace(/\s+/g, "");
  return /^[1-5]x([1-9]|10)$/.test(normalized);
}

/**
 * Heuristic price-sensitivity score for a single tenant.
 *
 * Score = weighted sum of:
 *   - 0.30 × inverse-log tenure (short-tenure tenants more sensitive)
 *   - 0.20 × (1 - payment_health_score) (late-paying tenants more sensitive)
 *   - 0.15 × no_autopay flag
 *   - 0.20 × rate gap (under-priced units have headroom but tenants notice)
 *   - 0.15 × small-unit flag (low switching cost for 5x10 and below)
 *
 * Roadmap 08 phase 2 (revised). Reuses the existing tenants + tenant_payments
 * + facility_pms_tenant_rates tables — no new source data, just feature
 * engineering.
 */
export function computeSensitivityScore(input: {
  tenant: Record<string, unknown>;
  paymentsLast12mo: Record<string, unknown>[];
  facilityMarketRate?: number | null;
}): Omit<SensitivityResult, "tenant_id" | "facility_id"> {
  const tenant = input.tenant;
  const moveInDate = tenant.move_in_date
    ? new Date(String(tenant.move_in_date))
    : null;
  const tenureMonths = moveInDate
    ? Math.max(
        0,
        Math.floor((Date.now() - moveInDate.getTime()) / (30 * 86400000)),
      )
    : 0;

  // Payment health: 1.0 if all on time, drops with late payments
  const latePayments = input.paymentsLast12mo.filter(
    (p) => Number(p.days_late ?? 0) > 0,
  );
  const totalPayments = input.paymentsLast12mo.length;
  const paymentHealthScore =
    totalPayments === 0
      ? 0.75 // unknown — assume slightly below perfect
      : Math.max(0, 1 - latePayments.length / totalPayments);

  const autopayFlag = Boolean(tenant.autopay_enabled);
  const hasInsurance = Boolean(tenant.has_insurance);
  const currentRate = tenant.monthly_rate ? num(tenant.monthly_rate) : null;
  const marketRate = input.facilityMarketRate ?? null;
  const rateGapPct =
    currentRate && marketRate && marketRate > 0
      ? (marketRate - currentRate) / marketRate
      : null;
  const unitSize = (tenant.unit_size as string) || null;

  // Component scores (each 0..1 before weighting)
  const tenureComponent = 1 / Math.log(tenureMonths + 2); // ranges ~1.0 at month 0 down to ~0.2 at 5 years
  const paymentComponent = 1 - paymentHealthScore;
  const autopayComponent = autopayFlag ? 0 : 1;
  const rateGapComponent = rateGapPct !== null ? Math.max(0, Math.min(1, rateGapPct)) : 0;
  const smallUnitComponent = isSmallUnit(unitSize) ? 1 : 0;

  const factors: SensitivityFactors = {
    tenure_component: tenureComponent,
    payment_component: paymentComponent,
    autopay_component: autopayComponent,
    rate_gap_component: rateGapComponent,
    small_unit_component: smallUnitComponent,
  };

  const score =
    0.3 * tenureComponent +
    0.2 * paymentComponent +
    0.15 * autopayComponent +
    0.2 * rateGapComponent +
    0.15 * smallUnitComponent;

  const clampedScore = Math.max(0, Math.min(1, score));

  return {
    tenure_months: tenureMonths,
    months_since_last_increase: null, // populated below from facility_pms_tenant_rates if available
    payment_health_score: paymentHealthScore,
    late_payment_count_12mo: latePayments.length,
    autopay_flag: autopayFlag,
    current_rate: currentRate,
    market_rate: marketRate,
    rate_gap_pct: rateGapPct,
    unit_size: unitSize,
    has_insurance: hasInsurance,
    sensitivity_score: clampedScore,
    bucket: bucketFor(clampedScore),
    factors,
  };
}

export interface ScoreSensitivityResult {
  scored: number;
  facilitiesProcessed: number;
  errors: number;
}

/**
 * Score all active tenants and upsert into tenant_sensitivity_features for
 * today's date. Idempotent on (tenant_id, snapshot_date) — same-day re-runs
 * overwrite.
 */
export async function scoreAllActiveTenantsSensitivity(
  client: DbExecutor,
  opts: { facilityId?: string } = {},
): Promise<ScoreSensitivityResult> {
  const facilityFilter = opts.facilityId
    ? Prisma.sql`AND facility_id = ${opts.facilityId}::uuid`
    : Prisma.empty;

  const tenants = await client.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM tenants WHERE status = 'active' ${facilityFilter}
  `;

  // Pre-compute per-facility market rate by unit_type: median standard_rate
  // from facility_pms_tenant_rates' latest snapshot per facility.
  const marketRates = await client.$queryRaw<
    Array<{ facility_id: string; unit_size: string | null; market_rate: unknown }>
  >`
    SELECT facility_id, size_label AS unit_size,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY standard_rate)::numeric AS market_rate
    FROM facility_pms_tenant_rates
    WHERE standard_rate IS NOT NULL
    GROUP BY facility_id, size_label
  `;
  const rateMap = new Map<string, number>();
  for (const row of marketRates) {
    if (row.unit_size && row.market_rate !== null) {
      rateMap.set(`${row.facility_id}|${row.unit_size}`, num(row.market_rate));
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const facilitySet = new Set<string>();
  let scored = 0;
  let errors = 0;

  for (const tenant of tenants) {
    try {
      const payments = await client.$queryRaw<Record<string, unknown>[]>`
        SELECT days_late FROM tenant_payments
        WHERE tenant_id = ${tenant.id}::uuid
          AND payment_date >= NOW() - INTERVAL '12 months'
      `;

      const marketRate =
        rateMap.get(`${tenant.facility_id}|${tenant.unit_size}`) ?? null;

      const result = computeSensitivityScore({
        tenant,
        paymentsLast12mo: payments,
        facilityMarketRate: marketRate,
      });

      await client.$executeRaw`
        INSERT INTO tenant_sensitivity_features (
          tenant_id, facility_id, snapshot_date,
          tenure_months, months_since_last_increase,
          payment_health_score, late_payment_count_12mo, autopay_flag,
          current_rate, market_rate, rate_gap_pct,
          unit_size, has_insurance,
          sensitivity_score, bucket, factors, computed_at
        ) VALUES (
          ${tenant.id}::uuid, ${tenant.facility_id}::uuid, ${today}::date,
          ${result.tenure_months}, ${result.months_since_last_increase},
          ${result.payment_health_score}, ${result.late_payment_count_12mo}, ${result.autopay_flag},
          ${result.current_rate}, ${result.market_rate}, ${result.rate_gap_pct},
          ${result.unit_size}, ${result.has_insurance},
          ${result.sensitivity_score}, ${result.bucket},
          ${JSON.stringify(result.factors)}::jsonb, NOW()
        )
        ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET
          tenure_months = EXCLUDED.tenure_months,
          months_since_last_increase = EXCLUDED.months_since_last_increase,
          payment_health_score = EXCLUDED.payment_health_score,
          late_payment_count_12mo = EXCLUDED.late_payment_count_12mo,
          autopay_flag = EXCLUDED.autopay_flag,
          current_rate = EXCLUDED.current_rate,
          market_rate = EXCLUDED.market_rate,
          rate_gap_pct = EXCLUDED.rate_gap_pct,
          unit_size = EXCLUDED.unit_size,
          has_insurance = EXCLUDED.has_insurance,
          sensitivity_score = EXCLUDED.sensitivity_score,
          bucket = EXCLUDED.bucket,
          factors = EXCLUDED.factors,
          computed_at = NOW()
      `;

      facilitySet.add(String(tenant.facility_id));
      scored++;
    } catch {
      errors++;
    }
  }

  return { scored, facilitiesProcessed: facilitySet.size, errors };
}
