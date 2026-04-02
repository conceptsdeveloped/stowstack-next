import { NextRequest } from "next/server";
import crypto from "crypto";
import { promisify } from "util";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { isValidEmail, sanitizeString, escapeHtml } from "@/lib/validation";

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
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.SIGNUP_HOURLY, "partner-signup");
  if (limited) return limited;

  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const companyName = sanitizeString(body.companyName, 200);
    const contactName = sanitizeString(body.contactName, 200);
    const email = sanitizeString(body.email, 254);
    const phone = sanitizeString(body.phone, 30);
    const { facilityCount, plan } = body;

    if (!companyName || !email || !contactName) {
      return errorResponse("Company name, contact name, and email are required", 400, origin);
    }
    if (!isValidEmail(email)) {
      return errorResponse("Invalid email format", 400, origin);
    }

    const baseSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);

    let slug = baseSlug;
    let suffix = 1;
    while (await db.organizations.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const existing = await db.org_users.findFirst({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return errorResponse("An account with this email already exists", 400, origin);
    }

    const validPlans = ["starter", "growth", "enterprise"];
    const selectedPlan = validPlans.includes(plan) ? plan : "starter";
    const facilityLimits: Record<string, number> = { starter: 10, growth: 50, enterprise: 999 };

    const org = await db.organizations.create({
      data: {
        name: companyName,
        slug,
        contact_email: email.toLowerCase(),
        contact_phone: phone || null,
        plan: selectedPlan,
        facility_limit: facilityLimits[selectedPlan],
        status: "active",
      },
    });

    const userId = crypto.randomUUID();
    const tempPassword = crypto.randomBytes(6).toString("hex");
    const passwordHash = await hashPassword(tempPassword);

    await db.org_users.create({
      data: {
        id: userId,
        organization_id: org.id,
        email: email.toLowerCase(),
        name: contactName,
        role: "org_admin",
        password_hash: passwordHash,
        status: "active",
      },
    });

    await db.activity_log.create({
      data: {
        type: "partner_signup",
        detail: `${companyName} signed up as a partner (${selectedPlan} plan)`,
        meta: { orgId: org.id, email, plan: selectedPlan, facilityCount },
      },
    });

    const token = Buffer.from(`${org.id}:${email.toLowerCase()}`).toString("base64");

    if (process.env.RESEND_API_KEY) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "StorageAds Partners <partners@storageads.com>",
          to: email,
          subject: `Welcome to StorageAds — ${escapeHtml(companyName)} Partner Account`,
          html: `
            <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Welcome to StorageAds</h1>
                <p style="color: var(--color-dark); margin: 8px 0 0; font-size: 14px;">Partner Portal Access</p>
              </div>
              <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hi ${escapeHtml(contactName)},</p>
                <p style="color: #334155; font-size: 15px;">Your partner account for <strong>${escapeHtml(companyName)}</strong> is ready.</p>
                <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Your login credentials:</p>
                  <p style="margin: 0 0 4px; font-size: 14px;"><strong>Organization:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${escapeHtml(slug)}</code></p>
                  <p style="margin: 0 0 4px; font-size: 14px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
                </div>
                <p style="color: #334155; font-size: 14px;">Sign in at <strong>storageads.com/partner</strong> to get started.</p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— The StorageAds Team</p>
              </div>
            </div>
          `,
        }),
      }).catch((err) => {
        console.error("[partner-signup] Welcome email failed:", err instanceof Error ? err.message : err);
      });
    }

    return jsonResponse(
      {
        success: true,
        token,
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
        },
        user: {
          id: userId,
          email: email.toLowerCase(),
          name: contactName,
          role: "org_admin",
        },
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
