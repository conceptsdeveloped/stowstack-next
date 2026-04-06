import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface PlacesData {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  rating: number | null;
  reviewCount: number;
  website: string | null;
  mapsUrl: string | null;
  hours: string[] | null;
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    time: string;
  }>;
  photos: Array<{
    index: number;
    url: string;
    width: number;
    height: number;
  }>;
}

interface Competitor {
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number;
  placeId: string;
}

async function fetchPlacesData(
  facilityName: string,
  location: string
): Promise<PlacesData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const searchQuery = `${facilityName} ${location} self storage`;
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`
    );
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) return null;
    const place = searchData.results[0];

    const detailRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,rating,user_ratings_total,opening_hours,website,reviews,photos,url&key=${apiKey}`
    );
    const detailData = await detailRes.json();
    const details = detailData.result || {};

    return {
      placeId: place.place_id,
      name: details.name || facilityName,
      address: details.formatted_address || location,
      phone: details.formatted_phone_number || null,
      rating: details.rating || null,
      reviewCount: details.user_ratings_total || 0,
      website: details.website || null,
      mapsUrl: details.url || null,
      hours: details.opening_hours?.weekday_text || null,
      reviews: (details.reviews || [])
        .slice(0, 5)
        .map(
          (r: {
            author_name: string;
            rating: number;
            text?: string;
            relative_time_description: string;
          }) => ({
            author: r.author_name,
            rating: r.rating,
            text: r.text?.slice(0, 300) || "",
            time: r.relative_time_description,
          })
        ),
      photos: (details.photos || [])
        .slice(0, 5)
        .map(
          (
            p: { photo_reference: string; width: number; height: number },
            i: number
          ) => ({
            index: i,
            url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${apiKey}`,
            width: p.width,
            height: p.height,
          })
        ),
    };
  } catch {
    return null;
  }
}

async function fetchCompetitors(location: string): Promise<Competitor[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`self storage near ${location}`)}&key=${apiKey}`
    );
    const searchData = await searchRes.json();

    return (searchData.results || [])
      .slice(0, 5)
      .map(
        (p: {
          name: string;
          formatted_address: string;
          rating?: number;
          user_ratings_total?: number;
          place_id: string;
        }) => ({
          name: p.name,
          address: p.formatted_address,
          rating: p.rating || null,
          reviewCount: p.user_ratings_total || 0,
          placeId: p.place_id,
        })
      );
  } catch {
    return [];
  }
}

const OCCUPANCY_MID: Record<string, number> = {
  "below-60": 50,
  "60-75": 67.5,
  "75-85": 80,
  "85-95": 90,
  "above-95": 97,
  "Below 60%": 50,
  "60-75%": 67.5,
  "75-85%": 80,
  "85-95%": 90,
  "Above 95%": 97,
};

const UNIT_COUNTS: Record<string, number> = {
  "under-100": 75,
  "100-300": 200,
  "300-500": 400,
  "500+": 650,
};

interface FacilityRow {
  name: string;
  location: string;
  occupancy_range: string | null;
  total_units: string | null;
  biggest_issue: string | null;
  notes: string | null;
}

async function generateAuditWithAI(
  facility: FacilityRow,
  placesData: PlacesData | null,
  competitors: Competitor[]
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const occupancy = OCCUPANCY_MID[facility.occupancy_range || ""] || 80;
  const totalUnits = UNIT_COUNTS[facility.total_units || ""] || 200;
  const vacantUnits = Math.round(totalUnits * (1 - occupancy / 100));
  const monthlyLoss = vacantUnits * 110;
  const annualLoss = monthlyLoss * 12;

  const prompt = `You are an expert self-storage marketing analyst. Generate a professional facility audit report as JSON.

Facility Data:
- Name: ${facility.name}
- Location: ${facility.location}
- Occupancy: ${facility.occupancy_range} (est. ${occupancy}%)
- Total Units: ${facility.total_units} (est. ${totalUnits})
- Estimated Vacant: ${vacantUnits}
- Primary Issue: ${facility.biggest_issue}
- Google Rating: ${placesData?.rating || "Unknown"} (${placesData?.reviewCount || 0} reviews)
- Website: ${placesData?.website || "Unknown"}
${facility.notes ? `- Notes: ${facility.notes}` : ""}

Competitors (within 5 miles):
${competitors.map((c, i) => `${i + 1}. ${c.name} - ${c.rating || "N/A"} rating (${c.reviewCount} reviews) - ${c.address}`).join("\n") || "No competitor data available"}

Generate a JSON object with these exact keys:
{
  "facility_summary": {
    "name": string,
    "location": string,
    "occupancy_estimate": number,
    "total_units_estimate": number,
    "vacant_units_estimate": number,
    "google_rating": number or null,
    "review_count": number,
    "website": string or null
  },
  "market_position": {
    "summary": "2-3 sentence market position analysis",
    "competitors": [{ "name": string, "rating": number, "reviews": number, "distance": string, "threat_level": "low"|"medium"|"high" }]
  },
  "digital_presence": {
    "score": number (0-100),
    "grade": "A"|"B"|"C"|"D"|"F",
    "findings": ["finding 1", "finding 2", "finding 3"],
    "summary": "2-3 sentence assessment"
  },
  "revenue_leakage": {
    "monthly_loss": ${monthlyLoss},
    "annual_loss": ${annualLoss},
    "per_unit_monthly": 110,
    "vacancy_rate": ${(100 - occupancy).toFixed(1)},
    "summary": "1-2 sentence revenue impact statement"
  },
  "recommended_actions": [
    { "title": string, "detail": string, "priority": "high"|"medium"|"low", "impact": string, "timeline": string }
  ],
  "storageads_fit": {
    "score": number (0-100),
    "summary": "2-3 sentences on why StorageAds is a good fit for this facility",
    "projected_monthly_spend": number,
    "projected_cost_per_move_in": number,
    "projected_months_to_target": number
  },
  "overall_score": number (0-100),
  "grade": "A"|"B"|"C"|"D"|"F"
}

Important: Use operator vocabulary (occupancy, move-ins, vacancy, unit mix, cost per move-in). Be direct and specific. No fluff. Every recommendation should be actionable. Revenue leakage uses $110/month average unit rate.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data.content?.[0]?.text;
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "audit-generate");
  if (limited) return limited;

  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { facilityId } = body || {};
    if (!facilityId) return errorResponse("Missing facilityId", 400, origin);

    const facility = await db.facilities.findUnique({
      where: { id: facilityId },
    });
    if (!facility) return errorResponse("Facility not found", 404, origin);

    // Step 1: Google Places research
    const placesData = await fetchPlacesData(facility.name, facility.location);

    // Step 2: Fetch competitors
    const competitors = await fetchCompetitors(facility.location);

    // Step 3: Generate audit with AI
    const auditJson = await generateAuditWithAI(
      {
        name: facility.name,
        location: facility.location,
        occupancy_range: facility.occupancy_range,
        total_units: facility.total_units,
        biggest_issue: facility.biggest_issue,
        notes: facility.notes,
      },
      placesData,
      competitors
    );

    if (!auditJson) {
      return errorResponse(
        "Failed to generate audit. Check API keys.",
        500,
        origin
      );
    }

    // Step 4: Save places data, audit, and update pipeline status in a transaction
    const auditRow = await db.$transaction(async (tx) => {
      // Save places data if found
      if (placesData) {
        await tx.facilities.update({
          where: { id: facilityId },
          data: {
            place_id: placesData.placeId || undefined,
            google_address: placesData.address || undefined,
            google_phone: placesData.phone || undefined,
            google_rating: placesData.rating || undefined,
            review_count: placesData.reviewCount || undefined,
            website: placesData.website || undefined,
            google_maps_url: placesData.mapsUrl || undefined,
            hours: placesData.hours
              ? JSON.parse(JSON.stringify(placesData.hours))
              : undefined,
            updated_at: new Date(),
          },
        });

        // Save places data snapshot
        try {
          await tx.places_data.create({
            data: {
              facility_id: facilityId,
              photos: placesData.photos as unknown as Prisma.InputJsonValue,
              reviews: placesData.reviews as unknown as Prisma.InputJsonValue,
            },
          });
        } catch {
          // Ignore duplicate insert errors
        }
      }

      // Save audit
      const audit = await tx.audits.create({
        data: {
          facility_id: facilityId,
          audit_json: auditJson as unknown as Prisma.InputJsonValue,
          overall_score:
            typeof auditJson.overall_score === "number"
              ? auditJson.overall_score
              : 0,
          grade: typeof auditJson.grade === "string" ? auditJson.grade : "C",
        },
      });

      // Update facility pipeline status
      await tx.facilities.update({
        where: { id: facilityId },
        data: {
          status: "scraped",
          pipeline_status: "audit_generated",
          updated_at: new Date(),
        },
      });

      return audit;
    });

    // Log activity (fire-and-forget)
    db.activity_log
      .create({
        data: {
          type: "audit_generated",
          facility_id: facilityId,
          facility_name: facility.name,
          detail: `Auto-generated audit for ${facility.name} — Score: ${auditJson.overall_score}`,
        },
      })
      .catch((err) => console.error("[activity_log] Fire-and-forget failed:", err));

    // Step 5: Email notification for review
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const recipients = (
        process.env.AUDIT_NOTIFICATION_EMAILS ||
        "blake@storageads.com"
      )
        .split(",")
        .map((e: string) => e.trim());

      const revenueLeakage = auditJson.revenue_leakage as
        | Record<string, unknown>
        | undefined;

      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "StorageAds <notifications@storageads.com>",
          to: recipients,
          subject: `Audit Generated: ${facility.name} — Score ${auditJson.overall_score}/100`,
          html: `
            <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="margin: 0 0 12px; color: #1a1a1a;">Audit Ready for Review</h2>
              <p style="color: #666; margin: 0 0 16px;">An auto-generated audit for <strong>${esc(facility.name)}</strong> is ready for your review.</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666; width: 120px;">Facility</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;"><strong>${esc(facility.name)}</strong></td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Location</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(facility.location)}</td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Score</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;"><strong>${auditJson.overall_score}/100 (${auditJson.grade})</strong></td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Revenue Leakage</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #dc2626;"><strong>$${typeof revenueLeakage?.annual_loss === "number" ? revenueLeakage.annual_loss.toLocaleString() : "N/A"}/yr</strong></td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Google Rating</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${placesData?.rating || "N/A"} (${placesData?.reviewCount || 0} reviews)</td></tr>
              </table>
              <p style="margin-top: 20px;">
                <a href="https://storageads.com/admin" style="display: inline-block; padding: 12px 24px; background: #B58B3F; color: #faf9f5; text-decoration: none; border-radius: 8px; font-weight: 600;">Review in Dashboard</a>
              </p>
              <p style="margin-top: 16px; font-size: 12px; color: #999;">After review, approve the audit to share it with the lead and send the Calendly link.</p>
            </div>`,
        }),
      }).catch((err) => console.error("[email] Fire-and-forget failed:", err));
    }

    return jsonResponse(
      {
        success: true,
        auditId: auditRow.id,
        audit: auditJson,
        placesData: placesData
          ? {
              rating: placesData.rating,
              reviewCount: placesData.reviewCount,
              website: placesData.website,
              address: placesData.address,
            }
          : null,
        competitorCount: competitors.length,
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
