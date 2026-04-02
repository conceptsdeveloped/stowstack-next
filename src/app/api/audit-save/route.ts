import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

function generateSlug(facilityName: string): string {
  const base = (facilityName || "facility")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "audit-save");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { audit } = body || {};
    if (!audit || !audit.overall_score) {
      return errorResponse("Invalid audit data", 400, origin);
    }

    const facilityName = audit.facility_summary?.name || "facility";
    const slug = generateSlug(facilityName);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await db.shared_audits.create({
      data: {
        slug,
        facility_name: facilityName,
        audit_json: audit as unknown as Prisma.InputJsonValue,
        views: 0,
        expires_at: expiresAt,
      },
    });

    const baseUrl =
      origin && origin.includes("localhost")
        ? origin
        : "https://storageads.com";

    return jsonResponse(
      {
        slug,
        url: `${baseUrl}/audit/${slug}`,
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Failed to save audit", 500, origin);
  }
}
