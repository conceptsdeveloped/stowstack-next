import crypto from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

interface SessionRow {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date | null;
  last_active_at: Date | null;
  token_hash: string;
}

function parseBrowserInfo(ua: string | null): string {
  if (!ua) return "Unknown device";

  let browser = "Unknown browser";
  if (ua.includes("Firefox/")) {
    browser = "Firefox";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
  } else if (ua.includes("Chrome/") && !ua.includes("Edg/")) {
    browser = "Chrome";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Safari";
  } else if (ua.includes("OPR/") || ua.includes("Opera/")) {
    browser = "Opera";
  }

  let os = "Unknown OS";
  if (ua.includes("Windows NT")) {
    os = "Windows";
  } else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) {
    os = "macOS";
  } else if (ua.includes("Linux") && !ua.includes("Android")) {
    os = "Linux";
  } else if (ua.includes("Android")) {
    os = "Android";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
  }

  return `${browser} on ${os}`;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ss_")) {
    return auth.slice(7);
  }
  const orgToken = req.headers.get("x-org-token");
  if (orgToken?.startsWith("ss_")) {
    return orgToken;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "partner-sessions");
  if (limited) return limited;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  try {
    const rows = await db.$queryRaw<SessionRow[]>`
      SELECT id, ip_address, user_agent, created_at, last_active_at, token_hash
      FROM sessions
      WHERE user_id = ${session.user.id}::uuid AND expires_at > NOW()
      ORDER BY last_active_at DESC NULLS LAST
    `;

    const currentToken = extractToken(req);
    const currentHash = currentToken ? hashToken(currentToken) : null;

    const sessions = rows.map((row) => ({
      id: row.id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      browserInfo: parseBrowserInfo(row.user_agent),
      lastActiveAt: row.last_active_at?.toISOString() ?? row.created_at?.toISOString() ?? null,
      createdAt: row.created_at?.toISOString() ?? null,
      isCurrent: currentHash !== null && row.token_hash === currentHash,
    }));

    return jsonResponse({ sessions }, 200, origin);
  } catch (err) {
    console.error("Sessions GET error:", err);
    return errorResponse("Failed to fetch sessions", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "partner-sessions");
  if (limited) return limited;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = (await req.json()) as { sessionId?: string; revokeAll?: boolean };

    const currentToken = extractToken(req);
    const currentHash = currentToken ? hashToken(currentToken) : null;

    if (body.revokeAll) {
      if (!currentHash) {
        return errorResponse("Cannot determine current session", 400, origin);
      }
      await db.$executeRaw`
        DELETE FROM sessions
        WHERE user_id = ${session.user.id}::uuid
          AND token_hash != ${currentHash}
      `;
      return jsonResponse({ success: true }, 200, origin);
    }

    if (body.sessionId) {
      // Prevent revoking own session
      if (currentHash) {
        const target = await db.$queryRaw<{ token_hash: string }[]>`
          SELECT token_hash FROM sessions WHERE id = ${body.sessionId}::uuid AND user_id = ${session.user.id}::uuid
        `;
        if (target.length > 0 && target[0].token_hash === currentHash) {
          return errorResponse("Cannot revoke current session", 400, origin);
        }
      }

      await db.$executeRaw`
        DELETE FROM sessions
        WHERE id = ${body.sessionId}::uuid AND user_id = ${session.user.id}::uuid
      `;
      return jsonResponse({ success: true }, 200, origin);
    }

    return errorResponse("Provide sessionId or revokeAll", 400, origin);
  } catch (err) {
    console.error("Sessions DELETE error:", err);
    return errorResponse("Failed to revoke session", 500, origin);
  }
}
