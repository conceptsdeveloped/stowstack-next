import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

function getOAuthUrl(platform: string, facilityId: string): string | null {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_ENV === "production"
      ? "https://www.storageads.com"
      : null) ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const state = Buffer.from(JSON.stringify({ facilityId, platform })).toString(
    "base64url"
  );

  if (platform === "meta") {
    const appId = process.env.META_APP_ID;
    if (!appId) return null;
    const redirectUri = `${baseUrl}/api/auth/meta/callback`;
    const scopes = [
      "ads_management",
      "ads_read",
      "business_management",
      "pages_read_engagement",
    ].join(",");
    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
  }

  if (platform === "google_ads") {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    if (!clientId) return null;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const scopes = ["https://www.googleapis.com/auth/adwords"].join(" ");
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code&access_type=offline&prompt=consent`;
  }

  if (platform === "tiktok") {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) return null;
    const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;
    const scopes = ["video.publish", "video.upload", "user.info.basic"].join(
      ","
    );
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${state}`;
  }

  return null;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "platform-connections");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const connections = await db.platform_connections.findMany({
      where: { facility_id: facilityId },
      select: {
        id: true,
        facility_id: true,
        platform: true,
        status: true,
        account_id: true,
        account_name: true,
        page_id: true,
        page_name: true,
        created_at: true,
        updated_at: true,
        token_expires_at: true,
        metadata: true,
      },
    });

    const platforms = [
      {
        id: "meta",
        name: "Meta (Facebook & Instagram)",
        description:
          "Publish ads to Facebook Feed, Instagram Feed, and Instagram Stories",
        configured: !!process.env.META_APP_ID,
        connectUrl: getOAuthUrl("meta", facilityId),
        icon: "meta",
      },
      {
        id: "google_ads",
        name: "Google Ads",
        description: "Publish Search and Display ads to Google Ads",
        configured: !!process.env.GOOGLE_ADS_CLIENT_ID,
        connectUrl: getOAuthUrl("google_ads", facilityId),
        icon: "google",
      },
      {
        id: "tiktok",
        name: "TikTok",
        description:
          "Post organic content to target local audiences on TikTok",
        configured: !!process.env.TIKTOK_CLIENT_KEY,
        connectUrl: getOAuthUrl("tiktok", facilityId),
        icon: "tiktok",
      },
    ];

    return jsonResponse({ connections, platforms }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch connections", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "platform-connections");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req))
    return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { connectionId } = body || {};
    if (!connectionId)
      return errorResponse("connectionId required", 400, origin);

    await db.platform_connections.update({
      where: { id: connectionId },
      data: {
        status: "disconnected",
        access_token: null,
        refresh_token: null,
      },
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to disconnect", 500, origin);
  }
}
