import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db.$executeRaw`DELETE FROM sessions WHERE expires_at < NOW()`;
    return NextResponse.json({ success: true, deleted: result });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
