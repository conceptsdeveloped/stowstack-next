import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";
import { getSession } from "@/lib/session-auth";

const PLAN_LIMITS: Record<
  string,
  {
    facilities: number;
    landingPages: number;
    teamMembers: number;
    channels: string[];
  }
> = {
  launch: {
    facilities: 1,
    landingPages: 3,
    teamMembers: 3,
    channels: ["meta"],
  },
  growth: {
    facilities: 3,
    landingPages: -1,
    teamMembers: 10,
    channels: ["meta", "google"],
  },
  portfolio: {
    facilities: -1,
    landingPages: -1,
    teamMembers: -1,
    channels: ["meta", "google", "tiktok"],
  },
};

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const session = await getSession(req);
    if (!session) {
      return errorResponse("Unauthorized", 401, origin);
    }

    const orgId = session.organization.id;
    const plan = session.organization.plan;
    const facilityLimit = session.organization.facilityLimit;

    const facilityCount = await db.facilities.count({
      where: { organization_id: orgId },
    });

    const landingPageCount = await db.landing_pages.count({
      where: {
        facilities: { organization_id: orgId },
      },
    });

    const publishedPageCount = await db.landing_pages.count({
      where: {
        facilities: { organization_id: orgId },
        status: "published",
      },
    });

    const userCount = await db.org_users.count({
      where: { organization_id: orgId, status: "active" },
    });

    const adCount = await db.ad_variations.count({
      where: {
        facilities: { organization_id: orgId },
        status: "published",
      },
    });

    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.launch;

    return jsonResponse(
      {
        plan,
        subscriptionStatus: session.organization.subscriptionStatus,
        usage: {
          facilities: {
            used: facilityCount,
            limit: facilityLimit || limits.facilities,
            unlimited: limits.facilities === -1,
          },
          landingPages: {
            used: landingPageCount,
            published: publishedPageCount,
            limit: limits.landingPages,
            unlimited: limits.landingPages === -1,
          },
          teamMembers: {
            used: userCount,
            limit: limits.teamMembers,
            unlimited: limits.teamMembers === -1,
          },
          liveAds: { used: adCount },
        },
        features: {
          channels: limits.channels,
          abTesting: plan !== "launch",
          videoCreative: plan !== "launch",
          callTracking: plan !== "launch",
          churnPrediction: plan === "portfolio",
          whiteLabel: plan === "portfolio",
          dedicatedStrategist: plan === "portfolio",
        },
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Failed to fetch usage data", 500, origin);
  }
}
