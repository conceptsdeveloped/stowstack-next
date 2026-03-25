import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createBearerRequest, createMockRequest } from "@/test/helpers";
import {
  hashKey,
  requireApiAuth,
  isErrorResponse,
  requireScope,
  requireOrgFacility,
  v1Json,
  v1Error,
  v1CorsResponse,
} from "../v1-auth";

const mockDb = vi.mocked(db);

function makeApiKeyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "key-1",
    organization_id: "org-1",
    name: "Test Key",
    scopes: ["facilities:read", "leads:read", "leads:write"],
    rate_limit: null,
    expires_at: null,
    revoked: false,
    ...overrides,
  };
}

describe("hashKey", () => {
  it("returns a consistent sha256 hex hash", () => {
    const hash1 = hashKey("sk_live_test123");
    const hash2 = hashKey("sk_live_test123");
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns different hashes for different keys", () => {
    expect(hashKey("key1")).not.toBe(hashKey("key2"));
  });
});

describe("v1CorsResponse", () => {
  it("returns 204 with CORS headers", () => {
    const res = v1CorsResponse();
    expect(res.status).toBe(204);
  });
});

describe("v1Json", () => {
  it("returns data with 200 status by default", async () => {
    const res = v1Json({ ok: true });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe("v1Error", () => {
  it("returns error message with given status", async () => {
    const res = v1Error("Not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });
});

describe("requireApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockResolvedValue([makeApiKeyRow()]);
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns apiKey for valid Bearer token", async () => {
    const req = createBearerRequest("/api/v1/test", "sk_live_test123");
    const result = await requireApiAuth(req);
    expect(isErrorResponse(result)).toBe(false);
    if (!isErrorResponse(result)) {
      expect(result.apiKey.organization_id).toBe("org-1");
    }
  });

  it("returns 401 when no Authorization header", async () => {
    const req = createMockRequest("/api/v1/test");
    const result = await requireApiAuth(req);
    expect(isErrorResponse(result)).toBe(true);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns 401 when Authorization is not Bearer format", async () => {
    const req = createMockRequest("/api/v1/test", {
      headers: { authorization: "Basic abc" },
    });
    const result = await requireApiAuth(req);
    expect(isErrorResponse(result)).toBe(true);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns 401 when API key is not found in database", async () => {
    mockDb.$queryRaw.mockResolvedValue([]);
    const req = createBearerRequest("/api/v1/test", "sk_live_unknown");
    const result = await requireApiAuth(req);
    expect(isErrorResponse(result)).toBe(true);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns 401 when API key is revoked", async () => {
    mockDb.$queryRaw.mockResolvedValue([makeApiKeyRow({ revoked: true })]);
    const req = createBearerRequest("/api/v1/test", "sk_live_revoked");
    const result = await requireApiAuth(req);
    expect(isErrorResponse(result)).toBe(true);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns 401 when API key is expired", async () => {
    const pastDate = new Date(Date.now() - 86400000); // yesterday
    mockDb.$queryRaw.mockResolvedValue([
      makeApiKeyRow({ expires_at: pastDate }),
    ]);
    const req = createBearerRequest("/api/v1/test", "sk_live_expired");
    const result = await requireApiAuth(req);
    expect(isErrorResponse(result)).toBe(true);
    expect((result as NextResponse).status).toBe(401);
  });

  it("accepts non-expired API key", async () => {
    const futureDate = new Date(Date.now() + 86400000); // tomorrow
    mockDb.$queryRaw.mockResolvedValue([
      makeApiKeyRow({ expires_at: futureDate }),
    ]);
    const req = createBearerRequest("/api/v1/test", "sk_live_valid");
    const result = await requireApiAuth(req);
    expect(isErrorResponse(result)).toBe(false);
  });
});

describe("requireScope", () => {
  it("returns null when scope is present", () => {
    const apiKey = makeApiKeyRow();
    const result = requireScope(apiKey, "facilities:read");
    expect(result).toBeNull();
  });

  it("returns 403 when scope is missing", async () => {
    const apiKey = makeApiKeyRow();
    const result = requireScope(apiKey, "admin:write");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toContain("admin:write");
  });
});

describe("requireOrgFacility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns facility when it belongs to the org", async () => {
    mockDb.$queryRaw.mockResolvedValue([
      { id: "fac-1", organization_id: "org-1" },
    ]);
    const result = await requireOrgFacility("fac-1", "org-1");
    expect("id" in result).toBe(true);
    if ("id" in result) {
      expect(result.id).toBe("fac-1");
    }
  });

  it("returns 404 when facility belongs to different org", async () => {
    mockDb.$queryRaw.mockResolvedValue([
      { id: "fac-1", organization_id: "org-2" },
    ]);
    const result = await requireOrgFacility("fac-1", "org-1");
    expect(result instanceof NextResponse).toBe(true);
    expect((result as NextResponse).status).toBe(404);
  });

  it("returns 404 when facility does not exist", async () => {
    mockDb.$queryRaw.mockResolvedValue([]);
    const result = await requireOrgFacility("nonexistent", "org-1");
    expect(result instanceof NextResponse).toBe(true);
    expect((result as NextResponse).status).toBe(404);
  });

  it("returns 400 when facilityId is null", async () => {
    const result = await requireOrgFacility(null, "org-1");
    expect(result instanceof NextResponse).toBe(true);
    expect((result as NextResponse).status).toBe(400);
  });
});
