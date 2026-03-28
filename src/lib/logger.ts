type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

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
