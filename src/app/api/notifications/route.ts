import { NextRequest } from "next/server";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

interface Notification {
  id: string;
  type: string;
  title: string;
  detail: string;
  timestamp: string;
  leadId?: string;
  read: boolean;
}

async function loadRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN)
    return null;
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "notifications");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const redis = await loadRedis();
  if (!redis) {
    return jsonResponse(
      { notifications: [], unreadCount: 0, lastSeen: null },
      200,
      origin
    );
  }

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const notifications: Notification[] = [];

    let lastSeen = (await redis.get("notifications:lastSeen")) as
      | string
      | null;

    // 1. New leads (submitted in last 24h)
    const leadKeys = await redis.keys("lead:*");
    if (leadKeys.length) {
      const pipeline = redis.pipeline();
      leadKeys.forEach((k: string) => pipeline.get(k));
      const leadResults = await pipeline.exec();

      for (let i = 0; i < leadResults.length; i++) {
        const raw = leadResults[i];
        const record =
          typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown> | null);
        if (!record) continue;

        const leadId = leadKeys[i].replace("lead:", "");
        const createdAt = record.createdAt
          ? new Date(record.createdAt as string)
          : null;

        if (createdAt && createdAt >= twentyFourHoursAgo) {
          notifications.push({
            id: `new_lead_${leadId}`,
            type: "new_lead",
            title: "New lead submitted",
            detail: `${record.name || "Unknown"} — ${record.facilityName || "Unknown facility"}`,
            timestamp: record.createdAt as string,
            leadId,
            read: false,
          });
        }

        if (
          record.followUpDate &&
          new Date(record.followUpDate as string) < now &&
          !["lost", "client_signed"].includes(record.status as string)
        ) {
          notifications.push({
            id: `overdue_${leadId}`,
            type: "overdue",
            title: "Overdue follow-up",
            detail: `${record.name || "Unknown"} — follow-up was due ${record.followUpDate}`,
            timestamp: record.followUpDate as string,
            leadId,
            read: false,
          });
        }
      }
    }

    // 2. New unread client messages (last 24h)
    const messageKeys = await redis.keys("messages:*");
    if (messageKeys.length) {
      const msgPipeline = redis.pipeline();
      messageKeys.forEach((k: string) => msgPipeline.lrange(k, 0, 0));
      const msgResults = await msgPipeline.exec();

      for (let i = 0; i < msgResults.length; i++) {
        const messages = msgResults[i] as unknown[];
        if (!messages || !messages.length) continue;

        const lastMsg =
          typeof messages[0] === "string"
            ? JSON.parse(messages[0])
            : (messages[0] as Record<string, unknown> | null);
        if (!lastMsg) continue;

        if (
          lastMsg.from === "client" &&
          lastMsg.timestamp &&
          new Date(lastMsg.timestamp as string) >= twentyFourHoursAgo
        ) {
          const threadId = messageKeys[i].replace("messages:", "");
          const text = lastMsg.text as string | undefined;
          notifications.push({
            id: `new_message_${threadId}_${lastMsg.timestamp}`,
            type: "new_message",
            title: "New client message",
            detail: text
              ? text.slice(0, 120) + (text.length > 120 ? "\u2026" : "")
              : "New message received",
            timestamp: lastMsg.timestamp as string,
            leadId: threadId,
            read: false,
          });
        }
      }
    }

    // 3. Campaign alerts
    const alertKeys = await redis.keys("campaign-alert:*");
    if (alertKeys.length) {
      const alertPipeline = redis.pipeline();
      alertKeys.forEach((k: string) => alertPipeline.get(k));
      const alertResults = await alertPipeline.exec();

      for (let i = 0; i < alertResults.length; i++) {
        const raw = alertResults[i];
        const alert =
          typeof raw === "string"
            ? JSON.parse(raw)
            : (raw as Record<string, unknown> | null);
        if (!alert) continue;

        notifications.push({
          id: `alert_${alertKeys[i].replace("campaign-alert:", "")}`,
          type: "alert",
          title: (alert.title as string) || "Campaign alert",
          detail: (alert.detail as string) || (alert.message as string) || "",
          timestamp:
            (alert.timestamp as string) ||
            (alert.createdAt as string) ||
            now.toISOString(),
          read: false,
        });
      }
    }

    // Sort by timestamp descending, cap at 50
    notifications.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const capped = notifications.slice(0, 50);

    // Mark read status based on lastSeen
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen);
      capped.forEach((n) => {
        if (new Date(n.timestamp) <= lastSeenDate) {
          n.read = true;
        }
      });
    }

    const unreadCount = capped.filter((n) => !n.read).length;

    // Update lastSeen if ?markSeen=true
    const url = new URL(req.url);
    const markSeen = url.searchParams.get("markSeen");
    if (markSeen === "true") {
      const nowISO = now.toISOString();
      await redis.set("notifications:lastSeen", nowISO);
      lastSeen = nowISO;
      capped.forEach((n) => {
        n.read = true;
      });
    }

    return jsonResponse(
      {
        notifications: capped,
        unreadCount: markSeen === "true" ? 0 : unreadCount,
        lastSeen,
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Failed to aggregate notifications", 500, origin);
  }
}
