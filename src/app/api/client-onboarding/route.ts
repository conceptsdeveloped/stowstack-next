import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";

const VALID_STEPS = [
  "facilityDetails",
  "targetDemographics",
  "unitMix",
  "competitorIntel",
  "adPreferences",
];

interface StepData {
  [key: string]: unknown;
}

interface OnboardingSteps {
  [step: string]: { completed: boolean; data: StepData };
}

function emptyScaffold(code: string) {
  return {
    accessCode: code,
    updatedAt: new Date().toISOString(),
    completedAt: null,
    steps: {
      facilityDetails: {
        completed: false,
        data: { brandDescription: "", brandColors: "", sellingPoints: [] },
      },
      targetDemographics: {
        completed: false,
        data: {
          ageMin: 25,
          ageMax: 65,
          radiusMiles: 15,
          incomeLevel: "any",
          targetRenters: true,
          targetOwners: true,
          notes: "",
        },
      },
      unitMix: { completed: false, data: { units: [], specials: "" } },
      competitorIntel: {
        completed: false,
        data: { competitors: [], differentiation: "" },
      },
      adPreferences: {
        completed: false,
        data: {
          toneOfVoice: "",
          pastAdExperience: "",
          monthlyBudget: "",
          primaryGoal: "",
          notes: "",
        },
      },
    },
  };
}

function clampStr(val: unknown, max: number): string {
  if (typeof val !== "string") return "";
  return val.slice(0, max);
}

function clampNum(val: unknown, min: number, max: number): number {
  const n = Number(val);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function isStepComplete(step: string, data: StepData): boolean {
  switch (step) {
    case "facilityDetails":
      return !!(
        data.brandDescription &&
        data.brandColors &&
        data.sellingPoints &&
        Array.isArray(data.sellingPoints) &&
        data.sellingPoints.length > 0 &&
        data.sellingPoints.some((s: unknown) => typeof s === "string" && s.trim())
      );
    case "targetDemographics":
      return !!(data.ageMin && data.ageMax && data.radiusMiles && data.incomeLevel);
    case "unitMix":
      return !!(
        data.units &&
        Array.isArray(data.units) &&
        data.units.length > 0 &&
        data.units.every(
          (u: Record<string, unknown>) =>
            u.type && u.size && Number(u.monthlyRate) > 0
        )
      );
    case "competitorIntel":
      return !!data.differentiation;
    case "adPreferences":
      return !!(data.toneOfVoice && data.monthlyBudget && data.primaryGoal);
    default:
      return false;
  }
}

function sanitizeStepData(step: string, data: StepData): StepData {
  switch (step) {
    case "facilityDetails":
      return {
        brandDescription: clampStr(data.brandDescription, 500),
        brandColors: clampStr(data.brandColors, 100),
        sellingPoints: (Array.isArray(data.sellingPoints) ? data.sellingPoints : [])
          .slice(0, 5)
          .map((s: unknown) => clampStr(s, 200)),
      };
    case "targetDemographics":
      return {
        ageMin: clampNum(data.ageMin, 18, 99),
        ageMax: clampNum(data.ageMax, 18, 99),
        radiusMiles: clampNum(data.radiusMiles, 1, 100),
        incomeLevel: ["any", "low-mid", "mid-high", "high"].includes(
          data.incomeLevel as string
        )
          ? data.incomeLevel
          : "any",
        targetRenters: data.targetRenters !== false,
        targetOwners: data.targetOwners !== false,
        notes: clampStr(data.notes, 1000),
      };
    case "unitMix":
      return {
        units: (Array.isArray(data.units) ? data.units : [])
          .slice(0, 10)
          .map((u: Record<string, unknown>) => ({
            type: clampStr(u.type, 100),
            size: clampStr(u.size, 50),
            monthlyRate: Math.max(0, Number(u.monthlyRate) || 0),
            availableCount: Math.max(
              0,
              Math.round(Number(u.availableCount) || 0)
            ),
          })),
        specials: clampStr(data.specials, 500),
      };
    case "competitorIntel":
      return {
        competitors: (Array.isArray(data.competitors) ? data.competitors : [])
          .slice(0, 5)
          .map((c: Record<string, unknown>) => ({
            name: clampStr(c.name, 100),
            distance: clampStr(c.distance, 50),
            pricingNotes: clampStr(c.pricingNotes, 200),
          })),
        differentiation: clampStr(data.differentiation, 500),
      };
    case "adPreferences":
      return {
        toneOfVoice: [
          "professional",
          "friendly",
          "urgent",
          "premium",
        ].includes(data.toneOfVoice as string)
          ? data.toneOfVoice
          : "",
        pastAdExperience: clampStr(data.pastAdExperience, 1000),
        monthlyBudget: [
          "under-1k",
          "1k-2.5k",
          "2.5k-5k",
          "5k-10k",
          "10k+",
        ].includes(data.monthlyBudget as string)
          ? data.monthlyBudget
          : "",
        primaryGoal: [
          "fill-units",
          "lease-up",
          "seasonal-push",
          "rebrand",
        ].includes(data.primaryGoal as string)
          ? data.primaryGoal
          : "",
        notes: clampStr(data.notes, 1000),
      };
    default:
      return {};
  }
}

function computeCompletion(steps: OnboardingSteps): number {
  const completed = VALID_STEPS.filter((s) => steps[s]?.completed).length;
  return Math.round((completed / VALID_STEPS.length) * 100);
}

async function verifyClientAuth(
  code: string,
  email: string
): Promise<boolean> {
  if (!code || !email) return false;
  const client = await db.clients.findUnique({
    where: { access_code: code },
    select: { email: true },
  });
  if (!client) return false;
  return client.email.toLowerCase() === email.trim().toLowerCase();
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const isAdmin = isAdminRequest(req);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return errorResponse("Missing access code", 400, origin);
  }

  if (!isAdmin) {
    const email = url.searchParams.get("email");
    const valid = await verifyClientAuth(code, email || "");
    if (!valid) return errorResponse("Unauthorized", 401, origin);
  }

  try {
    const row = await db.client_onboarding.findFirst({
      where: { access_code: code },
    });

    if (!row) {
      const scaffold = emptyScaffold(code);
      return jsonResponse(
        { onboarding: scaffold, completionPct: 0 },
        200,
        origin
      );
    }

    const onboarding = {
      accessCode: row.access_code,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      steps: (row.steps as OnboardingSteps) || {},
    };

    return jsonResponse(
      { onboarding, completionPct: computeCompletion(onboarding.steps) },
      200,
      origin
    );
  } catch {
    return errorResponse("Failed to get onboarding data", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  const isAdmin = isAdminRequest(req);

  try {
    const body = await req.json();
    const { code, step, data, email } = body || {};

    if (!code || !step || !data) {
      return errorResponse("Missing code, step, or data", 400, origin);
    }
    if (!VALID_STEPS.includes(step)) {
      return errorResponse("Invalid step", 400, origin);
    }

    if (!isAdmin) {
      const valid = await verifyClientAuth(code, email || "");
      if (!valid) return errorResponse("Unauthorized", 401, origin);
    }

    let row = await db.client_onboarding.findFirst({
      where: { access_code: code },
    });

    if (!row) {
      const client = await db.clients.findUnique({
        where: { access_code: code },
        select: { id: true },
      });
      if (!client) {
        return errorResponse("Client not found", 404, origin);
      }

      const scaffold = emptyScaffold(code);
      row = await db.client_onboarding.create({
        data: {
          client_id: client.id,
          access_code: code,
          steps: scaffold.steps,
        },
      });
    }

    const steps = (row.steps as OnboardingSteps) || {};
    const sanitized = sanitizeStepData(step, data);
    steps[step] = {
      completed: isStepComplete(step, sanitized),
      data: sanitized,
    };

    const allDone = VALID_STEPS.every((s) => steps[s]?.completed);
    const completedAt = allDone ? new Date() : null;

    await db.client_onboarding.update({
      where: { id: row.id },
      data: {
        steps: steps as any,
        completed_at: completedAt,
        updated_at: new Date(),
      },
    });

    const onboarding = {
      accessCode: code,
      updatedAt: new Date().toISOString(),
      completedAt: completedAt?.toISOString() || null,
      steps,
    };

    return jsonResponse(
      {
        success: true,
        onboarding,
        completionPct: computeCompletion(steps),
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Failed to save onboarding data", 500, origin);
  }
}
