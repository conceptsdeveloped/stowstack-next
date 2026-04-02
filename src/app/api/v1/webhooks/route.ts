import crypto from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  v1CorsResponse,
  v1Json,
  v1Error,
  requireApiAuth,
  isErrorResponse,
  requireScope,
} from "@/lib/v1-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const VALID_EVENTS = [
  "lead.created",
  "lead.updated",
  "unit.updated",
  "facility.updated",
  "special.created",
  "special.updated",
];

export async function OPTIONS() {
  return v1CorsResponse();
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-webhooks");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "webhooks:manage");
  if (scopeErr) return scopeErr;

  const id = new URL(request.url).searchParams.get("id");

  try {
    if (id) {
      const rows = await db.$queryRaw<Record<string, unknown>[]>`
        SELECT id, url, events, active, failure_count, last_triggered_at, last_status, created_at, updated_at
        FROM webhooks WHERE id = ${id}::uuid AND organization_id = ${orgId}::uuid
      `;
      if (!rows.length) return v1Error("Webhook not found", 404);

      const deliveries = await db.$queryRaw`
        SELECT id, event, status, duration_ms, error, created_at
        FROM webhook_deliveries WHERE webhook_id = ${id}::uuid
        ORDER BY created_at DESC LIMIT 20
      `;

      return v1Json({ webhook: rows[0], deliveries });
    }

    const webhooks = await db.$queryRaw`
      SELECT id, url, events, active, failure_count, last_triggered_at, last_status, created_at
      FROM webhooks WHERE organization_id = ${orgId}::uuid ORDER BY created_at DESC
    `;
    return v1Json({ webhooks });
  } catch {
    return v1Error("Failed to fetch webhooks", 500);
  }
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-webhooks");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "webhooks:manage");
  if (scopeErr) return scopeErr;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  if (id && action === "test") {
    const rows = await db.$queryRaw<
      { id: string; url: string; secret: string; events: string[] }[]
    >`
      SELECT id, url, secret, events FROM webhooks
      WHERE id = ${id}::uuid AND organization_id = ${orgId}::uuid
    `;
    if (!rows.length) return v1Error("Webhook not found", 404);

    const webhook = rows[0];
    const testPayload = {
      event: "webhook.test",
      data: {
        message: "This is a test webhook from StorageAds",
        webhookId: webhook.id,
      },
      timestamp: new Date().toISOString(),
    };
    const body = JSON.stringify(testPayload);
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(body)
      .digest("hex");

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-StorageAds-Event": "webhook.test",
          "X-StorageAds-Signature": `sha256=${signature}`,
          "X-StorageAds-Delivery": crypto.randomUUID(),
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const responseBody = (await resp.text()).slice(0, 1024);
      const durationMs = Date.now() - start;

      db.$executeRaw`
        INSERT INTO webhook_deliveries (webhook_id, event, payload, status, response_body, duration_ms)
        VALUES (${webhook.id}::uuid, 'webhook.test', ${JSON.stringify(testPayload)}::jsonb, ${resp.status}, ${responseBody}, ${durationMs})
      `.catch((err) => console.error("[webhook_delivery] Fire-and-forget failed:", err));

      return v1Json({
        success: resp.status >= 200 && resp.status < 300,
        status: resp.status,
        durationMs,
        responsePreview: responseBody.slice(0, 200),
      });
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      const e = err as Error & { name?: string };
      const error =
        e.name === "AbortError" ? "Timeout (5s)" : e.message;
      return v1Json({ success: false, error, durationMs });
    }
  }

  const reqBody = await request.json().catch(() => null);
  const { url: webhookUrl, events } = reqBody || {};

  if (!webhookUrl || !events?.length) {
    return v1Error("url and events[] are required");
  }

  const invalid = events.filter((e: string) => !VALID_EVENTS.includes(e));
  if (invalid.length) {
    return v1Error(
      `Invalid events: ${invalid.join(", ")}. Valid: ${VALID_EVENTS.join(", ")}`
    );
  }

  try {
    const urlObj = new URL(webhookUrl);
    if (urlObj.protocol !== "https:") {
      return v1Error("Webhook URL must use HTTPS");
    }
  } catch {
    return v1Error("Invalid webhook URL");
  }

  const secret = crypto.randomBytes(32).toString("hex");

  try {
    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      INSERT INTO webhooks (organization_id, url, events, secret)
      VALUES (${orgId}::uuid, ${webhookUrl}, ${events}::text[], ${secret})
      RETURNING id, url, events, active, secret, created_at
    `;
    return v1Json({ webhook: rows[0] });
  } catch {
    return v1Error("Failed to create webhook", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-webhooks");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "webhooks:manage");
  if (scopeErr) return scopeErr;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return v1Error("id query param is required");

  const body = await request.json().catch(() => null);
  if (!body) return v1Error("No valid fields to update");

  const fieldMap: Record<string, string> = {
    url: "url",
    events: "events",
    active: "active",
  };

  const sets: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
    if (body[bodyKey] !== undefined) {
      sets.push(`${dbCol} = $${paramIdx++}`);
      params.push(body[bodyKey]);
    }
  }

  if (!sets.length) return v1Error("No valid fields to update");

  if (body.events) {
    const invalid = body.events.filter(
      (e: string) => !VALID_EVENTS.includes(e)
    );
    if (invalid.length) {
      return v1Error(`Invalid events: ${invalid.join(", ")}`);
    }
  }

  if (body.active === true) {
    sets.push("failure_count = 0");
  }

  sets.push("updated_at = NOW()");
  params.push(id, orgId);

  try {
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE webhooks SET ${sets.join(", ")}
       WHERE id = $${paramIdx++}::uuid AND organization_id = $${paramIdx}::uuid
       RETURNING id, url, events, active, failure_count, last_triggered_at, created_at, updated_at`,
      ...params
    );
    if (!rows.length) return v1Error("Webhook not found", 404);
    return v1Json({ webhook: rows[0] });
  } catch {
    return v1Error("Failed to update webhook", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-webhooks");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "webhooks:manage");
  if (scopeErr) return scopeErr;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return v1Error("id query param is required");

  try {
    const rows = await db.$queryRaw<{ id: string }[]>`
      DELETE FROM webhooks WHERE id = ${id}::uuid AND organization_id = ${orgId}::uuid RETURNING id
    `;
    if (!rows.length) return v1Error("Webhook not found", 404);
    return v1Json({ success: true, id: rows[0].id });
  } catch {
    return v1Error("Failed to delete webhook", 500);
  }
}
