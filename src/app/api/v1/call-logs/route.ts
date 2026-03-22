import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  v1CorsResponse,
  v1Json,
  v1Error,
  requireApiAuth,
  isErrorResponse,
  requireScope,
  requireOrgFacility,
} from "@/lib/v1-auth";

export async function OPTIONS() {
  return v1CorsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "calls:read");
  if (scopeErr) return scopeErr;

  const url = new URL(request.url);
  const facilityId = url.searchParams.get("facilityId");
  const facility = await requireOrgFacility(facilityId, orgId);
  if (facility instanceof Response) return facility;

  const summary = url.searchParams.get("summary") === "true";

  try {
    if (summary) {
      const [stats, byNumber] = await Promise.all([
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT
            COUNT(*)::int AS total_calls,
            COUNT(*) FILTER (WHERE cl.status = 'completed')::int AS completed_calls,
            COALESCE(AVG(cl.duration) FILTER (WHERE cl.status = 'completed'), 0)::int AS avg_duration,
            COUNT(DISTINCT cl.caller_number)::int AS unique_callers,
            COUNT(*) FILTER (WHERE cl.started_at > NOW() - INTERVAL '24 hours')::int AS calls_today,
            COUNT(*) FILTER (WHERE cl.started_at > NOW() - INTERVAL '7 days')::int AS calls_this_week
          FROM call_logs cl WHERE cl.facility_id = ${facilityId}::uuid
        `,
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT ctn.id, ctn.label, ctn.phone_number, ctn.call_count, ctn.total_duration,
                 COUNT(cl.id) FILTER (WHERE cl.started_at > NOW() - INTERVAL '7 days')::int AS calls_7d
          FROM call_tracking_numbers ctn
          LEFT JOIN call_logs cl ON cl.tracking_number_id = ctn.id
          WHERE ctn.facility_id = ${facilityId}::uuid AND ctn.status = 'active'
          GROUP BY ctn.id ORDER BY ctn.call_count DESC
        `,
      ]);
      return v1Json({ stats: stats[0], trackingNumbers: byNumber });
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    const [logs, countRows] = await Promise.all([
      db.$queryRaw<Record<string, unknown>[]>`
        SELECT cl.id, cl.caller_number, cl.caller_city, cl.caller_state,
               cl.duration, cl.status, cl.started_at, cl.ended_at,
               ctn.label AS tracking_label, ctn.phone_number AS tracking_number
        FROM call_logs cl
        JOIN call_tracking_numbers ctn ON cl.tracking_number_id = ctn.id
        WHERE cl.facility_id = ${facilityId}::uuid
        ORDER BY cl.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      db.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total FROM call_logs WHERE facility_id = ${facilityId}::uuid
      `,
    ]);

    const total = countRows[0]?.total || 0;
    return v1Json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    return v1Error("Failed to fetch call logs", 500);
  }
}
