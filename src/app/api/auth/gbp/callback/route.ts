import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 15;

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_ENV === "production"
      ? "https://www.storageads.com"
      : null) ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

function redirectError(message: string): NextResponse {
  return NextResponse.redirect(
    `${getBaseUrl()}/?auth=error&platform=gbp&message=${encodeURIComponent(message)}`
  );
}

/**
 * GET /api/auth/gbp/callback
 * Handles the OAuth callback from Google for Business Profile access.
 * Exchanges the authorization code for tokens and creates/updates gbp_connections.
 */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_WRITE, "auth-gbp-callback");
  if (limited) return limited;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return redirectError(error);
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

  const clientId = process.env.GOOGLE_GBP_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GBP_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return redirectError("Google OAuth not configured");
  }

  const baseUrl = getBaseUrl();
  const redirectUri = `${baseUrl}/api/auth/gbp/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return redirectError(
        tokenData.error_description || tokenData.error
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const tokenExpiresAt = new Date(
      Date.now() + (expires_in || 3600) * 1000
    );

    // Fetch GBP accounts/locations
    let locationId: string | null = null;
    let locationName: string | null = null;
    let allLocations: { name: string; title: string }[] = [];

    try {
      // List accounts
      const accountsRes = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      const accountsData = await accountsRes.json();
      const accounts = accountsData.accounts || [];

      // Get the first account's locations
      if (accounts.length > 0) {
        const accountName = accounts[0].name;
        const locationsRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress`,
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );
        const locationsData = await locationsRes.json();
        const locations = locationsData.locations || [];

        allLocations = locations.map((l: { name: string; title?: string }) => ({
          name: l.name,
          title: l.title || l.name,
        }));

        if (locations.length === 1) {
          locationId = locations[0].name;
          locationName = locations[0].title || null;
        }
        // If multiple locations, store them all for admin to choose
      }
    } catch {
      // Failed to list locations — store connection anyway, admin can select later
    }

    // Determine connection status based on location count
    const needsLocationSelection = allLocations.length > 1 && !locationId;
    const connectionStatus = needsLocationSelection ? "pending_location_selection" : "connected";
    const syncConfig = needsLocationSelection ? { pending_locations: allLocations } : undefined;

    // Upsert gbp_connections
    const existing = await db.gbp_connections.findUnique({
      where: { facility_id: facilityId },
    });

    if (existing) {
      await db.gbp_connections.update({
        where: { facility_id: facilityId },
        data: {
          access_token,
          refresh_token: refresh_token || existing.refresh_token,
          token_expires_at: tokenExpiresAt,
          location_id: locationId || existing.location_id,
          location_name: locationName || existing.location_name,
          status: connectionStatus,
          ...(syncConfig ? { sync_config: syncConfig } : {}),
          last_sync_at: new Date(),
        },
      });
    } else {
      await db.gbp_connections.create({
        data: {
          facility_id: facilityId,
          access_token,
          refresh_token: refresh_token || "",
          token_expires_at: tokenExpiresAt,
          location_id: locationId,
          location_name: locationName,
          status: connectionStatus,
          ...(syncConfig ? { sync_config: syncConfig } : {}),
        },
      });
    }

    // Log the connection
    await db.activity_log.create({
      data: {
        type: "gbp_connected",
        facility_id: facilityId,
        detail: `Google Business Profile connected${locationName ? `: ${locationName}` : ""}`,
        meta: { locationId, locationName },
      },
    });

    if (needsLocationSelection) {
      return NextResponse.redirect(
        `${baseUrl}/?auth=success&platform=gbp&action=select_location&facilityId=${facilityId}`
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/?auth=success&platform=gbp`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return redirectError(message);
  }
}
