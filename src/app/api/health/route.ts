import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
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
