import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  v1CorsResponse,
  v1Json,
  v1Error,
  requireApiAuth,
  isErrorResponse,
} from "@/lib/v1-auth";

export async function OPTIONS() {
  return v1CorsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const days = Math.min(
    90,
    Math.max(1, parseInt(new URL(request.url).searchParams.get("days") || "30"))
  );
  const interval = `${days} days`;

  try {
    const [summary, daily, byEndpoint, byKey, recentErrors] =
      await Promise.all([
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT
            COUNT(*)::int AS total_requests,
            COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS success_count,
            COUNT(*) FILTER (WHERE status_code >= 400)::int AS error_count,
            COALESCE(AVG(duration_ms), 0)::int AS avg_duration_ms,
            COUNT(DISTINCT api_key_id)::int AS active_keys
          FROM api_usage_log
          WHERE organization_id = ${orgId}::uuid AND created_at > NOW() - ${interval}::INTERVAL
        `,
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT
            created_at::date AS date,
            COUNT(*)::int AS requests,
            COUNT(*) FILTER (WHERE status_code >= 400)::int AS errors
          FROM api_usage_log
          WHERE organization_id = ${orgId}::uuid AND created_at > NOW() - ${interval}::INTERVAL
          GROUP BY created_at::date ORDER BY date DESC
        `,
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT path, method,
            COUNT(*)::int AS requests,
            COALESCE(AVG(duration_ms), 0)::int AS avg_ms,
            COUNT(*) FILTER (WHERE status_code >= 400)::int AS errors
          FROM api_usage_log
          WHERE organization_id = ${orgId}::uuid AND created_at > NOW() - ${interval}::INTERVAL
          GROUP BY path, method ORDER BY requests DESC LIMIT 20
        `,
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT u.api_key_id, k.name AS key_name, k.key_prefix,
            COUNT(*)::int AS requests,
            COUNT(*) FILTER (WHERE u.status_code >= 400)::int AS errors
          FROM api_usage_log u
          JOIN api_keys k ON k.id = u.api_key_id
          WHERE u.organization_id = ${orgId}::uuid AND u.created_at > NOW() - ${interval}::INTERVAL
          GROUP BY u.api_key_id, k.name, k.key_prefix ORDER BY requests DESC
        `,
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT method, path, status_code, created_at
          FROM api_usage_log
          WHERE organization_id = ${orgId}::uuid AND status_code >= 400
            AND created_at > NOW() - INTERVAL '24 hours'
          ORDER BY created_at DESC LIMIT 50
        `,
      ]);

    return v1Json({
      period: `${days} days`,
      summary: summary[0],
      daily,
      byEndpoint,
      byKey,
      recentErrors,
    });
  } catch {
    return v1Error("Failed to fetch usage data", 500);
  }
}
