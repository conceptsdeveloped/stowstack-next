import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";

vi.mock("@/lib/push", () => ({ sendPushToAll: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
  SENDERS: {
    team: "StorageAds <team@storageads.com>",
    notifications: "StorageAds <notifications@storageads.com>",
  },
  resolveSiteUrl: () => "https://storageads.com",
}));
import { sendPushToAll } from "@/lib/push";
import { sendEmail } from "@/lib/email";
import { GET, POST } from "../route";

// M4: messaging is now Postgres-backed (client_messages). These tests cover the
// auth boundary AND the durable read/write contract ({id, from, text, timestamp}).
const mockDb = vi.mocked(db, true);
const mockSendPush = vi.mocked(sendPushToAll);
const mockSendEmail = vi.mocked(sendEmail);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/client-messages", () => {
  it("401s without any portal credentials", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(createMockRequest("/api/client-messages"));
    expect(res.status).toBe(401);
  });

  it("401s when accessCode + email do not resolve to a client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(
      createMockRequest("/api/client-messages?accessCode=BAD&email=o@e.com")
    );
    expect(res.status).toBe(401);
  });

  it("returns the client's thread mapped to the wire contract", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      findMany: vi.fn().mockResolvedValue([
        { id: "m1", sender: "admin", body: "Welcome!", created_at: new Date("2026-06-01T00:00:00Z") },
      ]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const res = await GET(
      createMockRequest("/api/client-messages?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toEqual([
      { id: "m1", from: "admin", text: "Welcome!", timestamp: "2026-06-01T00:00:00.000Z" },
    ]);
    // Reading the thread marks the OTHER party's unread messages read.
    // @ts-expect-error — inspecting the mock
    const where = mockDb.client_messages.updateMany.mock.calls[0][0].where;
    expect(where.client_id).toBe("c1");
    expect(where.sender).toBe("admin");
  });
});

describe("POST /api/client-messages", () => {
  it("401s a client message with invalid credentials", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await POST(
      createMockRequest("/api/client-messages?accessCode=BAD&email=o@e.com", {
        method: "POST",
        body: { text: "hi", from: "client" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("401s a client trying to impersonate admin", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    const res = await POST(
      createMockRequest("/api/client-messages?accessCode=AC&email=o@e.com", {
        method: "POST",
        body: { text: "hi", from: "admin" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("persists a valid client message and returns it", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      create: vi.fn().mockResolvedValue({
        id: "m2",
        sender: "client",
        body: "hi",
        created_at: new Date("2026-06-02T00:00:00Z"),
      }),
    };
    const res = await POST(
      createMockRequest("/api/client-messages?accessCode=AC&email=o@e.com", {
        method: "POST",
        body: { text: "hi", from: "client" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toEqual({
      id: "m2",
      from: "client",
      text: "hi",
      timestamp: "2026-06-02T00:00:00.000Z",
    });
    // Persisted as a client message under the resolved client.
    // @ts-expect-error — inspecting the mock
    const data = mockDb.client_messages.create.mock.calls[0][0].data;
    expect(data.client_id).toBe("c1");
    expect(data.sender).toBe("client");
  });

  it("lets an admin (x-admin-key) post to a thread by accessCode", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findUnique: vi.fn().mockResolvedValue({ id: "c9" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      create: vi.fn().mockResolvedValue({
        id: "m3",
        sender: "admin",
        body: "from staff",
        created_at: new Date("2026-06-03T00:00:00Z"),
      }),
    };
    const res = await POST(
      createAdminRequest("/api/client-messages?accessCode=AC", {
        method: "POST",
        body: { text: "from staff", from: "admin" },
      })
    );
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_messages.create.mock.calls[0][0].data.client_id).toBe("c9");
  });

  it("404s an admin posting to an accessCode that resolves to no client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue(null) };
    const res = await POST(
      createAdminRequest("/api/client-messages?accessCode=NOPE", {
        method: "POST",
        body: { text: "hi", from: "admin" },
      })
    );
    expect(res.status).toBe(404);
  });

  it("400s on missing text", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    const res = await POST(
      createMockRequest("/api/client-messages?accessCode=AC&email=o@e.com", {
        method: "POST",
        body: { from: "client" },
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/client-messages — D6 push notifications", () => {
  it("pushes to the client's own devices when an admin replies", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue({ id: "c9" }) };
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      create: vi.fn().mockResolvedValue({
        id: "m3",
        sender: "admin",
        body: "from staff",
        created_at: new Date("2026-06-03T00:00:00Z"),
      }),
    };
    const res = await POST(
      createAdminRequest("/api/client-messages?accessCode=AC", {
        method: "POST",
        body: { text: "from staff", from: "admin" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockSendPush).toHaveBeenCalledTimes(1);
    const [payload, filter] = mockSendPush.mock.calls[0];
    // Notify ONLY this client's rows — never broadcast to other tenants.
    expect(filter).toEqual({ userType: "client", userId: "c9" });
    expect(payload.url).toBe("/portal/messages");
    expect(payload.body).toContain("from staff");
  });

  it("pings the admins when a client writes in", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      create: vi.fn().mockResolvedValue({
        id: "m2",
        sender: "client",
        body: "hi",
        created_at: new Date("2026-06-02T00:00:00Z"),
      }),
    };
    const res = await POST(
      createMockRequest("/api/client-messages?accessCode=AC&email=o@e.com", {
        method: "POST",
        body: { text: "hi", from: "client" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockSendPush).toHaveBeenCalledTimes(1);
    const [payload, filter] = mockSendPush.mock.calls[0];
    // All admins (no userId filter); never tagged to a client id.
    expect(filter).toEqual({ userType: "admin" });
    expect(filter).not.toHaveProperty("userId");
    expect(payload.url).toBe("/admin/messages");
  });

  it("truncates a long preview to keep the notification body short", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    const longText = "x".repeat(500);
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      create: vi.fn().mockResolvedValue({
        id: "m4",
        sender: "client",
        body: longText,
        created_at: new Date("2026-06-04T00:00:00Z"),
      }),
    };
    await POST(
      createMockRequest("/api/client-messages?accessCode=AC&email=o@e.com", {
        method: "POST",
        body: { text: longText, from: "client" },
      })
    );
    const [payload] = mockSendPush.mock.calls[0];
    expect(payload.body.length).toBeLessThanOrEqual(120);
    expect(payload.body.endsWith("...")).toBe(true);
  });

  it("still returns 200 when push delivery throws (fire-and-forget)", async () => {
    mockSendPush.mockRejectedValueOnce(new Error("vapid down"));
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      create: vi.fn().mockResolvedValue({
        id: "m5",
        sender: "client",
        body: "hi",
        created_at: new Date("2026-06-05T00:00:00Z"),
      }),
    };
    const res = await POST(
      createMockRequest("/api/client-messages?accessCode=AC&email=o@e.com", {
        method: "POST",
        body: { text: "hi", from: "client" },
      })
    );
    // The message persisted; the failed push must not surface to the caller.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("POST /api/client-messages — D6 email notifications", () => {
  // Email fires AFTER the response returns (post-await client lookup), so each
  // assertion polls with vi.waitFor rather than checking synchronously.
  it("emails the client when an admin replies, reply-to the founder inbox", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findUnique: vi.fn().mockResolvedValue({
        id: "c9",
        email: "owner@acme.com",
        name: "Dana",
        facility_name: "Acme Storage",
      }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      create: vi.fn().mockResolvedValue({
        id: "m3",
        sender: "admin",
        body: "Your campaign is live.",
        created_at: new Date("2026-06-03T00:00:00Z"),
      }),
    };
    const res = await POST(
      createAdminRequest("/api/client-messages?accessCode=AC", {
        method: "POST",
        body: { text: "Your campaign is live.", from: "admin" },
      })
    );
    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(mockSendEmail).toHaveBeenCalledTimes(1));
    const params = mockSendEmail.mock.calls[0][0];
    expect(params.to).toBe("owner@acme.com");
    expect(params.replyTo).toBe("blake@storageads.com");
    expect(params.subject).toContain("StorageAds team");
    // Idempotency keyed on the message id so a retry can't double-send.
    expect(params.idempotencyKey).toBe("msg-notify-client-m3");
    expect(params.html).toContain("Your campaign is live.");
  });

  it("does not email a client that has no address on file", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findUnique: vi.fn().mockResolvedValue({ id: "c9", email: "", name: "Dana", facility_name: "Acme" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      create: vi.fn().mockResolvedValue({
        id: "m3",
        sender: "admin",
        body: "hi",
        created_at: new Date("2026-06-03T00:00:00Z"),
      }),
    };
    const res = await POST(
      createAdminRequest("/api/client-messages?accessCode=AC", {
        method: "POST",
        body: { text: "hi", from: "admin" },
      })
    );
    expect(res.status).toBe(200);
    // Give the post-response notify path a tick; it must not send.
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("emails the founder inbox when a client writes in, reply-to the client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
      findUnique: vi.fn().mockResolvedValue({
        id: "c1",
        email: "owner@acme.com",
        name: "Dana",
        facility_name: "Acme Storage",
      }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      create: vi.fn().mockResolvedValue({
        id: "m2",
        sender: "client",
        body: "Quick question",
        created_at: new Date("2026-06-02T00:00:00Z"),
      }),
    };
    const res = await POST(
      createMockRequest("/api/client-messages?accessCode=AC&email=o@e.com", {
        method: "POST",
        body: { text: "Quick question", from: "client" },
      })
    );
    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(mockSendEmail).toHaveBeenCalledTimes(1));
    const params = mockSendEmail.mock.calls[0][0];
    expect(params.to).toBe("blake@storageads.com");
    expect(params.replyTo).toBe("owner@acme.com");
    expect(params.subject).toContain("Acme Storage");
    expect(params.idempotencyKey).toBe("msg-notify-admin-m2");
  });

  it("still returns 200 when email delivery throws (fire-and-forget)", async () => {
    mockSendEmail.mockRejectedValueOnce(new Error("resend down"));
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findUnique: vi.fn().mockResolvedValue({
        id: "c9",
        email: "owner@acme.com",
        name: "Dana",
        facility_name: "Acme",
      }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      create: vi.fn().mockResolvedValue({
        id: "m6",
        sender: "admin",
        body: "hi",
        created_at: new Date("2026-06-06T00:00:00Z"),
      }),
    };
    const res = await POST(
      createAdminRequest("/api/client-messages?accessCode=AC", {
        method: "POST",
        body: { text: "hi", from: "admin" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
