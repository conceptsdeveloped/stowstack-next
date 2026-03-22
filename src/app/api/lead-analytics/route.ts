import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, requireAdminKey } from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const totalLeads = await db.facilities.count();

    // Pipeline stage counts
    const stages = ["diagnostic_submitted", "submitted", "audit_generated", "audit_sent", "form_sent", "form_completed", "call_scheduled", "client_signed", "lost"];
    const stageDistribution: Record<string, number> = {};

    for (const stage of stages) {
      stageDistribution[stage] = await db.facilities.count({
        where: { pipeline_status: stage },
      });
    }

    const signed = stageDistribution["client_signed"] || 0;
    const lost = stageDistribution["lost"] || 0;
    const conversionRate = totalLeads > 0 ? ((signed / totalLeads) * 100).toFixed(1) : "0";
    const lostRate = totalLeads > 0 ? ((lost / totalLeads) * 100).toFixed(1) : "0";

    // Weekly velocity (last 8 weeks)
    const weeklyVelocity = await db.$queryRaw<
      Array<{ week: string; count: bigint }>
    >`
      SELECT date_trunc('week', created_at)::text as week, COUNT(*) as count
      FROM facilities
      WHERE created_at > NOW() - INTERVAL '8 weeks'
      GROUP BY week
      ORDER BY week ASC
    `;

    return jsonResponse({
      totalLeads,
      funnel: stageDistribution,
      conversionRate,
      lostRate,
      stageDistribution,
      weeklyVelocity: weeklyVelocity.map((w) => ({
        week: w.week,
        count: Number(w.count),
      })),
    }, 200, origin);
  } catch (err) {
    console.error("Lead analytics error:", err);
    return errorResponse("Failed to fetch analytics", 500, origin);
  }
}
