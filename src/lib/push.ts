import webpush from "web-push";
import { db } from "./db";

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  if (
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  ) {
    return false;
  }
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
    return true;
  } catch {
    return false;
  }
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface PushFilter {
  userType?: string;
  userId?: string;
}

export async function sendPushToAll(
  payload: PushPayload,
  filter: PushFilter = {}
): Promise<void> {
  if (!ensureVapid()) return;

  let whereClause = "WHERE active = true";
  const params: unknown[] = [];

  if (filter.userType) {
    params.push(filter.userType);
    whereClause += ` AND user_type = $${params.length}`;
  }
  if (filter.userId) {
    params.push(filter.userId);
    whereClause += ` AND user_id = $${params.length}`;
  }

  const subs = await db.$queryRawUnsafe<
    { id: string; endpoint: string; p256dh: string; auth: string }[]
  >(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions ${whereClause}`, ...params);

  if (!subs.length) return;

  const message = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        );
        db.$executeRaw`UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = ${sub.id}::uuid`.catch(
          () => {}
        );
      } catch (err: unknown) {
        const e = err as { statusCode?: number };
        if (e.statusCode === 410 || e.statusCode === 404) {
          staleIds.push(sub.id);
        }
      }
    })
  );

  if (staleIds.length) {
    await db
      .$executeRawUnsafe(
        `UPDATE push_subscriptions SET active = false WHERE id = ANY($1::uuid[])`,
        staleIds
      )
      .catch(() => {});
  }
}
