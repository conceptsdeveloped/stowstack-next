import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET, POST } from "../route";

// No KV env in the test runner, so getRedis() returns null and the route takes
// its degraded path (empty list / fake success). That lets these tests isolate
// the *auth* behavior — the actual bug that was fixed — without a live Redis.
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

  it("returns a (Redis-less empty) thread for an authenticated client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    const res = await GET(
      createMockRequest("/api/client-messages?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toEqual([]);
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

  it("accepts a valid client message", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
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
  });

  it("lets an admin (x-admin-key) post as admin to any thread", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn() };
    const res = await POST(
      createAdminRequest("/api/client-messages?accessCode=AC", {
        method: "POST",
        body: { text: "from staff", from: "admin" },
      })
    );
    expect(res.status).toBe(200);
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
