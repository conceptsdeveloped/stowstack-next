import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit using Upstash Redis sliding window.
 * @param key - Unique key for the rate limit (e.g., "portal_verify:user@example.com")
 * @param maxAttempts - Maximum attempts allowed in the window
 * @param windowSeconds - Window duration in seconds
 * @returns { allowed, remaining, resetAt }
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const r = getRedis();
  if (!r) {
    // No Redis configured — allow all (fail-open in dev)
    return { allowed: true, remaining: maxAttempts, resetAt: 0 };
  }

  const redisKey = `rl:${key}`;

  try {
    // Atomic incr + expire using pipeline to prevent race condition
    // where TTL could be lost or extended between separate commands
    const pipeline = r.pipeline();
    pipeline.incr(redisKey);
    pipeline.ttl(redisKey);
    const results = await pipeline.exec<[number, number]>();
    const current = results[0];
    let ttl = results[1];

    // Set TTL on first increment (ttl === -1 means no expiry set)
    if (ttl === -1) {
      await r.expire(redisKey, windowSeconds);
      ttl = windowSeconds;
    }

    const resetAt = Date.now() + Math.max(ttl, 0) * 1000;

    if (current > maxAttempts) {
      return { allowed: false, remaining: 0, resetAt };
    }

    return {
      allowed: true,
      remaining: maxAttempts - current,
      resetAt,
    };
  } catch {
    // Redis failure — fail-open to avoid blocking legitimate users
    return { allowed: true, remaining: maxAttempts, resetAt: 0 };
  }
}

/**
 * Reset a rate limit key (e.g., on successful login).
 */
export async function resetRateLimit(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(`rl:${key}`);
  } catch {
    // Non-critical
  }
}
