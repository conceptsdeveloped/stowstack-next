import { NextRequest, NextResponse } from "next/server";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { authenticatePortalRequest } from "@/lib/portal-auth";

interface RedisClient {
  lrange(key: string, start: number, stop: number): Promise<unknown[]>;
  lpush(key: string, value: string): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<string>;
}

async function getRedis(): Promise<RedisClient | null> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    const { Redis } = await import("@upstash/redis");
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    }) as unknown as RedisClient;
  } catch {
    return null;
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-messages");
  if (limited) return limited;
  const origin = getOrigin(req);

  // Canonical portal auth (Postgres). The old path read a Redis `client:*` key
  // the Postgres app never populates, so a real client always 401'd (or silently
  // succeeded when Upstash was unset). A client is validated to their own access
  // code; an admin (x-admin-key) may read any thread by passing accessCode.
  const scope = await authenticatePortalRequest(req);
  if (scope instanceof NextResponse) return scope;

  const accessCode = new URL(req.url).searchParams.get("accessCode");
  if (!accessCode) return errorResponse("Missing access code", 400, origin);

  const redis = await getRedis();
  if (!redis) return jsonResponse({ messages: [] }, 200, origin);

  try {
    const raw = await redis.lrange(`messages:${accessCode}`, 0, 199);
    const messages = (raw || []).map((entry) =>
      typeof entry === "string" ? JSON.parse(entry) : entry
    );
    messages.reverse();
    return jsonResponse({ messages }, 200, origin);
  } catch {
    return errorResponse("Failed to read messages", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-messages");
  if (limited) return limited;
  const origin = getOrigin(req);

  // Auth before parsing the body. Credentials (accessCode + email) ride in the
  // query so the shared helper can validate them; the body carries only content.
  const scope = await authenticatePortalRequest(req);
  if (scope instanceof NextResponse) return scope;

  const accessCode = new URL(req.url).searchParams.get("accessCode");
  if (!accessCode) return errorResponse("Missing access code", 400, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { text, from } = body as { text?: string; from?: string };

  if (!text || !from) {
    return errorResponse("Missing text or from", 400, origin);
  }
  if (!["client", "admin"].includes(from)) {
    return errorResponse('from must be "client" or "admin"', 400, origin);
  }
  if (text.length > 2000) {
    return errorResponse("Message too long (max 2000 chars)", 400, origin);
  }
  // Only an admin may speak as "admin"; a portal client can only post as a client.
  if (from === "admin" && scope.kind !== "admin") {
    return errorResponse("Unauthorized", 401, origin);
  }

  const redis = await getRedis();
  if (!redis) return jsonResponse({ success: true }, 200, origin);

  try {
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from,
      text: text.slice(0, 2000),
      timestamp: new Date().toISOString(),
    };

    await redis.lpush(`messages:${accessCode}`, JSON.stringify(message));
    await redis.ltrim(`messages:${accessCode}`, 0, 199);

    return jsonResponse({ success: true, message }, 200, origin);
  } catch {
    return errorResponse("Failed to send message", 500, origin);
  }
}
