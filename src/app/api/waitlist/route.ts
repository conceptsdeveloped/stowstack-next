import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { corsResponse, errorResponse, getOrigin, jsonResponse } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { normalisePhone } from "@/lib/messaging/types";
import { isOptedOut } from "@/lib/messaging/send";
import { availabilityFor } from "@/lib/respond/hold";

/**
 * Join the sold-out waitlist (RESPOND r9 / CONVERT c6).
 *
 * The capture half of the waitlist. Public and unauthenticated by design — it
 * sits on a landing page next to a size that has no availability, which is
 * exactly the moment somebody is willing to leave a number.
 */
export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC_WRITE, "waitlist");
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
  const sizeLabel = typeof body.sizeLabel === "string" && body.sizeLabel.trim() ? body.sizeLabel.trim() : null;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : null;
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : null;

  if (!facilityId || !/^[0-9a-f-]{36}$/i.test(facilityId)) {
    return errorResponse("A valid facilityId is required", 400, origin);
  }
  if (!phone) {
    return errorResponse("A valid phone number is required", 400, origin);
  }

  try {
    const facility = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM facilities WHERE id = ${facilityId}::uuid`;
    if (facility.length === 0) return errorResponse("Unknown facility", 404, origin);

    // Somebody who has opted out of texts should not be added to a list whose
    // only purpose is to text them. Accepted quietly rather than erroring —
    // explaining their own opt-out back to them helps nobody.
    if (await isOptedOut(phone)) {
      return jsonResponse({ joined: false, reason: "opted-out" }, 200, origin);
    }

    // Re-submitting the same number for the same size is the same request, not
    // a second place in the queue.
    const existing = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM unit_waitlist
      WHERE facility_id = ${facilityId}::uuid AND contact_phone = ${phone}
        AND (size_label IS NOT DISTINCT FROM ${sizeLabel})
        AND status IN ('waiting', 'notified')
      LIMIT 1`;
    if (existing.length > 0) {
      return jsonResponse({ joined: true, id: existing[0].id, alreadyOnList: true }, 200, origin);
    }

    const rows = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO unit_waitlist (facility_id, size_label, contact_name, contact_phone, contact_email, source)
      VALUES (${facilityId}::uuid, ${sizeLabel}, ${name}, ${phone}, ${email}, 'web')
      RETURNING id`;

    // Useful, and honest: if the size is actually available right now they
    // should be told to just book it rather than wait for a text that may
    // never come.
    const avail = await availabilityFor(facilityId, sizeLabel);

    return jsonResponse(
      { joined: true, id: rows[0].id, availableNow: avail.available > 0 },
      201,
      origin
    );
  } catch (error) {
    console.error("[waitlist] failed:", error);
    return errorResponse("Could not join the waitlist", 500, origin);
  }
}
