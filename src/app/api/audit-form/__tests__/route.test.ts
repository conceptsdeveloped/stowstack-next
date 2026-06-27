import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest } from "@/test/helpers";

vi.mock("@/lib/db", () => ({
  db: { facilities: { create: vi.fn() } },
}));

vi.mock("@/lib/with-rate-limit", () => ({
  applyRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
  SENDERS: { noreply: "StorageAds <noreply@storageads.com>" },
}));

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { POST } from "../route";

const m = db as unknown as { facilities: { create: ReturnType<typeof vi.fn> } };
const notify = sendEmail as unknown as ReturnType<typeof vi.fn>;

function post(body: unknown) {
  return POST(
    createMockRequest("http://localhost:3000/api/audit-form", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body,
    })
  );
}

const valid = {
  name: "Pat Owner",
  email: "pat@sunsetstorage.com",
  facilityName: "Sunset Storage",
  location: "Austin, TX",
  phone: "512-555-0100",
  totalUnits: "300",
  occupancyRange: "80-90%",
};

beforeEach(() => {
  vi.clearAllMocks();
  m.facilities.create.mockResolvedValue({ id: "fac-1" });
});

describe("POST /api/audit-form", () => {
  it("400s on missing required fields without creating a facility", async () => {
    const res = await post({ email: "pat@x.com" });
    expect(res.status).toBe(400);
    expect(m.facilities.create).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("400s on an invalid email format", async () => {
    const res = await post({ ...valid, email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(m.facilities.create).not.toHaveBeenCalled();
  });

  it("creates the facility and notifies Blake on a valid submission", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, facilityId: "fac-1" });

    expect(m.facilities.create).toHaveBeenCalledTimes(1);
    const data = m.facilities.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: "Sunset Storage",
      contact_email: "pat@sunsetstorage.com",
      status: "intake",
      pipeline_status: "submitted",
    });

    expect(notify).toHaveBeenCalledTimes(1);
    const arg = notify.mock.calls[0][0];
    expect(arg.subject).toContain("Sunset Storage");
    expect(arg.html).toContain("pat@sunsetstorage.com");
  });

  it("trims the email and tolerates a non-string email", async () => {
    await post({ ...valid, email: "  pat@sunsetstorage.com  " });
    expect(m.facilities.create.mock.calls[0][0].data.contact_email).toBe(
      "pat@sunsetstorage.com"
    );
  });

  it("500s (not a crash) when the DB write fails", async () => {
    m.facilities.create.mockRejectedValue(new Error("db down"));
    const res = await post(valid);
    expect(res.status).toBe(500);
  });
});
