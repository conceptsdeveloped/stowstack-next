import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

type LogContext = {
  operation: string;
  route?: string;
  userId?: string;
  orgId?: string;
  facilityId?: string;
  metadata?: Record<string, unknown>;
};

export function log(level: LogLevel, message: string, data: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export function logRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  extra: Record<string, unknown> = {}
): void {
  log("info", `${method} ${path} ${status}`, { method, path, status, durationMs, ...extra });
}

export function logError(error: unknown, context: LogContext): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  log("error", errorMessage, {
    stack: errorStack,
    ...context,
  });

  Sentry.captureException(error, {
    tags: {
      operation: context.operation,
      route: context.route,
    },
    extra: context.metadata,
  });
}

export function logWarning(message: string, context: LogContext): void {
  log("warn", message, { ...context });
}

export function fireAndForget(
  promise: Promise<unknown>,
  context: LogContext
): void {
  promise.catch((error) => logError(error, context));
}
