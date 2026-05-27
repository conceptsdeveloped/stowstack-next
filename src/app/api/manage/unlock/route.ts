import { NextRequest } from "next/server";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  verifyCsrfOrigin,
} from "@/lib/api-helpers";
import { createManageToken } from "@/lib/manage-session";
import { db } from "@/lib/db";

/**
 * POST /api/manage/unlock
 *
 * Owner entry — "I have a code". The visitor enters the facility access_code
 * they received from their audit. We look it up, and on a match mint a
 * facility-scoped manage token. The token is returned to the client (stored
 * client-side and sent as x-manage-token, mirroring the admin-key pattern).
 *
 * No admin auth: this is an unauthenticated entry point gated by knowledge of
 * the access_code. Abuse is bounded by the code being a unique 16-char value;
 * a TODO below notes adding per-IP rate limiting before launch.
 */

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const csrf = verifyCsrfOrigin(req);
  if (csrf) return csrf;

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 16) {
    return errorResponse("A valid access code is required", 400, origin);
  }

  // TODO(pre-launch): add per-IP rate limiting (Upstash) to slow code guessing.
  const facility = await db.facilities.findUnique({
    where: { access_code: code },
    select: {
      id: true,
      name: true,
      contact_name: true,
      contact_email: true,
      contact_phone: true,
      website: true,
      google_address: true,
      occupancy_range: true,
      total_units: true,
      biggest_issue: true,
      notes: true,
      google_rating: true,
      review_count: true,
      google_phone: true,
      google_maps_url: true,
      deleted_at: true,
    },
  });

  if (!facility || facility.deleted_at) {
    // Generic message — do not reveal whether a code exists.
    return errorResponse("That code didn't match a facility", 404, origin);
  }

  const token = createManageToken([facility.id], "code");
  if (!token) {
    return errorResponse(
      "Manage sessions are not configured (missing MANAGE_SESSION_SECRET)",
      500,
      origin
    );
  }

  return jsonResponse(
    {
      token,
      facility: {
        id: facility.id,
        name: facility.name,
        contact_name: facility.contact_name,
        contact_email: facility.contact_email,
        contact_phone: facility.contact_phone,
        website: facility.website,
        google_address: facility.google_address,
        occupancy_range: facility.occupancy_range,
        total_units: facility.total_units,
        biggest_issue: facility.biggest_issue,
        notes: facility.notes,
        review_count: facility.review_count,
        google_phone: facility.google_phone,
        google_maps_url: facility.google_maps_url,
        // Prisma Decimal -> number for the client
        google_rating:
          facility.google_rating != null ? Number(facility.google_rating) : null,
      },
    },
    200,
    origin
  );
}
