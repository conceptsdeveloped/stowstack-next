import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, createAdminRequest } from "@/test/helpers";

// Mock Clerk's auth() — not used in the functions we're testing here
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: null, sessionClaims: null }),
}));

import {
  getCorsHeaders,
  corsResponse,
  jsonResponse,
  errorResponse,
  isAdminRequest,
  requireAdminKey,
} from "../api-helpers";

describe("getCorsHeaders", () => {
  it("returns the origin when it is in the allowlist", () => {
    const headers = getCorsHeaders("http://localhost:3000");
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:3000");
  });

  it("returns the production origin when it is in the allowlist", () => {
    const headers = getCorsHeaders("https://storageads.com");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://storageads.com");
  });

  it("falls back to first allowed origin for unknown origins", () => {
    const headers = getCorsHeaders("https://evil.com");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://storageads.com");
  });

  it("falls back to first allowed origin when origin is null", () => {
    const headers = getCorsHeaders(null);
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://storageads.com");
  });

  it("includes required CORS methods and headers", () => {
    const headers = getCorsHeaders(null);
    expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
    expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
    expect(headers["Access-Control-Allow-Headers"]).toContain("Authorization");
    expect(headers["Access-Control-Allow-Headers"]).toContain("X-Admin-Key");
  });
});

describe("corsResponse", () => {
  it("returns 200 with CORS headers", async () => {
    const res = corsResponse("http://localhost:3000");
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000"
    );
  });
});

describe("jsonResponse", () => {
  it("returns data with default 200 status", async () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("supports custom status codes", async () => {
    const res = jsonResponse({ created: true }, 201);
    expect(res.status).toBe(201);
  });
});

describe("errorResponse", () => {
  it("returns error message with default 400 status", async () => {
    const res = errorResponse("Bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Bad request");
  });

  it("supports custom status codes", async () => {
    const res = errorResponse("Not found", 404);
    expect(res.status).toBe(404);
  });
});

describe("isAdminRequest", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-admin-secret-key";
  });

  it("returns true for valid admin key", () => {
    const req = createAdminRequest("/api/test");
    expect(isAdminRequest(req)).toBe(true);
  });

  it("returns false for wrong admin key", () => {
    const req = createMockRequest("/api/test", {
      headers: { "x-admin-key": "wrong-key" },
    });
    expect(isAdminRequest(req)).toBe(false);
  });

  it("returns false when no admin key header is provided", () => {
    const req = createMockRequest("/api/test");
    expect(isAdminRequest(req)).toBe(false);
  });

  it("returns false when ADMIN_SECRET env var is missing", () => {
    delete process.env.ADMIN_SECRET;
    const req = createMockRequest("/api/test", {
      headers: { "x-admin-key": "any-key" },
    });
    expect(isAdminRequest(req)).toBe(false);
  });

  it("returns false for empty admin key header", () => {
    const req = createMockRequest("/api/test", {
      headers: { "x-admin-key": "" },
    });
    expect(isAdminRequest(req)).toBe(false);
  });
});

describe("requireAdminKey", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-admin-secret-key";
  });

  it("returns null (pass) for valid admin key", () => {
    const req = createAdminRequest("/api/test");
    expect(requireAdminKey(req)).toBeNull();
  });

  it("returns 401 error response for invalid admin key", async () => {
    const req = createMockRequest("/api/test", {
      headers: { "x-admin-key": "wrong" },
    });
    const res = requireAdminKey(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
    const body = await res!.json();
    expect(body.error).toBe("Unauthorized");
  });
});
