import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");
  const summary = url.searchParams.get("summary");

  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    if (summary === "true") {
      const [stats] = await db.$queryRaw<
        Array<{
          total_calls: bigint;
          completed_calls: bigint;
          qualified_calls: bigint;
          avg_duration: number;
          unique_callers: bigint;
          calls_today: bigint;
          calls_this_week: bigint;
        }>
      >`
        SELECT
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE cl.status = 'completed') as completed_calls,
          COUNT(*) FILTER (WHERE cl.status = 'completed' AND cl.duration >= 30) as qualified_calls,
          COALESCE(AVG(cl.duration) FILTER (WHERE cl.status = 'completed'), 0) as avg_duration,
          COUNT(DISTINCT cl.caller_number) as unique_callers,
          COUNT(*) FILTER (WHERE cl.started_at > NOW() - INTERVAL '24 hours') as calls_today,
          COUNT(*) FILTER (WHERE cl.started_at > NOW() - INTERVAL '7 days') as calls_this_week
        FROM call_logs cl
        WHERE cl.facility_id = ${facilityId}::uuid
      `;

      const byNumber = await db.$queryRaw<
        Array<{
          label: string;
          phone_number: string;
          call_count: number;
          total_duration: number;
          calls_7d: bigint;
        }>
      >`
        SELECT ctn.label, ctn.phone_number, ctn.call_count, ctn.total_duration,
               COUNT(cl.id) FILTER (WHERE cl.started_at > NOW() - INTERVAL '7 days') as calls_7d
        FROM call_tracking_numbers ctn
        LEFT JOIN call_logs cl ON cl.tracking_number_id = ctn.id
        WHERE ctn.facility_id = ${facilityId}::uuid AND ctn.status = 'active'
        GROUP BY ctn.id
        ORDER BY ctn.call_count DESC
      `;

      const formattedStats = stats
        ? {
            total_calls: Number(stats.total_calls),
            completed_calls: Number(stats.completed_calls),
            qualified_calls: Number(stats.qualified_calls),
            avg_duration: Number(stats.avg_duration),
            unique_callers: Number(stats.unique_callers),
            calls_today: Number(stats.calls_today),
            calls_this_week: Number(stats.calls_this_week),
          }
        : null;

      const formattedByNumber = byNumber.map((n) => ({
        ...n,
        calls_7d: Number(n.calls_7d),
      }));

      return jsonResponse(
        { stats: formattedStats, byNumber: formattedByNumber },
        200,
        origin
      );
    }

    // Detail mode: paginated call logs
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      100
    );
    const offset = (page - 1) * limit;

    const [logs, totalResult] = await Promise.all([
      db.call_logs.findMany({
        where: { facility_id: facilityId },
        orderBy: { started_at: "desc" },
        skip: offset,
        take: limit,
        include: {
          call_tracking_numbers: {
            select: { label: true, phone_number: true },
          },
        },
      }),
      db.call_logs.count({ where: { facility_id: facilityId } }),
    ]);

    const formattedLogs = logs.map((l) => ({
      ...l,
      tracking_label: l.call_tracking_numbers?.label || null,
      tracking_number: l.call_tracking_numbers?.phone_number || null,
      call_tracking_numbers: undefined,
    }));

    return jsonResponse(
      {
        logs: formattedLogs,
        total: totalResult,
        page,
        pages: Math.ceil(totalResult / limit),
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Failed to fetch call logs", 500, origin);
  }
}

const VALID_OUTCOMES = ["qualified", "existing_tenant", "spam", "wrong_number", "unknown"];

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { id, call_outcome, move_in_linked } = body;
    if (!id) return errorResponse("Call log ID required", 400, origin);
    if (call_outcome && !VALID_OUTCOMES.includes(call_outcome)) {
      return errorResponse(`Invalid outcome. Valid: ${VALID_OUTCOMES.join(", ")}`, 400, origin);
    }

    const updateData: Record<string, unknown> = {};
    if (call_outcome !== undefined) updateData.call_outcome = call_outcome || null;
    if (move_in_linked !== undefined) updateData.move_in_linked = !!move_in_linked;

    await db.call_logs.update({
      where: { id },
      data: updateData,
    });

    // If marking as move-in, create an activity log entry for attribution
    if (move_in_linked) {
      const callLog = await db.call_logs.findUnique({
        where: { id },
        select: { facility_id: true, caller_number: true, campaign_source: true },
      });
      if (callLog) {
        db.activity_log.create({
          data: {
            type: "attributed_move_in",
            facility_id: callLog.facility_id,
            detail: `Move-in attributed from phone call${callLog.campaign_source ? ` (${callLog.campaign_source})` : ""}`,
            meta: { source: "phone_call", call_log_id: id, campaign: callLog.campaign_source },
          },
        }).catch(() => {});
      }
    }

    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to update call log", 500, origin);
  }
}
