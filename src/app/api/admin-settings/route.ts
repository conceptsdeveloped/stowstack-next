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

const DEFAULTS: Record<string, unknown> = {
  companyName: "StorageAds",
  companyEmail: "anna@storageads.com",
  companyPhone: "",
  notifyNewLeads: true,
  notifyOverdue: true,
  notifyMessages: true,
  notifyAlerts: true,
  emailSignature: "",
  defaultFollowUpDays: 3,
  theme: "light",
};

function validateSettings(updates: Record<string, unknown>) {
  const errors: string[] = [];
  const valid: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (!(key in DEFAULTS)) continue;

    switch (key) {
      case "companyName":
      case "companyEmail":
      case "companyPhone":
      case "emailSignature":
        if (typeof value !== "string") {
          errors.push(`${key} must be a string`);
        } else {
          valid[key] = value;
        }
        break;

      case "notifyNewLeads":
      case "notifyOverdue":
      case "notifyMessages":
      case "notifyAlerts":
        if (typeof value !== "boolean") {
          errors.push(`${key} must be a boolean`);
        } else {
          valid[key] = value;
        }
        break;

      case "defaultFollowUpDays":
        if (
          typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < 1
        ) {
          errors.push(`${key} must be a positive integer`);
        } else {
          valid[key] = value;
        }
        break;

      case "theme":
        if (value !== "light" && value !== "dark") {
          errors.push(`${key} must be 'light' or 'dark'`);
        } else {
          valid[key] = value;
        }
        break;
    }
  }

  return { valid, errors };
}

let getRedis: (() => {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: string) => Promise<unknown>;
}) | null = null;

async function loadRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN)
    return null;
  if (!getRedis) {
    const { Redis } = await import("@upstash/redis");
    getRedis = () =>
      new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
      });
  }
  return getRedis();
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "admin-settings");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const redis = await loadRedis();
    if (!redis) {
      return jsonResponse({ settings: { ...DEFAULTS } }, 200, origin);
    }

    const raw = await redis.get("admin:settings");
    const stored = raw
      ? typeof raw === "string"
        ? JSON.parse(raw)
        : raw
      : {};
    const settings = { ...DEFAULTS, ...stored };
    return jsonResponse({ settings }, 200, origin);
  } catch {
    // Fall back to defaults if Redis is unavailable
    return jsonResponse({ settings: { ...DEFAULTS } }, 200, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "admin-settings");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const redis = await loadRedis();
    if (!redis) {
      return jsonResponse({ success: true, settings: { ...DEFAULTS } }, 200, origin);
    }
    const updates = (await req.json()) || {};
    if (!Object.keys(updates).length) {
      return errorResponse("No updates provided", 400, origin);
    }

    const { valid, errors } = validateSettings(updates);
    if (errors.length) {
      return jsonResponse(
        { error: "Validation failed", details: errors },
        400,
        origin
      );
    }
    if (!Object.keys(valid).length) {
      return errorResponse("No valid fields to update", 400, origin);
    }

    const raw = await redis.get("admin:settings");
    const stored = raw
      ? typeof raw === "string"
        ? JSON.parse(raw)
        : raw
      : {};
    const merged = { ...DEFAULTS, ...stored, ...valid };
    await redis.set("admin:settings", JSON.stringify(merged));
    return jsonResponse({ success: true, settings: merged }, 200, origin);
  } catch {
    return errorResponse("Failed to save settings", 500, origin);
  }
}
