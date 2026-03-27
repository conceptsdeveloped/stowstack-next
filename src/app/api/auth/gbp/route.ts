import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/api-helpers";

/**
 * GET /api/auth/gbp
 * Initiates Google Business Profile OAuth flow.
 * Redirects the admin to Google's consent screen.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");
  if (!facilityId) {
    return NextResponse.json(
      { error: "Missing facilityId" },
      { status: 400 }
    );
  }

  const clientId = process.env.GOOGLE_GBP_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 500 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_ENV === "production"
      ? "https://www.storageads.com"
      : null) ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const redirectUri = `${baseUrl}/api/auth/gbp/callback`;

  // Encode facility ID in state parameter
  const state = Buffer.from(
    JSON.stringify({ facilityId })
  ).toString("base64url");

  const scopes = [
    "https://www.googleapis.com/auth/business.manage",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
