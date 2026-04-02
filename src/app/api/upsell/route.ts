import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

interface TenantForUpsell {
  id: string;
  facility_id: string;
  name: string;
  unit_number: string;
  unit_size: string | null;
  unit_type: string | null;
  monthly_rate: number | string;
  move_in_date: Date | string;
  lease_end_date: Date | string | null;
  autopay_enabled: boolean | null;
  has_insurance: boolean | null;
}

interface UpsellOpportunity {
  type: string;
  title: string;
  description: string;
  current_value: number;
  proposed_value: number;
  monthly_uplift: number;
  confidence: number;
}

function identifyUpsells(tenant: TenantForUpsell): UpsellOpportunity[] {
  const opportunities: UpsellOpportunity[] = [];

  if (!tenant.has_insurance) {
    opportunities.push({
      type: "insurance",
      title: "Add tenant protection plan",
      description: `${tenant.name} has no insurance on unit ${tenant.unit_number}. Recommend adding coverage.`,
      current_value: 0,
      proposed_value: 12,
      monthly_uplift: 12,
      confidence: 75,
    });
  }

  if (!tenant.autopay_enabled) {
    opportunities.push({
      type: "autopay",
      title: "Enroll in autopay",
      description: `${tenant.name} pays manually. Autopay reduces delinquency risk and improves retention.`,
      current_value: 0,
      proposed_value: 0,
      monthly_uplift: 0,
      confidence: 60,
    });
  }

  const tenureMonths = Math.floor(
    (Date.now() - new Date(tenant.move_in_date).getTime()) / (30 * 86400000),
  );
  const smallSizes = ["5x5", "5x10", "5x15"];
  if (
    tenant.unit_size &&
    smallSizes.some((s) => tenant.unit_size!.includes(s)) &&
    tenureMonths > 6
  ) {
    const currentRate = parseFloat(String(tenant.monthly_rate)) || 0;
    const proposedRate = Math.round(currentRate * 1.4);
    opportunities.push({
      type: "unit_upgrade",
      title: "Upgrade to larger unit",
      description: `${tenant.name} has been in a ${tenant.unit_size} for ${tenureMonths} months. May need more space.`,
      current_value: currentRate,
      proposed_value: proposedRate,
      monthly_uplift: proposedRate - currentRate,
      confidence: 45,
    });
  }

  if (
    tenant.unit_type === "standard" &&
    parseFloat(String(tenant.monthly_rate)) > 100
  ) {
    const currentRate = parseFloat(String(tenant.monthly_rate)) || 0;
    const proposedRate = Math.round(currentRate * 1.25);
    opportunities.push({
      type: "climate_upgrade",
      title: "Upgrade to climate-controlled",
      description: `${tenant.name} stores in a standard unit at $${currentRate}/mo. Climate protection adds value.`,
      current_value: currentRate,
      proposed_value: proposedRate,
      monthly_uplift: proposedRate - currentRate,
      confidence: 40,
    });
  }

  if (!tenant.lease_end_date && tenureMonths >= 6) {
    const currentRate = parseFloat(String(tenant.monthly_rate)) || 0;
    opportunities.push({
      type: "longer_term",
      title: "Lock in annual lease",
      description: `${tenant.name} is month-to-month after ${tenureMonths} months. Offer 5% discount for 12-month commitment.`,
      current_value: currentRate,
      proposed_value: Math.round(currentRate * 0.95),
      monthly_uplift: 0,
      confidence: 55,
    });
  }

  return opportunities;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "upsell");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const facilityId = req.nextUrl.searchParams.get("facilityId");
    const type = req.nextUrl.searchParams.get("type");
    const status = req.nextUrl.searchParams.get("status");

    const whereParts: Prisma.Sql[] = [Prisma.sql`1=1`];

    if (facilityId) {
      whereParts.push(Prisma.sql`uo.facility_id = ${facilityId}::uuid`);
    }
    if (type) {
      whereParts.push(Prisma.sql`uo.type = ${type}`);
    }
    if (status) {
      whereParts.push(Prisma.sql`uo.status = ${status}`);
    }

    const whereClause = Prisma.join(whereParts, " AND ");

    const opportunities = await db.$queryRaw<unknown[]>`SELECT uo.*, t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
              t.unit_number, t.unit_size, t.monthly_rate,
              f.name as facility_name, f.location as facility_location
       FROM upsell_opportunities uo
       JOIN tenants t ON t.id = uo.tenant_id
       JOIN facilities f ON f.id = uo.facility_id
       WHERE ${whereClause}
       ORDER BY uo.monthly_uplift DESC, uo.confidence DESC`;

    const statsWhereClause = facilityId
      ? Prisma.sql`WHERE facility_id = ${facilityId}::uuid`
      : Prisma.empty;

    const stats = await db.$queryRaw<unknown[]>`SELECT
         COUNT(*) as total_opportunities,
         COUNT(*) FILTER (WHERE status = 'identified') as pending_count,
         COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
         COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
         COUNT(*) FILTER (WHERE status = 'declined') as declined_count,
         SUM(monthly_uplift) FILTER (WHERE status = 'identified') as potential_mrr,
         SUM(monthly_uplift) FILTER (WHERE status = 'accepted') as captured_mrr,
         COUNT(DISTINCT type) as type_count,
         ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted','declined')), 0) * 100, 1) as acceptance_rate
       FROM upsell_opportunities
       ${statsWhereClause}`;

    return jsonResponse(
      { opportunities, stats: (stats as unknown[])[0] },
      200,
      origin,
    );
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin,
    );
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "upsell");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const { facilityId } = await req.json();

    const tenants = await db.tenants.findMany({
      where: {
        status: "active",
        ...(facilityId ? { facility_id: facilityId } : {}),
      },
    });

    let created = 0;

    for (const tenant of tenants) {
      const upsells = identifyUpsells(tenant as unknown as TenantForUpsell);
      for (const u of upsells) {
        const existing = await db.upsell_opportunities.findFirst({
          where: {
            tenant_id: tenant.id,
            type: u.type,
            status: { in: ["identified", "queued", "sent"] },
          },
        });
        if (!existing) {
          await db.upsell_opportunities.create({
            data: {
              tenant_id: tenant.id,
              facility_id: tenant.facility_id,
              type: u.type,
              title: u.title,
              description: u.description,
              current_value: u.current_value,
              proposed_value: u.proposed_value,
              monthly_uplift: u.monthly_uplift,
              confidence: u.confidence,
            },
          });
          created++;
        }
      }
    }

    return jsonResponse(
      { created, message: `Found ${created} new upsell opportunities` },
      200,
      origin,
    );
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin,
    );
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "upsell");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { id, ids, action, status, outreach_method } = body;

    if (Array.isArray(ids) && ids.length > 0) {
      if (action === "batch_send") {
        const method = outreach_method || "email";
        await db.$executeRaw`
          UPDATE upsell_opportunities SET status = 'sent', outreach_method = ${method}, sent_at = NOW(), updated_at = NOW()
          WHERE id = ANY(${ids}::uuid[]) AND status = 'identified'
        `;
        for (const oid of ids) {
          const opp = await db.upsell_opportunities.findUnique({
            where: { id: oid },
            select: { tenant_id: true, facility_id: true, title: true },
          });
          if (opp) {
            await db.tenant_communications.create({
              data: {
                tenant_id: opp.tenant_id,
                facility_id: opp.facility_id,
                channel: method,
                type: "upsell",
                subject: opp.title,
                related_id: oid,
                status: "sent",
              },
            });
          }
        }
        return jsonResponse({ updated: ids.length }, 200, origin);
      }
      if (action === "batch_status" && status) {
        const setClauses: Prisma.Sql[] = [Prisma.sql`status = ${status}`, Prisma.sql`updated_at = NOW()`];
        if (["accepted", "declined"].includes(status))
          setClauses.push(Prisma.sql`responded_at = NOW()`);
        await db.$executeRaw`UPDATE upsell_opportunities SET ${Prisma.join(setClauses)} WHERE id = ANY(${ids}::uuid[])`;
        return jsonResponse({ updated: ids.length }, 200, origin);
      }
      return errorResponse("Unknown batch action", 400, origin);
    }

    if (!id) return errorResponse("id or ids required", 400, origin);

    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [id];
    let pIdx = 2;

    if (status) {
      params.push(status);
      sets.push(`status = $${pIdx++}`);
      if (status === "sent") sets.push("sent_at = NOW()");
      if (["accepted", "declined"].includes(status))
        sets.push("responded_at = NOW()");
    }
    if (outreach_method) {
      params.push(outreach_method);
      sets.push(`outreach_method = $${pIdx++}`);
    }

    const rows = await db.$queryRawUnsafe<unknown[]>(
      `UPDATE upsell_opportunities SET ${sets.join(", ")} WHERE id = $1::uuid RETURNING *`,
      ...params,
    );

    const opp = (rows as Array<{
      tenant_id: string;
      facility_id: string;
      title: string;
    }>)[0];

    if (status === "sent" && opp) {
      await db.tenant_communications.create({
        data: {
          tenant_id: opp.tenant_id,
          facility_id: opp.facility_id,
          channel: outreach_method || "email",
          type: "upsell",
          subject: opp.title,
          related_id: id,
          status: "sent",
        },
      });
    }

    return jsonResponse({ opportunity: opp || null }, 200, origin);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin,
    );
  }
}
