import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const ref = req.nextUrl.searchParams.get("ref");
  const maxwidth = req.nextUrl.searchParams.get("maxwidth");

  if (!ref) {
    return errorResponse("ref (photo_reference) is required", 400, origin);
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return errorResponse("Server configuration error", 500, origin);
  }

  const width = parseInt(maxwidth || "800", 10) || 800;
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
