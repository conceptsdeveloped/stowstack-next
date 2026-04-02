import { NextRequest } from "next/server";
import crypto from "crypto";
import { promisify } from "util";
import { db } from "@/lib/db";
import { getSession, createSession } from "@/lib/session-auth";
import { jsonResponse, errorResponse, getOrigin, corsResponse, isAdminRequest, verifyCsrfOrigin } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const scryptAsync = promisify(crypto.scrypt);
const SCRYPT_KEYLEN = 64;

async function verifyPassword(password: string, storedHash: string, userId?: string): Promise<boolean> {
  if (storedHash.startsWith("scrypt:")) {
    const [, saltHex, hashHex] = storedHash.split(":");
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
    return derived.toString("hex") === hashHex;
  }
  // Legacy sha256(password + userId) format from partner-signup
  if (userId) {
    const hash = crypto.createHash("sha256").update(password + userId).digest("hex");
    if (hash === storedHash) return true;
  }
  return false;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const isAdmin = isAdminRequest(req);
  const session = !isAdmin ? await getSession(req) : null;

  if (!isAdmin && !session) return errorResponse("Unauthorized", 401, origin);

  try {
    if (isAdmin) {
      const orgs = await db.organizations.findMany({
        orderBy: { created_at: "desc" },
      });
      return jsonResponse({ organizations: orgs }, 200, origin);
    }

    // Non-admin: return own org
    const org = await db.organizations.findUnique({
      where: { id: session!.organization.id },
    });
    return jsonResponse({ organization: org }, 200, origin);
  } catch (err) {
    console.error("Organizations error:", err);
    return errorResponse("Failed to fetch organizations", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "login") {
      const { email, password, orgSlug } = body;
      if (!email || !password || !orgSlug) {
        return errorResponse("Email, password, and organization are required", 400, origin);
      }

      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const rl = await checkRateLimit(`org_login:${ip}:${email?.toLowerCase() || "unknown"}`, 5, 60);
      if (!rl.allowed) {
        return errorResponse("Too many requests", 429, origin);
      }

      const orgs = await db.organizations.findMany({
        where: { slug: orgSlug, status: { in: ["active", "pending_deletion"] } },
      });
      if (!orgs.length) {
        return errorResponse("Invalid credentials", 401, origin);
      }
      const org = orgs[0];

      const users = await db.org_users.findMany({
        where: {
          email: email.toLowerCase(),
          organization_id: org.id,
          status: "active",
        },
      });
      if (!users.length) {
        return errorResponse("Invalid credentials", 401, origin);
      }
      const user = users[0];

      if (!user.password_hash) {
        return errorResponse("Invalid credentials", 401, origin);
      }

      const valid = await verifyPassword(password, user.password_hash, user.id);
      if (!valid) {
        return errorResponse("Invalid credentials", 401, origin);
      }

      // Rehash legacy SHA-256 passwords to scrypt on successful login
      if (!user.password_hash.startsWith("scrypt:")) {
        const salt = crypto.randomBytes(16);
        const hash = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
        const newHash = `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
        await db.org_users.update({
          where: { id: user.id },
          data: { password_hash: newHash },
        });
      }

      // Check if 2FA is enabled — return temp token instead of session
      if (user.totp_enabled) {
        const payload = JSON.stringify({ userId: user.id, exp: Date.now() + 5 * 60 * 1000 });
        const sig = crypto.createHmac("sha256", process.env.ADMIN_SECRET || "").update(payload).digest("hex");
        const tempToken = Buffer.from(payload).toString("base64") + "." + sig;
        return jsonResponse({ requires2FA: true, tempToken }, 200, origin);
      }

      const token = await createSession(user.id, req);

      logAudit(req, {
        user: { id: user.id, organization_id: org.id, email: user.email, name: user.name, role: user.role, status: "active", is_superadmin: false },
        organization: { id: org.id, name: org.name, slug: org.slug, logoUrl: null, primaryColor: null, accentColor: null, whiteLabel: false, plan: org.plan || "starter", facilityLimit: 0, settings: null, status: "active", subscriptionStatus: null, trialEndsAt: null, hasStripe: false },
      }, { action: "login", resourceType: "session", metadata: { email: user.email } });

      return jsonResponse(
        {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            plan: org.plan,
            status: org.status,
          },
        },
        200,
        origin,
      );
    }

    if (action === "signup") {
      const { companyName, contactName, email, phone, plan } = body;
      if (!companyName || !email || !contactName) {
        return errorResponse("Company name, contact name, and email are required", 400, origin);
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
      const salt = crypto.randomBytes(16);
      const hash = (await scryptAsync(tempPassword, salt, SCRYPT_KEYLEN)) as Buffer;
      const passwordHash = `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;

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

      const token = await createSession(userId, req);

      logAudit(req, {
        user: { id: userId, organization_id: org.id, email: email.toLowerCase(), name: contactName, role: "org_admin", status: "active", is_superadmin: false },
        organization: { id: org.id, name: org.name, slug: org.slug, logoUrl: null, primaryColor: null, accentColor: null, whiteLabel: false, plan: org.plan || selectedPlan, facilityLimit: facilityLimits[selectedPlan], settings: null, status: "active", subscriptionStatus: null, trialEndsAt: null, hasStripe: false },
      }, { action: "signup", resourceType: "organization", resourceId: org.id, metadata: { email: email.toLowerCase(), plan: selectedPlan } });

      return jsonResponse(
        {
          token,
          user: {
            id: userId,
            email: email.toLowerCase(),
            name: contactName,
            role: "org_admin",
          },
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            plan: org.plan,
            status: org.status,
          },
          tempPassword,
        },
        200,
        origin,
      );
    }

    return errorResponse("Invalid action", 400, origin);
  } catch (err) {
    console.error("Organizations POST error:", err);
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);
  if (session.user.role !== "org_admin" && !session.user.is_superadmin) {
    return errorResponse("Forbidden", 403, origin);
  }

  try {
    const body = await req.json();
    const allowedFields = ["name", "logo_url", "primary_color", "accent_color", "white_label", "settings"];
    const updateData: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid fields to update", 400, origin);
    }

    const org = await db.organizations.update({
      where: { id: session.organization.id },
      data: updateData,
    });

    logAudit(req, session, { action: "settings.update", resourceType: "organization", resourceId: org.id, metadata: { fields: Object.keys(updateData) } });

    return jsonResponse({ organization: org }, 200, origin);
  } catch (err) {
    console.error("Organization update error:", err);
    return errorResponse("Failed to update organization", 500, origin);
  }
}
