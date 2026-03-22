import { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";

export const maxDuration = 60;

const PRIORITY_PAGE_KEYWORDS = [
  "gallery", "photos", "photo", "images", "pictures",
  "units", "unit-sizes", "unit-types", "storage-units", "sizes",
  "amenities", "features", "facility", "tour", "virtual-tour",
  "about", "about-us",
  "services", "pricing", "prices", "rates", "specials", "promotions",
  "offers", "deals", "coupons", "discounts",
  "locations", "location", "find-us", "directions",
  "faq", "frequently-asked", "help", "tips",
  "contact", "contact-us",
  "blog", "news", "articles",
  "reviews", "testimonials",
  "climate-controlled", "rv-storage", "boat-storage", "vehicle-storage",
  "moving", "packing", "supplies",
];

function resolveUrl(base: string, relative: string): string | null {
  try {
    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

function isUsefulImage(
  src: string | null | undefined,
  width?: number,
  height?: number,
): boolean {
  if (!src) return false;
  if (src.startsWith("data:")) return false;
  if (
    src.includes("facebook.com") ||
    src.includes("google-analytics") ||
    src.includes("doubleclick") ||
    src.includes("pixel")
  )
    return false;
  if (src.endsWith(".svg") || src.endsWith(".ico") || src.endsWith(".gif"))
    return false;
  if (width && height && (width < 150 || height < 150)) return false;
  if (
    /logo|icon|spinner|loading|avatar|badge|widget|pixel\.|tracking/i.test(src)
  )
    return false;
  return true;
}

function isWorthCrawling(href: string, baseOrigin: string): boolean {
  if (!href) return false;
  try {
    const url = new URL(href);
    if (url.origin !== baseOrigin) return false;
    if (/\.(pdf|zip|doc|xls|csv|mp4|mp3|avi|mov)$/i.test(url.pathname))
      return false;
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (
      /\/(wp-admin|wp-login|cart|checkout|account|login|signup|feed|rss|xmlrpc)/i.test(
        url.pathname,
      )
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

function pageScore(href: string): number {
  const lower = href.toLowerCase();
  for (const kw of PRIORITY_PAGE_KEYWORDS) {
    if (lower.includes(kw)) return 10;
  }
  try {
    const url = new URL(href);
    if (url.pathname === "/" || url.pathname === "") return 5;
  } catch {
    /* ignore */
  }
  return 1;
}

interface ScrapedImage {
  url: string;
  alt: string;
  source: string;
  page: string;
  width?: number | null;
  height?: number | null;
}

interface PageResult {
  images: ScrapedImage[];
  videos: Array<{ url: string; type: string }>;
  links: string[];
  meta: {
    title: string | null;
    description: string | null;
    ogImage: string | null;
    ogTitle: string | null;
  } | null;
  contact: { phones: string[]; emails: string[] } | null;
  structuredData: unknown[];
  headings: string[];
  address: string | null;
  hours: unknown;
  pageCopy: string[];
  services: Array<{
    heading: string | null;
    description: string | null;
    page: string;
  }>;
  promotions: Array<{ text: string; page: string }>;
}

async function scrapePage(
  pageUrl: string,
  imageSet: Set<string>,
): Promise<PageResult> {
  const result: PageResult = {
    images: [],
    videos: [],
    links: [],
    meta: null,
    contact: null,
    structuredData: [],
    headings: [],
    address: null,
    hours: null,
    pageCopy: [],
    services: [],
    promotions: [],
  };

  try {
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return result;
    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    )
      return result;

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(pageUrl).origin;

    result.meta = {
      title: $("title").first().text().trim() || null,
      description:
        $('meta[name="description"]').attr("content")?.trim() ||
        $('meta[property="og:description"]').attr("content")?.trim() ||
        null,
      ogImage:
        $('meta[property="og:image"]').attr("content")?.trim() || null,
      ogTitle:
        $('meta[property="og:title"]').attr("content")?.trim() || null,
    };

    if (result.meta.ogImage) {
      const resolved = resolveUrl(baseUrl, result.meta.ogImage);
      if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
        imageSet.add(resolved);
        result.images.push({
          url: resolved,
          alt: result.meta.ogTitle || "",
          source: "og_image",
          page: pageUrl,
        });
      }
    }

    $("img").each((_, el) => {
      const src =
        $(el).attr("src") ||
        $(el).attr("data-src") ||
        $(el).attr("data-lazy-src") ||
        $(el).attr("data-original");
      const width = parseInt($(el).attr("width") || "0");
      const height = parseInt($(el).attr("height") || "0");
      const alt = $(el).attr("alt") || "";
      if (!isUsefulImage(src, width, height)) return;
      const resolved = resolveUrl(baseUrl, src!);
      if (resolved && !imageSet.has(resolved)) {
        imageSet.add(resolved);
        result.images.push({
          url: resolved,
          alt,
          source: "img_tag",
          page: pageUrl,
          width: width || null,
          height: height || null,
        });
      }
    });

    $('[style*="background"]').each((_, el) => {
      const style = $(el).attr("style") || "";
      const matches = style.matchAll(/url\(['"]?([^'")\s]+)['"]?\)/g);
      for (const match of matches) {
        const resolved = resolveUrl(baseUrl, match[1]);
        if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
          imageSet.add(resolved);
          result.images.push({
            url: resolved,
            alt: "",
            source: "background",
            page: pageUrl,
          });
        }
      }
    });

    $("img[srcset], source[srcset]").each((_, el) => {
      const srcset = $(el).attr("srcset") || "";
      const entries = srcset
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (entries.length) {
        const sorted = entries
          .map((e) => {
            const parts = e.split(/\s+/);
            return { url: parts[0], w: parseInt(parts[1]) || 0 };
          })
          .sort((a, b) => b.w - a.w);
        const best = sorted[0];
        const resolved = resolveUrl(baseUrl, best.url);
        if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
          imageSet.add(resolved);
          result.images.push({
            url: resolved,
            alt: "",
            source: "srcset",
            page: pageUrl,
          });
        }
      }
    });

    $("picture source[srcset]").each((_, el) => {
      const srcset = $(el).attr("srcset") || "";
      const firstUrl = srcset.split(",")[0]?.trim().split(/\s+/)[0];
      if (firstUrl) {
        const resolved = resolveUrl(baseUrl, firstUrl);
        if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
          imageSet.add(resolved);
          result.images.push({
            url: resolved,
            alt: "",
            source: "picture",
            page: pageUrl,
          });
        }
      }
    });

    $("style").each((_, el) => {
      const css = $(el).html() || "";
      const matches = css.matchAll(
        /url\(['"]?([^'")\s]+\.(jpg|jpeg|png|webp)[^'")\s]*)['"]?\)/gi,
      );
      for (const match of matches) {
        const resolved = resolveUrl(baseUrl, match[1]);
        if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
          imageSet.add(resolved);
          result.images.push({
            url: resolved,
            alt: "",
            source: "css",
            page: pageUrl,
          });
        }
      }
    });

    $("video source, video[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        const resolved = resolveUrl(baseUrl, src);
        if (resolved)
          result.videos.push({
            url: resolved,
            type: $(el).attr("type") || "video/mp4",
          });
      }
    });

    $("iframe[src]").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (
        src.includes("youtube.com") ||
        src.includes("youtu.be") ||
        src.includes("vimeo.com")
      ) {
        result.videos.push({ url: src, type: "embed" });
      }
    });

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        result.structuredData.push(JSON.parse($(el).html()!));
      } catch {
        /* ignore */
      }
    });

    const bodyText = $("body").text();
    result.contact = {
      phones: [
        ...new Set(
          (
            bodyText.match(
              /(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,
            ) || []
          ),
        ),
      ].slice(0, 5),
      emails: [
        ...new Set(
          (
            bodyText.match(
              /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            ) || []
          ),
        ),
      ]
        .filter((e) => !e.includes("sentry") && !e.includes("webpack"))
        .slice(0, 5),
    };

    for (const sd of result.structuredData) {
      const data = sd as Record<string, unknown>;
      const addr =
        data.address ||
        (data?.["@graph"] as unknown[] | undefined)?.find?.(
          (n: unknown) => (n as Record<string, unknown>).address,
        );
      if (addr) {
        const addrObj = (
          typeof addr === "object" && addr !== null
            ? (addr as Record<string, unknown>).address || addr
            : addr
        ) as Record<string, string> | string;
        result.address =
          typeof addrObj === "string"
            ? addrObj
            : [
                addrObj.streetAddress,
                addrObj.addressLocality,
                addrObj.addressRegion,
                addrObj.postalCode,
              ]
                .filter(Boolean)
                .join(", ");
        break;
      }
    }

    for (const sd of result.structuredData) {
      const data = sd as Record<string, unknown>;
      const oh =
        data.openingHoursSpecification ||
        (
          (data?.["@graph"] as unknown[] | undefined)?.find?.(
            (n: unknown) =>
              (n as Record<string, unknown>).openingHoursSpecification,
          ) as Record<string, unknown> | undefined
        )?.openingHoursSpecification;
      if (oh) {
        result.hours = oh;
        break;
      }
    }

    $("h1, h2, h3").each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.length < 200) result.headings.push(t);
    });

    const copySelectors =
      'p, li, .description, .content, .text, .service-item, .feature-item, [class*="description"], [class*="content"]';
    $(copySelectors).each((_, el) => {
      const t = $(el).text().trim();
      if (
        t &&
        t.length > 30 &&
        t.length < 500 &&
        !/cookie|privacy|copyright|©|all rights/i.test(t)
      ) {
        result.pageCopy.push(t);
      }
    });

    $(
      '[class*="service"], [class*="feature"], [class*="amenit"], [class*="benefit"]',
    ).each((_, el) => {
      const heading = $(el).find("h2, h3, h4, strong").first().text().trim();
      const desc = $(el).find("p").first().text().trim();
      if (heading || desc)
        result.services.push({
          heading: heading || null,
          description: desc || null,
          page: pageUrl,
        });
    });

    $(
      '[class*="promo"], [class*="special"], [class*="offer"], [class*="deal"], [class*="coupon"], [class*="discount"], [class*="banner"]',
    ).each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.length > 10 && t.length < 300)
        result.promotions.push({ text: t, page: pageUrl });
    });

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const resolved = resolveUrl(baseUrl, href!);
      if (resolved && isWorthCrawling(resolved, baseUrl)) {
        result.links.push(resolved);
      }
    });
  } catch {
    /* page scrape failed, return partial result */
  }

  return result;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  const body = await req.json().catch(() => null);
  const url = body?.url?.trim();
  const facilityId = body?.facilityId;

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
    const imageSet = new Set<string>();
    const allImages: ScrapedImage[] = [];
    const allVideos: Array<{ url: string; type: string }> = [];
    const allHeadings: string[] = [];
    const allStructuredData: unknown[] = [];
    const allPageCopy: string[] = [];
    const allServices: Array<{
      heading: string | null;
      description: string | null;
      page: string;
    }> = [];
    const allPromotions: Array<{ text: string; page: string }> = [];
    let bestMeta: PageResult["meta"] = null;
    let bestContact: { phones: string[]; emails: string[] } | null = null;
    let bestAddress: string | null = null;
    let bestHours: unknown = null;
    const pagesScraped: string[] = [];

    function mergePageResult(r: PageResult, pageUrl: string) {
      pagesScraped.push(pageUrl);
      allImages.push(...r.images);
      allVideos.push(...r.videos);
      allHeadings.push(...r.headings);
      allStructuredData.push(...r.structuredData);
      allPageCopy.push(...(r.pageCopy || []));
      allServices.push(...(r.services || []));
      allPromotions.push(...(r.promotions || []));
      if (r.contact) {
        if (!bestContact) bestContact = r.contact;
        else {
          bestContact.phones = [
            ...new Set([...bestContact.phones, ...r.contact.phones]),
          ].slice(0, 5);
          bestContact.emails = [
            ...new Set([...bestContact.emails, ...r.contact.emails]),
          ].slice(0, 5);
        }
      }
      if (r.address && !bestAddress) bestAddress = r.address;
      if (r.hours && !bestHours) bestHours = r.hours;
    }

    const homeResult = await scrapePage(targetUrl.href, imageSet);
    mergePageResult(homeResult, targetUrl.href);
    bestMeta = homeResult.meta;

    const discoveredLinks = [...new Set(homeResult.links)]
      .filter((link) => !pagesScraped.includes(link))
      .map((link) => ({ url: link, score: pageScore(link) }))
      .sort((a, b) => b.score - a.score);

    const maxPages = 15;
    const pagesToCrawl = discoveredLinks.slice(0, maxPages);

    for (let i = 0; i < pagesToCrawl.length; i += 4) {
      const batch = pagesToCrawl.slice(i, i + 4);
      const results = await Promise.all(
        batch.map((p) => scrapePage(p.url, imageSet)),
      );

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        mergePageResult(r, batch[j].url);

        for (const link of r.links) {
          if (
            !pagesScraped.includes(link) &&
            !pagesToCrawl.some((p) => p.url === link)
          ) {
            const score = pageScore(link);
            if (score >= 10 && pagesToCrawl.length < maxPages + 5) {
              pagesToCrawl.push({ url: link, score });
            }
          }
        }
      }
    }

    const uniqueCopy = [...new Set(allPageCopy)].slice(0, 50);

    const result = {
      scraped: true,
      url: targetUrl.href,
      pagesScraped: pagesScraped.length,
      pagesCrawled: pagesScraped,
      meta: bestMeta,
      images: allImages.slice(0, 50),
      videos: [...new Map(allVideos.map((v) => [v.url, v])).values()],
      contact: bestContact,
      address: bestAddress,
      hours: bestHours,
      structuredData: allStructuredData.slice(0, 5),
      headings: [...new Set(allHeadings)].slice(0, 30),
      pageCopy: uniqueCopy,
      services: allServices.slice(0, 20),
      promotions: [
        ...new Map(allPromotions.map((p) => [p.text, p])).values(),
      ].slice(0, 10),
    };

    if (facilityId && allImages.length > 0) {
      try {
        for (const img of allImages.slice(0, 25)) {
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
          }).catch(() => {});
        }
      } catch {
        /* asset save failed, not critical */
      }
    }

    const contactInfo = bestContact as { phones: string[]; emails: string[] } | null;
    if (
      facilityId &&
      (bestAddress ||
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

          if (bestAddress && !facility.google_address) {
            updateData.google_address = bestAddress;
          }
          if (contactInfo?.phones.length && !facility.google_phone) {
            updateData.google_phone = contactInfo.phones[0];
          }
          if (!facility.website) {
            updateData.website = targetUrl.origin;
          }
          if (bestHours && !facility.hours) {
            updateData.hours = bestHours;
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
