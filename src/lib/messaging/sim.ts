import type { MessageProvider, SendRequest, SendResult } from "./types";

/**
 * The sim provider (MISSION.md s5).
 *
 * The default when no Twilio keys are present, so the whole messaging path —
 * gating, opt-out, idempotency, the waitlist handler — is exercisable locally
 * and in tests without a vendor account and without the risk of texting a real
 * person. The mail system treats its sim as a permanent product surface for the
 * same reason; this follows that.
 *
 * `live` is false, and the sender refuses a provider that is not live for real
 * sends, so this can never be mistaken for delivery.
 */
export class SimMessageProvider implements MessageProvider {
  id = "sim";
  live = false;
  readonly sent: SendRequest[] = [];

  async send(req: SendRequest): Promise<SendResult> {
    this.sent.push(req);
    console.log(`[messaging:sim] ${req.channel} → ${req.to}: ${req.body.slice(0, 120)}`);
    return { providerId: `sim_${req.dedupeKey.slice(0, 32)}`, status: "sent" };
  }
}
