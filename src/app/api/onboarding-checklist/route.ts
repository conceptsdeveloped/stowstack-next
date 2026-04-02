import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const ONBOARDING_STEPS = [
  {
    id: "facility_info",
    label: "Facility info collected",
    description:
      "Name, address, phone, hours, unit mix, pricing, current promos",
  },
  {
    id: "storedge_verified",
    label: "storEDGE account verified",
    description: "Embed URL confirmed and tested",
  },
  {
    id: "meta_access",
    label: "Meta Business Manager access granted",
    description: "Partner access to Facebook/Instagram ad accounts",
  },
  {
    id: "google_access",
    label: "Google Ads account access granted",
    description: "If applicable — MCC or direct access",
  },
  {
    id: "brand_assets",
    label: "Brand assets received",
    description: "Logo, photos, brand colors",
  },
  {
    id: "landing_pages",
    label: "Landing page(s) built and approved",
    description: "Client has reviewed and approved the landing pages",
  },
  {
    id: "call_tracking",
    label: "Call tracking number provisioned",
    description: "Forwarding tested and working",
  },
  {
    id: "pixel_verified",
    label: "Pixel/CAPI tracking verified",
    description: "Test events firing correctly to Meta and Google",
  },
  {
    id: "creative_approved",
    label: "Ad creative approved by client",
    description: "All ad images, copy, and videos signed off",
  },
  {
    id: "campaigns_launched",
    label: "Campaigns launched",
    description: "Ads are live and serving impressions",
  },
];

interface ChecklistItem {
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
}

interface ChecklistSteps {
  checklist?: Record<string, ChecklistItem>;
  [key: string]: unknown;
}

function esc(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildStepsResult(
  checklist: Record<string, ChecklistItem>,
  includeCompletedBy: boolean
) {
  const steps = ONBOARDING_STEPS.map((s) => ({
    ...s,
    completed: !!checklist[s.id]?.completed,
    completedAt: checklist[s.id]?.completedAt || null,
    ...(includeCompletedBy
      ? { completedBy: checklist[s.id]?.completedBy || null }
      : {}),
  }));
  const completedCount = steps.filter((s) => s.completed).length;
  return {
    steps,
    completedCount,
    totalSteps: ONBOARDING_STEPS.length,
    completionPct: Math.round(
      (completedCount / ONBOARDING_STEPS.length) * 100
    ),
  };
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "onboarding-checklist");
  if (limited) return limited;
  const origin = getOrigin(req);
  const isAdmin = isAdminRequest(req);

  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId");
    const accessCode = url.searchParams.get("accessCode");
    const email = url.searchParams.get("email");

    if (clientId && isAdmin) {
      const client = await db.clients.findUnique({
        where: { id: clientId },
        select: { id: true, facility_id: true },
      });
      if (!client) {
        return errorResponse("Client not found", 404, origin);
      }

      const row = await db.client_onboarding.findUnique({
        where: { client_id: clientId },
        select: { steps: true },
      });

      const checklist =
        ((row?.steps as ChecklistSteps)?.checklist as Record<
          string,
          ChecklistItem
        >) || {};
      const result = buildStepsResult(checklist, true);
      return jsonResponse({ success: true, ...result }, 200, origin);
    }

    if (accessCode && email) {
      const client = await db.clients.findFirst({
        where: {
          access_code: accessCode,
          email: { equals: email, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (!client) {
        return errorResponse("Unauthorized", 401, origin);
      }

      const row = await db.client_onboarding.findUnique({
        where: { client_id: client.id },
        select: { steps: true },
      });

      const checklist =
        ((row?.steps as ChecklistSteps)?.checklist as Record<
          string,
          ChecklistItem
        >) || {};

      const steps = ONBOARDING_STEPS.map((s) => ({
        ...s,
        completed: !!checklist[s.id]?.completed,
        completedAt: checklist[s.id]?.completedAt || null,
      }));

      let nextAction: {
        step: string;
        label: string;
        instruction: string;
      } | null = null;

      for (const step of steps) {
        if (!step.completed) {
          if (step.id === "meta_access") {
            nextAction = {
              step: step.id,
              label: step.label,
              instruction:
                "We need your Meta Business Manager access. Go to business.facebook.com > Settings > Partners > Add Partner and enter our Business ID.",
            };
          } else if (step.id === "google_access") {
            nextAction = {
              step: step.id,
              label: step.label,
              instruction:
                "Grant us access to your Google Ads account. Go to Tools > Access > Add user and invite blake@storageads.com.",
            };
          } else if (step.id === "brand_assets") {
            nextAction = {
              step: step.id,
              label: step.label,
              instruction:
                "Send us your logo (PNG preferred), facility photos, and brand colors. Reply to your welcome email or upload in the onboarding wizard.",
            };
          } else if (step.id === "creative_approved") {
            nextAction = {
              step: step.id,
              label: step.label,
              instruction:
                "Review the ad creative we sent you and let us know if it is approved or needs changes.",
            };
          } else if (step.id === "landing_pages") {
            nextAction = {
              step: step.id,
              label: step.label,
              instruction:
                "Review the landing pages we built for your facility. Let us know if anything needs to change.",
            };
          }
          break;
        }
      }

      const completedCount = steps.filter((s) => s.completed).length;
      return jsonResponse(
        {
          success: true,
          steps,
          completedCount,
          totalSteps: ONBOARDING_STEPS.length,
          completionPct: Math.round(
            (completedCount / ONBOARDING_STEPS.length) * 100
          ),
          nextAction,
        },
        200,
        origin
      );
    }

    return errorResponse("Missing clientId or accessCode+email", 400, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "onboarding-checklist");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { clientId, stepId, completed, completedBy } = body || {};

    if (!clientId || !stepId) {
      return errorResponse("Missing clientId or stepId", 400, origin);
    }

    const validStep = ONBOARDING_STEPS.find((s) => s.id === stepId);
    if (!validStep) {
      return errorResponse("Invalid step ID", 400, origin);
    }

    let row = await db.client_onboarding.findUnique({
      where: { client_id: clientId },
    });

    if (!row) {
      const client = await db.clients.findUnique({
        where: { id: clientId },
        select: { id: true, access_code: true },
      });
      if (!client) {
        return errorResponse("Client not found", 404, origin);
      }

      row = await db.client_onboarding.create({
        data: {
          client_id: clientId,
          access_code: client.access_code,
          steps: {},
        },
      });
    }

    const steps = (row.steps as ChecklistSteps) || {};
    if (!steps.checklist) steps.checklist = {};

    steps.checklist[stepId] = {
      completed: completed !== false,
      completedAt: completed !== false ? new Date().toISOString() : null,
      completedBy: completedBy || "admin",
    };

    const allDone = ONBOARDING_STEPS.every(
      (s) => steps.checklist?.[s.id]?.completed
    );

    await db.client_onboarding.update({
      where: { client_id: clientId },
      data: {
        steps: steps as unknown as Prisma.InputJsonValue,
        completed_at: allDone ? new Date() : null,
        updated_at: new Date(),
      },
    });

    // Send notification email to client when a step is completed
    if (completed !== false) {
      const apiKey = process.env.RESEND_API_KEY;
      const client = await db.clients.findUnique({
        where: { id: clientId },
        select: { email: true, name: true, facility_name: true },
      });

      if (apiKey && client) {
        const stepLabel = validStep.label;
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: "StorageAds <notifications@storageads.com>",
            to: client.email,
            subject: `Onboarding update: ${stepLabel}`,
            html: `
              <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="margin: 0 0 12px; color: #1a1a1a;">Your StorageAds onboarding: ${esc(stepLabel)}</h2>
                <p style="color: #666; margin: 0 0 20px;">Hey ${esc(client.name.split(" ")[0])}, just a quick update on your ${esc(client.facility_name || "")} campaign setup.</p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #16a34a; font-weight: 600;">${esc(stepLabel)}</p>
                </div>
                <p style="color: #666; margin: 0 0 20px;">Log in to your portal to see the full progress: <a href="https://storageads.com/portal" style="color: #16a34a;">storageads.com/portal</a></p>
                <p style="color: #999; font-size: 12px; margin-top: 24px;">StorageAds by StorageAds.com</p>
              </div>`,
          }),
        }).catch((err) => console.error("[email] Fire-and-forget failed:", err));
      }
    }

    // Log activity (fire-and-forget)
    db.activity_log
      .create({
        data: {
          type: "onboarding_step",
          detail: `${completed !== false ? "Completed" : "Unchecked"}: ${validStep.label} for client ${clientId}`,
        },
      })
      .catch((err) => console.error("[activity_log] Fire-and-forget failed:", err));

    const checklist = steps.checklist;
    const result = buildStepsResult(checklist, true);
    return jsonResponse({ success: true, ...result }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
