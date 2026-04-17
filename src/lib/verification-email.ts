import { Resend } from "resend";

type SendVerificationArgs = {
  to: string;
  name?: string | null;
  token: string;
};

function renderHtml(name: string | null | undefined, verifyUrl: string): string {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  return `
    <div style="font-family: -apple-system, system-ui, 'Poppins', sans-serif; max-width: 560px; margin: 0 auto; background: #faf9f5;">
      <div style="padding: 32px 24px; border: 1px solid #e8e6dc; border-radius: 12px; background: #ffffff;">
        <div style="font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 18px; color: #141413; letter-spacing: -0.02em;">storageads</div>
        <h1 style="font-family: 'Poppins', sans-serif; font-weight: 600; color: #141413; margin: 24px 0 8px; font-size: 22px;">Verify your email</h1>
        <p style="color: #6a6560; font-size: 15px; line-height: 1.55; margin: 0 0 20px;">${greeting}</p>
        <p style="color: #141413; font-size: 15px; line-height: 1.55; margin: 0 0 24px;">Click the button below to confirm your email and finish setting up your StorageAds account.</p>
        <div style="margin: 28px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: #141413; color: #faf9f5; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; font-family: 'Poppins', sans-serif;">
            Verify email
          </a>
        </div>
        <p style="color: #6a6560; font-size: 13px; line-height: 1.55; margin: 20px 0 0;">This link expires in 24 hours. If you didn&rsquo;t create this account, you can safely ignore this email.</p>
        <p style="color: #b0aea5; font-size: 12px; margin-top: 28px;">&mdash; The StorageAds Team</p>
      </div>
    </div>
  `;
}

/**
 * Send the verification email for a newly created org_user. Fails silently —
 * the caller stores the token regardless, and the user can trigger a resend.
 */
export async function sendVerificationEmail({ to, name, token }: SendVerificationArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[verification-email] RESEND_API_KEY not set — skipping send");
    return;
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://storageads.com");
  const verifyUrl = `${siteUrl}/verify-email?token=${token}`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "StorageAds <noreply@storageads.com>",
      to,
      subject: "Verify your email address",
      html: renderHtml(name, verifyUrl),
    });
  } catch (err) {
    console.error("[verification-email] send failed:", err instanceof Error ? err.message : err);
  }
}
