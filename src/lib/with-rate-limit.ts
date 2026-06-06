import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "./rate-limit";
import { getCorsHeaders } from "./api-helpers";
import type { RateLimitTier } from "./rate-limit-tiers";

/**
 * Apply rate limiting to an API route handler.
 * Call at the top of any handler — returns a 429 NextResponse if limited, or null to continue.
 *
 * Usage:
 *   const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "my-route");
 *   if (limited) return limited;
 */
export async function applyRateLimit(
  req: NextRequest,
  tier: RateLimitTier,
  prefix: string,
  keyOverride?: string
): Promise<NextResponse | null> {
  // Vercel sets x-forwarded-for with the real client IP as the first entry.
  // Do NOT trust x-real-ip — it's non-standard and trivially spoofable.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = keyOverride ?? ip ?? "unknown-ip";

  const rl = await checkRateLimit(
    `${prefix}:${key}`,
    tier.requests,
    tier.windowSeconds
  );

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "X-RateLimit-Limit": String(tier.requests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
          "Retry-After": String(tier.windowSeconds),
        },
      }
    );
  }

  return null;
}

/**
 * Fail-closed variant of applyRateLimit. If the rate-limit backend is
 * unavailable (Redis unset or erroring), the request is REJECTED with 429
 * instead of allowed through — but only in production, so local dev (which
 * usually has no Redis) is unaffected. Use for unauthenticated, cost-bearing
 * routes (paid Anthropic/Google proxies) where an unthrottled fallback would
 * mean unbounded spend.
 */
export async function applyRateLimitStrict(
  req: NextRequest,
  tier: RateLimitTier,
  prefix: string,
  keyOverride?: string
): Promise<NextResponse | null> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = keyOverride ?? ip ?? "unknown-ip";

  const rl = await checkRateLimit(
    `${prefix}:${key}`,
    tier.requests,
    tier.windowSeconds
  );

  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  if (!rl.allowed || (rl.degraded && isProd)) {
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "X-RateLimit-Limit": String(tier.requests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
          "Retry-After": String(tier.windowSeconds),
        },
      }
    );
  }

  return null;
}
