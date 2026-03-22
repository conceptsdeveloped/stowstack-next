import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId");
    const accessCode = url.searchParams.get("accessCode");
    const email = url.searchParams.get("email");
    const limit = parseInt(url.searchParams.get("limit") || "12") || 12;

    let resolvedClientId = clientId;

    if (!resolvedClientId && accessCode && email) {
      const client = await db.clients.findFirst({
        where: {
          access_code: accessCode,
          email: { equals: email.trim(), mode: "insensitive" },
        },
        select: { id: true },
      });
      if (client) resolvedClientId = client.id;
    }

    if (clientId && !isAdminRequest(req)) {
      return errorResponse("Unauthorized", 401, origin);
    }

    if (!resolvedClientId) {
      return errorResponse("Missing client identifier", 400, origin);
    }

    const reports = await db.$queryRaw<
      Array<{
        id: string;
        report_type: string;
        period_start: Date;
        period_end: Date;
        report_data: unknown;
        sent_at: Date | null;
        opened_at: Date | null;
        status: string;
        created_at: Date;
      }>
    >`
      SELECT id, report_type, period_start, period_end, report_data, sent_at, opened_at, status, created_at
      FROM client_reports WHERE client_id = ${resolvedClientId}::uuid
      ORDER BY period_start DESC
      LIMIT ${limit}
    `;

    return jsonResponse({ success: true, data: reports }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { clientId } = body || {};
    if (!clientId) return errorResponse("Missing clientId", 400, origin);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const cronSecret = process.env.CRON_SECRET || "";

    const cronRes = await fetch(`${baseUrl}/api/cron/send-client-reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const cronData = await cronRes.json();
    return jsonResponse({ success: true, result: cronData }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
