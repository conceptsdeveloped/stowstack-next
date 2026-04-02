import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_READ, "health");
  if (limited) return limited;
  const start = performance.now();

  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs: number | null = null;

  try {
    const dbStart = performance.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Math.round(performance.now() - dbStart);
  } catch {
    dbStatus = "error";
  }

  const totalMs = Math.round(performance.now() - start);

  const healthy = dbStatus === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      responseTimeMs: totalMs,
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
