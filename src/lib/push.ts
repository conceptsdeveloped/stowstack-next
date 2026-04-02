import webpush from "web-push";
import { Prisma } from "@prisma/client";
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

  const conditions: Prisma.Sql[] = [Prisma.sql`active = true`];

  if (filter.userType) {
    conditions.push(Prisma.sql`user_type = ${filter.userType}`);
  }
  if (filter.userId) {
    conditions.push(Prisma.sql`user_id = ${filter.userId}`);
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const subs = await db.$queryRaw<
    { id: string; endpoint: string; p256dh: string; auth: string }[]
  >`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE ${whereClause}`;

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
      .$executeRaw`UPDATE push_subscriptions SET active = false WHERE id = ANY(${staleIds}::uuid[])`
      .catch((err) => console.error("[push] Fire-and-forget failed:", err));
  }
}
