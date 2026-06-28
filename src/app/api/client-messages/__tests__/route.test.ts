import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET, POST } from "../route";

// M4: messaging is now Postgres-backed (client_messages). These tests cover the
// auth boundary AND the durable read/write contract ({id, from, text, timestamp}).
const mockDb = vi.mocked(db, true);

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
