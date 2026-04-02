import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  verifyCsrfOrigin,
} from "@/lib/api-helpers";
import { Resend } from "resend";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_WRITE, "verify-email");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "send" || action === "resend") {
      const session = await getSession(req);
      if (!session) {
        return errorResponse("Unauthorized", 401, origin);
      }

      const userId = session.user.id;
      const userEmail = session.user.email;
      const userName = session.user.name;

      // For resend action, check rate limit — don't send if token was created less than 60s ago
      if (action === "resend") {
        const recent = await db.$queryRaw<
          Array<{ email_verify_expires_at: Date }>
        >`
          SELECT email_verify_expires_at
          FROM org_users
          WHERE id = ${userId}::uuid
            AND email_verify_expires_at IS NOT NULL
        `;

        if (recent.length > 0) {
          const expiresAt = new Date(recent[0].email_verify_expires_at);
          // Token was set with 24h expiry, so creation time = expiresAt - 24h
          const createdAt = new Date(expiresAt.getTime() - 24 * 60 * 60 * 1000);
          const secondsSinceCreation = (Date.now() - createdAt.getTime()) / 1000;

          if (secondsSinceCreation < 60) {
            return errorResponse(
              "Please wait before requesting another verification email",
              429,
              origin,
            );
          }
        }
      }

      const verifyToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.$executeRaw`
        UPDATE org_users
        SET email_verify_token = ${verifyToken},
            email_verify_expires_at = ${expiresAt}
        WHERE id = ${userId}::uuid
      `;

      if (process.env.RESEND_API_KEY) {
        const verifyUrl = `https://storageads.com/verify-email?token=${verifyToken}`;

        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "StorageAds <noreply@storageads.com>",
            to: userEmail,
            subject: "Verify Your Email Address",
            html: `
              <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #B58B3F, #9E7A36); padding: 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 20px;">Email Verification</h1>
                  <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">StorageAds Partner Portal</p>
                </div>
                <div style="padding: 24px; border: 1px solid #e8e6dc; border-top: 0; border-radius: 0 0 12px 12px;">
                  <p style="color: #141413; font-size: 15px;">Hi ${userName || "there"},</p>
                  <p style="color: #141413; font-size: 15px;">Please verify your email address to complete your account setup.</p>
                  <div style="margin: 24px 0; text-align: center;">
                    <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #B58B3F, #9E7A36); color: #faf9f5; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      Verify Email
                    </a>
                  </div>
                  <p style="color: #6a6560; font-size: 13px;">This link expires in 24 hours. If you didn&apos;t create this account, you can safely ignore this email.</p>
                  <p style="color: #b0aea5; font-size: 12px; margin-top: 24px;">&mdash; The StorageAds Team</p>
                </div>
              </div>
            `,
          });
        } catch {
          /* email send failed silently — token is still saved */
        }
      }

      return jsonResponse({ message: "Verification email sent" }, 200, origin);
    }

    if (action === "verify") {
      const { token } = body;
      if (!token || typeof token !== "string") {
        return errorResponse("Token required", 400, origin);
      }

      const users = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM org_users
        WHERE email_verify_token = ${token}
          AND email_verify_expires_at > NOW()
      `;

      if (!users.length) {
        return errorResponse(
          "Invalid or expired verification link",
          400,
          origin,
        );
      }

      await db.$executeRaw`
        UPDATE org_users
        SET email_verified = true,
            email_verify_token = NULL,
            email_verify_expires_at = NULL
        WHERE id = ${users[0].id}::uuid
      `;

      return jsonResponse({ message: "Email verified" }, 200, origin);
    }

    return errorResponse("Invalid action", 400, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
