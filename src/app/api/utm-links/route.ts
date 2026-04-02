import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

function generateShortCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "utm-links");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const rows = await db.utm_links.findMany({
      where: { facility_id: facilityId },
      orderBy: { created_at: "desc" },
      include: {
        landing_pages: {
          select: { title: true, slug: true },
        },
      },
    });

    const links = rows.map((r) => ({
      ...r,
      landing_page_title: r.landing_pages?.title || null,
      landing_page_slug: r.landing_pages?.slug || null,
      landing_pages: undefined,
    }));

    return jsonResponse({ links }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch UTM links", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "utm-links");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const {
      facilityId,
      landingPageId,
      label,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
    } = body || {};

    if (!facilityId || !label || !utmSource || !utmMedium) {
      return errorResponse(
        "facilityId, label, utmSource, and utmMedium are required",
        400,
        origin
      );
    }

    const shortCode = generateShortCode();
    const link = await db.utm_links.create({
      data: {
        facility_id: facilityId,
        landing_page_id: landingPageId || null,
        label,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        utm_term: utmTerm || null,
        short_code: shortCode,
      },
      include: {
        landing_pages: {
          select: { title: true, slug: true },
        },
      },
    });

    const result = {
      ...link,
      landing_page_title: link.landing_pages?.title || null,
      landing_page_slug: link.landing_pages?.slug || null,
      landing_pages: undefined,
    };

    return jsonResponse({ link: result }, 201, origin);
  } catch {
    return errorResponse("Failed to create UTM link", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "utm-links");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return errorResponse("id required", 400, origin);

  try {
    await db.utm_links.delete({ where: { id } });
    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to delete UTM link", 500, origin);
  }
}
