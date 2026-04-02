import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import { checkRateLimit } from "./rate-limit";

const V1_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function v1CorsResponse(): NextResponse {
  return NextResponse.json(null, { status: 204, headers: V1_CORS_HEADERS });
}

export function v1Json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: V1_CORS_HEADERS });
}

export function v1Error(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: V1_CORS_HEADERS });
}

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

interface ApiKeyRow {
  id: string;
  organization_id: string;
  name: string;
  scopes: string[];
  rate_limit: number | null;
  expires_at: Date | null;
  revoked: boolean;
}

export async function requireApiAuth(
  req: NextRequest
): Promise<{ apiKey: ApiKeyRow } | NextResponse> {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return v1Error(
      "Missing or invalid Authorization header. Use: Bearer sk_live_...",
      401
    );
  }

  const token = auth.slice(7);
  const hash = hashKey(token);

  const rows = await db.$queryRaw<ApiKeyRow[]>`
    SELECT id, organization_id, name, scopes, rate_limit, expires_at, revoked
    FROM api_keys
    WHERE key_hash = ${hash}
  `;

  const row = rows[0];
  if (!row || row.revoked) {
    return v1Error("Invalid or revoked API key", 401);
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return v1Error("API key has expired", 401);
  }

  // Enforce rate limits if configured
  if (row.rate_limit) {
    const rl = await checkRateLimit(`v1:${row.id}`, row.rate_limit, 60);
    if (!rl.allowed) {
      return v1Error("Rate limit exceeded. Retry after the window resets.", 429);
    }
  }

  db.$executeRaw`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${row.id}::uuid`.catch(
    () => {}
  );

  const start = Date.now();
  const method = req.method;
  const path = new URL(req.url).pathname;

  setTimeout(() => {
    const duration = Date.now() - start;
    db.$executeRaw`
      INSERT INTO api_usage_log (api_key_id, organization_id, method, path, status_code, duration_ms)
      VALUES (${row.id}, ${row.organization_id}, ${method}, ${path}, 200, ${duration})
    `.catch((err) => console.error("[api_usage] Fire-and-forget failed:", err));
  }, 0);

  return { apiKey: row };
}

export function isErrorResponse(
  result: { apiKey: ApiKeyRow } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

export function requireScope(
  apiKey: ApiKeyRow,
  scope: string
): NextResponse | null {
  if (!apiKey.scopes.includes(scope)) {
    return v1Error(`Insufficient permissions. Required scope: ${scope}`, 403);
  }
  return null;
}

export async function requireOrgFacility(
  facilityId: string | null,
  organizationId: string
): Promise<{ id: string; organization_id: string } | NextResponse> {
  if (!facilityId) {
    return v1Error("facilityId is required");
  }

  const rows = await db.$queryRaw<{ id: string; organization_id: string }[]>`
    SELECT id, organization_id FROM facilities WHERE id = ${facilityId}::uuid
  `;

  const facility = rows[0];
  if (!facility || facility.organization_id !== organizationId) {
    return v1Error("Facility not found", 404);
  }

  return facility;
}
