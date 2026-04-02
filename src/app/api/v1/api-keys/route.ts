import crypto from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/api-helpers";
import {
  v1CorsResponse,
  v1Json,
  v1Error,
  hashKey,
  requireApiAuth,
  isErrorResponse,
} from "@/lib/v1-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const VALID_SCOPES = [
  "facilities:read",
  "facilities:write",
  "units:read",
  "units:write",
  "leads:read",
  "leads:write",
  "tenants:read",
  "tenants:write",
  "pages:read",
  "calls:read",
  "webhooks:manage",
];

export async function OPTIONS() {
  return v1CorsResponse();
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-api-keys");
  if (limited) return limited;
  const admin = isAdminRequest(request);
  let organizationId: string | null = null;

  if (!admin) {
    const auth = await requireApiAuth(request);
    if (isErrorResponse(auth)) return auth;
    organizationId = auth.apiKey.organization_id;
  } else {
    organizationId = new URL(request.url).searchParams.get("organizationId");
  }

  if (!organizationId) {
    return v1Error("organizationId is required");
  }

  try {
    const keys = await db.$queryRaw`
      SELECT id, name, key_prefix, scopes, rate_limit, last_used_at, expires_at, revoked, created_at
      FROM api_keys WHERE organization_id = ${organizationId}::uuid ORDER BY created_at DESC
    `;
    return v1Json({ keys });
  } catch {
    return v1Error("Failed to list API keys", 500);
  }
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-api-keys");
  if (limited) return limited;
  if (!isAdminRequest(request)) {
    return v1Error("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const { organizationId, name, scopes, rateLimitPerMinute, expiresAt } =
    body || {};

  if (!organizationId || !name) {
    return v1Error("organizationId and name are required");
  }

  const requestedScopes = scopes || VALID_SCOPES;
  const invalid = requestedScopes.filter(
    (s: string) => !VALID_SCOPES.includes(s)
  );
  if (invalid.length) {
    return v1Error(`Invalid scopes: ${invalid.join(", ")}`);
  }

  const org = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM organizations WHERE id = ${organizationId}::uuid
  `;
  if (!org.length) {
    return v1Error("Organization not found", 404);
  }

  const rawKey = `sk_live_${crypto.randomBytes(20).toString("hex")}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);

  try {
    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      INSERT INTO api_keys (organization_id, name, key_hash, key_prefix, scopes, rate_limit, expires_at)
      VALUES (${organizationId}::uuid, ${name}, ${keyHash}, ${keyPrefix}, ${requestedScopes}, ${rateLimitPerMinute || 100}, ${expiresAt || null}::timestamptz)
      RETURNING id, name, key_prefix, scopes, rate_limit, expires_at, created_at
    `;
    return v1Json({ key: rawKey, ...rows[0] });
  } catch {
    return v1Error("Failed to create API key", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-api-keys");
  if (limited) return limited;
  if (!isAdminRequest(request)) {
    return v1Error("Unauthorized", 401);
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return v1Error("id query param is required");

  try {
    const rows = await db.$queryRaw<{ id: string }[]>`
      UPDATE api_keys SET revoked = TRUE, revoked_at = NOW() WHERE id = ${id}::uuid RETURNING id
    `;
    if (!rows.length) return v1Error("API key not found", 404);
    return v1Json({ success: true, id: rows[0].id });
  } catch {
    return v1Error("Failed to revoke API key", 500);
  }
}
