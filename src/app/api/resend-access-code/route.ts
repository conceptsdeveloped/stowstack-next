import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const { email } = await req.json();
    if (!email) return errorResponse("Email required", 400, origin);

    const sanitizedEmail = email.trim().toLowerCase();

    const client = await db.clients.findFirst({
      where: { email: { equals: sanitizedEmail, mode: "insensitive" } },
      select: { name: true, email: true },
    });

    // Always return success to prevent email enumeration
    if (!client) return jsonResponse({ success: true }, 200, origin);

    // Generate a 4-digit numeric code
    const code = String(Math.floor(1000 + Math.random() * 9000));
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stowstack.co";
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
            from: "StowStack <noreply@stowstack.co>",
            to: client.email,
            subject: "Your StowStack Login Code",
            html: `
              <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto; background: #0A0A0A; color: #F5F5F7;">
                <div style="background: linear-gradient(135deg, #3B82F6, #2563EB); padding: 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 20px;">Your Login Code</h1>
                  <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">StowStack Client Portal</p>
                </div>
                <div style="padding: 24px; border: 1px solid rgba(255,255,255,0.06); border-top: 0; border-radius: 0 0 12px 12px; background: #111111;">
                  <p style="color: #A1A1A6; font-size: 15px;">Hi ${client.name || "there"},</p>
                  <p style="color: #A1A1A6; font-size: 15px;">Here's your 4-digit login code:</p>
                  <div style="background: #0A0A0A; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid rgba(59,130,246,0.2);">
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #3B82F6; font-family: monospace;">
                      ${code}
                    </div>
                  </div>
                  <p style="color: #6E6E73; font-size: 13px; text-align: center; margin-bottom: 20px;">
                    This code expires in 10 minutes.
                  </p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${magicLink}" style="display: inline-block; background: #3B82F6; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                      Sign In Instantly
                    </a>
                  </div>
                  <p style="color: #6E6E73; font-size: 12px; text-align: center;">
                    Or go to <strong style="color: #A1A1A6;">stowstack.co/portal</strong> and enter your code manually.
                  </p>
                  <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 20px 0;" />
                  <p style="color: #6E6E73; font-size: 11px;">
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
