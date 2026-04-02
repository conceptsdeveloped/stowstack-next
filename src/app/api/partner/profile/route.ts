import crypto from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  verifyCsrfOrigin,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "partner-profile");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = (await req.json()) as { name?: string; email?: string; avatar_url?: string | null };
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 1 || name.length > 100) {
        return errorResponse("Name must be between 1 and 100 characters", 400, origin);
      }
      updates.name = name;
    }

    if (body.avatar_url !== undefined) {
      if (body.avatar_url === null) {
        updates.avatar_url = null;
      } else {
        const url = String(body.avatar_url).trim();
        if (url.length > 2048) {
          return errorResponse("Avatar URL too long", 400, origin);
        }
        updates.avatar_url = url;
      }
    }

    let emailChanged = false;

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse("Invalid email address", 400, origin);
      }

      // Check if email is actually changing
      if (email !== session.user.email.toLowerCase()) {
        // Check uniqueness within the org
        const existing = await db.org_users.findFirst({
          where: {
            organization_id: session.user.organization_id,
            email,
            id: { not: session.user.id },
          },
          select: { id: true },
        });

        if (existing) {
          return errorResponse("Email already in use within your organization", 409, origin);
        }

        const verifyToken = crypto.randomBytes(32).toString("hex");
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        updates.email = email;
        updates.email_verified = false;
        updates.email_verify_token = verifyToken;
        updates.email_verify_expires_at = verifyExpires;
        emailChanged = true;

        // Send verification email (fire-and-forget)
        sendVerificationEmail(email, verifyToken).catch((err) =>
          console.error("Failed to send verification email:", err)
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse("No changes provided", 400, origin);
    }

    const updated = await db.org_users.update({
      where: { id: session.user.id },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        email_verified: true,
        avatar_url: true,
        role: true,
      },
    });

    return jsonResponse(
      {
        user: updated,
        emailChanged,
        message: emailChanged
          ? "Profile updated. Please check your new email for a verification link."
          : "Profile updated successfully.",
      },
      200,
      origin
    );
  } catch (err) {
    console.error("Profile PATCH error:", err);
    return errorResponse("Failed to update profile", 500, origin);
  }
}

async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storageads.com";
  const verifyUrl = `${baseUrl}/partner/verify-email?token=${token}`;

  // Use Resend if available
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set, skipping verification email");
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "StorageAds <noreply@storageads.com>",
      to: [email],
      subject: "Verify your new email address",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #141413; font-size: 20px; margin-bottom: 16px;">Verify your email</h2>
          <p style="color: #6a6560; font-size: 14px; line-height: 1.6;">
            You recently changed your email address on StorageAds. Click the button below to verify your new email.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #B58B3F; color: #141413; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
            Verify Email
          </a>
          <p style="color: #b0aea5; font-size: 12px;">This link expires in 24 hours.</p>
        </div>
      `,
    }),
  });
}
