import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { isValidEmail } from "@/lib/validation";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_WRITE, "resend-access-code");
  if (limited) return limited;
  const origin = getOrigin(req);

  try {
    const { email } = await req.json();
    if (!email) return errorResponse("Email required", 400, origin);

    const sanitizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(sanitizedEmail)) {
      return errorResponse("Invalid email format", 400, origin);
    }

    const client = await db.clients.findFirst({
      where: { email: { equals: sanitizedEmail, mode: "insensitive" } },
      select: { name: true, email: true },
    });

    // Always return success to prevent email enumeration
    if (!client) return jsonResponse({ success: true }, 200, origin);

    // Rate limit: max 3 codes per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCodes = await db.portal_login_codes.count({
      where: { email: client.email, created_at: { gte: oneHourAgo } },
    });
    if (recentCodes >= 3) {
      return jsonResponse({ success: true }, 200, origin); // Silent rate limit
    }

    // Generate a 4-digit cryptographically secure code
    const { randomInt } = await import("crypto");
    const code = String(randomInt(1000, 9999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing unused codes for this email
    await db.portal_login_codes.updateMany({
      where: { email: client.email, used: false },
      data: { used: true },
    });

    // Create the new code
    await db.portal_login_codes.create({
      data: {
        email: client.email,
        code,
        expires_at: expiresAt,
      },
    });

    // Build magic link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storageads.com";
    const magicLink = `${baseUrl}/portal?code=${code}&email=${encodeURIComponent(client.email)}`;

    if (process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "StorageAds <noreply@storageads.com>",
            to: client.email,
            subject: "Your StorageAds Login Code",
            html: `
              <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto; background: #faf9f5; color: #141413;">
                <div style="background: linear-gradient(135deg, #B58B3F, #9E7A36); padding: 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: #faf9f5; margin: 0; font-size: 20px;">Your Login Code</h1>
                  <p style="color: rgba(250,249,245,0.8); margin: 8px 0 0; font-size: 14px;">StorageAds Client Portal</p>
                </div>
                <div style="padding: 24px; border: 1px solid #e8e6dc; border-top: 0; border-radius: 0 0 12px 12px; background: #ffffff;">
                  <p style="color: #6a6560; font-size: 15px;">Hi ${client.name || "there"},</p>
                  <p style="color: #6a6560; font-size: 15px;">Here's your 4-digit login code:</p>
                  <div style="background: #faf9f5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid rgba(181,139,63,0.2);">
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #B58B3F; font-family: monospace;">
                      ${code}
                    </div>
                  </div>
                  <p style="color: #b0aea5; font-size: 13px; text-align: center; margin-bottom: 20px;">
                    This code expires in 10 minutes.
                  </p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${magicLink}" style="display: inline-block; background: #B58B3F; color: #faf9f5; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                      Sign In Instantly
                    </a>
                  </div>
                  <p style="color: #b0aea5; font-size: 12px; text-align: center;">
                    Or go to <strong style="color: #141413;">storageads.com/portal</strong> and enter your code manually.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e8e6dc; margin: 20px 0;" />
                  <p style="color: #b0aea5; font-size: 11px;">
                    If you didn't request this code, you can safely ignore this email.
                  </p>
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
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
