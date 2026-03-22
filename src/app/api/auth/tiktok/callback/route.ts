import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const maxDuration = 15;

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_ENV === "production"
      ? "https://www.stowstack.co"
      : null) ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

function redirectError(message: string): NextResponse {
  return NextResponse.redirect(
    `${getBaseUrl()}/?auth=error&platform=tiktok&message=${encodeURIComponent(message)}`
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return redirectError(errorDescription || error);
  }

  if (!code || !state) {
    return redirectError("Missing authorization code");
  }

  let facilityId: string;
  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString()
    );
    facilityId = parsed.facilityId;
  } catch {
    return redirectError("Invalid state parameter");
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    return redirectError("TikTok app not configured");
  }

  const baseUrl = getBaseUrl();
  const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

  try {
    const tokenRes = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      }
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      const errMsg =
        tokenData.error_description ||
        tokenData.error ||
        "Token exchange failed";
      return redirectError(errMsg);
    }

    const { access_token, refresh_token, expires_in, open_id } =
      tokenData;
    const tokenExpiresAt = new Date(
      Date.now() + (expires_in || 86400) * 1000
    ).toISOString();

    let userName: string | null = null;
    let displayName: string | null = null;
    try {
      const userRes = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      const userData = await userRes.json();
      if (userData.data?.user) {
        userName = userData.data.user.username;
        displayName = userData.data.user.display_name;
      }
    } catch {
      // Failed to fetch user info — continue without
    }

    const metadata = JSON.stringify({
      open_id,
      username: userName,
      displayName,
    });
    const accountId = open_id || null;
    const accountName = displayName || userName || null;

    await db.$executeRaw`
      INSERT INTO platform_connections (facility_id, platform, status, access_token, refresh_token, token_expires_at, account_id, account_name, metadata, updated_at)
      VALUES (${facilityId}::uuid, 'tiktok', 'connected', ${access_token}, ${refresh_token || null}, ${tokenExpiresAt}::timestamptz, ${accountId}, ${accountName}, ${metadata}::jsonb, NOW())
      ON CONFLICT (facility_id, platform) DO UPDATE SET
        status = 'connected',
        access_token = ${access_token},
        refresh_token = COALESCE(${refresh_token || null}, platform_connections.refresh_token),
        token_expires_at = ${tokenExpiresAt}::timestamptz,
        account_id = COALESCE(${accountId}, platform_connections.account_id),
        account_name = COALESCE(${accountName}, platform_connections.account_name),
        metadata = ${metadata}::jsonb,
        updated_at = NOW()
    `;

    return NextResponse.redirect(
      `${baseUrl}/?auth=success&platform=tiktok`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return redirectError(message);
  }
}
