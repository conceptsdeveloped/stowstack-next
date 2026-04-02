import { NextRequest } from "next/server";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const STORAGE_QUERIES: Record<string, string[]> = {
  exterior: [
    "self storage facility building",
    "storage unit doors row",
    "storage facility entrance gate",
    "storage units outdoor",
    "mini storage building",
  ],
  interior: [
    "storage unit interior clean",
    "climate controlled storage hallway",
    "storage locker organized",
    "warehouse storage shelves boxes",
    "indoor storage units corridor",
  ],
  moving: [
    "people moving boxes",
    "loading moving truck",
    "couple packing cardboard boxes",
    "moving day family",
    "stacking moving boxes",
  ],
  packing: [
    "packing supplies boxes tape",
    "cardboard boxes stacked",
    "packing materials bubble wrap",
    "organized packing boxes labels",
    "moving boxes garage",
  ],
  lifestyle: [
    "cluttered garage storage",
    "garage cleanout organizing",
    "decluttering home",
    "organized garage storage",
    "household overflow storage",
  ],
  vehicle: [
    "rv storage facility",
    "boat storage outdoor",
    "vehicle storage covered",
    "car storage facility",
  ],
};

const CURATED_IMAGES = [
  { id: "curated-1", url: "https://images.unsplash.com/photo-1770720086655-22f3d1205dc2?w=800&q=80", alt: "Self storage facility units", category: "exterior" },
  { id: "curated-2", url: "https://images.unsplash.com/photo-1759277700771-137173db0e5b?w=800&q=80", alt: "Storage unit hallway", category: "interior" },
  { id: "curated-3", url: "https://images.unsplash.com/photo-1761511308689-f79162e3177a?w=800&q=80", alt: "Row of storage unit doors", category: "exterior" },
  { id: "curated-4", url: "https://plus.unsplash.com/premium_photo-1666426211392-9d07aedc4e48?w=800&q=80", alt: "Storage facility building", category: "exterior" },
  { id: "curated-5", url: "https://plus.unsplash.com/premium_photo-1682146262947-614e8920a36d?w=800&q=80", alt: "Climate controlled storage interior", category: "interior" },
  { id: "curated-6", url: "https://plus.unsplash.com/premium_photo-1663041615054-7e8eb5701abb?w=800&q=80", alt: "Storage units with roll-up doors", category: "exterior" },
  { id: "curated-7", url: "https://plus.unsplash.com/premium_photo-1682146414067-de169cd65ef6?w=800&q=80", alt: "Indoor storage facility corridor", category: "interior" },
  { id: "curated-8", url: "https://plus.unsplash.com/premium_photo-1661286609628-909e94dd55ca?w=800&q=80", alt: "Moving boxes and packing", category: "moving" },
  { id: "curated-9", url: "https://images.unsplash.com/photo-1700165644892-3dd6b67b25bc?w=800&q=80", alt: "Cardboard boxes for moving", category: "moving" },
  { id: "curated-10", url: "https://images.unsplash.com/photo-1600725935160-f67ee4f6084a?w=800&q=80", alt: "Stacked moving boxes", category: "moving" },
  { id: "curated-11", url: "https://images.unsplash.com/photo-1573376671096-e1fce2d1f19d?w=800&q=80", alt: "Person carrying moving box", category: "moving" },
  { id: "curated-12", url: "https://images.unsplash.com/photo-1631010231931-d2c396b444ec?w=800&q=80", alt: "Packing boxes with tape", category: "packing" },
  { id: "curated-13", url: "https://images.unsplash.com/photo-1680034977375-3d83ee017e52?w=800&q=80", alt: "Packing supplies organized", category: "packing" },
  { id: "curated-14", url: "https://images.unsplash.com/photo-1624137308591-43f03e6d64c3?w=800&q=80", alt: "Boxes packed and labeled", category: "packing" },
  { id: "curated-15", url: "https://images.unsplash.com/photo-1556227996-370b60576b84?w=800&q=80", alt: "Home needing decluttering", category: "lifestyle" },
  { id: "curated-16", url: "https://images.unsplash.com/photo-1631010231888-777b6285ef84?w=800&q=80", alt: "Organized storage space", category: "lifestyle" },
];

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "stock-images");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  const category = req.nextUrl.searchParams.get("category");
  const searchQuery = req.nextUrl.searchParams.get("query");
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!unsplashKey) {
    const filtered =
      category && category !== "all"
        ? CURATED_IMAGES.filter((img) => img.category === category)
        : CURATED_IMAGES;
    return jsonResponse({ images: filtered, source: "curated" }, 200, origin);
  }

  try {
    let query = searchQuery?.trim();

    if (!query) {
      const queries = STORAGE_QUERIES[category || ""] || [
        "self storage facility",
        "storage units",
        "moving boxes packing",
        "storage building exterior",
      ];
      query = queries[Math.floor(Math.random() * queries.length)];
    }

    const params = new URLSearchParams({
      query,
      per_page: "20",
      orientation: "landscape",
      content_filter: "high",
    });

    const response = await fetch(
      `https://api.unsplash.com/search/photos?${params}`,
      {
        headers: { Authorization: `Client-ID ${unsplashKey}` },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      const filtered =
        category && category !== "all"
          ? CURATED_IMAGES.filter((img) => img.category === category)
          : CURATED_IMAGES;
      return jsonResponse(
        { images: filtered, source: "curated_fallback" },
        200,
        origin,
      );
    }

    const data = await response.json();
    const images = data.results.map(
      (photo: {
        id: string;
        urls: { regular: string; thumb: string };
        alt_description: string | null;
        description: string | null;
        user: { name: string };
        links: { html: string };
      }) => ({
        id: `unsplash-${photo.id}`,
        url: `${photo.urls.regular}&w=800&q=80`,
        thumb: photo.urls.thumb,
        alt: photo.alt_description || photo.description || query,
        category: category || "search",
        photographer: photo.user.name,
        unsplashLink: photo.links.html,
      }),
    );

    return jsonResponse({ images, source: "unsplash", query }, 200, origin);
  } catch {
    const filtered =
      category && category !== "all"
        ? CURATED_IMAGES.filter((img) => img.category === category)
        : CURATED_IMAGES;
    return jsonResponse(
      { images: filtered, source: "curated_fallback" },
      200,
      origin,
    );
  }
}
