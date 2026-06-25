import { NextRequest, NextResponse } from "next/server";
import { requireAdminKey, corsResponse } from "@/lib/api-helpers";
import { IDEAS_HTML } from "@/lib/ideas-doc";

// Serves the full internal feature/idea doc as raw HTML, gated by the admin
// key. The content lives in a server-only module so it never reaches the
// public client bundle — only an authenticated admin can fetch it here.
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest) {
  return corsResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest) {
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  return new NextResponse(IDEAS_HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
