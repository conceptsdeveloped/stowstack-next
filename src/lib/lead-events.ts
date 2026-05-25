import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type DbExecutor = PrismaClient | Prisma.TransactionClient;

export type LeadStatus =
  | "partial"
  | "inquiry"
  | "qualified"
  | "tour_booked"
  | "tour_completed"
  | "moved_in"
  | "tenured"
  | "moved_out"
  | "churned"
  | "not_qualified"
  | "duplicate"
  | "spam"
  | "no_response";

export type LeadEventSource =
  | "phone_call"
  | "chat"
  | "form"
  | "audit_tool"
  | "pms_import"
  | "manual"
  | "system";

export interface RecordLeadEventOptions {
  toStatus: LeadStatus;
  source?: LeadEventSource;
  sourceRefId?: string;
  changedBy?: string;
  notes?: string;
}

export interface LeadEventResult {
  recorded: boolean;
  fromStatus: string | null;
  reason?: "lead_not_found" | "noop_same_status";
}

/**
 * Record a lead status transition and update partial_leads.lead_status atomically.
 * Idempotent on identical (from → to) — if the lead is already at toStatus, no
 * event is recorded.
 *
 * Roadmap 10 phase 1 (revised): the canonical entry point for lead status
 * changes. Future Phase 2 (PMS-to-lead matching) and Phase 5 (channel ROI
 * reporting) both read from lead_status_events.
 */
export async function recordLeadStatusEvent(
  client: DbExecutor,
  partialLeadId: string,
  opts: RecordLeadEventOptions,
): Promise<LeadEventResult> {
  const lead = await client.partial_leads.findUnique({
    where: { id: partialLeadId },
    select: { id: true, lead_status: true },
  });

  if (!lead) return { recorded: false, fromStatus: null, reason: "lead_not_found" };

  const fromStatus = lead.lead_status ?? null;
  if (fromStatus === opts.toStatus) {
    return { recorded: false, fromStatus, reason: "noop_same_status" };
  }

  await client.$executeRaw`
    INSERT INTO lead_status_events
      (partial_lead_id, from_status, to_status, source, source_ref_id, changed_by, notes)
    VALUES
      (${partialLeadId}::uuid, ${fromStatus}, ${opts.toStatus},
       ${opts.source ?? null}, ${opts.sourceRefId ?? null}::uuid,
       ${opts.changedBy ?? null}, ${opts.notes ?? null})
  `;

  await client.$executeRaw`
    UPDATE partial_leads
    SET lead_status = ${opts.toStatus},
        status_updated_at = NOW(),
        updated_at = NOW()
    WHERE id = ${partialLeadId}::uuid
  `;

  return { recorded: true, fromStatus };
}

/**
 * Convenience: record that a tenant in PMS matched this lead. Sets
 * matched_tenant_id and emits a "moved_in" status event.
 */
export async function markLeadAsMatchedTenant(
  client: DbExecutor,
  partialLeadId: string,
  tenantId: string,
  opts: { changedBy?: string; notes?: string } = {},
): Promise<LeadEventResult> {
  await client.$executeRaw`
    UPDATE partial_leads
    SET matched_tenant_id = ${tenantId}::uuid,
        converted = true,
        converted_at = COALESCE(converted_at, NOW()),
        updated_at = NOW()
    WHERE id = ${partialLeadId}::uuid
  `;

  return recordLeadStatusEvent(client, partialLeadId, {
    toStatus: "moved_in",
    source: "pms_import",
    sourceRefId: tenantId,
    changedBy: opts.changedBy ?? "system",
    notes: opts.notes,
  });
}
