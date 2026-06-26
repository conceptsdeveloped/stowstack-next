import { NextRequest } from "next/server";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { sanitizeString } from "@/lib/validation";
import { resolveSiteUrl } from "@/lib/email";

// Delegates to /api/audit-generate-diagnostic, which runs a 30-60s Claude call.
export const maxDuration = 120;

/**
 * Quick diagnostic generation from PUBLIC data only.
 *
 * The full generator (`/api/audit-generate-diagnostic`) expects an ~80-field
 * operator intake. That makes it unusable for fast outbound: you can't turn a
 * facility name into a send-ready /audit/[slug] link in a couple of minutes.
 *
 * This route takes the minimal public signals you already have from the audit
 * tool's Google lookup (name, address, website, rating, review count), fills the
 * rest of the intake with explicit "Not provided" defaults plus a note telling
 * the model to reason from public data and benchmarks, then delegates to the
 * existing generator unchanged. One admin call in -> shareable diagnostic link out.
 */

type QuickInput = {
  facilityName?: unknown;
  facilityAddress?: unknown;
  websiteUrl?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  googleRating?: unknown;
  reviewCount?: unknown;
};

const TEXT_UNKNOWN = "Not provided";

function num(val: unknown): number | undefined {
  const n = typeof val === "string" ? Number(val) : (val as number);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

/** Build a complete DiagnosticInput-shaped object from sparse public data. */
function buildDiagnosticInput(input: QuickInput) {
  const facilityName = sanitizeString(input.facilityName, 200);
  const facilityAddress = sanitizeString(input.facilityAddress, 500);
  const websiteUrl = sanitizeString(input.websiteUrl, 500);
  const contactName = sanitizeString(input.contactName, 200);
  const contactEmail =
    typeof input.contactEmail === "string" ? input.contactEmail.trim() : "";
  const contactPhone = sanitizeString(input.contactPhone, 50);
  const rating = num(input.googleRating);
  const reviews = num(input.reviewCount);

  // Every text field defaults to "Not provided" so the prompt never renders
  // `undefined`; every list defaults to empty.
  const T = TEXT_UNKNOWN;
  return {
    facilityName,
    facilityAddress,
    contactName: contactName || T,
    contactEmail: contactEmail || "",
    contactPhone: contactPhone || T,
    websiteUrl: websiteUrl || T,
    role: T,
    yearsManaged: T,
    facilityAge: T,
    facilityCount: T,

    occupancy: T,
    leasingMomentum: T,
    occupancyVs6Months: T,
    occupancyVsLastYear: T,
    moveIns30Days: T,
    moveOuts30Days: T,
    totalUnits: T,

    unitTypesOffered: [],
    bestRentingUnits: [],
    hardestToRentUnits: [],
    specificVacancyNotes: T,
    offlineUnits: T,
    unitMixBalance: T,

    biggerIssue: T,
    leadSources: [],
    weeklyInquiries: T,
    whyPeopleDontRent: T,
    canReserveOnline: T,
    canRentFullyOnline: T,
    onlineVsWalkIn: T,

    followUpConfidence: T,
    callsRecorded: T,
    callTrackingSoftware: T,
    missedCallProcess: T,
    abandonedReservationFollowUp: T,
    reservationNoShowProcess: T,
    phoneClosingAbility: T,

    currentMarketing: [],
    monthlyAdSpend: T,
    googleAdsPerformance: T,
    metaAdsPerformance: T,
    knowsCostPerLead: T,
    whoManagesMarketing: T,
    openToMetaAds: T,
    idealAdBudget: T,
    storageAgencyExperience: T,

    websiteBuilder: T,
    lastWebsiteUpdate: T,
    showsLiveAvailability: T,
    googleReviewCount: reviews !== undefined ? String(reviews) : T,
    googleRating: rating !== undefined ? String(rating) : T,
    respondsToReviews: T,
    requestsReviews: T,
    gbpStatus: T,
    gbpPostFrequency: T,
    socialMedia: [],

    pms: T,
    revenueManagementSoftware: T,
    pricingPerception: T,
    currentPromotions: T,
    ecriStatus: T,
    lastStreetRateIncrease: T,
    pricingMethod: T,
    tenantProtection: T,
    autopayPercentage: T,

    staffingModel: T,
    officeHours: T,
    gateAccessHours: T,
    facilityCondition: T,
    facilityAgeYears: T,
    securityFeatures: [],
    amenities: [],
    recentRenovations: T,

    topCompetitors: T,
    competitorAdvantages: T,
    yourAdvantages: T,
    commonObjections: [],
    newSupply: T,
    marketSaturation: T,

    vacancyReason: T,
    unusualCircumstances: T,
    fixOneThingFirst: T,
    aggressiveness: "balanced",
    urgency: T,
    openToPmsReports: T,
    howHeard: "quick_diagnostic",
    additionalNotes:
      "GENERATED FROM PUBLIC DATA ONLY. The operator did not complete the full " +
      "intake; nearly every field is unknown. Reason from the public signals " +
      "provided (Google Business Profile rating/review count, website presence) " +
      "plus self-storage industry benchmarks. Where you must assume a value, say " +
      "so plainly and frame it as an estimate to confirm on a call — do not " +
      "invent specific operator-only facts (occupancy %, unit counts, ad spend).",

    // Optional scraped data — populates the prompt's "known" public signals.
    ...(rating !== undefined ? { scrapedGoogleRating: rating } : {}),
    ...(reviews !== undefined ? { scrapedReviewCount: reviews } : {}),
  };
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "audit-quick-diagnostic");
  if (limited) return limited;

  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  const origin = getOrigin(req);

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return errorResponse("Server not configured for diagnostic generation", 500, origin);
  }

  let body: QuickInput;
  try {
    body = (await req.json()) as QuickInput;
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const facilityName = sanitizeString(body.facilityName, 200);
  const facilityAddress = sanitizeString(body.facilityAddress, 500);
  if (!facilityName || !facilityAddress) {
    return errorResponse("facilityName and facilityAddress are required", 400, origin);
  }

  const diagnosticJson = buildDiagnosticInput(body);

  // Delegate to the existing generator unchanged. The x-admin-key header both
  // authenticates the call and makes it CSRF-exempt at the proxy.
  let genRes: Response;
  try {
    genRes = await fetch(`${resolveSiteUrl()}/api/audit-generate-diagnostic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminSecret,
      },
      body: JSON.stringify({ diagnosticJson }),
    });
  } catch (e) {
    console.error("[audit-quick-diagnostic] generator call failed:", e);
    return errorResponse("Failed to reach diagnostic generator", 502, origin);
  }

  const data = await genRes.json().catch(() => null);
  if (!genRes.ok || !data?.success) {
    return errorResponse(
      data?.error || "Diagnostic generation failed",
      genRes.status === 200 ? 500 : genRes.status,
      origin
    );
  }

  return jsonResponse(
    {
      success: true,
      slug: data.slug,
      auditUrl: data.auditUrl,
      overallScore: data.overallScore,
      overallGrade: data.overallGrade,
    },
    200,
    origin
  );
}
