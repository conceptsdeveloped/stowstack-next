import crypto from "crypto";
import { db } from "./db";

export async function dispatchWebhook(
  organizationId: string,
  event: string,
  payload: unknown
): Promise<void> {
  try {
    const hooks = await db.$queryRaw<
      { id: string; url: string; secret: string }[]
    >`
      SELECT id, url, secret FROM webhooks
      WHERE organization_id = ${organizationId}
        AND ${event} = ANY(events)
        AND active = TRUE
    `;

    if (!hooks.length) return;

    await Promise.allSettled(
      hooks.map((hook) => deliverWebhook(hook, event, payload))
    );
  } catch {
    // Fire-and-forget — never throws
  }
}

async function deliverWebhook(
  hook: { id: string; url: string; secret: string },
  event: string,
  payload: unknown
): Promise<void> {
  const deliveryId = crypto.randomUUID();
  const body = JSON.stringify({
    event,
    data: payload,
    timestamp: new Date().toISOString(),
  });
  const signature = crypto
    .createHmac("sha256", hook.secret)
    .update(body)
    .digest("hex");

  const start = Date.now();
  let status: number | null = null;
  let responseBody: string | null = null;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-StorageAds-Event": event,
        "X-StorageAds-Signature": `sha256=${signature}`,
        "X-StorageAds-Delivery": deliveryId,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    status = resp.status;
    responseBody = (await resp.text()).slice(0, 1024);

    if (status >= 200 && status < 300) {
      await db.$executeRaw`
        UPDATE webhooks SET failure_count = 0, last_triggered_at = NOW(),
          last_status = ${status}, updated_at = NOW()
        WHERE id = ${hook.id}::uuid
      `;
    } else {
      await incrementFailure(hook.id, status);
    }
  } catch (err: unknown) {
    const e = err as Error & { name?: string };
    error = e.name === "AbortError" ? "Timeout (5s)" : e.message;
    await incrementFailure(hook.id, null);
  }

  const durationMs = Date.now() - start;

  await db
    .$executeRaw`
    INSERT INTO webhook_deliveries (webhook_id, event, payload, status, response_body, duration_ms, error)
    VALUES (${hook.id}::uuid, ${event}, ${JSON.stringify(payload)}::jsonb, ${status}, ${responseBody}, ${durationMs}, ${error})
  `
    .catch(() => {});
}

async function incrementFailure(
  hookId: string,
  status: number | null
): Promise<void> {
  try {
    await db.$executeRaw`
      UPDATE webhooks SET
        failure_count = failure_count + 1,
        last_triggered_at = NOW(),
        last_status = ${status},
        active = CASE WHEN failure_count + 1 >= 10 THEN FALSE ELSE active END,
        updated_at = NOW()
      WHERE id = ${hookId}::uuid
    `;
  } catch {
    // Silently fail
  }
}
