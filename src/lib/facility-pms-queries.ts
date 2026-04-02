import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Shared PMS queries used across occupancy-intelligence, revenue-intelligence,
 * and revenue-loss API routes.
 *
 * Each function runs a single parameterised query and returns untyped rows.
 */

/* -- facility_pms_units with occupancy + revenue computations -- */

export function queryUnitsWithOccupancy(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT *,
      CASE WHEN total_count > 0
        THEN ROUND((occupied_count::numeric / total_count * 100), 1)
        ELSE 0 END as physical_occ_pct,
      (total_count * COALESCE(street_rate, 0)) as gross_potential,
      (occupied_count * COALESCE(actual_avg_rate, street_rate, 0)) as actual_revenue,
      CASE WHEN total_count > 0 AND street_rate > 0
        THEN ROUND((occupied_count * COALESCE(actual_avg_rate, street_rate, 0)) / (total_count * street_rate) * 100, 1)
        ELSE 0 END as economic_occ_pct,
      (total_count - occupied_count) as vacant_count,
      CASE WHEN occupied_count > 0 AND actual_avg_rate > 0 AND street_rate > 0
        THEN ROUND(((street_rate - actual_avg_rate) * occupied_count)::numeric, 2)
        ELSE 0 END as rate_gap_loss,
      CASE WHEN total_count > 0
        THEN ROUND(((total_count - occupied_count)::numeric / total_count * COALESCE(street_rate, 0))::numeric, 2)
        ELSE 0 END as vacancy_cost_per_unit_type
    FROM facility_pms_units
    WHERE facility_id = ${facilityId}::uuid
    ORDER BY sqft ASC NULLS LAST, street_rate ASC`;
}

export function queryUnitsWithRevenue(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT *,
      (total_count * COALESCE(street_rate, 0)) as gross_potential,
      (occupied_count * COALESCE(actual_avg_rate, street_rate, 0)) as actual_revenue,
      ((total_count - occupied_count) * COALESCE(street_rate, 0)) as lost_revenue,
      CASE WHEN street_rate > 0 AND actual_avg_rate > 0
        THEN ROUND((actual_avg_rate / street_rate * 100)::numeric, 1)
        ELSE NULL END as rate_capture_pct,
      CASE WHEN total_count > 0 AND street_rate > 0
        THEN ROUND((occupied_count * COALESCE(actual_avg_rate, street_rate, 0)) / (total_count * street_rate) * 100, 1)
        ELSE NULL END as economic_occupancy
    FROM facility_pms_units
    WHERE facility_id = ${facilityId}::uuid
    ORDER BY sqft ASC NULLS LAST, street_rate ASC`;
}

export function queryUnitsWithVacancy(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT *, (total_count - occupied_count) as vacant_count,
      (total_count * COALESCE(street_rate, 0)) as gross_potential,
      ((total_count - occupied_count) * COALESCE(street_rate, 0)) as vacant_lost_monthly
    FROM facility_pms_units WHERE facility_id = ${facilityId}::uuid ORDER BY sqft ASC NULLS LAST`;
}

/* -- snapshots -- */

export function querySnapshots(facilityId: string, limit = 90) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM facility_pms_snapshots
     WHERE facility_id = ${facilityId}::uuid
     ORDER BY snapshot_date DESC
     LIMIT ${limit}`;
}

/* -- tenant rates -- */

export function queryTenantRates(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM facility_pms_tenant_rates
     WHERE facility_id = ${facilityId}::uuid
     ORDER BY rate_variance ASC`;
}

export function queryTenantRatesDetailed(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT unit, unit_type, size_label, tenant_name,
      standard_rate, actual_rate, paid_rate, rate_variance,
      discount, discount_desc, days_as_tenant,
      ecri_flag, ecri_suggested, ecri_revenue_lift, moved_in
    FROM facility_pms_tenant_rates
    WHERE facility_id = ${facilityId}::uuid
    ORDER BY rate_variance ASC`;
}

/* -- aging -- */

export function queryAgingLatest(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM facility_pms_aging
     WHERE facility_id = ${facilityId}::uuid
       AND snapshot_date = (SELECT MAX(snapshot_date) FROM facility_pms_aging WHERE facility_id = ${facilityId}::uuid)`;
}

export function queryAgingSummary(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT
      COUNT(*) as delinquent_count,
      SUM(bucket_0_30) as total_0_30,
      SUM(bucket_31_60) as total_31_60,
      SUM(bucket_61_90) as total_61_90,
      SUM(bucket_91_120) as total_91_120,
      SUM(bucket_120_plus) as total_120_plus,
      SUM(total) as total_outstanding,
      COUNT(CASE WHEN move_out_date IS NOT NULL THEN 1 END) as moved_out_count
    FROM facility_pms_aging
    WHERE facility_id = ${facilityId}::uuid
      AND snapshot_date = (SELECT MAX(snapshot_date) FROM facility_pms_aging WHERE facility_id = ${facilityId}::uuid)`;
}

export function queryAgingAll(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM facility_pms_aging WHERE facility_id = ${facilityId}::uuid ORDER BY total DESC`;
}

/* -- revenue history -- */

const MONTH_ORDER_CASE = Prisma.raw(`CASE month
  WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
  WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
  WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
  WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
END`);

export function queryRevenueHistoryAsc(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM facility_pms_revenue_history
     WHERE facility_id = ${facilityId}::uuid
     ORDER BY year ASC, ${MONTH_ORDER_CASE} ASC`;
}

export function queryRevenueHistoryDesc(facilityId: string, limit = 24) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM facility_pms_revenue_history
     WHERE facility_id = ${facilityId}::uuid
     ORDER BY year DESC, ${MONTH_ORDER_CASE} DESC
     LIMIT ${limit}`;
}

/* -- rent roll (latest snapshot) -- */

export function queryRentRollLatest(facilityId: string) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT unit, size_label, tenant_name, rent_rate, total_due, days_past_due, paid_thru
     FROM facility_pms_rent_roll
     WHERE facility_id = ${facilityId}::uuid
       AND snapshot_date = (SELECT MAX(snapshot_date) FROM facility_pms_rent_roll WHERE facility_id = ${facilityId}::uuid)
     ORDER BY days_past_due DESC`;
}
