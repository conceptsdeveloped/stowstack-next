import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { authenticatePortalRequest } from "../portal-auth";

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authenticatePortalRequest", () => {
  it("returns admin scope when the X-Admin-Key header is valid", async () => {
    // @ts-expect-error — db is a vi mock; clients is added per-test
    mockDb.clients = { findFirst: vi.fn() };
    const req = createAdminRequest("/api/client-reports");
    const scope = await authenticatePortalRequest(req);
    expect(scope).toEqual({ kind: "admin" });
    // Admin path must not hit the database.
    // @ts-expect-error — inspecting the mock
    expect(mockDb.clients.findFirst).not.toHaveBeenCalled();
  });

  it("resolves a client to its facility + client id from accessCode + email", async () => {
    // @ts-expect-error — db is a vi mock; clients is added per-test
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue({ id: "client-1", facility_id: "fac-1" }) };

    const req = createMockRequest(
      "/api/client-reports?accessCode=ABC123&email=owner@example.com"
    );
    const scope = await authenticatePortalRequest(req);
    expect(scope).toEqual({ kind: "client", facilityId: "fac-1", clientId: "client-1" });
  });

  it("matches email case-insensitively", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue({ id: "client-1", facility_id: "fac-1" }) };

    const req = createMockRequest(
      "/api/client-reports?accessCode=ABC123&email=Owner@Example.com"
    );
    await authenticatePortalRequest(req);

    // @ts-expect-error — inspecting the mock call
    const where = mockDb.clients.findFirst.mock.calls[0][0].where;
    expect(where.email).toEqual({ equals: "Owner@Example.com", mode: "insensitive" });
    expect(where.access_code).toBe("ABC123");
  });

  it("returns 401 when credentials are missing", async () => {
    const req = createMockRequest("/api/client-reports");
    const res = await authenticatePortalRequest(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
  });

  it("returns 401 when the client is not found", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };

    const req = createMockRequest(
      "/api/client-reports?accessCode=WRONG&email=owner@example.com"
    );
    const res = await authenticatePortalRequest(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
  });

  it("returns 401 when the matched client has no facility", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue({ id: "client-1", facility_id: null }) };

    const req = createMockRequest(
      "/api/client-reports?accessCode=ABC123&email=owner@example.com"
    );
    const res = await authenticatePortalRequest(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
  });

  it("does not trust a caller-supplied clientId/facilityId for non-admins", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue({ id: "real-client", facility_id: "real-fac" }) };

    // A client tries to target someone else's facility via query params.
    const req = createMockRequest(
      "/api/client-reports?accessCode=ABC123&email=owner@example.com&clientId=victim&facilityId=victim-fac"
    );
    const scope = await authenticatePortalRequest(req);
    // Scope is pinned to the access code's own client, ignoring the injected ids.
    expect(scope).toEqual({ kind: "client", facilityId: "real-fac", clientId: "real-client" });
  });
});
