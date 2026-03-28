import { NextRequest } from "next/server";
import { db } from "./db";
import type { Session } from "./session-auth";

interface AuditParams {
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export function logAudit(
  req: NextRequest,
  session: Session | null,
  params: AuditParams
): void {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = req.headers.get("user-agent") || null;
  const orgId = session?.organization?.id || null;
  const userId = session?.user?.id || null;
  const meta = params.metadata ? JSON.stringify(params.metadata) : null;

  // Fire-and-forget — don't block the request
  db.$executeRaw`
    INSERT INTO audit_log (organization_id, user_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
    VALUES (${orgId}, ${userId}, ${params.action}, ${params.resourceType || null}, ${params.resourceId || null}, ${meta}::jsonb, ${ip}, ${ua})
  `.catch(() => {});
}
