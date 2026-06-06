import crypto from "crypto";

const STATE_TTL_MS = 30 * 60 * 1000; // 30 minutes — room for multi-step provider consent

/**
 * Secret used to HMAC the OAuth `state` parameter. Prefer a dedicated
 * OAUTH_STATE_SECRET; fall back to other always-present server secrets so signing
 * works in every environment without new configuration. Returns "" if none are
 * set, in which case verifyOAuthState fails closed (rejects all state).
 */
function getStateSecret(): string {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.ADMIN_SECRET ||
    process.env.CRON_SECRET ||
    ""
  );
}

/**
 * Create a tamper-proof OAuth state token: base64url(payload).base64url(hmac).
 * The payload carries the caller's fields plus an issued-at timestamp and a random
 * nonce. Because it is HMAC-signed with a server secret, a client cannot forge a
 * state naming an arbitrary facilityId, which closes the cross-tenant OAuth-token
 * injection on the callbacks.
 */
export function signOAuthState(payload: Record<string, unknown>): string {
  const secret = getStateSecret();
  if (!secret) throw new Error("OAuth state secret not configured");
  const body = {
    ...payload,
    iat: Date.now(),
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

/**
 * Verify and decode an OAuth state token. Returns the decoded payload, or null if
 * the signature is invalid/missing, the secret is unset, the format is wrong, or
 * the token has expired. Uses constant-time signature comparison.
 */
export function verifyOAuthState<T = Record<string, unknown>>(
  state: string | null | undefined
): T | null {
  const secret = getStateSecret();
  if (!secret || !state) return null;

  const dot = state.lastIndexOf(".");
  if (dot <= 0) return null;
  const data = state.slice(0, dot);
  const sig = state.slice(dot + 1);

  const expected = crypto.createHmac("sha256", secret).update(data).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  let body: { iat?: number } & Record<string, unknown>;
  try {
    body = JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof body.iat !== "number" || Date.now() - body.iat > STATE_TTL_MS) {
    return null;
  }
  return body as T;
}
