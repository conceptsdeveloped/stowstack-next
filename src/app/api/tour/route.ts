import { NextRequest } from "next/server";
import { corsResponse, errorResponse, getOrigin, jsonResponse, requireAdminKey } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { normalisePhone } from "@/lib/messaging/types";
import { asLanguage } from "@/lib/messaging/copy";
import { setLanguage } from "@/lib/messaging/language";
import { bookTour, cancelTour, completeTour } from "@/lib/respond/tour";

/**
 * Book a facility tour (MISSION.md RESPOND r6).
 *
 * Public and unauthenticated by design, like the waitlist: it sits on a landing
 * page and the whole point is that somebody can commit to a time without an
 * account. A booking is a promise to turn up, so `bookTour` confirms it by text
 * on the way out — a booking with no confirmation is how a no-show starts.
 *
 * Rescheduling is the same call: a second booking for the same number at the
 * same facility moves the existing tour rather than creating a second one.
 */
export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/** Why a time was refused, in words a landing page can show somebody. */
const REFUSALS: Record<string, string> = {
  past: "That time has already passed. Please pick a later one.",
  "too-far": "That is too far ahead to book. Please pick a date within the next two months.",
  "outside-hours": "We are not open then. Please pick a time between 7am and 8pm.",
  invalid: "That date could not be read. Please pick a time again.",
  "no-number": "A valid phone number is required.",
  "unknown-facility": "Unknown facility.",
};

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_WRITE, "tour");
  if (limited) return limited;
  const origin = getOrigin(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const facilityId = typeof body.facilityId === "string" ? body.facilityId : null;
  const phone = normalisePhone(typeof body.phone === "string" ? body.phone : null);
  const rawWhen = typeof body.scheduledAt === "string" ? body.scheduledAt : null;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : null;
  const sizeLabel =
    typeof body.sizeLabel === "string" && body.sizeLabel.trim() ? body.sizeLabel.trim().slice(0, 32) : null;
  const leadId = typeof body.leadId === "string" && /^[0-9a-f-]{36}$/i.test(body.leadId) ? body.leadId : null;
  // Only recorded when the page actually states one — an unstated "en" written
  // as a deliberate choice would block us ever learning Spanish from a reply.
  const stated = typeof body.language === "string" && body.language.trim() ? asLanguage(body.language) : null;

  if (!facilityId || !/^[0-9a-f-]{36}$/i.test(facilityId)) {
    return errorResponse("A valid facilityId is required", 400, origin);
  }
  if (!phone) return errorResponse("A valid phone number is required", 400, origin);
  if (!rawWhen) return errorResponse("scheduledAt is required", 400, origin);

  const scheduledAt = new Date(rawWhen);
  if (Number.isNaN(scheduledAt.getTime())) {
    return errorResponse("scheduledAt must be an ISO date-time", 400, origin);
  }

  try {
    // Before the booking, so the confirmation text goes out in their language.
    if (stated) await setLanguage(phone, stated, "form");

    const res = await bookTour({
      facilityId, phone, scheduledAt, name, sizeLabel, leadId, source: "web",
    });

    if (!res.booked) {
      const message = REFUSALS[res.reason ?? ""] ?? "That time could not be booked.";
      // 409, not 400: the request was well-formed, the slot was not acceptable.
      return jsonResponse(
        { booked: false, reason: res.reason, message },
        res.reason === "unknown-facility" ? 404 : 409,
        origin
      );
    }

    return jsonResponse(
      {
        booked: true,
        id: res.id,
        rescheduled: res.rescheduled,
        confirmationSent: res.confirmSent,
      },
      res.rescheduled ? 200 : 201,
      origin
    );
  } catch (error) {
    console.error("[tour] failed:", error);
    return errorResponse("Could not book the tour", 500, origin);
  }
}

/**
 * Operator actions: mark a tour attended or cancel it.
 *
 * Admin-gated, unlike the POST — this is the operator's side of the desk.
 * Completing a tour also moves its lead to `toured`, which is the status the
 * pipeline already had a name for and nothing ever set.
 */
export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "tour");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authError = await requireAdminKey(req);
  if (authError) return authError;

  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return errorResponse("A valid tour id is required", 400, origin);
  }

  let action: unknown;
  try {
    action = (await req.json())?.action;
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  try {
    if (action === "complete") {
      const ok = await completeTour(id);
      return ok
        ? jsonResponse({ ok: true, status: "completed" }, 200, origin)
        : errorResponse("That tour is not in a state that can be completed", 409, origin);
    }
    if (action === "cancel") {
      const ok = await cancelTour(id);
      return ok
        ? jsonResponse({ ok: true, status: "cancelled" }, 200, origin)
        : errorResponse("That tour is not live, so there is nothing to cancel", 409, origin);
    }
    return errorResponse("action must be 'complete' or 'cancel'", 400, origin);
  } catch (error) {
    console.error("[tour] patch failed:", error);
    return errorResponse("Could not update the tour", 500, origin);
  }
}
