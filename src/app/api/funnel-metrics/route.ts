import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/* ── GET: Aggregate funnel metrics across stages ── */
export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const denied = await requireAdminKey(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const funnelId = searchParams.get("funnelId");
  const facilityId = searchParams.get("facilityId");

  if (!funnelId && !facilityId) {
    return errorResponse("funnelId or facilityId is required", 400, origin);
  }

  try {
    if (funnelId) {
      // Get metrics for a single funnel
      const funnel = await db.funnels.findUnique({
        where: { id: funnelId },
        select: {
          id: true,
          name: true,
          archetype: true,
          status: true,
          config: true,
          created_at: true,
        },
      });
      if (!funnel) return errorResponse("Funnel not found", 404, origin);

      // Aggregate from related data
      const [variations, leads, stageMetrics, dripSequences] = await Promise.all([
        // Ad performance
        db.creative_performance.aggregate({
          where: { funnel_id: funnelId },
          _sum: { impressions: true, clicks: true, leads: true, move_ins: true, spend: true },
        }),
        // Lead counts by status
        db.partial_leads.groupBy({
          by: ["lead_status"],
          where: { funnel_id: funnelId },
          _count: true,
        }),
        // Stage metrics (from funnel_stage_metrics table)
        db.funnel_stage_metrics.findMany({
          where: { funnel_id: funnelId },
          orderBy: { period: "desc" },
          take: 90, // last 90 entries
        }),
        // Drip performance
        db.drip_sequences.groupBy({
          by: ["status"],
          where: { funnel_id: funnelId },
          _count: true,
        }),
      ]);

      const perf = variations._sum;
      const impressions = perf.impressions || 0;
      const clicks = perf.clicks || 0;
      const totalLeads = leads.reduce((sum, g) => sum + g._count, 0);
      const convertedLeads = leads.find((g) => g.lead_status === "converted")?._count || 0;
      const moveIns = perf.move_ins || 0;

      // Build stage-by-stage funnel visualization data
      const stages = [
        { stage: "impression", count: impressions, label: "Ad Impressions" },
        { stage: "click", count: clicks, label: "Ad Clicks", rate: impressions > 0 ? clicks / impressions : 0 },
        { stage: "page_view", count: stageMetrics.filter((m) => m.stage === "page_view").reduce((s, m) => s + m.count, 0) || clicks, label: "Page Views" },
        { stage: "form_start", count: stageMetrics.filter((m) => m.stage === "form_start").reduce((s, m) => s + m.count, 0), label: "Form Starts" },
        { stage: "conversion", count: convertedLeads || (perf.leads || 0), label: "Conversions" },
        { stage: "drip_active", count: dripSequences.find((g) => g.status === "active")?._count || 0, label: "In Drip Sequence" },
        { stage: "drip_completed", count: dripSequences.find((g) => g.status === "completed")?._count || 0, label: "Drip Completed" },
        { stage: "move_in", count: moveIns, label: "Move-Ins" },
      ];

      // Calculate drop-off rates between adjacent stages
      for (let i = 1; i < stages.length; i++) {
        const prev = stages[i - 1].count;
        if (prev > 0) {
          (stages[i] as Record<string, unknown>).dropOff = 1 - stages[i].count / prev;
          (stages[i] as Record<string, unknown>).rate = stages[i].count / prev;
        }
      }

      return jsonResponse(
        {
          funnel,
          summary: {
            totalSpend: perf.spend ? Number(perf.spend) : 0,
            impressions,
            clicks,
            ctr: impressions > 0 ? clicks / impressions : 0,
            totalLeads,
            convertedLeads,
            moveIns,
            costPerLead: totalLeads > 0 && perf.spend ? Number(perf.spend) / totalLeads : null,
            costPerMoveIn: moveIns > 0 && perf.spend ? Number(perf.spend) / moveIns : null,
          },
          stages,
          leadsByStatus: leads,
          dripsByStatus: dripSequences,
          dailyMetrics: stageMetrics,
        },
        200,
        origin
      );
    }

    // Facility-level: compare all funnels
    const funnels = await db.funnels.findMany({
      where: { facility_id: facilityId! },
      include: {
        _count: { select: { partial_leads: true, ad_variations: true } },
        creative_performance: {
          select: { impressions: true, clicks: true, leads: true, move_ins: true, spend: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const comparison = funnels.map((f) => {
      const perf = f.creative_performance.reduce(
        (acc, p) => ({
          impressions: acc.impressions + p.impressions,
          clicks: acc.clicks + p.clicks,
          leads: acc.leads + p.leads,
          moveIns: acc.moveIns + p.move_ins,
          spend: acc.spend + Number(p.spend),
        }),
        { impressions: 0, clicks: 0, leads: 0, moveIns: 0, spend: 0 }
      );

      return {
        id: f.id,
        name: f.name,
        archetype: f.archetype,
        status: f.status,
        created_at: f.created_at,
        leadCount: f._count.partial_leads,
        variationCount: f._count.ad_variations,
        ...perf,
        ctr: perf.impressions > 0 ? perf.clicks / perf.impressions : 0,
        conversionRate: perf.clicks > 0 ? perf.leads / perf.clicks : 0,
        costPerLead: perf.leads > 0 ? perf.spend / perf.leads : null,
      };
    });

    return jsonResponse({ funnels: comparison }, 200, origin);
  } catch (err) {
    console.error("[funnel-metrics GET]", err);
    return errorResponse("Internal server error", 500, origin);
  }
}

/* ── POST: Record a funnel stage event ── */
export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const { funnelId, stage } = body;

    if (!funnelId || !stage) {
      return errorResponse("funnelId and stage are required", 400, origin);
    }

    const today = new Date().toISOString().slice(0, 10); // "2026-04-12"

    await db.funnel_stage_metrics.upsert({
      where: {
        funnel_id_period_stage: {
          funnel_id: funnelId,
          period: today,
          stage,
        },
      },
      create: {
        funnel_id: funnelId,
        period: today,
        stage,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch (err) {
    console.error("[funnel-metrics POST]", err);
    return errorResponse("Internal server error", 500, origin);
  }
}
