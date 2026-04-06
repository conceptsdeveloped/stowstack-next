import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { scrapeWebsite } from "@/lib/scrape-website";
import { scrapeSparefoot, scrapeSelfStorage } from "@/lib/aggregator-scrape";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 60;

const STALENESS_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractZip(address: string | null): string | null {
  if (!address) return null;
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

function extractCityState(
  address: string | null
): { city: string; state: string } | null {
  if (!address) return null;
  const match = address.match(/([A-Za-z\s]+),\s*([A-Z]{2})\b/);
  if (match) {
    return {
      city: match[1].trim().toLowerCase().replace(/\s+/g, "-"),
      state: match[2].toLowerCase(),
    };
  }
  return null;
}

async function searchPlaces(
  textQuery: string,
  apiKey: string,
  maxResults = 10
): Promise<Record<string, unknown>[]> {
  const fieldMask =
    "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.location,places.websiteUri";
  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: maxResults,
        }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.places || []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

async function fetchCensusDemographics(
  zip: string | null
): Promise<Record<string, unknown> | null> {
  if (!zip) return null;
  const vars =
    "B01003_001E,B19013_001E,B25003_002E,B25003_003E,B01002_001E,B25077_001E";
  const url = `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length < 2) return null;
    const values = data[1] as string[];
    const populationVal = parseInt(values[0]) || 0;
    const medianIncome = parseInt(values[1]) || 0;
    const ownerOccupied = parseInt(values[2]) || 0;
    const renterOccupied = parseInt(values[3]) || 0;
    const medianAge = parseFloat(values[4]) || 0;
    const medianHomeValue = parseInt(values[5]) || 0;
    const totalHousing = ownerOccupied + renterOccupied;
    const renterPct =
      totalHousing > 0
        ? Math.round((renterOccupied / totalHousing) * 1000) / 10
        : 0;
    return {
      zip,
      population: populationVal,
      median_income: medianIncome,
      median_age: medianAge,
      owner_occupied: ownerOccupied,
      renter_occupied: renterOccupied,
      renter_pct: renterPct,
      median_home_value: medianHomeValue,
      source: "census_acs_2022",
    };
  } catch {
    return null;
  }
}

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "market-intel");
  if (limited) return limited;
  const origin = getOrigin(request);
  const denied = await requireAdminKey(request);
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const rows = await db.$queryRaw<Record<string, unknown>[]>`SELECT * FROM facility_market_intel WHERE facility_id = ${facilityId}::uuid`;
    return jsonResponse({ intel: rows[0] || null }, 200, origin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "market-intel");
  if (limited) return limited;
  const origin = getOrigin(request);
  const denied = await requireAdminKey(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { facilityId, force } = body || {};
    if (!facilityId) return errorResponse("facilityId required", 400, origin);

    // Staleness check — return cached data if < 30 days old
    if (!force) {
      try {
        const existing = await db.$queryRaw<Record<string, unknown>[]>`SELECT * FROM facility_market_intel WHERE facility_id = ${facilityId}::uuid`;
        if (existing.length > 0) {
          const lastScanned = existing[0].last_scanned;
          if (
            lastScanned &&
            Date.now() - new Date(lastScanned as string).getTime() < STALENESS_MS
          ) {
            return jsonResponse(
              { intel: existing[0], cached: true },
              200,
              origin
            );
          }
        }
      } catch {
        /* staleness check failed, proceed with fresh scan */
      }
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey)
      return errorResponse(
        "GOOGLE_PLACES_API_KEY not configured",
        500,
        origin
      );

    const facilityRows = await db.$queryRaw<Record<string, unknown>[]>`SELECT * FROM facilities WHERE id = ${facilityId}::uuid`;
    if (facilityRows.length === 0)
      return errorResponse("Facility not found", 404, origin);
    const facility = facilityRows[0];

    const address = String(
      facility.google_address || facility.location || ""
    );
    const zip = extractZip(address);

    const demandCategories = [
      { query: "apartment complex", category: "apartment_complex" },
      { query: "university", category: "university" },
      { query: "military base", category: "military_base" },
      { query: "real estate office", category: "real_estate" },
      { query: "moving company", category: "moving_company" },
      { query: "senior living", category: "senior_living" },
    ];

    // Multiple search queries for better competitor coverage
    const [
      storageResults1,
      storageResults2,
      storageResults3,
      ...demandResults
    ] = await Promise.all([
      searchPlaces(`self storage near ${address}`, apiKey, 10),
      searchPlaces(`storage units near ${address}`, apiKey, 5),
      searchPlaces(`mini storage near ${address}`, apiKey, 5),
      ...demandCategories.map((cat) =>
        searchPlaces(`${cat.query} near ${address}`, apiKey, 5)
      ),
    ]);

    // Deduplicate competitor results by name
    const seenNames = new Set<string>();
    const allCompetitorResults = [
      ...storageResults1,
      ...storageResults2,
      ...storageResults3,
    ].filter((p) => {
      const name = (
        (p.displayName as Record<string, string>)?.text || ""
      ).toLowerCase();
      if (!name || seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });

    const demographics = await fetchCensusDemographics(zip);

    let facilityLat: number | null = null;
    let facilityLng: number | null = null;

    if (facility.google_address) {
      const selfResults = await searchPlaces(
        String(facility.google_address),
        apiKey,
        1
      );
      if (
        selfResults.length &&
        (selfResults[0].location as Record<string, unknown> | undefined)
      ) {
        const loc = selfResults[0].location as Record<string, number>;
        facilityLat = loc.latitude;
        facilityLng = loc.longitude;
      }
    }

    const competitors = allCompetitorResults
      .filter((p) => {
        const pName = (
          (p.displayName as Record<string, string>)?.text || ""
        ).toLowerCase();
        const fName = String(facility.name || "").toLowerCase();
        return !pName.includes(fName) && !fName.includes(pName);
      })
      .map((p) => {
        const loc = p.location as Record<string, number> | undefined;
        const lat = loc?.latitude;
        const lng = loc?.longitude;
        let distance_miles: number | null = null;
        if (facilityLat && facilityLng && lat && lng) {
          distance_miles =
            Math.round(
              haversineDistance(facilityLat, facilityLng, lat, lng) * 10
            ) / 10;
        }
        return {
          name:
            (p.displayName as Record<string, string>)?.text || "Unknown",
          address: (p.formattedAddress as string) || "",
          rating: (p.rating as number) || null,
          reviewCount: (p.userRatingCount as number) || 0,
          distance_miles,
          mapsUrl: (p.googleMapsUri as string) || null,
          website: (p.websiteUri as string) || null,
          source: "google_places",
          units: [] as Array<{
            size: string;
            price: string | null;
            type: string | null;
          }>,
          promotions: [] as Array<{ text: string }>,
        };
      })
      .filter((c) => c.distance_miles === null || c.distance_miles <= 15)
      .sort(
        (a, b) => (a.distance_miles ?? 99) - (b.distance_miles ?? 99)
      );

    // Enrich top 5 competitors that have websites with scraped pricing data
    const competitorsWithWebsites = competitors
      .filter((c) => c.website)
      .slice(0, 5);

    if (competitorsWithWebsites.length > 0) {
      try {
        const scrapeResults = await Promise.all(
          competitorsWithWebsites.map((c) =>
            scrapeWebsite(c.website!).catch(() => null)
          )
        );
        for (let i = 0; i < competitorsWithWebsites.length; i++) {
          const scrape = scrapeResults[i];
          if (!scrape) continue;
          const comp = competitorsWithWebsites[i];
          if (scrape.units?.length) {
            comp.units = scrape.units.map((u) => ({
              size: u.size,
              price: u.price,
              type: u.type,
            }));
          }
          if (scrape.promotions?.length) {
            comp.promotions = scrape.promotions.map((p) => ({
              text: p.text,
            }));
          }
        }
      } catch {
        /* competitor scraping failed, not critical */
      }
    }

    // Aggregator scraping for supplementary pricing data
    const cityState = extractCityState(address);
    if (cityState) {
      try {
        const [sparefootResults, selfStorageResults] = await Promise.all([
          scrapeSparefoot(cityState.city, cityState.state).catch(() => []),
          scrapeSelfStorage(cityState.city, cityState.state).catch(() => []),
        ]);

        const allAggregatorResults = [
          ...sparefootResults,
          ...selfStorageResults,
        ];

        for (const agg of allAggregatorResults) {
          if (!agg.name) continue;
          const aggNameLower = agg.name.toLowerCase();

          // Try to match with an existing competitor
          const match = competitors.find((c) => {
            const cNameLower = c.name.toLowerCase();
            return (
              cNameLower.includes(aggNameLower) ||
              aggNameLower.includes(cNameLower)
            );
          });

          if (match) {
            // Merge pricing into existing competitor if it has none
            if (agg.units.length && !match.units.length) {
              match.units = agg.units;
            }
          } else {
            // Add as new competitor from aggregator
            competitors.push({
              name: agg.name,
              address: agg.address || "",
              rating: null,
              reviewCount: 0,
              distance_miles: null,
              mapsUrl: null,
              website: null,
              source: agg.source,
              units: agg.units,
              promotions: [],
            });
          }
        }
      } catch {
        /* aggregator scraping failed, not critical */
      }
    }

    const demand_drivers: Record<string, unknown>[] = [];
    demandCategories.forEach((cat, i) => {
      const results = demandResults[i] || [];
      results.forEach((p) => {
        const loc = p.location as Record<string, number> | undefined;
        const lat = loc?.latitude;
        const lng = loc?.longitude;
        let distance_miles: number | null = null;
        if (facilityLat && facilityLng && lat && lng) {
          distance_miles =
            Math.round(
              haversineDistance(facilityLat, facilityLng, lat, lng) * 10
            ) / 10;
        }
        if (distance_miles !== null && distance_miles > 5) return;
        demand_drivers.push({
          name:
            (p.displayName as Record<string, string>)?.text || "Unknown",
          category: cat.category,
          address: p.formattedAddress || "",
          distance_miles,
          source: "google_places",
        });
      });
    });
    demand_drivers.sort(
      (a, b) =>
        ((a.distance_miles as number) ?? 99) -
        ((b.distance_miles as number) ?? 99)
    );

    const competitorsJson = JSON.stringify(competitors);
    const demandDriversJson = JSON.stringify(demand_drivers);
    const demographicsJson = JSON.stringify(demographics || {});
    const intelRows = await db.$queryRaw<Record<string, unknown>[]>`INSERT INTO facility_market_intel (facility_id, last_scanned, competitors, demand_drivers, demographics)
       VALUES (${facilityId}, NOW(), ${competitorsJson}::jsonb, ${demandDriversJson}::jsonb, ${demographicsJson}::jsonb)
       ON CONFLICT (facility_id) DO UPDATE SET
         last_scanned = NOW(),
         competitors = ${competitorsJson}::jsonb,
         demand_drivers = ${demandDriversJson}::jsonb,
         demographics = ${demographicsJson}::jsonb,
         updated_at = NOW()
       RETURNING *`;

    return jsonResponse({ intel: intelRows[0] }, 200, origin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500, origin);
  }
}

export async function PATCH(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "market-intel");
  if (limited) return limited;
  const origin = getOrigin(request);
  const denied = await requireAdminKey(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { facilityId, manual_notes, operator_overrides } = body || {};
    if (!facilityId) return errorResponse("facilityId required", 400, origin);

    const manualNotesVal = manual_notes ?? null;
    const operatorOverridesVal = operator_overrides ? JSON.stringify(operator_overrides) : null;
    const intelRows = await db.$queryRaw<Record<string, unknown>[]>`INSERT INTO facility_market_intel (facility_id, manual_notes, operator_overrides)
       VALUES (${facilityId}, ${manualNotesVal}, ${operatorOverridesVal}::jsonb)
       ON CONFLICT (facility_id) DO UPDATE SET
         manual_notes = COALESCE(${manualNotesVal}, facility_market_intel.manual_notes),
         operator_overrides = COALESCE(${operatorOverridesVal}::jsonb, facility_market_intel.operator_overrides),
         updated_at = NOW()
       RETURNING *`;

    return jsonResponse({ intel: intelRows[0] }, 200, origin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500, origin);
  }
}
