import { NextRequest } from "next/server";
import crypto from "crypto";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  verifyCsrfOrigin,
  safeCompare,
} from "@/lib/api-helpers";
import { createManageToken } from "@/lib/manage-session";
import { db } from "@/lib/db";

/**
 * POST /api/manage/scratch
 *
 * Owner entry — "Start from scratch". Gated behind a shared invite code
 * (MANAGE_INVITE_CODE) so the paid generation tools aren't wide open. Creates
 * a fresh facility owned by the resulting manage session and returns a token.
 */

function generateAccessCode(): string {
  // 16 hex-ish chars, uppercase, matches access_code VarChar(16)
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const csrf = verifyCsrfOrigin(req);
  if (csrf) return csrf;

  // Preferred gate is MANAGE_INVITE_CODE. TEMPORARY: fall back to ADMIN_SECRET
  // when it isn't set, so the flow works on environments where MANAGE_INVITE_CODE
  // hasn't propagated yet. Restore MANAGE_INVITE_CODE-only before launch.
  const inviteSecret =
    process.env.MANAGE_INVITE_CODE || process.env.ADMIN_SECRET || null;
  if (!inviteSecret) {
    return errorResponse(
      "Start-from-scratch is not enabled (set MANAGE_INVITE_CODE or ADMIN_SECRET)",
      503,
      origin
    );
  }

  let body: {
    inviteCode?: unknown;
    name?: unknown;
    location?: unknown;
    contact_email?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim() : "";
  if (!inviteCode || !safeCompare(inviteCode, inviteSecret)) {
    return errorResponse("Invalid invite code", 403, origin);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const contactEmail =
    typeof body.contact_email === "string" ? body.contact_email.trim() : null;

  if (!name || !location) {
    return errorResponse("Facility name and location are required", 400, origin);
  }

  // Generate a unique access_code so the owner can return to this facility.
  let accessCode = generateAccessCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db.facilities.findUnique({
      where: { access_code: accessCode },
      select: { id: true },
    });
    if (!clash) break;
    accessCode = generateAccessCode();
  }

  const facility = await db.facilities.create({
    data: {
      name,
      location,
      contact_email: contactEmail,
      access_code: accessCode,
      status: "self_serve",
      pipeline_status: "self_serve",
    },
    select: {
      id: true,
      name: true,
      contact_email: true,
      occupancy_range: true,
      total_units: true,
      access_code: true,
    },
  });

  const token = createManageToken([facility.id], "scratch");
  if (!token) {
    return errorResponse(
      "Manage sessions are not configured (missing MANAGE_SESSION_SECRET)",
      500,
      origin
    );
  }

  return jsonResponse({ token, facility }, 200, origin);
}
