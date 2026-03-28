import { NextRequest } from "next/server";
import crypto from "crypto";
import { TOTP } from "otpauth";
import { db } from "@/lib/db";
import { getSession, createSession } from "@/lib/session-auth";
import { corsResponse, jsonResponse, errorResponse, getOrigin } from "@/lib/api-helpers";

const ISSUER = "StorageAds";
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_ALGORITHM = "SHA1";
const TEMP_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------- helpers ----------

function generateBase32Secret(byteLength = 20): string {
  const bytes = crypto.randomBytes(byteLength);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }
  return result;
}

function buildOtpauthUri(email: string, secret: string): string {
  const label = encodeURIComponent(`${ISSUER}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer: ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function makeTOTP(base32Secret: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: base32Secret,
  });
}

function verifyTOTPCode(base32Secret: string, code: string): boolean {
  const totp = makeTOTP(base32Secret);
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString("hex"));
  }
  return codes;
}

function signTempToken(userId: string): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + TEMP_TOKEN_TTL_MS });
  const sig = crypto
    .createHmac("sha256", process.env.ADMIN_SECRET || "")
    .update(payload)
    .digest("hex");
  return Buffer.from(payload).toString("base64") + "." + sig;
}

function verifyTempToken(tempToken: string): { userId: string } | null {
  const dotIndex = tempToken.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = tempToken.slice(0, dotIndex);
  const sig = tempToken.slice(dotIndex + 1);

  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64").toString();
  } catch {
    return null;
  }

  const expectedSig = crypto
    .createHmac("sha256", process.env.ADMIN_SECRET || "")
    .update(payload)
    .digest("hex");

  // timing-safe compare
  if (sig.length !== expectedSig.length) return null;
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed: { userId: string; exp: number } = JSON.parse(payload);
    if (!parsed.userId || !parsed.exp) return null;
    if (Date.now() > parsed.exp) return null;
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

// ---------- route ----------

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const { action } = body as { action: string };

    // ===== SETUP =====
    if (action === "setup") {
      const session = await getSession(req);
      if (!session) return errorResponse("Unauthorized", 401, origin);

      const secret = generateBase32Secret();
      const qrUri = buildOtpauthUri(session.user.email, secret);

      await db.org_users.update({
        where: { id: session.user.id },
        data: { totp_secret: secret, totp_enabled: false },
      });

      return jsonResponse({ secret, qrUri }, 200, origin);
    }

    // ===== CONFIRM =====
    if (action === "confirm") {
      const session = await getSession(req);
      if (!session) return errorResponse("Unauthorized", 401, origin);

      const { code } = body as { code: string };
      if (!code || code.length !== 6) {
        return errorResponse("A 6-digit code is required", 400, origin);
      }

      const user = await db.org_users.findUnique({
        where: { id: session.user.id },
        select: { totp_secret: true },
      });
      if (!user?.totp_secret) {
        return errorResponse("2FA setup not initiated", 400, origin);
      }

      if (!verifyTOTPCode(user.totp_secret, code)) {
        return errorResponse("Invalid code", 400, origin);
      }

      const backupCodes = generateBackupCodes();
      const hashedCodes = backupCodes.map((c) => sha256(c));

      await db.org_users.update({
        where: { id: session.user.id },
        data: {
          totp_enabled: true,
          totp_backup_codes: hashedCodes,
        },
      });

      return jsonResponse({ backupCodes }, 200, origin);
    }

    // ===== VERIFY (login 2FA) =====
    if (action === "verify") {
      const { tempToken, code } = body as { tempToken: string; code: string };
      if (!tempToken || !code) {
        return errorResponse("Token and code are required", 400, origin);
      }

      const tokenData = verifyTempToken(tempToken);
      if (!tokenData) {
        return errorResponse("Invalid or expired token", 401, origin);
      }

      const user = await db.org_users.findUnique({
        where: { id: tokenData.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          totp_secret: true,
          totp_enabled: true,
          organization_id: true,
        },
      });
      if (!user || !user.totp_secret || !user.totp_enabled) {
        return errorResponse("2FA not configured", 400, origin);
      }

      if (!verifyTOTPCode(user.totp_secret, code)) {
        return errorResponse("Invalid 2FA code", 401, origin);
      }

      const token = await createSession(user.id, req);

      const org = await db.organizations.findUnique({
        where: { id: user.organization_id },
        select: { id: true, name: true, slug: true, plan: true },
      });

      return jsonResponse(
        {
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          organization: org,
        },
        200,
        origin,
      );
    }

    // ===== VERIFY-BACKUP =====
    if (action === "verify-backup") {
      const { tempToken, backupCode } = body as { tempToken: string; backupCode: string };
      if (!tempToken || !backupCode) {
        return errorResponse("Token and backup code are required", 400, origin);
      }

      const tokenData = verifyTempToken(tempToken);
      if (!tokenData) {
        return errorResponse("Invalid or expired token", 401, origin);
      }

      const user = await db.org_users.findUnique({
        where: { id: tokenData.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          totp_secret: true,
          totp_enabled: true,
          totp_backup_codes: true,
          organization_id: true,
        },
      });
      if (!user || !user.totp_enabled) {
        return errorResponse("2FA not configured", 400, origin);
      }

      const hashedInput = sha256(backupCode.trim().toLowerCase());
      const codeIndex = user.totp_backup_codes.indexOf(hashedInput);
      if (codeIndex === -1) {
        return errorResponse("Invalid backup code", 401, origin);
      }

      // Remove used backup code
      const remainingCodes = [...user.totp_backup_codes];
      remainingCodes.splice(codeIndex, 1);
      await db.org_users.update({
        where: { id: user.id },
        data: { totp_backup_codes: remainingCodes },
      });

      const token = await createSession(user.id, req);

      const org = await db.organizations.findUnique({
        where: { id: user.organization_id },
        select: { id: true, name: true, slug: true, plan: true },
      });

      return jsonResponse(
        {
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          organization: org,
        },
        200,
        origin,
      );
    }

    // ===== DISABLE =====
    if (action === "disable") {
      const session = await getSession(req);
      if (!session) return errorResponse("Unauthorized", 401, origin);

      const { code } = body as { code: string };
      if (!code) {
        return errorResponse("Current 2FA code is required", 400, origin);
      }

      const user = await db.org_users.findUnique({
        where: { id: session.user.id },
        select: { totp_secret: true, totp_enabled: true },
      });
      if (!user?.totp_secret || !user.totp_enabled) {
        return errorResponse("2FA is not enabled", 400, origin);
      }

      if (!verifyTOTPCode(user.totp_secret, code)) {
        return errorResponse("Invalid code", 400, origin);
      }

      await db.org_users.update({
        where: { id: session.user.id },
        data: {
          totp_enabled: false,
          totp_secret: null,
          totp_backup_codes: [],
        },
      });

      return jsonResponse({ success: true }, 200, origin);
    }

    return errorResponse("Invalid action", 400, origin);
  } catch (err) {
    console.error("2FA route error:", err);
    return errorResponse("Internal server error", 500, origin);
  }
}
