import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";

/**
 * Maps form responses (question-answer pairs) to DiagnosticInput format
 * expected by the audit-generate-diagnostic endpoint.
 */
function mapResponsesToDiagnosticInput(
  facility: {
    facilityName: string;
    facilityAddress: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    websiteUrl: string;
  },
  responses: Record<string, string | string[]>
) {
  const r = (key: string): string => {
    const val = responses[key];
    return typeof val === "string" ? val : Array.isArray(val) ? val.join(", ") : "";
  };

  return {
    facilityName: facility.facilityName,
    facilityAddress: facility.facilityAddress,
    contactName: facility.contactName,
    contactEmail: facility.contactEmail,
    contactPhone: facility.contactPhone,
    websiteUrl: facility.websiteUrl,
    role: "",
    yearsManaged: "",
    facilityAge: "",
    facilityCount: "1",

    // Occupancy
    occupancy: r("About where is your facility sitting today (overall occupancy)?"),
    leasingMomentum: r("How would you describe the facility's leasing momentum right now?"),
    occupancyVs6Months: "",
    occupancyVsLastYear: "",
    moveIns30Days: r("Roughly how many move-ins have you had in the last 30 days?"),
    moveOuts30Days: r("Roughly how many move-outs in the last 30 days?"),
    totalUnits: r("What is your total unit count (approximately)?"),

    // Unit mix
    unitTypesOffered: [],
    bestRentingUnits: [],
    hardestToRentUnits: [],
    specificVacancyNotes: "",
    offlineUnits: "",
    unitMixBalance: "",

    // Lead flow
    biggerIssue: r("What feels like the bigger issue right now?"),
    leadSources: [],
    weeklyInquiries: "",
    whyPeopleDontRent: "",
    canReserveOnline: "",
    canRentFullyOnline: "",
    onlineVsWalkIn: "",

    // Sales
    followUpConfidence: "",
    callsRecorded: "",
    callTrackingSoftware: "",
    missedCallProcess: "",
    abandonedReservationFollowUp: "",
    reservationNoShowProcess: "",
    phoneClosingAbility: "",

    // Marketing
    currentMarketing: r("What marketing / advertising are you currently running? (select all)").split(", ").filter(Boolean),
    monthlyAdSpend: r("What is your approximate total monthly marketing / ad spend?"),
    googleAdsPerformance: r("If you run Google Ads, how would you describe the performance?"),
    metaAdsPerformance: "",
    knowsCostPerLead: "",
    whoManagesMarketing: r("Who manages your marketing / ads?"),
    openToMetaAds: "",
    idealAdBudget: "",
    storageAgencyExperience: "",

    // Digital presence
    websiteBuilder: "",
    lastWebsiteUpdate: r("When was the last time your website was meaningfully updated?"),
    showsLiveAvailability: "",
    googleReviewCount: r("Approximately how many Google reviews does your facility have?"),
    googleRating: r("What is your approximate Google review rating?"),
    respondsToReviews: "",
    requestsReviews: "",
    gbpStatus: r("Is your Google Business Profile (GBP) claimed and actively managed?"),
    gbpPostFrequency: "",
    socialMedia: [],

    // Revenue management
    pms: r("Which PMS / management software do you use?"),
    revenueManagementSoftware: "",
    pricingPerception: "",
    currentPromotions: "",
    ecriStatus: "",
    lastStreetRateIncrease: "",
    pricingMethod: "",
    tenantProtection: "",
    autopayPercentage: "",

    // Operations
    staffingModel: "",
    officeHours: "",
    gateAccessHours: "",
    facilityCondition: "",
    facilityAgeYears: "",
    securityFeatures: [],
    amenities: [],
    recentRenovations: "",

    // Competition
    topCompetitors: "",
    competitorAdvantages: "",
    yourAdvantages: "",
    commonObjections: [],
    newSupply: "",
    marketSaturation: "",

    // Priorities
    vacancyReason: "",
    unusualCircumstances: "",
    fixOneThingFirst: r("If this diagnostic could fix only ONE thing, what should it fix first?"),
    aggressiveness: r("How aggressive are you willing to be if the audit shows changes are needed?"),
    urgency: r("How soon are you looking to take action?"),
    openToPmsReports: "",
    howHeard: "",
    additionalNotes: r("Anything else you want us to know before we review your facility?"),
  };
}

/**
 * POST /api/diagnostic-intake
 *
 * Accepts diagnostic form submissions from:
 * 1. Google Forms via Apps Script webhook
 * 2. Direct JSON submissions from our own forms
 *
 * Stores the submission in the facilities table with pipeline_status='diagnostic_submitted'
 * and stores the full form data in the notes field as JSON.
 *
 * Google Apps Script webhook payload format:
 * {
 *   "facilityName": "...",
 *   "facilityAddress": "...",
 *   "contactName": "...",
 *   "contactEmail": "...",
 *   "contactPhone": "...",
 *   "websiteUrl": "...",
 *   "responses": { ...all form field key-value pairs... }
 * }
 */

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const {
      facilityName,
      facilityAddress,
      contactName,
      contactEmail,
      contactPhone,
      websiteUrl,
      responses,
    } = body || {};

    if (!facilityName || !contactEmail) {
      return errorResponse(
        "facilityName and contactEmail are required",
        400,
        origin
      );
    }

    // Parse occupancy from responses if available
    const occupancyRaw =
      responses?.[
        "About where is your facility sitting today (overall occupancy)?"
      ] || "";
    const occupancyMap: Record<string, string> = {
      "Under 50%": "below-60",
      "50–59%": "below-60",
      "60–69%": "60-75",
      "70–79%": "60-75",
      "80–84%": "75-85",
      "85–89%": "85-95",
      "90–94%": "85-95",
      "95%+": "above-95",
    };

    const totalUnitsRaw =
      responses?.[
        "What is your total unit count (approximately)?"
      ] || "";
    const unitCountMap: Record<string, string> = {
      "Under 100": "under-100",
      "100–199": "100-300",
      "200–349": "100-300",
      "350–499": "300-500",
      "500–749": "500+",
      "750–999": "500+",
      "1,000+": "500+",
    };

    const biggestIssueRaw =
      responses?.[
        "What feels like the bigger issue right now?"
      ] || "";
    const issueMap: Record<string, string> = {
      "Not enough leads coming in": "filling-units",
      "Plenty of leads, not enough are converting to move-ins":
        "competitive-pressure",
      "Both — not enough leads AND they're not converting": "filling-units",
      "Not sure": "filling-units",
    };

    // Create facility record
    const facility = await db.facilities.create({
      data: {
        name: facilityName,
        location: facilityAddress || "",
        contact_name: contactName || null,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        website: websiteUrl || null,
        occupancy_range: occupancyMap[occupancyRaw] || "60-75",
        total_units: unitCountMap[totalUnitsRaw] || "100-300",
        biggest_issue: issueMap[biggestIssueRaw] || "filling-units",
        status: "intake",
        pipeline_status: "diagnostic_submitted",
        notes: JSON.stringify({
          source: "diagnostic_form",
          submittedAt: new Date().toISOString(),
          responses: responses || body,
        }),
      },
    });

    // Send notification email
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "StorageAds <notifications@storageads.com>",
          to: ["blake@storageads.com"],
          subject: `New Diagnostic Submission: ${facilityName}`,
          html: `
            <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="margin: 0 0 12px; color: #1a1a1a;">New Diagnostic Form Submission</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Facility</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;"><strong>${facilityName}</strong></td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Address</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${facilityAddress || "N/A"}</td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Contact</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${contactName || "N/A"} (${contactEmail})</td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Occupancy</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${occupancyRaw || "N/A"}</td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Units</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${totalUnitsRaw || "N/A"}</td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Issue</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${biggestIssueRaw || "N/A"}</td></tr>
              </table>
              <p style="margin-top: 20px;">
                <a href="https://storageads.com/admin/audits" style="display: inline-block; padding: 12px 24px; background: #B58B3F; color: #faf9f5; text-decoration: none; border-radius: 8px; font-weight: 600;">Generate Audit</a>
              </p>
            </div>`,
        }),
      }).catch(() => {});
    }

    // Log activity
    db.activity_log
      .create({
        data: {
          type: "diagnostic_submitted",
          facility_id: facility.id,
          facility_name: facilityName,
          detail: `Diagnostic form submitted by ${contactName || contactEmail}`,
        },
      })
      .catch(() => {});

    // Auto-trigger audit generation (fire-and-forget)
    const adminSecret = process.env.ADMIN_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || "http://localhost:3000";

    if (adminSecret && process.env.ANTHROPIC_API_KEY) {
      const diagnosticJson = mapResponsesToDiagnosticInput(
        { facilityName, facilityAddress, contactName, contactEmail, contactPhone, websiteUrl },
        responses || {}
      );

      fetch(`${appUrl}/api/audit-generate-diagnostic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminSecret,
        },
        body: JSON.stringify({
          diagnosticJson,
          facilityId: facility.id,
        }),
      }).catch((err) => {
        console.error("Auto-audit generation trigger failed:", err);
      });
    }

    return jsonResponse(
      {
        success: true,
        facilityId: facility.id,
        message: "Diagnostic submission received. Your audit is being generated now.",
      },
      201,
      origin
    );
  } catch (e) {
    console.error("Diagnostic intake error:", e);
    return errorResponse("Internal server error", 500, origin);
  }
}
