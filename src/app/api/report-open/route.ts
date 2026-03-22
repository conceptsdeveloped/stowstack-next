import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    db.$executeRaw`
      UPDATE client_reports SET opened_at = COALESCE(opened_at, NOW()), status = 'opened'
      WHERE id = ${id}::uuid AND opened_at IS NULL
    `.catch(() => {});
  }

  return pixelResponse();
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (id) {
      db.$executeRaw`
        UPDATE client_reports SET opened_at = COALESCE(opened_at, NOW()), status = 'opened'
        WHERE id = ${id}::uuid AND opened_at IS NULL
      `.catch(() => {});
    }
  } catch {
    /* ignore parse errors */
  }

  return pixelResponse();
}
