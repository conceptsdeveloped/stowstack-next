import { NextRequest } from "next/server";
import { jsonResponse, getOrigin, corsResponse } from "@/lib/api-helpers";
import { COOKIE_NAME, manageCookieOptions } from "@/lib/manage-session";

/**
 * POST /api/manage/logout
 *
 * Clears the manage session cookie. Same-origin call from the owner shell's
 * "Exit" action.
 */

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const res = jsonResponse({ ok: true }, 200, origin);
  // maxAge 0 expires the cookie immediately.
  res.cookies.set(COOKIE_NAME, "", manageCookieOptions(0));
  return res;
}
