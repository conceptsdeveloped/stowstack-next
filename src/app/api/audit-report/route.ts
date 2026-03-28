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

const OCCUPANCY_MID: Record<string, number> = {
  "below-60": 50,
  "60-75": 67.5,
  "75-85": 80,
  "85-95": 90,
  "above-95": 97,
};

const UNIT_COUNTS: Record<string, number> = {
  "under-100": 75,
  "100-300": 200,
  "300-500": 400,
  "500+": 650,
};

const AVG_UNIT_RATE = 125;

interface LeadData {
  facilityName: string;
  location: string;
  occupancyRange: string;
  totalUnits: string;
  biggestIssue: string;
}

function generateReport(lead: LeadData) {
  const occupancy = OCCUPANCY_MID[lead.occupancyRange] || 80;
  const totalUnits = UNIT_COUNTS[lead.totalUnits] || 200;
  const vacantUnits = Math.round(totalUnits * (1 - occupancy / 100));
  const monthlyVacancyCost = vacantUnits * AVG_UNIT_RATE;
  const annualVacancyCost = monthlyVacancyCost * 12;

  const vacancyScore = Math.min(40, Math.round((100 - occupancy) * 0.8));
  const sizeScore = totalUnits >= 300 ? 25 : totalUnits >= 100 ? 18 : 10;
  const issueScores: Record<string, number> = {
    "filling-units": 20,
    "lowering-costs": 12,
    "competitive-pressure": 18,
    "seasonal-fluctuations": 14,
    "digital-presence": 16,
    other: 8,
  };
  const issueScore = issueScores[lead.biggestIssue] || 10;
  const marketOpportunityScore = Math.min(
    100,
    vacancyScore + sizeScore + issueScore + 15
  );

  const baseSpend =
    totalUnits <= 100
      ? 1500
      : totalUnits <= 300
        ? 2500
        : totalUnits <= 500
          ? 4000
          : 6000;
  const vacancyMultiplier =
    occupancy < 70 ? 1.4 : occupancy < 80 ? 1.2 : occupancy < 90 ? 1.0 : 0.8;
  const recommendedSpend =
    Math.round((baseSpend * vacancyMultiplier) / 100) * 100;

  const projectedCpl = totalUnits >= 300 ? 18 : totalUnits >= 100 ? 24 : 32;
  const projectedLeadsPerMonth = Math.round(recommendedSpend / projectedCpl);
  const conversionRate = 0.25;
  const projectedMoveInsPerMonth = Math.round(
    projectedLeadsPerMonth * conversionRate
  );
  const projectedRevenuePerMoveIn = AVG_UNIT_RATE * 8;
  const projectedMonthlyRevenue =
    projectedMoveInsPerMonth * projectedRevenuePerMoveIn;
  const projectedRoas =
    recommendedSpend > 0
      ? Math.round((projectedMonthlyRevenue / recommendedSpend) * 10) / 10
      : 0;
  const projectedMonthsToFill =
    vacantUnits > 0 && projectedMoveInsPerMonth > 0
      ? Math.ceil(vacantUnits / projectedMoveInsPerMonth)
      : 0;

  const competitiveInsights: string[] = [];
  if (occupancy < 75) {
    competitiveInsights.push(
      "Your occupancy is significantly below the 90%+ industry benchmark, indicating strong market opportunity for aggressive digital acquisition."
    );
  } else if (occupancy < 85) {
    competitiveInsights.push(
      "Your facility has room to grow. Targeted Meta ads can capture renters actively searching for storage in your radius."
    );
  } else {
    competitiveInsights.push(
      "Your occupancy is healthy. Digital ads can help maintain occupancy and build a waitlist for premium-rate units."
    );
  }
  if (lead.biggestIssue === "filling-units") {
    competitiveInsights.push(
      "Direct-response campaigns with move-in specials consistently outperform brand awareness for filling units fast."
    );
  }
  if (lead.biggestIssue === "competitive-pressure") {
    competitiveInsights.push(
      "Competitor targeting via Custom Audiences and geo-fencing can intercept renters considering nearby facilities."
    );
  }
  if (totalUnits >= 300) {
    competitiveInsights.push(
      "Your facility size supports multi-unit-type campaigns — climate, drive-up, and standard units can each have targeted ad sets."
    );
  }

  const recommendations = [
    {
      title: "Launch Meta CBO Campaign",
      detail: `Start with $${recommendedSpend}/mo budget using Campaign Budget Optimization across 3-4 ad sets targeting renters within a 10-15 mile radius.`,
      priority: "high",
    },
    {
      title: "Implement Conversion Tracking",
      detail:
        "Install Meta Pixel on your website and set up conversion events for form submissions, phone calls, and direction requests.",
      priority: "high",
    },
    {
      title: "Build Custom & Lookalike Audiences",
      detail:
        "Upload your existing tenant list to create Lookalike Audiences. Target people similar to your best customers.",
      priority: "medium",
    },
    {
      title: "Create Unit-Specific Ad Creative",
      detail:
        "Dynamic creative for each unit type (climate, drive-up, standard) with pricing and availability. Include move-in specials.",
      priority: "medium",
    },
    {
      title: "Optimize Call Handling",
      detail:
        "Ensure calls are answered within 3 rings during business hours. Set up missed call text-back automation for after-hours leads.",
      priority: "high",
    },
    {
      title: "Landing Page Optimization",
      detail:
        "Create dedicated landing pages per unit type with clear CTAs, pricing, and a prominent phone number. Remove navigation distractions.",
      priority: "medium",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    facility: {
      name: lead.facilityName,
      location: lead.location,
      totalUnits,
      occupancy,
      vacantUnits,
      biggestIssue: lead.biggestIssue,
    },
    vacancyCost: {
      monthlyLoss: monthlyVacancyCost,
      annualLoss: annualVacancyCost,
      vacantUnits,
      avgUnitRate: AVG_UNIT_RATE,
    },
    marketOpportunity: {
      score: marketOpportunityScore,
      grade:
        marketOpportunityScore >= 80
          ? "Excellent"
          : marketOpportunityScore >= 60
            ? "Strong"
            : marketOpportunityScore >= 40
              ? "Moderate"
              : "Low",
    },
    projections: {
      recommendedSpend,
      projectedCpl,
      projectedLeadsPerMonth,
      projectedMoveInsPerMonth,
      projectedMonthlyRevenue,
      projectedRoas,
      projectedMonthsToFill,
      conversionRate: Math.round(conversionRate * 100),
    },
    competitiveInsights,
    recommendations,
  };
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const leadId = url.searchParams.get("id");
  if (!leadId) return errorResponse("Missing lead ID", 400, origin);

  try {
    // Check cache
    const cached = await db.audit_report_cache.findUnique({
      where: { facility_id: leadId },
    });
    if (cached) {
      return jsonResponse(
        { report: cached.report_json, cached: true },
        200,
        origin
      );
    }

    // Generate from facility data
    const facility = await db.facilities.findUnique({
      where: { id: leadId },
    });
    if (!facility) return errorResponse("Lead not found", 404, origin);

    const lead: LeadData = {
      facilityName: facility.name,
      location: facility.location,
      occupancyRange: facility.occupancy_range || "",
      totalUnits: facility.total_units || "",
      biggestIssue: facility.biggest_issue || "",
    };

    const report = generateReport(lead);

    // Cache the report
    await db.audit_report_cache.upsert({
      where: { facility_id: leadId },
      create: {
        facility_id: leadId,
        report_json: report as unknown as Prisma.InputJsonValue,
      },
      update: {
        report_json: report as unknown as Prisma.InputJsonValue,
        created_at: new Date(),
      },
    });

    return jsonResponse({ report, cached: false }, 200, origin);
  } catch {
    return errorResponse("Failed to generate report", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { leadId } = body || {};
    if (!leadId) return errorResponse("Missing lead ID", 400, origin);

    const facility = await db.facilities.findUnique({
      where: { id: leadId },
    });
    if (!facility) return errorResponse("Lead not found", 404, origin);

    const lead: LeadData = {
      facilityName: facility.name,
      location: facility.location,
      occupancyRange: facility.occupancy_range || "",
      totalUnits: facility.total_units || "",
      biggestIssue: facility.biggest_issue || "",
    };

    const report = generateReport(lead);

    // Upsert cache
    await db.audit_report_cache.upsert({
      where: { facility_id: leadId },
      create: {
        facility_id: leadId,
        report_json: report as unknown as Prisma.InputJsonValue,
      },
      update: {
        report_json: report as unknown as Prisma.InputJsonValue,
        created_at: new Date(),
      },
    });

    return jsonResponse({ report, cached: false }, 200, origin);
  } catch {
    return errorResponse("Failed to regenerate report", 500, origin);
  }
}
