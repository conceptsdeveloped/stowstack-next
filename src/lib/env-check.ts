const REQUIRED_VARS = [
  "DATABASE_URL",
  "CRON_SECRET",
  "ADMIN_SECRET",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
] as const;

const REQUIRED_FOR_FEATURES: Record<string, string[]> = {
  "Clerk auth": ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
  Stripe: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  "AI features": ["ANTHROPIC_API_KEY"],
  Email: ["RESEND_API_KEY"],
  "Google Places": ["GOOGLE_PLACES_API_KEY"],
  "Google Ads": ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET"],
  "Google Business Profile": ["GOOGLE_GBP_CLIENT_ID", "GOOGLE_GBP_CLIENT_SECRET"],
  Twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
  "Push notifications": ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"],
};

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);

  // Only hard-fail on a *real* production deploy. Vercel runs preview and
  // development deployments with NODE_ENV=production as well, so a missing
  // non-critical var (KV/CRON) would otherwise 500 the entire preview at
  // startup via the instrumentation hook. Gate on VERCEL_ENV when present;
  // fall back to NODE_ENV for non-Vercel production hosts.
  const isRealProd =
    process.env.VERCEL_ENV === "production" ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");

  if (missing.length > 0 && isRealProd) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(", ")}`);
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (missing.length > 0) {
    console.warn(`[WARN] Missing required environment variables: ${missing.join(", ")}`);
  }

  const featureWarnings: string[] = [];
  for (const [feature, keys] of Object.entries(REQUIRED_FOR_FEATURES)) {
    const missingKeys = keys.filter((k) => !process.env[k]);
    if (missingKeys.length > 0) {
      featureWarnings.push(`${feature}: missing ${missingKeys.join(", ")}`);
    }
  }
  if (featureWarnings.length > 0) {
    console.warn(
      `[WARN] Features with missing env vars (will degrade gracefully):\n  ${featureWarnings.join("\n  ")}`
    );
  }
}
