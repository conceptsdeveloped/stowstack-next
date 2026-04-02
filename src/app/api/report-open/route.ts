import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { db } from "@/lib/db";
import { isValidUuid } from "@/lib/validation";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

function pixelResponse() {
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_WRITE, "report-open");
  if (limited) return limited;
  const id = req.nextUrl.searchParams.get("id");

  if (id && isValidUuid(id)) {
    db.$executeRaw`
      UPDATE client_reports SET opened_at = COALESCE(opened_at, NOW()), status = 'opened'
      WHERE id = ${id}::uuid AND opened_at IS NULL
    `.catch((err) => console.error("[report-open] DB update failed:", err instanceof Error ? err.message : err));
  }

  return pixelResponse();
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_WRITE, "report-open");
  if (limited) return limited;

  try {
    const { id } = await req.json();
    if (id && isValidUuid(id)) {
      db.$executeRaw`
        UPDATE client_reports SET opened_at = COALESCE(opened_at, NOW()), status = 'opened'
        WHERE id = ${id}::uuid AND opened_at IS NULL
      `.catch((err) => console.error("[report-open] DB update failed:", err instanceof Error ? err.message : err));
    }
  } catch {
    /* ignore JSON parse errors — tracking pixels shouldn't fail */
  }

  return pixelResponse();
}
