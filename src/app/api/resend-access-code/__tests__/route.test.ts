import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest } from "@/test/helpers";

// Real isValidEmail (pure) keeps the format check meaningful; email send is mocked.
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true, skipped: false }),
  SENDERS: { noreply: "StorageAds <noreply@storageads.com>" },
}));
import { sendEmail } from "@/lib/email";
import { POST } from "../route";

const mockDb = vi.mocked(db, true);
const mockSendEmail = vi.mocked(sendEmail);

function setCodes(count: number) {
  // @ts-expect-error — db is a vi mock
  mockDb.portal_login_codes = {
    count: vi.fn().mockResolvedValue(count),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn().mockResolvedValue({}),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setCodes(0);
});

const post = (body: unknown) =>
  POST(createMockRequest("/api/resend-access-code", { method: "POST", body }));

describe("POST /api/resend-access-code", () => {
  it("400s when no email is provided", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it("400s an malformed email", async () => {
    const res = await post({ email: "notanemail" });
    expect(res.status).toBe(400);
  });

  it("does NOT reveal that an email is unknown — returns success, sends nothing", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };

    const res = await post({ email: "ghost@nowhere.com" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    // No code minted, no email sent — the anti-enumeration contract.
    // @ts-expect-error — inspecting the mock
    expect(mockDb.portal_login_codes.create).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("mints a fresh 4-digit code, invalidates old ones, and emails a known client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ name: "Dana", email: "owner@pawpaw.com" }),
    };

    const res = await post({ email: "Owner@Pawpaw.com" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    // Old unused codes for this email are burned first...
    // @ts-expect-error — inspecting the mock
    const inval = mockDb.portal_login_codes.updateMany.mock.calls[0][0];
    expect(inval.where.email).toBe("owner@pawpaw.com");
    expect(inval.where.used).toBe(false);
    expect(inval.data.used).toBe(true);

    // ...then a new 4-digit code is created and emailed to the client.
    // @ts-expect-error — inspecting the mock
    const created = mockDb.portal_login_codes.create.mock.calls[0][0].data;
    expect(created.email).toBe("owner@pawpaw.com");
    expect(created.code).toMatch(/^\d{4}$/);
    expect(created.expires_at).toBeInstanceOf(Date);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].to).toBe("owner@pawpaw.com");
  });

  it("silently throttles at >=3 codes in the last hour — no new code, no email", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ name: "Dana", email: "owner@pawpaw.com" }),
    };
    setCodes(3); // already at the hourly cap

    const res = await post({ email: "owner@pawpaw.com" });
    // Still a 200 success — indistinguishable from the happy path to the caller.
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    // @ts-expect-error — inspecting the mock
    expect(mockDb.portal_login_codes.create).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns an identical response for known, unknown, and throttled — no enumeration signal", async () => {
    // Unknown
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const unknown = await (await post({ email: "ghost@nowhere.com" })).json();

    // Known + under cap
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ name: "Dana", email: "owner@pawpaw.com" }),
    };
    setCodes(0);
    const known = await (await post({ email: "owner@pawpaw.com" })).json();

    // Known + throttled
    setCodes(3);
    const throttled = await (await post({ email: "owner@pawpaw.com" })).json();

    expect(unknown).toEqual(known);
    expect(known).toEqual(throttled);
  });
});
