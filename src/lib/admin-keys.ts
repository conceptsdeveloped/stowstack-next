import crypto from "crypto";
import { db } from "./db";

const KEY_PREFIX = "sa_adm_";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function createAdminKey(
  adminEmail: string,
  label?: string
): Promise<string> {
  const rawKey = crypto.randomBytes(32).toString("hex");
  const fullKey = `${KEY_PREFIX}${rawKey}`;
  const keyHash = hashKey(fullKey);
  const keyPrefix = fullKey.substring(0, 8);

  await db.admin_keys.create({
    data: {
      key_hash: keyHash,
      key_prefix: keyPrefix,
      user_email: adminEmail,
      label: label || null,
    },
  });

  return fullKey;
}

export async function validateAdminKey(
  key: string
): Promise<{ valid: boolean; adminEmail?: string; keyId?: string; scopes?: string[] }> {
  if (!key.startsWith(KEY_PREFIX)) {
    return { valid: false };
  }

  const keyHash = hashKey(key);
  const record = await db.admin_keys.findUnique({
    where: { key_hash: keyHash },
  });

  if (!record || record.revoked_at) {
    return { valid: false };
  }

  if (record.expires_at && record.expires_at < new Date()) {
    return { valid: false };
  }

  db.admin_keys
    .update({
      where: { id: record.id },
      data: { last_used_at: new Date() },
    })
    .catch((err) =>
      console.error("[admin-keys] last_used_at update failed:", err instanceof Error ? err.message : err)
    );

  return {
    valid: true,
    adminEmail: record.user_email,
    keyId: record.id,
    scopes: record.scopes,
  };
}

/**
 * Return true if the given scope list grants the required scope.
 * "*" is a wildcard that grants everything.
 */
export function hasScope(scopes: string[] | undefined, required: string): boolean {
  if (!scopes || scopes.length === 0) return false;
  if (scopes.includes("*")) return true;
  return scopes.includes(required);
}

export async function revokeAdminKey(keyId: string): Promise<void> {
  await db.admin_keys.update({
    where: { id: keyId },
    data: { revoked_at: new Date() },
  });
}

export async function listAdminKeys() {
  return db.admin_keys.findMany({
    select: {
      id: true,
      user_email: true,
      key_prefix: true,
      label: true,
      scopes: true,
      last_used_at: true,
      expires_at: true,
      revoked_at: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });
}
