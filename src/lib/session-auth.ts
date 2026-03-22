import crypto from "crypto";
import { NextRequest } from "next/server";
import { db } from "./db";

const SESSION_DURATION_DAYS = 30;
const TOKEN_PREFIX = "ss_";

function generateToken(): string {
  return TOKEN_PREFIX + crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface SessionUser {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  is_superadmin: boolean;
}

export interface SessionOrg {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  whiteLabel: boolean;
  plan: string;
  facilityLimit: number;
  settings: unknown;
  status: string;
  subscriptionStatus: string | null;
  hasStripe: boolean;
}

export interface Session {
  user: SessionUser;
  organization: SessionOrg;
}

export async function createSession(
  userId: string,
  req: NextRequest
): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = req.headers.get("user-agent") || null;

  await db.$executeRaw`
    INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
    VALUES (${userId}, ${tokenHash}, ${expiresAt}, ${ip}, ${ua})
  `;

  return token;
}

export async function getSession(req: NextRequest): Promise<Session | null> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ss_")) {
    const token = auth.slice(7);
    return lookupSession(token);
  }

  const orgToken = req.headers.get("x-org-token");
  if (orgToken) {
    if (orgToken.startsWith("ss_")) {
      return lookupSession(orgToken);
    }
    return lookupLegacyToken(orgToken);
  }

  return null;
}

async function lookupSession(token: string): Promise<Session | null> {
  const tokenHash = hashToken(token);

  const rows = await db.$queryRaw<
    Array<{
      session_id: string;
      id: string;
      organization_id: string;
      email: string;
      name: string;
      role: string;
      status: string;
      is_superadmin: boolean;
      org_id: string;
      org_name: string;
      org_slug: string;
      logo_url: string | null;
      primary_color: string | null;
      accent_color: string | null;
      white_label: boolean;
      plan: string;
      facility_limit: number;
      org_settings: unknown;
      org_status: string;
      subscription_status: string | null;
      stripe_customer_id: string | null;
    }>
  >`
    SELECT s.id as session_id,
           ou.id, ou.organization_id, ou.email, ou.name, ou.role, ou.status, ou.is_superadmin,
           o.id as org_id, o.name as org_name, o.slug as org_slug, o.logo_url,
           o.primary_color, o.accent_color, o.white_label, o.plan, o.facility_limit,
           o.settings as org_settings, o.status as org_status,
           o.subscription_status, o.stripe_customer_id
    FROM sessions s
    JOIN org_users ou ON ou.id = s.user_id
    JOIN organizations o ON o.id = ou.organization_id
    WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW()
      AND ou.status = 'active' AND o.status = 'active'
  `;

  if (!rows.length) return null;
  const row = rows[0];

  // Fire-and-forget update
  db.$executeRaw`UPDATE sessions SET last_active_at = NOW() WHERE id = ${row.session_id}`.catch(
    () => {}
  );

  return formatSessionResult(row);
}

async function lookupLegacyToken(token: string): Promise<Session | null> {
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const [orgId, email] = decoded.split(":");
    if (!orgId || !email) return null;

    const rows = await db.$queryRaw<
      Array<{
        id: string;
        organization_id: string;
        email: string;
        name: string;
        role: string;
        status: string;
        is_superadmin: boolean;
        org_id: string;
        org_name: string;
        org_slug: string;
        logo_url: string | null;
        primary_color: string | null;
        accent_color: string | null;
        white_label: boolean;
        plan: string;
        facility_limit: number;
        org_settings: unknown;
        org_status: string;
        subscription_status: string | null;
        stripe_customer_id: string | null;
      }>
    >`
      SELECT ou.id, ou.organization_id, ou.email, ou.name, ou.role, ou.status, ou.is_superadmin,
             o.id as org_id, o.name as org_name, o.slug as org_slug, o.logo_url,
             o.primary_color, o.accent_color, o.white_label, o.plan, o.facility_limit,
             o.settings as org_settings, o.status as org_status,
             o.subscription_status, o.stripe_customer_id
      FROM org_users ou JOIN organizations o ON o.id = ou.organization_id
      WHERE ou.organization_id = ${orgId} AND ou.email = ${email}
        AND ou.status = 'active' AND o.status = 'active'
    `;

    if (!rows.length) return null;
    return formatSessionResult(rows[0]);
  } catch {
    return null;
  }
}

function formatSessionResult(row: {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  is_superadmin: boolean;
  org_id: string;
  org_name: string;
  org_slug: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  white_label: boolean;
  plan: string;
  facility_limit: number;
  org_settings: unknown;
  org_status: string;
  subscription_status: string | null;
  stripe_customer_id: string | null;
}): Session {
  return {
    user: {
      id: row.id,
      organization_id: row.organization_id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status,
      is_superadmin: row.is_superadmin || false,
    },
    organization: {
      id: row.org_id,
      name: row.org_name,
      slug: row.org_slug,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      accentColor: row.accent_color,
      whiteLabel: row.white_label,
      plan: row.plan,
      facilityLimit: row.facility_limit,
      settings: row.org_settings,
      status: row.org_status,
      subscriptionStatus: row.subscription_status,
      hasStripe: !!row.stripe_customer_id,
    },
  };
}

export async function destroySession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db.$executeRaw`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
}

export async function destroyAllSessions(userId: string): Promise<void> {
  await db.$executeRaw`DELETE FROM sessions WHERE user_id = ${userId}`;
}
