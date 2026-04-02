import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "partner-changelog-viewed");
  if (limited) return limited;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  try {
    await db.org_users.update({
      where: { id: session.user.id },
      data: { last_changelog_viewed_at: new Date() },
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch (err) {
    console.error("Changelog viewed PATCH error:", err);
    return errorResponse("Failed to update", 500, origin);
  }
}
