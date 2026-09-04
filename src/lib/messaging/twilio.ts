import twilio from "twilio";
import {
  SendOutcomeUnknown,
  SendRejected,
  type MessageProvider,
  type SendRequest,
  type SendResult,
} from "./types";

/**
 * Twilio (MISSION.md s5). The only file in the repo's new code that imports the
 * vendor — everything else talks to `MessageProvider`.
 *
 * Live is DOUBLE-gated, matching the mail provider: credentials must exist AND
 * `MESSAGING_LIVE=true` must be set as an operator attestation (A2P 10DLC brand
 * and campaign registered, sending number provisioned). Credentials alone are
 * not consent to text real people — an unregistered 10DLC campaign gets
 * filtered or fined rather than delivered.
 */
export class TwilioMessageProvider implements MessageProvider {
  id = "twilio";
  live: boolean;
  private client: ReturnType<typeof twilio>;
  private defaultFrom?: string;

  constructor(sid: string, token: string, opts: { live: boolean; from?: string }) {
    this.client = twilio(sid, token);
    this.live = opts.live;
    this.defaultFrom = opts.from;
  }

  async send(req: SendRequest): Promise<SendResult> {
    if (req.channel !== "sms") {
      throw new SendRejected(`twilio provider handles sms only, got "${req.channel}"`);
    }
    const from = req.from ?? this.defaultFrom;
    if (!from) throw new SendRejected("no sending number configured");

    try {
      const msg = await this.client.messages.create({ to: req.to, from, body: req.body });
      return { providerId: msg.sid, status: "sent" };
    } catch (e) {
      // Twilio surfaces a numeric `status` on API errors. A 4xx is the carrier
      // or the API refusing — definitive, safe to record and stop. Anything
      // else (timeout, 5xx, socket reset) leaves the outcome UNKNOWN: the
      // message may already be on its way, so it must freeze rather than retry.
      const status = (e as { status?: number }).status;
      const detail = e instanceof Error ? e.message : String(e);
      if (typeof status === "number" && status >= 400 && status < 500) {
        throw new SendRejected(`twilio rejected the message (${status}): ${detail}`);
      }
      throw new SendOutcomeUnknown(`twilio outcome unknown: ${detail}`);
    }
  }
}
