/**
 * Partner revenue-share computation — the single source of truth.
 *
 * Model: a partner / management organization earns a tiered percentage on the
 * gross MRR of the facilities in its own org. Tiers are keyed by facility count
 * (more facilities → higher rate). This matches the white-label management-co
 * positioning and the count-based tier design.
 *
 * `gross MRR` is computed from a per-facility rev-share basis (`REV_SHARE_FACILITY_MRR`).
 * This is the StorageAds subscription MRR the share is paid against. It is a single
 * named constant on purpose: the basis is not yet derived from the org's actual
 * billed plan (Launch/Growth/Portfolio), so we do not read `organizations.plan`
 * here. When that mapping lands, swap this basis for the org's real billed MRR —
 * the rest of the math is unchanged.
 *
 * Everything in this file is pure (no I/O) so it can be unit-tested and shared by
 * the read API and the monthly payout cron without divergence.
 */

export interface RevShareTier {
  /** Tier label shown in the partner UI. */
  name: "Bronze" | "Silver" | "Gold" | "Platinum";
  /** Inclusive lower bound of facility count for this tier. */
  min: number;
  /** Inclusive upper bound; `null` = unbounded (top tier). */
  max: number | null;
  /** Revenue-share percentage (e.g. 20 = 20%). */
  pct: number;
}

/** Tier table — canonical. The partner UI renders icons/colors keyed by `name`. */
export const REV_SHARE_TIERS: readonly RevShareTier[] = [
  { name: "Bronze", min: 1, max: 10, pct: 20 },
  { name: "Silver", min: 11, max: 25, pct: 25 },
  { name: "Gold", min: 26, max: 50, pct: 30 },
  { name: "Platinum", min: 51, max: null, pct: 35 },
] as const;

/** Per-facility monthly recurring revenue the rev-share is computed against (USD). */
export const REV_SHARE_FACILITY_MRR = 99;

/**
 * Resolve the tier for a facility count. Counts below the first tier's `min`
 * (i.e. 0 facilities) resolve to the first tier so the UI always has a tier to
 * render; earnings on 0 facilities are still 0.
 */
export function resolveTier(facilityCount: number): RevShareTier {
  for (const tier of REV_SHARE_TIERS) {
    const underMax = tier.max === null || facilityCount <= tier.max;
    if (facilityCount >= tier.min && underMax) return tier;
  }
  // Above every bound is impossible (top tier is unbounded); below the first
  // bound falls through to here.
  return facilityCount >= REV_SHARE_TIERS[REV_SHARE_TIERS.length - 1].min
    ? REV_SHARE_TIERS[REV_SHARE_TIERS.length - 1]
    : REV_SHARE_TIERS[0];
}

/** The next tier up from the current facility count, or `null` at the top tier. */
export function getNextTier(facilityCount: number): RevShareTier | null {
  const current = resolveTier(facilityCount);
  const idx = REV_SHARE_TIERS.findIndex((t) => t.name === current.name);
  return idx >= 0 && idx < REV_SHARE_TIERS.length - 1
    ? REV_SHARE_TIERS[idx + 1]
    : null;
}

/**
 * The effective rev-share percentage. An explicit per-org override
 * (`organizations.rev_share_pct`, set when `rev_share_tier` is not "auto")
 * wins; otherwise the tier rate for the facility count applies.
 */
export function resolvePct(
  facilityCount: number,
  override?: number | null,
): number {
  if (override != null && Number.isFinite(override) && override > 0) {
    return override;
  }
  return resolveTier(facilityCount).pct;
}

export interface EarningsInput {
  facilityCount: number;
  /** Effective percentage (already resolved via `resolvePct`). */
  pct: number;
  /** Per-facility MRR basis; defaults to `REV_SHARE_FACILITY_MRR`. */
  facilityMrr?: number;
}

export interface Earnings {
  grossMrr: number;
  pct: number;
  monthlyEarnings: number;
  annualEarnings: number;
}

/** Compute gross MRR and rev-share earnings. Rounds money to whole cents. */
export function computeEarnings({
  facilityCount,
  pct,
  facilityMrr = REV_SHARE_FACILITY_MRR,
}: EarningsInput): Earnings {
  const count = Math.max(0, Math.floor(facilityCount));
  const grossMrr = count * facilityMrr;
  const monthlyEarnings = round2(grossMrr * (pct / 100));
  return {
    grossMrr,
    pct,
    monthlyEarnings,
    annualEarnings: round2(monthlyEarnings * 12),
  };
}

/**
 * Convenience: resolve tier + pct + earnings for an org in one call.
 * `overridePct` is the org's stored `rev_share_pct` (or null/undefined for auto).
 */
export function summarize(
  facilityCount: number,
  overridePct?: number | null,
  facilityMrr: number = REV_SHARE_FACILITY_MRR,
): Earnings & { tier: RevShareTier; nextTier: RevShareTier | null } {
  const tier = resolveTier(facilityCount);
  const pct = resolvePct(facilityCount, overridePct);
  return {
    tier,
    nextTier: getNextTier(facilityCount),
    ...computeEarnings({ facilityCount, pct, facilityMrr }),
  };
}

/**
 * Payout period key "YYYY-MM" for a given date. Pure (takes the date in) so it
 * can be unit-tested. Uses UTC to keep period boundaries stable across regions.
 */
export function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
