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

interface EmailPreferences {
  payment_failed?: boolean;
  trial_ending?: boolean;
  ab_test_winner?: boolean;
  campaign_alert?: boolean;
  weekly_report?: boolean;
  team_changes?: boolean;
  product_updates?: boolean;
}

const VALID_KEYS: ReadonlySet<string> = new Set([
  "payment_failed",
  "trial_ending",
  "ab_test_winner",
  "campaign_alert",
  "weekly_report",
  "team_changes",
  "product_updates",
]);

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  try {
    const user = await db.org_users.findUnique({
      where: { id: session.user.id },
      select: { email_preferences: true },
    });

    const preferences = (user?.email_preferences ?? {}) as EmailPreferences;

    return jsonResponse({ preferences }, 200, origin);
  } catch (err) {
    console.error("Notification preferences GET error:", err);
    return errorResponse("Failed to fetch preferences", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = (await req.json()) as Record<string, unknown>;

    // Validate keys and values
    const updates: Partial<EmailPreferences> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!VALID_KEYS.has(key)) {
        return errorResponse(`Invalid preference key: ${key}`, 400, origin);
      }
      if (typeof value !== "boolean") {
        return errorResponse(
          `Preference '${key}' must be a boolean`,
          400,
          origin
        );
      }
      (updates as Record<string, boolean>)[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse("No valid preferences provided", 400, origin);
    }

    // Fetch current preferences, merge, then save
    const current = await db.org_users.findUnique({
      where: { id: session.user.id },
      select: { email_preferences: true },
    });

    const merged = {
      ...((current?.email_preferences as EmailPreferences | null) ?? {}),
      ...updates,
    };

    await db.org_users.update({
      where: { id: session.user.id },
      data: { email_preferences: merged },
    });

    return jsonResponse({ preferences: merged }, 200, origin);
  } catch (err) {
    console.error("Notification preferences PATCH error:", err);
    return errorResponse("Failed to update preferences", 500, origin);
  }
}
