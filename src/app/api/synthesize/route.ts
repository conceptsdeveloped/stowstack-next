import { NextRequest } from "next/server";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { synthesizeManual, synthesizeStyleReference, synthesizeCampaignResult } from "@/lib/synthesis";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 120;

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "synthesize");
  if (limited) return limited;

  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { type, data, targetDoc, analysis, title, facilityContext, metrics } = body;

    let results;

    switch (type) {
      case "style_reference":
        if (!analysis) return errorResponse("analysis required for style_reference type", 400, origin);
        results = await synthesizeStyleReference(analysis, title);
        break;

      case "campaign_result":
        if (!facilityContext || !metrics) return errorResponse("facilityContext and metrics required", 400, origin);
        results = await synthesizeCampaignResult(facilityContext, metrics);
        break;

      case "manual":
        if (!data || !targetDoc) return errorResponse("data and targetDoc required for manual type", 400, origin);
        results = await synthesizeManual(data, targetDoc);
        break;

      default:
        return errorResponse(`Unknown synthesis type: ${type}`, 400, origin);
    }

    return jsonResponse({ results }, 200, origin);
  } catch (err) {
    return errorResponse(
      (err as Error).message || "Synthesis failed",
      500,
      origin,
    );
  }
}
