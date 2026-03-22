import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { db } from "@/lib/db";

const { VoiceResponse } = twilio.twiml;

function twimlResponse(twiml: InstanceType<typeof VoiceResponse>): NextResponse {
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

async function parseFormBody(
  req: NextRequest
): Promise<Record<string, string>> {
  const text = await req.text();
  const params = new URLSearchParams(text);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const event = url.searchParams.get("event");
  const body = await parseFormBody(req);

  // Status callback: update call duration and final status
  if (event === "status") {
    const { CallSid, CallDuration, CallStatus } = body;
    if (CallSid) {
      await db.$executeRaw`
        UPDATE call_logs SET status = ${CallStatus || "completed"}, duration = ${parseInt(CallDuration) || 0}, ended_at = NOW()
        WHERE twilio_call_sid = ${CallSid}
      `;
      await db.$executeRaw`
        UPDATE call_tracking_numbers SET
          call_count = (SELECT COUNT(*) FROM call_logs WHERE tracking_number_id = call_tracking_numbers.id AND status = 'completed'),
          total_duration = (SELECT COALESCE(SUM(duration), 0) FROM call_logs WHERE tracking_number_id = call_tracking_numbers.id AND status = 'completed')
        WHERE id = (SELECT tracking_number_id FROM call_logs WHERE twilio_call_sid = ${CallSid})
      `;
    }
    return new NextResponse(null, { status: 200 });
  }

  // Initial voice webhook: forward the call
  const { CallSid, To, From, FromCity, FromState } = body;

  if (!To) {
    const twiml = new VoiceResponse();
    twiml.say("Sorry, this number is not configured.");
    return twimlResponse(twiml);
  }

  const trackingNum = await db.call_tracking_numbers.findFirst({
    where: { phone_number: To, status: "active" },
    select: { id: true, facility_id: true, forward_to: true },
  });

  if (!trackingNum) {
    const twiml = new VoiceResponse();
    twiml.say("Sorry, this number is no longer in service.");
    return twimlResponse(twiml);
  }

  // Log the call (fire-and-forget style with conflict handling)
  db.$executeRaw`
    INSERT INTO call_logs (tracking_number_id, facility_id, twilio_call_sid, caller_number, caller_city, caller_state, status, started_at)
    VALUES (${trackingNum.id}::uuid, ${trackingNum.facility_id}::uuid, ${CallSid}, ${From || null}, ${FromCity || null}, ${FromState || null}, 'ringing', NOW())
    ON CONFLICT (twilio_call_sid) DO NOTHING
  `.catch(() => {});

  // Generate TwiML to forward the call
  const twiml = new VoiceResponse();
  twiml.dial({ callerId: To }, trackingNum.forward_to);

  return twimlResponse(twiml);
}
