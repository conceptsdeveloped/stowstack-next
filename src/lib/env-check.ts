const REQUIRED_VARS = [
  "DATABASE_URL",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "ADMIN_SECRET",
] as const;

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0 && process.env.NODE_ENV === "production") {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(", ")}`);
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (missing.length > 0) {
    console.warn(`[WARN] Missing environment variables (non-production): ${missing.join(", ")}`);
  }
}
