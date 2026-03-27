import { NextRequest } from "next/server";
import crypto from "crypto";
import { promisify } from "util";
import { db } from "@/lib/db";
import { destroyAllSessions } from "@/lib/session-auth";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";

const scryptAsync = promisify(crypto.scrypt);
const SCRYPT_KEYLEN = 64;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "request") {
      const { email, orgSlug } = body;
      if (!email || !orgSlug) {
        return errorResponse("Email and organization required", 400, origin);
      }

      const users = await db.$queryRaw<
        Array<{
          id: string;
          name: string;
          email: string;
          org_name: string;
          slug: string;
        }>
      >`
        SELECT ou.id, ou.name, ou.email, o.name as org_name, o.slug
        FROM org_users ou JOIN organizations o ON o.id = ou.organization_id
        WHERE ou.email = ${email.toLowerCase()} AND o.slug = ${orgSlug} AND ou.status = 'active'
      `;

      if (!users.length) return jsonResponse({ success: true }, 200, origin);
      const user = users[0];

      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.$executeRaw`
        UPDATE org_users SET reset_token = ${resetToken}, reset_token_expires_at = ${expiresAt}
        WHERE id = ${user.id}::uuid
      `;

      if (process.env.RESEND_API_KEY) {
        const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://storageads.com"}/partner?reset=${resetToken}`;
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "StorageAds <noreply@storageads.com>",
              to: user.email,
              subject: "Reset Your StorageAds Password",
              html: `
                <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #B58B3F, #9E7A36); padding: 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">Password Reset</h1>
                    <p style="color: var(--color-dark); margin: 8px 0 0; font-size: 14px;">StorageAds Partner Portal</p>
                  </div>
                  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
                    <p style="color: #334155; font-size: 15px;">Hi ${user.name || "there"},</p>
                    <p style="color: #334155; font-size: 15px;">We received a request to reset your password for <strong>${user.org_name}</strong>.</p>
                    <div style="margin: 24px 0; text-align: center;">
                      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #B58B3F, #9E7A36); color: #faf9f5; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        Reset Password
                      </a>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— The StorageAds Team</p>
                  </div>
                </div>
              `,
            }),
          });
        } catch {
          /* email send failed, not critical */
        }
      }

      return jsonResponse({ success: true }, 200, origin);
    }

    if (action === "verify") {
      const { token } = body;
      if (!token) return errorResponse("Token required", 400, origin);

      const users = await db.$queryRaw<
        Array<{ id: string; email: string; org_slug: string }>
      >`
        SELECT ou.id, ou.email, o.slug as org_slug
        FROM org_users ou JOIN organizations o ON o.id = ou.organization_id
        WHERE ou.reset_token = ${token} AND ou.reset_token_expires_at > NOW()
      `;

      if (!users.length) {
        return errorResponse("Invalid or expired reset link", 400, origin);
      }

      return jsonResponse(
        { valid: true, email: users[0].email, orgSlug: users[0].org_slug },
        200,
        origin,
      );
    }

    if (action === "reset") {
      const { token, newPassword } = body;
      if (!token || !newPassword) {
        return errorResponse("Token and new password required", 400, origin);
      }
      if (newPassword.length < 8) {
        return errorResponse(
          "Password must be at least 8 characters",
          400,
          origin,
        );
      }

      const users = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM org_users WHERE reset_token = ${token} AND reset_token_expires_at > NOW()
      `;
      if (!users.length) {
        return errorResponse("Invalid or expired reset link", 400, origin);
      }

      // Destroy all existing sessions before changing password
      await destroyAllSessions(users[0].id);

      const passwordHash = await hashPassword(newPassword);
      await db.$executeRaw`
        UPDATE org_users SET password_hash = ${passwordHash}, reset_token = NULL, reset_token_expires_at = NULL
        WHERE id = ${users[0].id}::uuid
      `;

      return jsonResponse({ success: true }, 200, origin);
    }

    return errorResponse("Invalid action", 400, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
