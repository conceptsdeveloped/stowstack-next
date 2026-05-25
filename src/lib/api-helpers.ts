import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";

const ALLOWED_ORIGINS = [
  "https://storageads.com",
  "https://www.storageads.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Org-Token",
  };
  // Only set Allow-Origin for recognized origins — omit for unknown to block cross-origin access
  if (isAllowed) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

/**
 * Verify that the request Origin matches an allowed origin.
 * Returns null if valid, or an error response if the origin is unrecognized.
 * Skip for requests with no Origin header (server-to-server, cron, webhook).
 */
export function verifyCsrfOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  // No origin header = non-browser request (cron, webhook, server-to-server) — allow
  if (!origin) return null;
  if (ALLOWED_ORIGINS.includes(origin)) return null;
  return errorResponse("Forbidden: invalid origin", 403, origin);
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

export function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  // Hash both values to normalize length before comparison,
  // preventing timing leaks from the length check
  const hashA = crypto.createHash("sha256").update(String(a)).digest();
  const hashB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function isAdminRequest(req: NextRequest): boolean {
  const providedKey = req.headers.get("x-admin-key");
  if (!providedKey) return false;
  const adminKey = process.env.ADMIN_SECRET;
  if (adminKey && safeCompare(providedKey, adminKey)) return true;
  return false;
}

export async function requireAdminKey(
  req: NextRequest,
  requiredScope?: string
): Promise<NextResponse | null> {
  // Fast path: shared ADMIN_SECRET (still supported during migration).
  // Shared key is god-mode — scope checks are bypassed for founders.
  if (isAdminRequest(req)) {
    Sentry.addBreadcrumb({ category: "auth", message: "Admin key authenticated (shared)", level: "info" });
    return null;
  }

  // Per-admin key path: check x-admin-key header for sa_adm_ prefixed keys
  const providedKey = req.headers.get("x-admin-key");
  if (providedKey?.startsWith("sa_adm_")) {
    const { validateAdminKey, hasScope } = await import("@/lib/admin-keys");
    const { valid, adminEmail, scopes } = await validateAdminKey(providedKey);
    if (valid) {
      if (requiredScope && !hasScope(scopes, requiredScope)) {
        Sentry.addBreadcrumb({
          category: "auth",
          message: `Scope denied: ${adminEmail} lacks ${requiredScope}`,
          level: "warning",
        });
        return errorResponse(`Missing required scope: ${requiredScope}`, 403, req.headers.get("origin"));
      }
      Sentry.setTag("admin_email", adminEmail);
      Sentry.addBreadcrumb({ category: "auth", message: `Admin key authenticated: ${adminEmail}`, level: "info" });
      return null;
    }
  }

  return errorResponse("Unauthorized", 401, req.headers.get("origin"));
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
  if (isAdminRequest(req)) {
    Sentry.setTag("auth_method", "admin_key");
    return null;
  }

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
      Sentry.setUser({ id: userId });
      Sentry.setTag("auth_method", "clerk");
      Sentry.setTag("user_role", String(role));
      return null;
    }

    return errorResponse("Insufficient permissions", 403, req.headers.get("origin"));
  } catch {
    return errorResponse("Unauthorized", 401, req.headers.get("origin"));
  }
}
