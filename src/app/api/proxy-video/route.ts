import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  getOrigin,
  getCorsHeaders,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";

export const maxDuration = 30;

const ALLOWED_VIDEO_HOSTS = [
  "storage.googleapis.com",
  "res.cloudinary.com",
  "player.vimeo.com",
  "www.youtube.com",
  "i.ytimg.com",
  "cdn.stowstack.co",
  "stowstack.co",
];

function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    )
      return false;
    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.")
    )
      return false;
    if (hostname === "169.254.169.254") return false;
    if (hostname.endsWith(".internal") || hostname.endsWith(".local"))
      return false;
    return ALLOWED_VIDEO_HOSTS.some(
      (h) => hostname === h || hostname.endsWith("." + h),
    );
  } catch {
    return false;
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return errorResponse("url query param required", 400, origin);

  if (!isAllowedUrl(url)) {
    return errorResponse(
      "URL not allowed. Only trusted video hosting domains are permitted.",
      400,
      origin,
    );
  }

  try {
    const videoRes = await fetch(url, {
      signal: AbortSignal.timeout(25000),
      redirect: "error",
    });
    if (!videoRes.ok) return errorResponse("Upstream error", 502, origin);

    const contentType = videoRes.headers.get("content-type") || "video/mp4";
    if (!contentType.startsWith("video/") && !contentType.startsWith("audio/")) {
      return errorResponse("Response is not a video", 400, origin);
    }

    const buffer = Buffer.from(await videoRes.arrayBuffer());
    const corsHeaders = getCorsHeaders(origin);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...corsHeaders,
      },
    });
  } catch {
    return errorResponse("Failed to fetch video", 500, origin);
  }
}
