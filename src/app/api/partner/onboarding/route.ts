import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

interface CountRow {
  count: bigint;
}

interface OrgRow {
  logo_url: string | null;
  contact_email: string | null;
  onboarding_completed_at: Date | null;
}

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  link: string;
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  const orgId = session.organization.id;

  try {
    // Fetch all data in parallel
    const [orgRows, facilityCount, landingPageCount, connectionCount, publishCount] =
      await Promise.all([
        db.$queryRaw<OrgRow[]>`
          SELECT logo_url, contact_email, onboarding_completed_at
          FROM organizations
          WHERE id = ${orgId}::uuid
        `,
        db.$queryRaw<CountRow[]>`
          SELECT COUNT(*)::bigint as count
          FROM facilities
          WHERE organization_id = ${orgId}::uuid
        `,
        db.$queryRaw<CountRow[]>`
          SELECT COUNT(*)::bigint as count
          FROM landing_pages lp
          JOIN facilities f ON f.id = lp.facility_id
          WHERE f.organization_id = ${orgId}::uuid
        `,
        db.$queryRaw<CountRow[]>`
          SELECT COUNT(*)::bigint as count
          FROM platform_connections pc
          JOIN facilities f ON f.id = pc.facility_id
          WHERE f.organization_id = ${orgId}::uuid
            AND pc.status = 'connected'
        `,
        db.$queryRaw<CountRow[]>`
          SELECT COUNT(*)::bigint as count
          FROM publish_log pl
          JOIN facilities f ON f.id = pl.facility_id
          WHERE f.organization_id = ${orgId}::uuid
        `,
      ]);

    const org = orgRows[0];
    if (!org) return errorResponse("Organization not found", 404, origin);

    const step1Complete = org.logo_url !== null && org.contact_email !== null;
    const step2Complete = Number(facilityCount[0]?.count ?? 0) > 0;
    const step3Complete = Number(landingPageCount[0]?.count ?? 0) > 0;
    const step4Complete = Number(connectionCount[0]?.count ?? 0) > 0;
    const step5Complete = Number(publishCount[0]?.count ?? 0) > 0;

    const steps: OnboardingStep[] = [
      {
        key: "profile",
        title: "Complete your profile",
        description:
          "Add your organization logo and contact email to build trust with your clients.",
        completed: step1Complete,
        link: "/partner/settings",
      },
      {
        key: "facility",
        title: "Add your first facility",
        description:
          "Add a self-storage facility to start managing campaigns and tracking performance.",
        completed: step2Complete,
        link: "/partner/facilities",
      },
      {
        key: "landing_page",
        title: "Build a landing page",
        description:
          "Create a high-converting landing page for one of your facilities.",
        completed: step3Complete,
        link: "/partner/facilities",
      },
      {
        key: "ad_account",
        title: "Connect ad accounts",
        description:
          "Link your Meta or Google ad accounts to start running campaigns.",
        completed: step4Complete,
        link: "/partner/facilities",
      },
      {
        key: "campaign",
        title: "Launch a campaign",
        description:
          "Publish your first ad campaign and start generating leads.",
        completed: step5Complete,
        link: "/partner/facilities",
      },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const totalCount = steps.length;
    const allComplete = completedCount === totalCount;

    // Mark onboarding as complete if all steps done and not already marked
    if (allComplete && !org.onboarding_completed_at) {
      await db.$executeRaw`
        UPDATE organizations
        SET onboarding_completed_at = NOW()
        WHERE id = ${orgId}::uuid
      `;
    }

    return jsonResponse(
      { steps, completedCount, totalCount, allComplete },
      200,
      origin,
    );
  } catch (err) {
    console.error("Onboarding GET error:", err);
    return errorResponse("Failed to fetch onboarding status", 500, origin);
  }
}
