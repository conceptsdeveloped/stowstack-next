import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { corsResponse } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

/**
 * Meta Data Deletion Callback
 *
 * Meta sends a POST to this endpoint when a user requests deletion of their
 * data via Facebook Settings > Apps and Websites > Remove.
 *
 * The request contains a `signed_request` param (base64url-encoded JSON
 * signed with the app secret). We verify the signature, create a deletion
 * request in our DB, and return a JSON response with a status check URL
 * and confirmation code.
 *
 * Configure this URL in your Meta App Dashboard:
 *   Settings > Advanced > Data Deletion Request URL
 *   https://storageads.com/api/data-deletion/meta-callback
 */

export async function OPTIONS(req: NextRequest) {
  return corsResponse(req.headers.get("origin"));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.WEBHOOK, "wh-meta-data-deletion");
  if (limited) return limited;
  try {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error("META_APP_SECRET not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Meta sends signed_request as form data
    const formData = await req.formData();
    const signedRequest = formData.get("signed_request");

    if (!signedRequest || typeof signedRequest !== "string") {
      return NextResponse.json(
        { error: "Missing signed_request parameter" },
        { status: 400 }
      );
    }

    // Parse and verify the signed request
    const data = parseSignedRequest(signedRequest, appSecret);
    if (!data) {
      return NextResponse.json(
        { error: "Invalid signed request" },
        { status: 403 }
      );
    }

    const userId = data.user_id;
    if (!userId) {
      return NextResponse.json(
        { error: "No user_id in signed request" },
        { status: 400 }
      );
    }

    // Try to find the real user via platform_connections
    // Meta user IDs may be stored as account_id on facebook/instagram connections
    const connections = await db.platform_connections.findMany({
      where: {
        account_id: String(userId),
        platform: { in: ["facebook", "instagram", "meta"] },
      },
      include: {
        facilities: {
          select: { organization_id: true },
        },
      },
    });

    // Try to resolve an email from org_users linked to the facility's org
    let resolvedEmail: string | null = null;
    const dataFound: Record<string, string | number> = { meta_user_id: userId };

    if (connections.length > 0) {
      dataFound.platform_connections = connections.length;
      const orgIds = connections
        .map((c) => c.facilities?.organization_id)
        .filter(Boolean) as string[];

      if (orgIds.length > 0) {
        const orgUsers = await db.org_users.findMany({
          where: { organization_id: { in: orgIds } },
          select: { email: true },
          take: 1,
        });
        if (orgUsers.length > 0) {
          resolvedEmail = orgUsers[0].email;
          dataFound.resolved_from = "org_users";
        }
      }
    }

    // Create a deletion request record
    const request = await db.data_deletion_requests.create({
      data: {
        email: resolvedEmail || `fb_user_${userId}@meta.platform`,
        name: null,
        reason: "Meta platform data deletion callback",
        source: "meta_callback",
        data_found: dataFound,
      },
    });

    // Return the response Meta expects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storageads.com";
    const statusUrl = `${baseUrl}/data-deletion?confirmation=${request.id}`;

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: request.id,
    });
  } catch (err) {
    console.error("Meta data deletion callback error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Parse a Meta signed_request.
 * Format: base64url(sig).base64url(payload)
 * Verify HMAC-SHA256 of the payload using the app secret.
 */
function parseSignedRequest(
  signedRequest: string,
  secret: string
): { user_id?: string; algorithm?: string; issued_at?: number } | null {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;

  const [encodedSig, encodedPayload] = parts;

  // Decode the signature
  const sig = base64UrlDecode(encodedSig);

  // Verify the signature
  const expectedSig = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest();

  if (!timingSafeEqual(sig, expectedSig)) {
    console.error("Meta signed_request signature verification failed");
    return null;
  }

  // Decode the payload
  try {
    const payload = JSON.parse(
      base64UrlDecode(encodedPayload).toString("utf-8")
    );

    if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") {
      console.error(`Unexpected algorithm: ${payload.algorithm}`);
      return null;
    }

    return payload;
  } catch {
    console.error("Failed to parse signed_request payload");
    return null;
  }
}

function base64UrlDecode(str: string): Buffer {
  // Replace URL-safe chars and add padding
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}
