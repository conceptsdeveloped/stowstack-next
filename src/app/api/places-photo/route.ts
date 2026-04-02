import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_READ, "places-photo");
  if (limited) return limited;
  const origin = getOrigin(req);
  const ref = req.nextUrl.searchParams.get("ref");
  const maxwidth = req.nextUrl.searchParams.get("maxwidth");

  if (!ref) {
    return errorResponse("ref (photo_reference) is required", 400, origin);
  }

  // Validate photo_reference format: Google Places refs are alphanumeric + slashes/dashes/underscores, typically 100+ chars
  if (!/^[A-Za-z0-9_\-/+=]+$/.test(ref) || ref.length < 20 || ref.length > 2000) {
    return errorResponse("Invalid photo reference", 400, origin);
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return errorResponse("Server configuration error", 500, origin);
  }

  const width = Math.min(Math.max(parseInt(maxwidth || "800", 10) || 800, 100), 2400);
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${ref}&key=${apiKey}`;

  try {
    const photoRes = await fetch(url, { redirect: "follow" });
    if (!photoRes.ok) {
      return errorResponse("Photo fetch failed", photoRes.status, origin);
    }

    const contentType = photoRes.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await photoRes.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return errorResponse("Photo proxy failed", 500, origin);
  }
}
