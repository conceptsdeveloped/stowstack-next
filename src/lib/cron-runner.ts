import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyCronSecret } from "./cron-auth";

type CronConfig = {
  name: string;
  notifyOnFailure?: boolean;
  notifyOnPartialFailure?: boolean;
};

type CronResult = {
  processed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  durationMs: number;
};

export function createCronHandler(
  config: CronConfig,
  handler: () => Promise<CronResult>
) {
  return async (req: NextRequest) => {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    const { name, notifyOnFailure = true, notifyOnPartialFailure = true } = config;

    Sentry.setTag("cron", name);

    try {
      const result = await handler();
      result.durationMs = Date.now() - startTime;

      console.log(
        JSON.stringify({
          level: "info",
          cron: name,
          processed: result.processed,
          failed: result.failed,
          durationMs: result.durationMs,
        })
      );

      if (result.failed > 0 && notifyOnPartialFailure) {
        sendCronAlert({
          cronName: name,
          type: "partial_failure",
          processed: result.processed,
          failed: result.failed,
          errors: result.errors.slice(0, 10),
          durationMs: result.durationMs,
        });
      }

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(
        JSON.stringify({ level: "error", cron: name, error: errorMessage, durationMs })
      );
      Sentry.captureException(error, { tags: { cron: name } });

      if (notifyOnFailure) {
        sendCronAlert({
          cronName: name,
          type: "fatal_error",
          error: errorMessage,
          durationMs,
        });
      }

      return NextResponse.json({ error: errorMessage, durationMs }, { status: 500 });
    }
  };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Minimal failure alert for crons that don't use createCronHandler.
 * Logs to console and emails admin (via Resend) when configured.
 */
export function notifyCronFailure(cronName: string, error: unknown, durationMs?: number) {
  const message = error instanceof Error ? error.message : String(error);
  Sentry.captureException(error, { tags: { cron: cronName } });
  sendCronAlert({
    cronName,
    type: "fatal_error",
    error: message,
    durationMs: durationMs ?? 0,
  });
}

function sendCronAlert(alert: {
  cronName: string;
  type: "partial_failure" | "fatal_error";
  processed?: number;
  failed?: number;
  errors?: Array<{ id: string; error: string }>;
  error?: string;
  durationMs: number;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;

  // Log the alert regardless of notification channel
  console.error("[CRON_ALERT]", JSON.stringify(alert));

  // Send email notification if configured
  if (adminEmail && resendKey) {
    const subject =
      alert.type === "fatal_error"
        ? `CRON FATAL: ${alert.cronName}`
        : `CRON PARTIAL FAILURE: ${alert.cronName}`;

    const body =
      alert.type === "fatal_error"
        ? `Cron job "${alert.cronName}" failed with error: ${alert.error}\nDuration: ${alert.durationMs}ms`
        : `Cron job "${alert.cronName}" completed with failures.\nProcessed: ${alert.processed}, Failed: ${alert.failed}\nDuration: ${alert.durationMs}ms\nErrors:\n${alert.errors?.map((e) => `  - ${e.id}: ${e.error}`).join("\n")}`;

    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "StorageAds Alerts <alerts@storageads.com>",
        to: adminEmail,
        subject,
        text: body,
      }),
    }).catch((err) =>
      console.error("[CRON_ALERT] Email send failed:", err instanceof Error ? err.message : err)
    );
  }
}
