import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { scrapeWebsite } from "@/lib/scrape-website";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 60;

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "scrape-website");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  const body = await req.json().catch(() => null);
  const url = body?.url?.trim();
  const facilityId = body?.facilityId;
  const force = body?.force === true;

  if (!url) return errorResponse("url is required", 400, origin);

  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return errorResponse("URL must use http or https", 400, origin);
    }
    const hostname = targetUrl.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.") ||
      hostname === "169.254.169.254" ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local")
    ) {
      return errorResponse("URL not allowed", 400, origin);
    }
  } catch {
    return errorResponse("Invalid URL", 400, origin);
  }

  try {
    const result = await scrapeWebsite(targetUrl.href, { force, facilityId });

    // Save scraped images as facility assets (only on fresh scrapes)
    if (facilityId && !result.cached && result.images.length > 0) {
      try {
        for (const img of result.images.slice(0, 25)) {
          await db.assets.create({
            data: {
              facility_id: facilityId,
              type: "photo",
              source: "website_scrape",
              url: img.url,
              metadata: {
                alt: img.alt,
                scrapeSource: img.source,
                scrapedFrom: img.page || targetUrl.href,
              },
            },
          }).catch((err) => console.error("[asset_save] Fire-and-forget failed:", err));
        }
      } catch {
        /* asset save failed, not critical */
      }
    }

    // Update facility record with scraped contact/address info (only on fresh scrapes)
    const contactInfo = result.contact;
    if (
      facilityId &&
      !result.cached &&
      (result.address ||
        contactInfo?.phones.length ||
        contactInfo?.emails.length)
    ) {
      try {
        const facility = await db.facilities.findUnique({
          where: { id: facilityId },
          select: {
            google_address: true,
            google_phone: true,
            website: true,
            hours: true,
          },
        });

        if (facility) {
          const updateData: Record<string, unknown> = {};

          if (result.address && !facility.google_address) {
            updateData.google_address = result.address;
          }
          if (contactInfo?.phones.length && !facility.google_phone) {
            updateData.google_phone = contactInfo.phones[0];
          }
          if (!facility.website) {
            updateData.website = targetUrl.origin;
          }
          if (result.hours && !facility.hours) {
            updateData.hours = result.hours;
          }

          if (Object.keys(updateData).length) {
            await db.facilities.update({
              where: { id: facilityId },
              data: updateData,
            });
          }
        }
      } catch {
        /* facility update failed, not critical */
      }
    }

    return jsonResponse(result, 200, origin);
  } catch {
    return errorResponse("Scrape failed", 500, origin);
  }
}
