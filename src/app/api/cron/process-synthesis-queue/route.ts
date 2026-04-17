import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin } from "@/lib/api-helpers";
import { verifyCronSecret } from "@/lib/cron-auth";
import { notifyCronFailure } from "@/lib/cron-runner";
import { computeFacilityLearnings } from "@/lib/facility-learnings";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  if (!verifyCronSecret(req)) {
    return errorResponse("Unauthorized", 401, origin);
  }

  try {
    // Process up to 3 pending synthesis entries per run
    const pending = await db.synthesis_log.findMany({
      where: { status: "pending" },
      orderBy: { created_at: "asc" },
      take: 3,
    });

    if (pending.length === 0) {
      return jsonResponse({ processed: 0, message: "No pending entries" }, 200, origin);
    }

    let processed = 0;
    let failed = 0;

    for (const entry of pending) {
      try {
        if (entry.facility_id) {
          await computeFacilityLearnings(entry.facility_id);
        }
        await db.synthesis_log.update({
          where: { id: entry.id },
          data: {
            status: "completed",
            change_summary: `Processed: ${entry.input_summary || "facility learnings refresh"}`,
          },
        });
        processed++;
      } catch (err) {
        await db.synthesis_log.update({
          where: { id: entry.id },
          data: {
            status: "failed",
            change_summary: (err as Error).message,
          },
        });
        failed++;
      }
    }

    return jsonResponse({ processed, failed, total: pending.length }, 200, origin);
  } catch (err) {
    notifyCronFailure("process-synthesis-queue", err);
    return errorResponse(
      `Synthesis queue processing failed: ${(err as Error).message}`,
      500,
      origin,
    );
  }
}
