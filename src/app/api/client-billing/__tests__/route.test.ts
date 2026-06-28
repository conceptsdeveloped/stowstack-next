import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET } from "../route";

// No KV env in the test runner → loadRedis() returns null and GET returns an
// empty invoice list. These tests pin the *auth* behavior after migrating the
// route off its private verifyClientAuth onto the shared helper, including the
// `code` query alias the billing page sends.
const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/client-billing", () => {
  it("401s without any credentials", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(createMockRequest("/api/client-billing"));
    expect(res.status).toBe(401);
  });

  it("401s when code + email do not resolve to a client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(
      createMockRequest("/api/client-billing?code=BAD&email=o@e.com")
    );
    expect(res.status).toBe(401);
  });

  it("authenticates a client via the legacy `code` alias", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    const res = await GET(
      createMockRequest("/api/client-billing?code=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices).toEqual([]);
    // The shared helper resolved the client from the `code` param.
    // @ts-expect-error — inspecting the mock
    expect(mockDb.clients.findFirst).toHaveBeenCalled();
  });

  it("authenticates a client via the canonical `accessCode` param", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    const res = await GET(
      createMockRequest("/api/client-billing?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
  });

  it("lets an admin (X-Admin-Key) through without a client code", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn() };
    const res = await GET(createAdminRequest("/api/client-billing"));
    expect(res.status).toBe(200);
    // Admin auth must not hit the client lookup.
    // @ts-expect-error — inspecting the mock
    expect(mockDb.clients.findFirst).not.toHaveBeenCalled();
  });
});
