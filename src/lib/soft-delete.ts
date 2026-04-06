import { db } from "@/lib/db";

/**
 * Soft Delete Utilities
 *
 * Models with soft delete support: organizations, facilities, clients, tenants
 *
 * IMPORTANT: Soft delete does NOT automatically filter queries. When querying
 * these models, add `deleted_at: null` to your where clause to exclude
 * soft-deleted records:
 *
 *   await db.facilities.findMany({
 *     where: { deleted_at: null, ...otherFilters },
 *   });
 *
 * To find only deleted records, use:
 *
 *   await db.facilities.findMany({
 *     where: { deleted_at: { not: null } },
 *   });
 */

/** Models that support soft delete */
export type SoftDeleteModel =
  | "organizations"
  | "facilities"
  | "clients"
  | "tenants";

/**
 * Soft-delete a record by setting deleted_at to now.
 * Does NOT actually remove the row from the database.
 */
export async function softDelete(
  model: SoftDeleteModel,
  id: string,
  deletedBy?: string,
) {
  const data: { deleted_at: Date; deleted_by?: string } = {
    deleted_at: new Date(),
  };
  if (deletedBy) {
    data.deleted_by = deletedBy;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any)[model].update({
    where: { id },
    data,
  });
}

/**
 * Restore a soft-deleted record by clearing deleted_at and deleted_by.
 */
export async function restore(model: SoftDeleteModel, id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any)[model].update({
    where: { id },
    data: { deleted_at: null, deleted_by: null },
  });
}

/**
 * Where-clause fragment to exclude soft-deleted records.
 * Spread into your where clause:
 *
 *   await db.facilities.findMany({ where: { ...notDeleted(), status: "active" } });
 */
export function notDeleted() {
  return { deleted_at: null } as const;
}

/**
 * Where-clause fragment to find only soft-deleted records.
 */
export function onlyDeleted() {
  return { deleted_at: { not: null } } as const;
}
