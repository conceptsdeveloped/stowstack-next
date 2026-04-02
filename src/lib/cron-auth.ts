import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";

export function verifyCronSecret(req: Request): boolean {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (!cronSecret) return false; // fail-closed: reject if secret not configured
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${cronSecret}`;
  // Hash both to normalize length — prevents timing leak from length comparison
  const hashA = crypto.createHash("sha256").update(authHeader).digest();
  const hashB = crypto.createHash("sha256").update(expected).digest();
  const valid = crypto.timingSafeEqual(hashA, hashB);
  if (valid) {
    Sentry.addBreadcrumb({ category: "auth", message: "Cron secret verified", level: "info" });
  }
  return valid;
}
