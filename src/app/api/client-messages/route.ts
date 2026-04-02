import { NextRequest } from "next/server";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

interface RedisClient {
  get(key: string): Promise<unknown>;
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

async function verifyClient(
  redis: RedisClient,
  code: string,
  email: string
): Promise<boolean> {
  if (!code || !email) return false;
  const raw = await redis.get(`client:${code}`);
  if (!raw) return false;
  const client =
    typeof raw === "string"
      ? JSON.parse(raw)
      : (raw as Record<string, unknown>);
  return (
    !!client.email &&
    (client.email as string).toLowerCase() === email.toLowerCase()
  );
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-messages");
  if (limited) return limited;
  const origin = getOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const email = url.searchParams.get("email");

  if (!code) {
    return errorResponse("Missing access code", 400, origin);
  }

  const redis = await getRedis();
  const isAdmin = isAdminRequest(req);

  if (!isAdmin) {
    if (!redis) return jsonResponse({ messages: [] }, 200, origin);
    const valid = await verifyClient(redis, code, email || "");
    if (!valid) return errorResponse("Unauthorized", 401, origin);
  }

  if (!redis) return jsonResponse({ messages: [] }, 200, origin);

  try {
    const raw = await redis.lrange(`messages:${code}`, 0, 199);
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { code, email, text, from } = body as {
    code?: string;
    email?: string;
    text?: string;
    from?: string;
  };

  if (!code || !text || !from) {
    return errorResponse("Missing code, text, or from", 400, origin);
  }
  if (!["client", "admin"].includes(from)) {
    return errorResponse('from must be "client" or "admin"', 400, origin);
  }
  if (text.length > 2000) {
    return errorResponse("Message too long (max 2000 chars)", 400, origin);
  }

  const redis = await getRedis();
  const isAdmin = isAdminRequest(req);

  if (from === "admin" && !isAdmin) {
    return errorResponse("Unauthorized", 401, origin);
  }
  if (from === "client") {
    if (!redis) return jsonResponse({ success: true }, 200, origin);
    const valid = await verifyClient(redis, code, email || "");
    if (!valid) return errorResponse("Unauthorized", 401, origin);
  }

  if (!redis) return jsonResponse({ success: true }, 200, origin);

  try {
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from,
      text: text.slice(0, 2000),
      timestamp: new Date().toISOString(),
    };

    await redis.lpush(`messages:${code}`, JSON.stringify(message));
    await redis.ltrim(`messages:${code}`, 0, 199);

    return jsonResponse({ success: true, message }, 200, origin);
  } catch {
    return errorResponse("Failed to send message", 500, origin);
  }
}
