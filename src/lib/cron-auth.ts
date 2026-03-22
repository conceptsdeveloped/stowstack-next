export function verifyCronSecret(req: Request): boolean {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (!cronSecret) return false; // fail-closed: reject if secret not configured
  const authHeader = req.headers.get("authorization") || "";
  return authHeader === `Bearer ${cronSecret}`;
}
