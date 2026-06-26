import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import {
  buildRateIncreaseLetter,
  suggestRate,
  num,
  DEFAULT_NOTICE_DAYS,
} from "@/lib/ecri";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Generate a ready-to-send rate-increase letter for a single tenant. If the
 * caller doesn't pass an explicit newRate, the sensitivity-aware suggested rate
 * is computed from the tenant's latest sensitivity snapshot.
 */
export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(
    request,
    RATE_LIMIT_TIERS.AUTHENTICATED,
    "ecri-letter",
  );
  if (limited) return limited;
  const origin = getOrigin(request);
  const denied = await requireAdminKey(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const tenantId = typeof body.tenantId === "string" ? body.tenantId : "";
  if (!tenantId) return errorResponse("tenantId required", 400, origin);

  try {
    const tenant = await db.tenants.findFirst({
      where: { id: tenantId, deleted_at: null },
      select: {
        id: true,
        name: true,
        unit_number: true,
        monthly_rate: true,
        facilities: {
          select: {
            name: true,
            location: true,
            google_phone: true,
            contact_phone: true,
          },
        },
      },
    });
    if (!tenant) return errorResponse("Tenant not found", 404, origin);

    const currentRate = num(tenant.monthly_rate);

    let newRate: number;
    if (body.newRate !== undefined && Number.isFinite(Number(body.newRate))) {
      newRate = Math.round(Number(body.newRate));
    } else {
      // Derive the suggested rate from the latest sensitivity snapshot.
      const sens = await db.$queryRaw<
        Array<{ market_rate: unknown; bucket: string | null }>
      >`
        SELECT market_rate, bucket
        FROM tenant_sensitivity_features
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY snapshot_date DESC
        LIMIT 1`;
      const market = sens[0] ? num(sens[0].market_rate) : 0;
      const bucket = sens[0]?.bucket ?? null;
      const rec = suggestRate(currentRate, market, bucket);
      if (!rec.eligible) {
        return errorResponse(
          "No rate increase is recommended for this tenant. Pass an explicit newRate to override.",
          422,
          origin,
        );
      }
      newRate = rec.suggested;
    }

    if (!(newRate > currentRate)) {
      return errorResponse(
        "newRate must be greater than the current rate.",
        400,
        origin,
      );
    }

    const now = new Date();
    let effective: Date;
    let noticeDays = DEFAULT_NOTICE_DAYS;
    if (typeof body.effectiveDate === "string" && body.effectiveDate) {
      const parsed = new Date(body.effectiveDate);
      if (Number.isNaN(parsed.getTime())) {
        return errorResponse("Invalid effectiveDate", 400, origin);
      }
      effective = parsed;
      noticeDays = Math.max(
        0,
        Math.round((effective.getTime() - now.getTime()) / 86_400_000),
      );
    } else {
      effective = new Date(now.getTime() + DEFAULT_NOTICE_DAYS * 86_400_000);
    }

    const phone =
      tenant.facilities?.google_phone || tenant.facilities?.contact_phone || null;

    const { subject, body: letterBody } = buildRateIncreaseLetter({
      tenantName: tenant.name,
      unit: tenant.unit_number,
      currentRate,
      newRate,
      effectiveDate: fmtDate(effective),
      noticeDays,
      facilityName: tenant.facilities?.name || "our facility",
      facilityLocation: tenant.facilities?.location ?? null,
      facilityPhone: phone,
      letterDate: fmtDate(now),
    });

    return jsonResponse(
      {
        tenantId,
        tenantName: tenant.name,
        unit: tenant.unit_number,
        currentRate,
        newRate,
        effectiveDate: effective.toISOString().slice(0, 10),
        noticeDays,
        subject,
        body: letterBody,
      },
      200,
      origin,
    );
  } catch (err) {
    console.error("[ecri-letter] failed", err);
    return errorResponse("Failed to generate letter", 500, origin);
  }
}
