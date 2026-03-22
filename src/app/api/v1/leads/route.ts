import crypto from "crypto";
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

export async function OPTIONS() {
  return v1CorsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "leads:read");
  if (scopeErr) return scopeErr;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (id) {
      const rows = await db.$queryRaw<Record<string, unknown>[]>`
        SELECT pl.id, pl.facility_id, pl.name, pl.email, pl.phone, pl.unit_size,
               pl.lead_status, pl.utm_source, pl.utm_medium, pl.utm_campaign,
               pl.move_in_date, pl.created_at, pl.converted_at, pl.lead_notes
        FROM partial_leads pl
        JOIN facilities f ON f.id = pl.facility_id
        WHERE pl.id = ${id}::uuid AND f.organization_id = ${orgId}::uuid
      `;
      if (!rows.length) return v1Error("Lead not found", 404);
      return v1Json({ lead: rows[0] });
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25")));
    const offset = (page - 1) * limit;
    const facilityId = url.searchParams.get("facilityId");
    const status = url.searchParams.get("status");
    const since = url.searchParams.get("since");

    let where = "WHERE f.organization_id = $1::uuid";
    const params: unknown[] = [orgId];
    let paramIdx = 2;

    if (facilityId) {
      where += ` AND pl.facility_id = $${paramIdx++}::uuid`;
      params.push(facilityId);
    }
    if (status) {
      where += ` AND pl.lead_status = $${paramIdx++}`;
      params.push(status);
    }
    if (since) {
      where += ` AND pl.created_at >= $${paramIdx++}::timestamptz`;
      params.push(since);
    }

    const selectCols = `pl.id, pl.facility_id, pl.name, pl.email, pl.phone, pl.unit_size,
                        pl.lead_status, pl.utm_source, pl.utm_medium, pl.utm_campaign,
                        pl.move_in_date, pl.created_at, pl.converted_at`;

    const [leads, countRows] = await Promise.all([
      db.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT ${selectCols}
         FROM partial_leads pl
         JOIN facilities f ON f.id = pl.facility_id
         ${where}
         ORDER BY pl.created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        ...params,
        limit,
        offset
      ),
      db.$queryRawUnsafe<{ total: number }[]>(
        `SELECT COUNT(*)::int AS total
         FROM partial_leads pl
         JOIN facilities f ON f.id = pl.facility_id
         ${where}`,
        ...params
      ),
    ]);

    const total = countRows[0]?.total || 0;
    return v1Json({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return v1Error("Failed to fetch leads", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "leads:write");
  if (scopeErr) return scopeErr;

  const body = await request.json().catch(() => null);
  const {
    facilityId,
    name,
    email,
    phone,
    unitSize,
    leadStatus,
    utmSource,
    utmMedium,
    utmCampaign,
  } = body || {};

  if (!facilityId) return v1Error("facilityId is required");
  if (!name && !email && !phone) {
    return v1Error("At least one of name, email, or phone is required");
  }

  const facilityRows = await db.$queryRaw<
    { id: string; organization_id: string }[]
  >`SELECT id, organization_id FROM facilities WHERE id = ${facilityId}::uuid`;
  if (!facilityRows.length || facilityRows[0].organization_id !== orgId) {
    return v1Error("Facility not found", 404);
  }

  const sessionId = `api-${crypto.randomUUID()}`;

  try {
    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      INSERT INTO partial_leads (facility_id, session_id, name, email, phone, unit_size,
                                 lead_status, utm_source, utm_medium, utm_campaign)
      VALUES (${facilityId}::uuid, ${sessionId}, ${name || null}, ${email || null}, ${phone || null}, ${unitSize || null},
              ${leadStatus || "new"}, ${utmSource || "api"}, ${utmMedium || null}, ${utmCampaign || null})
      RETURNING id, facility_id, name, email, phone, unit_size, lead_status,
                utm_source, utm_medium, utm_campaign, created_at
    `;

    dispatchWebhook(orgId, "lead.created", { lead: rows[0] }).catch(() => {});

    return v1Json({ lead: rows[0] });
  } catch {
    return v1Error("Failed to create lead", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "leads:write");
  if (scopeErr) return scopeErr;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return v1Error("id query param is required");

  const body = await request.json().catch(() => null);
  if (!body) return v1Error("No valid fields to update");

  const fieldMap: Record<string, string> = {
    leadStatus: "lead_status",
    moveInDate: "move_in_date",
    notes: "lead_notes",
    name: "name",
    email: "email",
    phone: "phone",
    unitSize: "unit_size",
  };

  const sets: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
    if (body[bodyKey] !== undefined) {
      sets.push(`${dbCol} = $${paramIdx++}`);
      params.push(body[bodyKey]);
    }
  }

  if (!sets.length) return v1Error("No valid fields to update");

  if (body.leadStatus) {
    sets.push("status_updated_at = NOW()");
  }

  params.push(id, orgId);

  try {
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE partial_leads SET ${sets.join(", ")}
       FROM facilities f
       WHERE partial_leads.id = $${paramIdx++}::uuid
         AND partial_leads.facility_id = f.id
         AND f.organization_id = $${paramIdx}::uuid
       RETURNING partial_leads.id, partial_leads.facility_id, partial_leads.name,
                 partial_leads.email, partial_leads.phone, partial_leads.unit_size,
                 partial_leads.lead_status, partial_leads.move_in_date,
                 partial_leads.created_at, partial_leads.lead_notes`,
      ...params
    );
    if (!rows.length) return v1Error("Lead not found", 404);

    dispatchWebhook(orgId, "lead.updated", { lead: rows[0] }).catch(() => {});

    return v1Json({ lead: rows[0] });
  } catch {
    return v1Error("Failed to update lead", 500);
  }
}
