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
  country?: string;
  fbc?: string;
  fbp?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

function normalizeUserData(
  userData: UserData | null
): Record<string, string | undefined> {
  if (!userData || typeof userData !== "object") return {};
  const hashed: Record<string, string | undefined> = {};

  if (userData.email) hashed.em = hashSHA256(userData.email);
  if (userData.phone) {
    const phoneDigits = userData.phone.replace(/\D/g, "");
    if (phoneDigits) hashed.ph = hashSHA256(phoneDigits);
  }
  if (userData.firstName) hashed.fn = hashSHA256(userData.firstName);
  if (userData.lastName) hashed.ln = hashSHA256(userData.lastName);
  if (userData.city) hashed.ct = hashSHA256(userData.city);
  if (userData.state) hashed.st = hashSHA256(userData.state);
  if (userData.zip) hashed.zp = hashSHA256(userData.zip);
  if (userData.country) hashed.country = hashSHA256(userData.country);

  return hashed;
}

function mapEventName(storageAdsEvent: string): string {
  const eventMap: Record<string, string> = {
    PageView: "PageView",
    Lead: "Lead",
    InitiateCheckout: "InitiateCheckout",
    reservation_started: "InitiateCheckout",
    Purchase: "Purchase",
    move_in_completed: "Purchase",
    ViewContent: "ViewContent",
    unit_selected: "ViewContent",
  };
  return eventMap[storageAdsEvent] || storageAdsEvent;
}

interface CustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_type?: string;
  content_id?: string;
  num_items?: number;
}

interface EventBody {
  event_name?: string;
  event_time?: number;
  event_id?: string;
  event_source_url?: string;
  action_source?: string;
  user_data?: UserData;
  custom_data?: CustomData;
}

function buildCAPIEvent(
  data: EventBody & {
    client_ip_address?: string;
    user_agent?: string;
  }
): Record<string, unknown> {
  const event: Record<string, unknown> = {
    event_name: mapEventName(data.event_name || ""),
    event_time: data.event_time,
  };

  if (data.event_id) {
    event.event_id = data.event_id;
  }

  if (data.event_source_url) {
    event.event_source_url = data.event_source_url;
  }

  event.action_source = data.action_source || "website";

  if (data.user_data) {
    const userData: Record<string, unknown> = normalizeUserData(
      data.user_data
    );
    if (data.client_ip_address) {
      userData.client_ip_address = data.client_ip_address;
    }
    if (data.user_agent) {
      userData.client_user_agent = data.user_agent;
    }
    event.user_data = userData;
  }

  if (data.custom_data && typeof data.custom_data === "object") {
    const customData: Record<string, unknown> = {};
    if (data.custom_data.value !== undefined)
      customData.value = data.custom_data.value;
    if (data.custom_data.currency)
      customData.currency = data.custom_data.currency;
    if (data.custom_data.content_name)
      customData.content_name = data.custom_data.content_name;
    if (data.custom_data.content_category)
      customData.content_category = data.custom_data.content_category;
    if (data.custom_data.content_type)
      customData.content_type = data.custom_data.content_type;
    if (data.custom_data.content_id)
      customData.content_id = data.custom_data.content_id;
    if (data.custom_data.num_items !== undefined)
      customData.num_items = data.custom_data.num_items;
    event.custom_data = customData;
  }

  return event;
}

async function sendToMetaCAPI(
  event: Record<string, unknown>,
  pixelId: string,
  accessToken: string
) {
  const url = `https://graph.facebook.com/v19.0/${pixelId}/events`;
  const payload = {
    data: [event],
    access_token: accessToken,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Meta CAPI error (${response.status}): ${errorBody}`
    );
  }

  return response.json();
}

function validateEventData(
  body: EventBody
): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (!body.event_name || typeof body.event_name !== "string") {
    errors.event_name = "event_name is required";
  }
  if (!body.event_time || typeof body.event_time !== "number") {
    errors.event_time = "event_time (Unix timestamp) is required";
  }
  if (!body.user_data || typeof body.user_data !== "object") {
    errors.user_data = "user_data object is required";
  }
  if (body.user_data) {
    const hasPII =
      body.user_data.email ||
      body.user_data.phone ||
      body.user_data.firstName ||
      body.user_data.lastName;
    const hasTechnicalIds =
      body.user_data.fbc ||
      body.user_data.fbp ||
      body.user_data.client_user_agent ||
      body.user_data.client_ip_address;
    // PageView events can fire with only technical identifiers (fbc/fbp/user_agent)
    // Conversion events require at least one PII field
    if (!hasPII && !hasTechnicalIds) {
      errors.user_data =
        "user_data must contain at least one identifier (email, phone, fbc, fbp, or user_agent)";
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body: EventBody = await req.json();

    const validationErrors = validateEventData(body);
    if (validationErrors) {
      return jsonResponse(
        { error: "Validation failed", details: validationErrors },
        400,
        origin
      );
    }

    const pixelId = process.env.META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
      return errorResponse(
        "Server not configured for Meta CAPI",
        500,
        origin
      );
    }

    const capiEvent = buildCAPIEvent({
      ...body,
      client_ip_address:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });

    const metaResponse = await sendToMetaCAPI(
      capiEvent,
      pixelId,
      accessToken
    );

    return jsonResponse(
      {
        success: true,
        event_id: body.event_id,
        meta_response: metaResponse,
      },
      200,
      origin
    );
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Failed to send event to Meta",
      500,
      origin
    );
  }
}
