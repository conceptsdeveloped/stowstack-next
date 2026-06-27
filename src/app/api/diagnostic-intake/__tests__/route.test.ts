import { describe, it, expect, vi } from "vitest";
import { createMockRequest } from "@/test/helpers";

// The route fires a notification email on the success path; stub it so the
// module imports cleanly without a Resend client. (db is mocked globally in
// src/test/setup.ts.) The guard/validation paths under test return before any
// email or db call, so no further mocking is needed.
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
  SENDERS: { default: "test@storageads.com" },
}));

import { POST } from "../route";

const PATH = "/api/diagnostic-intake";

function post(body: unknown) {
  return POST(createMockRequest(PATH, { method: "POST", body }));
}

describe("POST /api/diagnostic-intake — payload-size guard", () => {
  it("rejects oversized submissions with 413 before they reach the AI prompt", async () => {
    // Valid required fields, so the ONLY thing that can produce a non-2xx here
    // is the size guard itself.
    const res = await post({
      facilityName: "Test Facility",
      contactEmail: "owner@example.com",
      responses: { note: "x".repeat(60_000) },
    });
    expect(res.status).toBe(413);
  });

  it("allows a normal-size submission past the guard (validation still runs)", async () => {
    // Small responses clear the guard; missing facilityName then trips the
    // existing required-field validation (400) before any db/email work.
    const res = await post({
      contactEmail: "owner@example.com",
      responses: { note: "occupancy is around 80%" },
    });
    expect(res.status).toBe(400);
  });

  it("does not false-trigger when responses is absent", async () => {
    const res = await post({ facilityName: "Test Facility" });
    // Missing contactEmail -> 400 from validation, NOT 413 from the guard.
    expect(res.status).toBe(400);
  });
});
