import { db } from "@/lib/db";

/**
 * ECRI (Existing Customer Rate Increase) engine.
 *
 * Tenant-centric: driven by the live `tenants` roster (which carries a real
 * tenant_id), enriched with the latest `tenant_sensitivity_features` snapshot
 * (native FK join — no fragile unit-string matching) and the latest ECRI-type
 * `upsell_opportunities` row for status tracking.
 *
 * The recommended increase is sensitivity-aware: a sticky (low-sensitivity)
 * tenant can absorb a larger raise than a flight-risk (high-sensitivity) one,
 * so the per-bucket cap below directly shapes the suggested rate.
 */

export type EcriRisk = "low" | "medium" | "higher";
export type EcriStatus = "pending" | "scheduled" | "sent" | "done";

export const ECRI_STATUSES: EcriStatus[] = [
  "pending",
  "scheduled",
  "sent",
  "done",
];

/** Max fraction of the current rate we'll suggest raising, by sensitivity bucket. */
export const SENSITIVITY_CAPS: Record<string, number> = {
  very_low: 0.12,
  low: 0.1,
  medium: 0.07,
  high: 0.05,
};
export const DEFAULT_CAP = 0.08;

/** Notice period (days) before a rate increase takes effect. */
export const DEFAULT_NOTICE_DAYS = 45;

export function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v) || 0;
  const obj = v as { toNumber?: () => number };
  if (typeof obj.toNumber === "function") return obj.toNumber();
  return Number(v) || 0;
}

/** Whole-month tenure from PMS days, falling back to the move-in date. */
export function tenureMonthsFrom(
  daysAsTenant: unknown,
  moveIn: unknown,
  now = Date.now(),
): number {
  const days = num(daysAsTenant);
  if (days > 0) return Math.floor(days / 30);
  if (moveIn) {
    const ms = new Date(String(moveIn)).getTime();
    if (!Number.isNaN(ms)) {
      const elapsedDays = (now - ms) / 86_400_000;
      if (elapsedDays > 0) return Math.floor(elapsedDays / 30);
    }
  }
  return 0;
}

/**
 * Suggested new rate: raise toward market but never above it, and never more
 * than the sensitivity-bucket cap. `eligible` is false when the tenant is at or
 * above market, or the resulting raise rounds to less than $1.
 */
export function suggestRate(
  current: number,
  market: number,
  bucket: string | null,
): { suggested: number; monthlyLift: number; capPct: number; eligible: boolean } {
  const capPct =
    bucket && SENSITIVITY_CAPS[bucket] !== undefined
      ? SENSITIVITY_CAPS[bucket]
      : DEFAULT_CAP;

  if (!(current > 0) || !(market > 0) || market <= current) {
    return { suggested: Math.round(current), monthlyLift: 0, capPct, eligible: false };
  }

  const target = Math.min(market, current * (1 + capPct));
  const suggested = Math.round(target);
  const monthlyLift = Math.max(0, suggested - current);
  return { suggested, monthlyLift, capPct, eligible: monthlyLift >= 1 };
}

/** Map a sensitivity bucket to a 3-level risk label (null when bucket unknown). */
export function riskFromBucket(bucket: string | null): EcriRisk | null {
  switch (bucket) {
    case "very_low":
    case "low":
      return "low";
    case "medium":
      return "medium";
    case "high":
      return "higher";
    default:
      return null;
  }
}

/** Tenure-only fallback when no sensitivity snapshot exists for the tenant. */
export function riskFromTenure(tenureMonths: number): EcriRisk {
  if (tenureMonths >= 24) return "low";
  if (tenureMonths >= 6) return "medium";
  return "higher";
}

export function resolveRisk(
  bucket: string | null,
  tenureMonths: number,
): EcriRisk {
  return riskFromBucket(bucket) ?? riskFromTenure(tenureMonths);
}

/** Normalize a stored upsell status into the ECRI lifecycle. */
export function normalizeStatus(raw: unknown): EcriStatus {
  const s = String(raw ?? "").toLowerCase();
  return (ECRI_STATUSES as string[]).includes(s) ? (s as EcriStatus) : "pending";
}

export interface EcriCandidate {
  tenantId: string;
  tenantName: string | null;
  email: string | null;
  unit: string | null;
  sizeLabel: string | null;
  unitType: string | null;
  currentRate: number;
  marketRate: number | null;
  suggestedRate: number;
  monthlyLift: number;
  liftPct: number | null;
  tenureMonths: number;
  monthsSinceLastIncrease: number | null;
  sensitivityBucket: string | null;
  sensitivityScore: number | null;
  risk: EcriRisk;
  status: EcriStatus;
  sentAt: string | null;
}

export interface EcriFacilityResult {
  facilityId: string;
  count: number;
  worked: number;
  totalMonthlyLift: number;
  totalAnnualLift: number;
  tenants: EcriCandidate[];
}

/**
 * Build the ECRI candidate list for a single facility. Pulls active tenants,
 * their latest sensitivity snapshot, and their latest ECRI tracking record in
 * one round-trip, then computes the sensitivity-aware recommendation per tenant
 * and keeps only those that are under market with a meaningful raise.
 */
export async function computeEcriForFacility(
  facilityId: string,
  now = Date.now(),
): Promise<EcriFacilityResult> {
  const rows = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT
      t.id::text          AS tenant_id,
      t.name              AS tenant_name,
      t.email             AS email,
      t.unit_number       AS unit,
      t.unit_size         AS size_label,
      t.unit_type         AS unit_type,
      t.monthly_rate      AS current_rate,
      t.move_in_date      AS move_in_date,
      s.market_rate       AS market_rate,
      s.bucket            AS bucket,
      s.sensitivity_score AS sensitivity_score,
      s.tenure_months     AS tenure_months,
      s.months_since_last_increase AS months_since_last_increase,
      u.status            AS ecri_status,
      u.sent_at           AS ecri_sent_at
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT market_rate, bucket, sensitivity_score, tenure_months,
             months_since_last_increase
      FROM tenant_sensitivity_features sf
      WHERE sf.tenant_id = t.id
      ORDER BY sf.snapshot_date DESC
      LIMIT 1
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT status, sent_at
      FROM upsell_opportunities uo
      WHERE uo.tenant_id = t.id AND uo.type = 'ecri'
      ORDER BY uo.created_at DESC
      LIMIT 1
    ) u ON true
    WHERE t.facility_id = ${facilityId}::uuid
      AND t.status = 'active'
      AND t.deleted_at IS NULL
    ORDER BY t.unit_number ASC`;

  const tenants: EcriCandidate[] = [];

  for (const r of rows) {
    const current = num(r.current_rate);
    const market = r.market_rate !== null ? num(r.market_rate) : 0;
    const bucket = (r.bucket as string) || null;
    const { suggested, monthlyLift, eligible } = suggestRate(
      current,
      market,
      bucket,
    );
    if (!eligible) continue;

    const tenureMonths =
      r.tenure_months !== null && r.tenure_months !== undefined
        ? num(r.tenure_months)
        : tenureMonthsFrom(null, r.move_in_date, now);

    tenants.push({
      tenantId: String(r.tenant_id),
      tenantName: (r.tenant_name as string) ?? null,
      email: (r.email as string) ?? null,
      unit: (r.unit as string) ?? null,
      sizeLabel: (r.size_label as string) ?? null,
      unitType: (r.unit_type as string) ?? null,
      currentRate: current,
      marketRate: market > 0 ? market : null,
      suggestedRate: suggested,
      monthlyLift,
      liftPct:
        current > 0
          ? Math.round(((suggested - current) / current) * 1000) / 10
          : null,
      tenureMonths,
      monthsSinceLastIncrease:
        r.months_since_last_increase !== null &&
        r.months_since_last_increase !== undefined
          ? num(r.months_since_last_increase)
          : null,
      sensitivityBucket: bucket,
      sensitivityScore:
        r.sensitivity_score !== null && r.sensitivity_score !== undefined
          ? num(r.sensitivity_score)
          : null,
      risk: resolveRisk(bucket, tenureMonths),
      status: normalizeStatus(r.ecri_status),
      sentAt: r.ecri_sent_at ? new Date(String(r.ecri_sent_at)).toISOString() : null,
    });
  }

  tenants.sort((a, b) => b.monthlyLift - a.monthlyLift);

  const totalMonthlyLift = tenants.reduce((s, t) => s + t.monthlyLift, 0);
  const worked = tenants.filter(
    (t) => t.status === "sent" || t.status === "done",
  ).length;

  return {
    facilityId,
    count: tenants.length,
    worked,
    totalMonthlyLift,
    totalAnnualLift: totalMonthlyLift * 12,
    tenants,
  };
}

export interface EcriPortfolioRow {
  facilityId: string;
  facilityName: string;
  location: string | null;
  count: number;
  worked: number;
  totalMonthlyLift: number;
  totalAnnualLift: number;
}

export interface EcriPortfolioResult {
  facilities: EcriPortfolioRow[];
  totalCandidates: number;
  totalMonthlyLift: number;
  totalAnnualLift: number;
}

/** Aggregate ECRI opportunity across every active, non-deleted facility. */
export async function computeEcriPortfolio(
  now = Date.now(),
): Promise<EcriPortfolioResult> {
  const facilities = await db.facilities.findMany({
    where: { deleted_at: null },
    select: { id: true, name: true, location: true },
    orderBy: { name: "asc" },
  });

  const rows: EcriPortfolioRow[] = await Promise.all(
    facilities.map(async (f) => {
      const result = await computeEcriForFacility(f.id, now);
      return {
        facilityId: f.id,
        facilityName: f.name,
        location: f.location ?? null,
        count: result.count,
        worked: result.worked,
        totalMonthlyLift: result.totalMonthlyLift,
        totalAnnualLift: result.totalAnnualLift,
      };
    }),
  );

  rows.sort((a, b) => b.totalAnnualLift - a.totalAnnualLift);

  return {
    facilities: rows,
    totalCandidates: rows.reduce((s, r) => s + r.count, 0),
    totalMonthlyLift: rows.reduce((s, r) => s + r.totalMonthlyLift, 0),
    totalAnnualLift: rows.reduce((s, r) => s + r.totalAnnualLift, 0),
  };
}

const USD = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

/**
 * Generate a professional rate-increase notice letter. Pure and deterministic —
 * the caller resolves dates and rates and passes them in, so it's trivially
 * testable and carries no clock or I/O.
 */
export function buildRateIncreaseLetter(input: {
  tenantName: string;
  unit: string;
  currentRate: number;
  newRate: number;
  effectiveDate: string;
  noticeDays: number;
  facilityName: string;
  facilityLocation?: string | null;
  facilityPhone?: string | null;
  letterDate: string;
}): { subject: string; body: string } {
  const {
    tenantName,
    unit,
    currentRate,
    newRate,
    effectiveDate,
    noticeDays,
    facilityName,
    facilityLocation,
    facilityPhone,
    letterDate,
  } = input;

  const subject = `Notice of Rate Adjustment — Unit ${unit}`;
  const contactLine = facilityPhone
    ? `If you have any questions, please reach us at ${facilityPhone}.`
    : `If you have any questions, please contact the office.`;

  const body = [
    letterDate,
    "",
    `Dear ${tenantName || "Valued Customer"},`,
    "",
    `Thank you for being a valued customer at ${facilityName}${
      facilityLocation ? ` in ${facilityLocation}` : ""
    }.`,
    "",
    `This letter serves as your ${noticeDays}-day notice that, effective ${effectiveDate}, the monthly rental rate for your unit (${unit}) will change from ${USD(
      currentRate,
    )} to ${USD(newRate)} per month.`,
    "",
    "This adjustment reflects current market conditions and our continued investment in the security, cleanliness, and upkeep of the facility. Your unit, gate access, autopay, and any insurance arrangements remain unchanged.",
    "",
    "No action is required on your part. If you are enrolled in autopay, the new amount will be reflected automatically beginning with the effective date above.",
    "",
    contactLine,
    "We appreciate your continued business.",
    "",
    "Sincerely,",
    `${facilityName} Management`,
  ].join("\n");

  return { subject, body };
}
