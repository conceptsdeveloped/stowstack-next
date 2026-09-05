import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { noteLanguageFromReply } from "@/lib/messaging/language";
import { classifyInbound, replies } from "@/lib/messaging/inbound";
import { normalisePhone } from "@/lib/messaging/types";
import { optIn, optOut } from "@/lib/messaging/send";
import { HOLD_MINUTES, placeHold } from "@/lib/respond/hold";

/**
 * Inbound SMS (MISSION.md s5 + RESPOND r9).
 *
 * Makes our own copy true. Every waitlist text says "Reply YES to hold it, STOP
 * to opt out" — this is what honours both.
 *
 * Replies are returned as TwiML rather than sent through the outbound path on
 * purpose: a STOP confirmation must go out even though the number is, by then,
 * opted out. Routing it through `sendMessage` would correctly refuse to send it.
 */
export const dynamic = "force-dynamic";

function twiml(message?: string): NextResponse {
  const r = new twilio.twiml.MessagingResponse();
  if (message) r.message(message);
  return new NextResponse(r.toString(), { status: 200, headers: { "Content-Type": "text/xml" } });
}

function parseForm(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  new URLSearchParams(text).forEach((v, k) => { out[k] = v; });
  return out;
}

/**
 * Twilio signs the full URL plus the sorted body params. Without this anybody
 * who knows the endpoint could opt arbitrary numbers in or out, or take holds.
 */
function verifySignature(req: NextRequest, rawBody: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return process.env.VERCEL_ENV !== "production";
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;
  const url = new URL(req.url);
  const fullUrl = `${process.env.NEXT_PUBLIC_SITE_URL || `https://${url.host}`}${url.pathname}${url.search}`;
  return twilio.validateRequest(authToken, signature, fullUrl, parseForm(rawBody));
}

export async function POST(req: NextRequest) {
  // The Twilio signature is the real gate; this is only a DoS guard. The
  // PUBLIC_WRITE tier (10/min) would drop legitimate inbound from a busy
  // facility, so a signed webhook gets the standard authenticated allowance.
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "sms-webhook");
  if (limited) return limited;

  const rawBody = await req.text();
  if (!verifySignature(req, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const params = parseForm(rawBody);
  const from = normalisePhone(params.From);
  const body = params.Body ?? "";
  if (!from) return twiml();

  const intent = classifyInbound(body);

  // Log every inbound message before acting: the record of what somebody sent
  // is the evidence for why we then stopped texting them.
  await db.$executeRaw`
    INSERT INTO message_log (channel, direction, to_number, from_number, body, status, provider, provider_id, dedupe_key, sent_at)
    VALUES ('sms', 'inbound', ${process.env.TWILIO_FROM_NUMBER ?? "unknown"}, ${from}, ${body},
            'sent', 'twilio', ${params.MessageSid ?? null},
            ${`in:${params.MessageSid ?? `${from}:${Date.now()}`}`}, now())
    ON CONFLICT ON CONSTRAINT message_log_dedupe_key DO NOTHING
  `;

  // Learn the language before answering, so the answer is in it. Best-effort by
  // construction: `noteLanguageFromReply` swallows its own failures and falls
  // back to English, because failing to record a language must never stop us
  // honouring a STOP.
  const R = replies(await noteLanguageFromReply(from, body));

  try {
    if (intent === "stop") {
      await optOut(from, "stop_reply", "sms-webhook");
      // Also stop chasing them on any list they are on.
      await db.$executeRaw`
        UPDATE unit_waitlist SET status = 'cancelled', updated_at = now()
        WHERE contact_phone = ${from} AND status IN ('waiting', 'notified')
      `;
      return twiml(R.stop);
    }

    if (intent === "start") {
      await optIn(from);
      return twiml(R.start);
    }

    if (intent === "help") return twiml(R.help);

    if (intent === "confirm") {
      // The most recent notification is what they are saying yes to.
      const rows = await db.$queryRaw<{ id: string; facility_id: string; size_label: string | null; contact_name: string | null }[]>`
        SELECT id, facility_id, size_label, contact_name FROM unit_waitlist
        WHERE contact_phone = ${from} AND status = 'notified'
        ORDER BY notified_at DESC NULLS LAST LIMIT 1
      `;
      const entry = rows[0];
      if (!entry) return twiml(R.noHold);

      const hold = await placeHold({
        facilityId: entry.facility_id,
        sizeLabel: entry.size_label,
        phone: from,
        name: entry.contact_name,
        waitlistId: entry.id,
        source: "waitlist",
      });

      if (!hold.held && hold.reason === "none-available") {
        return twiml(R.heldGone);
      }
      await db.$executeRaw`
        UPDATE unit_waitlist SET status = 'converted', updated_at = now() WHERE id = ${entry.id}::uuid
      `;
      return twiml(R.heldOk(entry.size_label, HOLD_MINUTES));
    }

    // Anything else is a real person typing a real question. Say nothing rather
    // than auto-replying noise; it is logged above for a human to pick up.
    return twiml();
  } catch (error) {
    console.error("[sms-webhook] failed:", error);
    // Never 500 at Twilio — it retries, and a retried STOP is not harmful but a
    // retried hold attempt is. Acknowledge and let the log carry the failure.
    return twiml();
  }
}
