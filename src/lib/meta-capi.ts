import crypto from "crypto";

/**
 * Server-side Meta Conversions API firer. Use for backend-initiated
 * conversion events (lead captures, status changes) where we don't have
 * a browser to fire the pixel. For browser-fired events see
 * /api/meta-capi which validates + forwards.
 */

type UserData = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
};

type CustomData = {
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
};

type FireArgs = {
  eventName: "Lead" | "InitiateCheckout" | "Purchase" | "ViewContent" | "PageView";
  eventSourceUrl?: string;
  eventId?: string;
  userData: UserData;
  customData?: CustomData;
};

function sha256Lower(value: string): string {
  return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

function hashUserData(ud: UserData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (ud.email) out.em = sha256Lower(ud.email);
  if (ud.phone) {
    const digits = ud.phone.replace(/\D/g, "");
    if (digits) out.ph = sha256Lower(digits);
  }
  if (ud.firstName) out.fn = sha256Lower(ud.firstName);
  if (ud.lastName) out.ln = sha256Lower(ud.lastName);
  if (ud.city) out.ct = sha256Lower(ud.city);
  if (ud.state) out.st = sha256Lower(ud.state);
  if (ud.zip) out.zp = sha256Lower(ud.zip);
  if (ud.country) out.country = sha256Lower(ud.country);
  if (ud.fbc) out.fbc = ud.fbc;
  if (ud.fbp) out.fbp = ud.fbp;
  if (ud.clientIpAddress) out.client_ip_address = ud.clientIpAddress;
  if (ud.clientUserAgent) out.client_user_agent = ud.clientUserAgent;
  return out;
}

/**
 * Fire a server-side Meta CAPI event. Returns true on success.
 * No-op when META_PIXEL_ID or META_ACCESS_TOKEN aren't configured —
 * intentional so dev environments don't fail lead capture.
 */
export async function fireMetaCapi(args: FireArgs): Promise<boolean> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return false;

  const event: Record<string, unknown> = {
    event_name: args.eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: hashUserData(args.userData),
  };
  if (args.eventId) event.event_id = args.eventId;
  if (args.eventSourceUrl) event.event_source_url = args.eventSourceUrl;

  if (args.customData) {
    const cd: Record<string, unknown> = {};
    if (args.customData.value !== undefined) cd.value = args.customData.value;
    if (args.customData.currency) cd.currency = args.customData.currency;
    if (args.customData.contentName) cd.content_name = args.customData.contentName;
    if (args.customData.contentCategory) cd.content_category = args.customData.contentCategory;
    if (Object.keys(cd).length) event.custom_data = cd;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event], access_token: accessToken }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[meta-capi] server fire failed:", res.status, body.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[meta-capi] server fire error:", err instanceof Error ? err.message : err);
    return false;
  }
}
