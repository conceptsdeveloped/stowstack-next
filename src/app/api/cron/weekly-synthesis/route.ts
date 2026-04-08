import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin } from "@/lib/api-helpers";
import { verifyCronSecret } from "@/lib/cron-auth";
import { computeFacilityLearnings } from "@/lib/facility-learnings";
import { aggregateGlobalPerformance, formatForSynthesis } from "@/lib/performance-aggregator";
import { synthesizeCampaignResult } from "@/lib/synthesis";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  if (!verifyCronSecret(req)) {
    return errorResponse("Unauthorized", 401, origin);
  }

  const results = {
    facilitiesProcessed: 0,
    learningsUpdated: 0,
    globalSynthesis: false,
    errors: [] as string[],
  };

  try {
    // Find facilities with creative_performance data updated in the last 7 days
    const facilities = await db.$queryRaw<
      Array<{ facility_id: string }>
    >`
      SELECT DISTINCT facility_id
      FROM creative_performance
      WHERE updated_at >= NOW() - INTERVAL '7 days'
    `;

    // Refresh facility learnings for each (pure DB, no LLM)
    for (const { facility_id } of facilities) {
      try {
        const learnings = await computeFacilityLearnings(facility_id);
        results.facilitiesProcessed++;
        if (learnings) results.learningsUpdated++;
      } catch (err) {
        results.errors.push(`facility ${facility_id}: ${(err as Error).message}`);
      }
    }

    // Run global synthesis if we have enough data
    const globalPerf = await aggregateGlobalPerformance();
    if (globalPerf && globalPerf.facilities >= 1) {
      try {
        const synthInput = formatForSynthesis(globalPerf);
        const synthResults = await synthesizeCampaignResult(
          `Cross-facility aggregate (${globalPerf.facilities} facilities)`,
          { summary: synthInput },
        );
        results.globalSynthesis = synthResults.some((r) => r.updated);

        // Log to synthesis_log
        await db.synthesis_log.create({
          data: {
            trigger: "weekly_cron",
            target_doc: "strategy",
            input_summary: `${globalPerf.facilities} facilities, ${Object.keys(globalPerf.avgCtrByAngle).length} angles tracked`,
            change_summary: synthResults.map((r) => r.changeSummary).join("; "),
            status: results.globalSynthesis ? "completed" : "skipped",
          },
        });
      } catch (err) {
        results.errors.push(`global synthesis: ${(err as Error).message}`);
        await db.synthesis_log.create({
          data: {
            trigger: "weekly_cron",
            target_doc: "strategy",
            input_summary: "Failed",
            status: "failed",
          },
        });
      }
    }

    // Also process any pending synthesis queue entries
    const pending = await db.synthesis_log.findMany({
      where: { status: "pending" },
      orderBy: { created_at: "asc" },
      take: 3,
    });

    for (const entry of pending) {
      try {
        if (entry.facility_id) {
          await computeFacilityLearnings(entry.facility_id);
        }
        await db.synthesis_log.update({
          where: { id: entry.id },
          data: { status: "completed", change_summary: "Processed by weekly cron" },
        });
      } catch (err) {
        await db.synthesis_log.update({
          where: { id: entry.id },
          data: { status: "failed", change_summary: (err as Error).message },
        });
      }
    }

    return jsonResponse(results, 200, origin);
  } catch (err) {
    return errorResponse(
      `Weekly synthesis failed: ${(err as Error).message}`,
      500,
      origin,
    );
  }
}
