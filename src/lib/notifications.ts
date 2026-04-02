import { db } from "./db";

interface CreateNotificationParams {
  orgId: string;
  userId?: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

export async function createNotification({
  orgId,
  userId,
  type,
  title,
  body,
  link,
}: CreateNotificationParams): Promise<void> {
  await db.$executeRaw`
    INSERT INTO notifications (organization_id, user_id, type, title, body, link)
    VALUES (${orgId}, ${userId || null}, ${type}, ${title}, ${body || null}, ${link || null})
  `;
}

export async function getUnreadCount(userId: string, orgId: string): Promise<number> {
  const rows = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM notifications
    WHERE (user_id = ${userId} OR (user_id IS NULL AND organization_id = ${orgId}))
      AND read_at IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await db.$executeRaw`
    UPDATE notifications SET read_at = NOW()
    WHERE id = ${notificationId}::uuid
      AND (user_id = ${userId} OR user_id IS NULL)
      AND read_at IS NULL
  `;
}

export async function markAllAsRead(userId: string, orgId: string): Promise<void> {
  await db.$executeRaw`
    UPDATE notifications SET read_at = NOW()
    WHERE (user_id = ${userId} OR (user_id IS NULL AND organization_id = ${orgId}))
      AND read_at IS NULL
  `;
}
