import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  v1CorsResponse,
  v1Json,
  v1Error,
  requireApiAuth,
  isErrorResponse,
  requireScope,
} from "@/lib/v1-auth";
import { dispatchWebhook } from "@/lib/webhook";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { isValidUuid } from "@/lib/validation";

export async function OPTIONS() {
  return v1CorsResponse();
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-facilities");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "facilities:read");
  if (scopeErr) return scopeErr;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (id) {
      if (!isValidUuid(id)) return v1Error("Invalid id format", 400);
      const rows = await db.$queryRaw<Record<string, unknown>[]>`
        SELECT id, name, location, contact_name, contact_email, contact_phone,
               status, occupancy_range, total_units, created_at, updated_at
        FROM facilities WHERE id = ${id}::uuid AND organization_id = ${orgId}::uuid
      `;
      if (!rows.length) return v1Error("Facility not found", 404);
      return v1Json({ facility: rows[0] });
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25")));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get("status");

    let facilities: Record<string, unknown>[];
    let countRows: { total: number }[];

    if (status) {
      facilities = await db.$queryRaw`
        SELECT id, name, location, contact_name, contact_email, contact_phone,
               status, occupancy_range, total_units, created_at, updated_at
        FROM facilities WHERE organization_id = ${orgId}::uuid AND status = ${status}
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
      countRows = await db.$queryRaw`
        SELECT COUNT(*)::int AS total FROM facilities
        WHERE organization_id = ${orgId}::uuid AND status = ${status}
      `;
    } else {
      facilities = await db.$queryRaw`
        SELECT id, name, location, contact_name, contact_email, contact_phone,
               status, occupancy_range, total_units, created_at, updated_at
        FROM facilities WHERE organization_id = ${orgId}::uuid
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
      countRows = await db.$queryRaw`
        SELECT COUNT(*)::int AS total FROM facilities WHERE organization_id = ${orgId}::uuid
      `;
    }

    const total = countRows[0]?.total || 0;
    return v1Json({
      facilities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return v1Error("Failed to fetch facilities", 500);
  }
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-facilities");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "facilities:write");
  if (scopeErr) return scopeErr;

  const body = await request.json().catch(() => null);
  const {
    name,
    location,
    contactName,
    contactEmail,
    contactPhone,
    totalUnits,
    occupancyRange,
  } = body || {};

  if (!name || !location) {
    return v1Error("name and location are required");
  }

  try {
    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      INSERT INTO facilities (name, location, contact_name, contact_email, contact_phone, total_units, occupancy_range, organization_id)
      VALUES (${name}, ${location}, ${contactName || null}, ${contactEmail || null}, ${contactPhone || null}, ${totalUnits || null}, ${occupancyRange || null}, ${orgId}::uuid)
      RETURNING id, name, location, contact_name, contact_email, contact_phone, status, occupancy_range, total_units, created_at
    `;

    dispatchWebhook(orgId, "facility.updated", {
      action: "created",
      facility: rows[0],
    }).catch((err) => console.error("[webhook] Fire-and-forget failed:", err));

    return v1Json({ facility: rows[0] });
  } catch {
    return v1Error("Failed to create facility", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-facilities");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "facilities:write");
  if (scopeErr) return scopeErr;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return v1Error("id query param is required");
  if (!isValidUuid(id)) return v1Error("Invalid id format", 400);

  const body = await request.json().catch(() => null);
  if (!body) return v1Error("No valid fields to update");

  const bodyMap: Record<string, string> = {
    name: "name",
    location: "location",
    contactName: "contact_name",
    contactEmail: "contact_email",
    contactPhone: "contact_phone",
    totalUnits: "total_units",
    occupancyRange: "occupancy_range",
  };

  const sets: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (const [bodyKey, dbCol] of Object.entries(bodyMap)) {
    if (body[bodyKey] !== undefined) {
      sets.push(`${dbCol} = $${paramIdx++}`);
      params.push(body[bodyKey]);
    }
  }

  if (!sets.length) return v1Error("No valid fields to update");

  sets.push("updated_at = NOW()");
  params.push(id, orgId);

  try {
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE facilities SET ${sets.join(", ")}
       WHERE id = $${paramIdx++}::uuid AND organization_id = $${paramIdx}::uuid
       RETURNING id, name, location, contact_name, contact_email, contact_phone, status, occupancy_range, total_units, created_at, updated_at`,
      ...params
    );
    if (!rows.length) return v1Error("Facility not found", 404);

    dispatchWebhook(orgId, "facility.updated", {
      action: "updated",
      facility: rows[0],
    }).catch((err) => console.error("[webhook] Fire-and-forget failed:", err));

    return v1Json({ facility: rows[0] });
  } catch {
    return v1Error("Failed to update facility", 500);
  }
}
