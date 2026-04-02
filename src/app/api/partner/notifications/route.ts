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

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: Date | null;
  created_at: Date | null;
}

interface UnreadCountRow {
  count: bigint;
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "partner-notifications");
  if (limited) return limited;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  const userId = session.user.id;
  const orgId = session.organization.id;

  try {
    const notifications = await db.$queryRaw<NotificationRow[]>`
      SELECT id, type, title, body, link, read_at, created_at
      FROM notifications
      WHERE (user_id = ${userId}::uuid OR (user_id IS NULL AND organization_id = ${orgId}::uuid))
      ORDER BY created_at DESC
      LIMIT 30
    `;

    const unreadResult = await db.$queryRaw<UnreadCountRow[]>`
      SELECT COUNT(*)::bigint as count
      FROM notifications
      WHERE (user_id = ${userId}::uuid OR (user_id IS NULL AND organization_id = ${orgId}::uuid))
        AND read_at IS NULL
    `;

    const unreadCount = Number(unreadResult[0]?.count ?? 0);

    return jsonResponse({ notifications, unreadCount }, 200, origin);
  } catch (err) {
    console.error("Notifications GET error:", err);
    return errorResponse("Failed to fetch notifications", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "partner-notifications");
  if (limited) return limited;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  const userId = session.user.id;
  const orgId = session.organization.id;

  try {
    const body = (await req.json()) as {
      id?: string;
      markAllRead?: boolean;
    };

    if (body.markAllRead) {
      await db.$executeRaw`
        UPDATE notifications
        SET read_at = NOW()
        WHERE (user_id = ${userId}::uuid OR (user_id IS NULL AND organization_id = ${orgId}::uuid))
          AND read_at IS NULL
      `;
    } else if (body.id) {
      await db.$executeRaw`
        UPDATE notifications
        SET read_at = NOW()
        WHERE id = ${body.id}::uuid
          AND (user_id = ${userId}::uuid OR user_id IS NULL)
          AND organization_id = ${orgId}::uuid
          AND read_at IS NULL
      `;
    } else {
      return errorResponse(
        "Provide either 'id' or 'markAllRead: true'",
        400,
        origin
      );
    }

    return jsonResponse({ success: true }, 200, origin);
  } catch (err) {
    console.error("Notifications PATCH error:", err);
    return errorResponse("Failed to update notification", 500, origin);
  }
}
