import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@clerk/nextjs/server";

const ALLOWED_ORIGINS = [
  "https://stowstack.co",
  "https://www.stowstack.co",
  "http://localhost:5173",
  "http://localhost:3000",
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Admin-Key, X-Org-Token",
  };
}

export function corsResponse(origin: string | null) {
  return NextResponse.json(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
}

export function jsonResponse(
  data: unknown,
  status = 200,
  origin: string | null = null
) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(origin),
  });
}

export function errorResponse(
  message: string,
  status = 400,
  origin: string | null = null
) {
  return NextResponse.json(
    { error: message },
    { status, headers: getCorsHeaders(origin) }
  );
}

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isAdminRequest(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_SECRET;
  const providedKey = req.headers.get("x-admin-key");
  if (!adminKey || !providedKey) return false;
  return safeCompare(providedKey, adminKey);
}

export function requireAdminKey(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return errorResponse("Unauthorized", 401, req.headers.get("origin"));
  }
  return null;
}

export function getOrigin(req: NextRequest): string | null {
  return req.headers.get("origin");
}

/**
 * Dual auth: accepts admin key header OR valid Clerk session with admin/VA role.
 * Returns null if authorized, or an error response if not.
 * Use this as a drop-in replacement for requireAdminKey() when you want
 * to support both auth methods.
 */
export async function requireAdminAuth(
  req: NextRequest
): Promise<NextResponse | null> {
  // First check admin key — fast path, no async needed
  if (isAdminRequest(req)) return null;

  // Fall back to Clerk session check
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return errorResponse("Unauthorized", 401, req.headers.get("origin"));
    }

    const claims = sessionClaims as Record<string, unknown> | undefined;
    const metadataRole = (claims?.metadata as Record<string, unknown>)?.role;
    const pubMetadata = claims?.publicMetadata as Record<string, unknown> | undefined;
    const role = metadataRole ?? pubMetadata?.role;

    if (role === "admin" || role === "virtual_assistant") {
      return null;
    }

    return errorResponse("Insufficient permissions", 403, req.headers.get("origin"));
  } catch {
    return errorResponse("Unauthorized", 401, req.headers.get("origin"));
  }
}
