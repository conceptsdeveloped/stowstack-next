import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

interface GbpConnection {
  id: string;
  facility_id: string;
  location_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: Date | null;
  status: string | null;
  sync_config: unknown;
}

async function getValidToken(connection: GbpConnection): Promise<string | null> {
  if (
    connection.access_token &&
    connection.token_expires_at &&
    new Date(connection.token_expires_at) > new Date()
  ) {
    return connection.access_token;
  }
  if (!connection.refresh_token) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET || "",
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      const expiresAt = new Date(
        Date.now() + (data.expires_in || 3600) * 1000
      );
      await db.gbp_connections.update({
        where: { id: connection.id },
        data: {
          access_token: data.access_token,
          token_expires_at: expiresAt,
          status: "connected",
          updated_at: new Date(),
        },
      });
      return data.access_token;
    }
  } catch {
    // Token refresh failed
  }
  return null;
}

async function syncHours(
  facilityId: string,
  connection: GbpConnection
): Promise<{ synced: boolean; reason?: string }> {
  const token = await getValidToken(connection);
  if (!token)
    throw new Error("Unable to authenticate with Google Business Profile");

  const facility = await db.facilities.findUnique({
    where: { id: facilityId },
    select: { hours: true },
  });
  if (!facility?.hours) {
    return { synced: false, reason: "No hours data in facility record" };
  }

  const hours = facility.hours;
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${connection.location_id}?updateMask=regularHours`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ regularHours: hours }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || `GBP API error ${res.status}`
    );
  }

  await db.gbp_profile_sync_log.create({
    data: {
      facility_id: facilityId,
      sync_type: "hours",
      status: "success",
      changes: { hours } as object,
    },
  });
  return { synced: true };
}

async function syncPhotos(
  facilityId: string,
  connection: GbpConnection
): Promise<{ synced: boolean; uploaded?: number; errors?: string[]; reason?: string }> {
  const token = await getValidToken(connection);
  if (!token)
    throw new Error("Unable to authenticate with Google Business Profile");

  const assets = await db.assets.findMany({
    where: {
      facility_id: facilityId,
      type: { in: ["photo", "generated_image"] },
    },
    orderBy: { created_at: "desc" },
    take: 10,
  });

  if (!assets.length) {
    return { synced: false, reason: "No photos to sync" };
  }

  let uploaded = 0;
  const errors: string[] = [];

  for (const asset of assets) {
    try {
      const res = await fetch(
        `https://mybusiness.googleapis.com/v4/${connection.location_id}/media`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mediaFormat: "PHOTO",
            sourceUrl: asset.url,
            locationAssociation: { category: "ADDITIONAL" },
          }),
        }
      );
      if (res.ok) uploaded++;
      else errors.push(`Failed to upload ${asset.url}`);
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const status =
    errors.length === 0 ? "success" : uploaded > 0 ? "partial" : "failed";
  await db.gbp_profile_sync_log.create({
    data: {
      facility_id: facilityId,
      sync_type: "photos",
      status,
      changes: { uploaded, total: assets.length } as object,
      error_message: errors.join("; ") || null,
    },
  });
  return { synced: true, uploaded, errors };
}

async function getProfileComparison(
  facilityId: string,
  connection: GbpConnection
) {
  const token = await getValidToken(connection);
  if (!token)
    throw new Error("Unable to authenticate with Google Business Profile");

  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${connection.location_id}?readMask=title,regularHours,websiteUri,phoneNumbers,storefrontAddress,profile`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || `GBP API error ${res.status}`
    );
  }

  const gbpProfile = await res.json();

  const facility = await db.facilities.findUnique({
    where: { id: facilityId },
    select: {
      name: true,
      location: true,
      google_phone: true,
      website: true,
      hours: true,
      google_address: true,
    },
  });

  return {
    gbp: {
      name: gbpProfile.title || "",
      address:
        gbpProfile.storefrontAddress?.addressLines?.join(", ") || "",
      phone: gbpProfile.phoneNumbers?.primaryPhone || "",
      website: gbpProfile.websiteUri || "",
      hours: gbpProfile.regularHours || null,
      description: gbpProfile.profile?.description || "",
    },
    local: {
      name: facility?.name || "",
      address: facility?.google_address || "",
      phone: facility?.google_phone || "",
      website: facility?.website || "",
      hours: facility?.hours || null,
    },
  };
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "gbp-sync");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  const facilityId = req.nextUrl.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const connection = await db.gbp_connections.findUnique({
      where: { facility_id: facilityId },
    });

    const syncLog = await db.gbp_profile_sync_log.findMany({
      where: { facility_id: facilityId },
      orderBy: { created_at: "desc" },
      take: 20,
    });

    return jsonResponse({ connection: connection || null, syncLog }, 200, origin);
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "gbp-sync");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const { facilityId, type, locationId, locationName } = await req.json();
    if (!facilityId) return errorResponse("facilityId required", 400, origin);

    // Handle location selection for multi-location accounts
    if (type === "select-location") {
      if (!locationId) return errorResponse("locationId required", 400, origin);
      await db.gbp_connections.updateMany({
        where: { facility_id: facilityId },
        data: {
          location_id: locationId,
          location_name: locationName || locationId,
          status: "connected",
          sync_config: {},
        },
      });
      return jsonResponse({ ok: true, locationId, locationName }, 200, origin);
    }

    const connection = await db.gbp_connections.findFirst({
      where: { facility_id: facilityId, status: "connected" },
    });
    if (!connection)
      return errorResponse("No GBP connection for this facility", 400, origin);

    try {
      if (type === "hours") {
        const result = await syncHours(facilityId, connection);
        return jsonResponse({ ok: true, ...result }, 200, origin);
      }

      if (type === "photos") {
        const result = await syncPhotos(facilityId, connection);
        return jsonResponse({ ok: true, ...result }, 200, origin);
      }

      if (type === "profile") {
        const comparison = await getProfileComparison(facilityId, connection);
        return jsonResponse({ ok: true, comparison }, 200, origin);
      }

      if (type === "full") {
        const results: Record<string, unknown> = {
          hours: null,
          photos: null,
        };
        try {
          results.hours = await syncHours(facilityId, connection);
        } catch (e: unknown) {
          results.hours = {
            error: e instanceof Error ? e.message : "Unknown error",
          };
        }
        try {
          results.photos = await syncPhotos(facilityId, connection);
        } catch (e: unknown) {
          results.photos = {
            error: e instanceof Error ? e.message : "Unknown error",
          };
        }

        await db.gbp_connections.update({
          where: { id: connection.id },
          data: { last_sync_at: new Date(), updated_at: new Date() },
        });
        await db.gbp_profile_sync_log.create({
          data: {
            facility_id: facilityId,
            sync_type: "full",
            status: "success",
            changes: results as object,
          },
        });
        return jsonResponse({ ok: true, results }, 200, origin);
      }

      return errorResponse(
        "Invalid type. Use hours, photos, profile, or full",
        400,
        origin
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db.gbp_profile_sync_log.create({
        data: {
          facility_id: facilityId,
          sync_type: type || "unknown",
          status: "failed",
          error_message: message,
        },
      });
      return errorResponse(message, 500, origin);
    }
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "gbp-sync");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const { facilityId, syncConfig } = await req.json();
    if (!facilityId) return errorResponse("facilityId required", 400, origin);

    const existing = await db.gbp_connections.findUnique({
      where: { facility_id: facilityId },
    });
    if (!existing)
      return errorResponse("No GBP connection for this facility", 404, origin);

    const updated = await db.gbp_connections.update({
      where: { facility_id: facilityId },
      data: { sync_config: syncConfig as unknown as Prisma.InputJsonValue, updated_at: new Date() },
    });
    return jsonResponse({ connection: updated }, 200, origin);
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}
