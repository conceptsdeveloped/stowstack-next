// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SENDERS, sendEmail } from "@/lib/email";

/**
 * LIVE delivery smoke test — hits the real Resend API. Skipped by default so it
 * never runs in CI or a normal `npm test`. To run it:
 *
 *   LIVE_EMAIL_TEST=1 LIVE_EMAIL_TO=you@example.com npx vitest run src/lib/__tests__/email-live.test.ts
 *
 * It loads RESEND_API_KEY from .env.local if not already in the environment.
 */
const LIVE = !!process.env.LIVE_EMAIL_TEST;

function loadKeyFromEnvLocal(): void {
  if (process.env.RESEND_API_KEY) return;
  try {
    const file = readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of file.split("\n")) {
      const m = line.match(/^RESEND_API_KEY=(.*)$/);
      if (m) {
        process.env.RESEND_API_KEY = m[1].replace(/^["']|["']$/g, "").trim();
        return;
      }
    }
  } catch {
    /* no .env.local — the test will surface the missing key */
  }
}

describe.skipIf(!LIVE)("sendEmail — LIVE Resend delivery", () => {
  beforeAll(() => {
    loadKeyFromEnvLocal();
    // Ensure the non-prod redirect guard does not rewrite our explicit recipient.
    delete process.env.EMAIL_REDIRECT_TO;
    delete process.env.EMAIL_DRY_RUN;
  });

  it("delivers a real email through the production code path", async () => {
    const to = process.env.LIVE_EMAIL_TO || "blake@storepawpaw.com";
    const result = await sendEmail({
      from: SENDERS.system,
      to,
      subject: "[LIVE TEST] sendEmail() integration",
      html: "<p>This message was delivered through the centralized <code>sendEmail()</code> layer (validation + retry + idempotency). If you received it, the production code path works end-to-end.</p>",
      text: "Delivered through the centralized sendEmail() layer.",
      tags: [{ name: "type", value: "live_integration_test" }],
      idempotencyKey: "live-integration-smoke",
    });

    console.log("[email-live] result:", JSON.stringify(result));
    expect(result.ok).toBe(true);
    expect(result.id).toBeTruthy();
    expect(result.attempts).toBe(1);
  }, 20_000);
});
