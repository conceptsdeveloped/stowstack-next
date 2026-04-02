import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

async function findPlaceId(facilityName: string, location: string, apiKey: string): Promise<string | null> {
  const searchQuery = encodeURIComponent(`${facilityName} ${location}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places text search failed: ${res.status}`);
  const data = await res.json();
  if (!data.results?.length) {
    throw new Error(
      `Places API returned: ${data.status}${data.error_message ? " — " + data.error_message : ""}`
    );
  }
  return data.results[0].place_id;
}

async function getPlaceDetails(placeId: string, apiKey: string) {
  const fields = [
    "name",
    "formatted_address",
    "formatted_phone_number",
    "website",
    "rating",
    "user_ratings_total",
    "reviews",
    "photos",
    "opening_hours",
    "business_status",
    "url",
  ].join(",");

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Place details failed: ${res.status}`);
  const data = await res.json();
  return data.result;
}

function buildPhotoUrl(photoReference: string, apiKey: string, maxWidth = 1200): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

async function resolvePhotoUrl(photoReference: string, apiKey: string, maxWidth = 1200): Promise<string> {
  const apiUrl = buildPhotoUrl(photoReference, apiKey, maxWidth);
  try {
    const res = await fetch(apiUrl, { redirect: "manual" });
    const location = res.headers.get("location");
    if (location) return location;
    if (res.ok) return apiUrl;
    const res2 = await fetch(apiUrl, { redirect: "follow" });
    return res2.url || apiUrl;
  } catch {
    return apiUrl;
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXTERNAL_API_HOURLY, "facility-lookup");
  if (limited) return limited;
  const origin = getOrigin(req);

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return errorResponse("Server configuration error: missing Google API key", 500, origin);
  }

  try {
    const body = await req.json();
    const { facilityName, location, facilityId } = body || {};

    if (!facilityName?.trim() || !location?.trim()) {
      return errorResponse("facilityName and location are required", 400, origin);
    }

    const placeId = await findPlaceId(facilityName.trim(), location.trim(), apiKey);

    if (!placeId) {
      return jsonResponse(
        {
          found: false,
          message: "No matching facility found on Google Maps",
          _debug: { query: `${facilityName} ${location}` },
        },
        200,
        origin
      );
    }

    const place = await getPlaceDetails(placeId, apiKey);

    const rawPhotos = (place.photos || []).slice(0, 10);
    const photos = await Promise.all(
      rawPhotos.map(
        async (
          photo: { photo_reference: string; width: number; height: number; html_attributions?: string[] },
          i: number
        ) => ({
          index: i,
          url: await resolvePhotoUrl(photo.photo_reference, apiKey),
          width: photo.width,
          height: photo.height,
          attribution: photo.html_attributions?.[0] || null,
        })
      )
    );

    const reviews = (place.reviews || [])
      .filter((r: { rating: number }) => r.rating >= 3)
      .slice(0, 5)
      .map((r: { author_name: string; rating: number; text: string; relative_time_description: string }) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        time: r.relative_time_description,
      }));

    const resultData = {
      found: true,
      placeId,
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      googleMapsUrl: place.url || null,
      rating: place.rating || null,
      reviewCount: place.user_ratings_total || 0,
      businessStatus: place.business_status || null,
      hours: place.opening_hours?.weekday_text || null,
      photos,
      reviews,
    };

    if (facilityId) {
      try {
        await db.facilities.update({
          where: { id: facilityId },
          data: {
            place_id: placeId,
            google_address: place.formatted_address,
            google_phone: place.formatted_phone_number || null,
            website: place.website || null,
            google_rating: place.rating || null,
            review_count: place.user_ratings_total || 0,
            google_maps_url: place.url || null,
            hours: place.opening_hours?.weekday_text || null,
            status: "scraped",
          },
        });

        await db.places_data.deleteMany({ where: { facility_id: facilityId } });
        await db.places_data.create({
          data: {
            facility_id: facilityId,
            photos: photos as unknown as object,
            reviews: reviews as unknown as object,
          },
        });

        if (photos.length > 0) {
          await db.assets.deleteMany({
            where: { facility_id: facilityId, source: "google_places" },
          });

          await db.assets.createMany({
            data: photos.map(
              (photo: { url: string; width: number; height: number; attribution: string | null }) => ({
                facility_id: facilityId,
                type: "photo",
                source: "google_places",
                url: photo.url,
                metadata: {
                  width: photo.width,
                  height: photo.height,
                  attribution: photo.attribution,
                },
              })
            ),
          });
        }
      } catch {
        // DB save failed — non-critical, return the result anyway
      }
    }

    return jsonResponse(resultData, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(`Facility lookup failed: ${message}`, 500, origin);
  }
}
