import crypto from "crypto";
import { NextRequest } from "next/server";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";

function hashSHA256(value: string): string | undefined {
  if (!value) return undefined;
  return crypto
    .createHash("sha256")
    .update(value.toLowerCase().trim())
    .digest("hex");
}

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  postalCode?: string;
  country?: string;
}

function normalizeUserData(
  userData: UserData | null
): Record<string, string[] | undefined> {
  if (!userData || typeof userData !== "object") return {};
  const hashed: Record<string, string[] | undefined> = {};

  if (userData.email) {
    hashed.email = [hashSHA256(userData.email)].filter(
      (v): v is string => !!v
    );
  }
  if (userData.phone) {
    const phoneDigits = userData.phone.replace(/\D/g, "");
    if (phoneDigits) {
      hashed.phone = [hashSHA256(phoneDigits)].filter(
        (v): v is string => !!v
      );
    }
  }
  if (userData.firstName) {
    hashed.firstName = [hashSHA256(userData.firstName)].filter(
      (v): v is string => !!v
    );
  }
  if (userData.lastName) {
    hashed.lastName = [hashSHA256(userData.lastName)].filter(
      (v): v is string => !!v
    );
  }
  if (userData.city) {
    hashed.city = [hashSHA256(userData.city)].filter(
      (v): v is string => !!v
    );
  }
  if (userData.state) {
    hashed.state = [hashSHA256(userData.state)].filter(
      (v): v is string => !!v
    );
  }
  if (userData.zip || userData.postalCode) {
    const zip = userData.zip || userData.postalCode || "";
    hashed.postalCode = [hashSHA256(zip)].filter(
      (v): v is string => !!v
    );
  }
  if (userData.country) {
    hashed.country = [hashSHA256(userData.country)].filter(
      (v): v is string => !!v
    );
  }
  return hashed;
}

function mapEventName(storageAdsEvent: string): string {
  const eventMap: Record<string, string> = {
    Lead: "lead",
    lead_captured: "lead",
    InitiateCheckout: "initiate_checkout",
    reservation_started: "initiate_checkout",
    Purchase: "purchase",
    move_in_completed: "purchase",
  };
  return eventMap[storageAdsEvent] || storageAdsEvent.toLowerCase();
}

interface ConversionBody {
  event_name?: string;
  event_time?: number;
  user_data?: UserData;
  gclid?: string;
  fbclid?: string;
  conversion_value?: number;
  conversion_currency?: string;
  custom_data?: Record<string, unknown>;
}

function validateConversionData(
  body: ConversionBody
): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (!body.event_name || typeof body.event_name !== "string") {
    errors.event_name = "event_name is required";
  }
  if (body.event_time && typeof body.event_time !== "number") {
    errors.event_time = "event_time must be a Unix timestamp";
  }
  if (!body.user_data || typeof body.user_data !== "object") {
    errors.user_data = "user_data object is required";
  }
  if (body.user_data) {
    const hasIdentifier = body.user_data.email || body.user_data.phone;
    if (!hasIdentifier) {
      errors.user_data =
        "user_data must contain email or phone for matching";
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

function buildConversionPayload(data: ConversionBody & { conversionId?: string; conversionLabel?: string }) {
  return {
    eventName: mapEventName(data.event_name || ""),
    eventTime: data.event_time || Math.floor(Date.now() / 1000),
    userData: normalizeUserData(data.user_data || null),
    gclid: data.gclid || "",
    fbclid: data.fbclid || "",
    conversionValue: data.conversion_value || 0,
    conversionCurrency: data.conversion_currency || "USD",
    customData: data.custom_data || {},
    conversionId: data.conversionId,
    conversionLabel: data.conversionLabel,
  };
}

async function sendViaConversionAPI(
  conversionPayload: ReturnType<typeof buildConversionPayload>
) {
  const conversionPixelUrl = `https://www.googleadservices.com/pagead/conversion/${conversionPayload.conversionId}/?`;

  const params = new URLSearchParams({
    label: conversionPayload.conversionLabel || "",
    value: String(conversionPayload.conversionValue || "0"),
    currency: conversionPayload.conversionCurrency || "USD",
    gclid: conversionPayload.gclid || "",
  });

  const response = await fetch(conversionPixelUrl + params.toString(), {
    method: "GET",
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  return {
    status: response.status,
    success: response.ok,
  };
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body: ConversionBody = await req.json();

    const validationErrors = validateConversionData(body);
    if (validationErrors) {
      return jsonResponse(
        { error: "Validation failed", details: validationErrors },
        400,
        origin
      );
    }

    const conversionId = process.env.GOOGLE_CONVERSION_ID;
    const conversionLabel = process.env.GOOGLE_CONVERSION_LABEL;

    if (!conversionId || !conversionLabel) {
      return errorResponse(
        "Server not configured for Google conversions",
        500,
        origin
      );
    }

    const conversionPayload = buildConversionPayload({
      ...body,
      conversionId,
      conversionLabel,
    });

    const googleResponse = await sendViaConversionAPI(conversionPayload);

    return jsonResponse(
      {
        success: true,
        event_name: body.event_name,
        conversion_id: conversionId,
        google_response: googleResponse,
      },
      200,
      origin
    );
  } catch (err: unknown) {
    console.error("Google conversion error:", err instanceof Error ? err.message : err);
    return errorResponse(
      "Failed to send conversion to Google",
      500,
      origin
    );
  }
}
