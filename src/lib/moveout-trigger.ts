import type { Prisma, PrismaClient } from "@prisma/client";

type DbExecutor = PrismaClient | Prisma.TransactionClient;

export interface MoveoutEnrollmentResult {
  enrolled: boolean;
  reason?: "not_moved_out" | "tenant_not_found";
}

export interface MoveoutEnrollmentOptions {
  offer_type?: string;
  offer_value?: number;
  offset_days?: number;
}

/**
 * Enrolls a tenant into the moveout_remarketing win-back sequence if they are
 * in a moved-out state. Idempotent via ON CONFLICT (tenant_id).
 *
 * Roadmap 05 Phase 1 (revised): the single source of truth for win-back
 * enrollment. Callers from admin actions, v1 imports, and bulk processors
 * should route through this helper rather than inline INSERT statements.
 */
export async function enrollIfMovedOut(
  client: DbExecutor,
  tenantId: string,
  opts: MoveoutEnrollmentOptions = {},
): Promise<MoveoutEnrollmentResult> {
  const tenant = await client.tenants.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      facility_id: true,
      moved_out_date: true,
      move_out_reason: true,
      status: true,
    },
  });

  if (!tenant) return { enrolled: false, reason: "tenant_not_found" };
  if (tenant.status !== "moved_out" || !tenant.moved_out_date) {
    return { enrolled: false, reason: "not_moved_out" };
  }

  const offerType = opts.offer_type ?? "discount";
  const offerValue = opts.offer_value ?? 0;
  const offsetDays = opts.offset_days ?? 3;
  const moveOutReason = tenant.move_out_reason ?? "voluntary";

  await client.$executeRaw`
    INSERT INTO moveout_remarketing (tenant_id, facility_id, moved_out_date, move_out_reason,
      sequence_status, next_send_at, offer_type, offer_value)
    VALUES (${tenant.id}::uuid, ${tenant.facility_id}::uuid, ${tenant.moved_out_date}::date,
      ${moveOutReason}, 'active', NOW() + (${offsetDays.toString()} || ' days')::INTERVAL,
      ${offerType}, ${offerValue})
    ON CONFLICT (tenant_id) DO NOTHING
  `;

  return { enrolled: true };
}

/**
 * Returns true when a tenant update transitions them from active (or any
 * non-moved-out state) into moved_out for the first time. Use BEFORE applying
 * the update to capture the prior state, then call enrollIfMovedOut after the
 * update completes if this returns true.
 */
export function isMoveOutTransition(
  before: { status?: string | null; moved_out_date?: Date | string | null } | null,
  after: { status?: string | null; moved_out_date?: Date | string | null },
): boolean {
  const beforeMovedOut =
    before?.status === "moved_out" && Boolean(before?.moved_out_date);
  const afterMovedOut =
    after.status === "moved_out" && Boolean(after.moved_out_date);
  return !beforeMovedOut && afterMovedOut;
}
