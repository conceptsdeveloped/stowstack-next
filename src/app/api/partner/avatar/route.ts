import { NextRequest } from "next/server";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  verifyCsrfOrigin,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function PUT(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "partner-avatar");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  const contentType = req.headers.get("content-type") || "";
  if (!ALLOWED_TYPES.includes(contentType)) {
    return errorResponse("Only JPEG, PNG, and WebP images are allowed", 400, origin);
  }

  try {
    // Read body and enforce actual size limit (Content-Length is spoofable)
    const body = await req.arrayBuffer();
    if (body.byteLength === 0) {
      return errorResponse("Empty file", 400, origin);
    }
    if (body.byteLength > MAX_SIZE) {
      return errorResponse("Image must be under 2 MB", 400, origin);
    }

    // Delete old avatar if it exists on Vercel Blob
    const user = await db.org_users.findUnique({
      where: { id: session.user.id },
      select: { avatar_url: true },
    });
    if (user?.avatar_url?.includes(".vercel-storage.com")) {
      del(user.avatar_url).catch((err) => console.error("[blob] Avatar delete failed:", err));
    }

    const ext = contentType.split("/")[1] || "jpg";
    const blob = await put(
      `avatars/${session.user.id}-${Date.now()}.${ext}`,
      Buffer.from(body),
      { access: "public", contentType },
    );

    await db.org_users.update({
      where: { id: session.user.id },
      data: { avatar_url: blob.url },
    });

    return jsonResponse({ avatar_url: blob.url }, 200, origin);
  } catch (err) {
    console.error("Avatar upload error:", err);
    return errorResponse("Failed to upload avatar", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "partner-avatar");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  try {
    const user = await db.org_users.findUnique({
      where: { id: session.user.id },
      select: { avatar_url: true },
    });

    if (user?.avatar_url?.includes(".vercel-storage.com")) {
      del(user.avatar_url).catch((err) => console.error("[blob] Avatar delete failed:", err));
    }

    await db.org_users.update({
      where: { id: session.user.id },
      data: { avatar_url: null },
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch (err) {
    console.error("Avatar delete error:", err);
    return errorResponse("Failed to remove avatar", 500, origin);
  }
}
