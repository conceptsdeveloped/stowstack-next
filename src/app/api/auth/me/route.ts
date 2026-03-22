import { NextRequest } from "next/server";
import { getSession } from "@/lib/session-auth";
import { jsonResponse, errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) {
    return errorResponse("Unauthorized", 401, origin);
  }
  return jsonResponse({ user: session.user, organization: session.organization }, 200, origin);
}
