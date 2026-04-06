import { db } from "@/lib/db";

/**
 * Shared facility-level queries used by revenue-loss and other routes.
 *
 * PMS-specific queries (units, snapshots, tenant rates, aging, revenue history,
 * rent roll) live in @/lib/facility-pms-queries — re-exported below for a
 * single import point.
 */

// Re-export every PMS query so consumers can import from one place
export {
  queryUnitsWithOccupancy,
  queryUnitsWithRevenue,
  queryUnitsWithVacancy,
  querySnapshots,
  queryTenantRates,
  queryTenantRatesDetailed,
  queryAgingLatest,
  queryAgingSummary,
  queryAgingAll,
  queryRevenueHistoryAsc,
  queryRevenueHistoryDesc,
  queryRentRollLatest,
} from "@/lib/facility-pms-queries";

/* ------------------------------------------------------------------ */
/*  Facility-level queries (not PMS-specific)                         */
/* ------------------------------------------------------------------ */

/** Fetch a single facility row by ID. */
export function queryFacility(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM facilities WHERE id = ${facilityId}::uuid`;
}

/** Fetch market intelligence data for a facility. */
export function queryMarketIntel(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM facility_market_intel WHERE facility_id = ${facilityId}::uuid`;
}

/** Fetch active PMS specials for a facility. */
export function queryActiveSpecials(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM facility_pms_specials WHERE facility_id = ${facilityId}::uuid AND active = true`;
}
