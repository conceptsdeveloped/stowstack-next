import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";

vi.mock("@/lib/portal-auth", () => ({ authenticatePortalRequest: vi.fn() }));
import { authenticatePortalRequest } from "@/lib/portal-auth";
import { GET } from "../route";

const mockDb = vi.mocked(db, true);
const mockAuth = vi.mocked(authenticatePortalRequest);

beforeEach(() => {
  vi.clearAllMocks();
  // @ts-expect-error — db is a vi mock
  mockDb.activity_log = { findMany: vi.fn().mockResolvedValue([]) };
});

describe("GET /api/client-activity", () => {
  it("fails closed when the request is unauthenticated", async () => {
    mockAuth.mockResolvedValue(
      NextResponse.json({ error: "unauthorized" }, { status: 401 }) as never
    );
    const res = await GET(createMockRequest("/api/client-activity"));
    expect(res.status).toBe(401);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.activity_log.findMany).not.toHaveBeenCalled();
  });

  it("scopes a client to ONLY their own facility and the client-visible types", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "client", facilityId: "fac-1", clientId: "c-1" });
    const res = await GET(
      createMockRequest("/api/client-activity?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    const where = mockDb.activity_log.findMany.mock.calls[0][0].where;
    expect(where.facility_id).toBe("fac-1"); // never a caller-supplied facility
    // Only the curated client-visible event types are ever returned.
    expect(Array.isArray(where.type.in)).toBe(true);
    expect(where.type.in).toContain("lead_created");
    expect(where.type.in).not.toContain("invoice_sent"); // internal-only stays hidden
  });

  it("ignores a caller-supplied facilityId for a client (no escalation)", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "client", facilityId: "fac-1", clientId: "c-1" });
    await GET(
      createMockRequest("/api/client-activity?accessCode=AC&email=o@e.com&facilityId=fac-EVIL")
    );
    // @ts-expect-error — inspecting the mock
    const where = mockDb.activity_log.findMany.mock.calls[0][0].where;
    expect(where.facility_id).toBe("fac-1"); // the spoofed param is ignored
  });

  it("400s an admin that does not name a facilityId", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "admin" });
    const res = await GET(createAdminRequest("/api/client-activity"));
    expect(res.status).toBe(400);
  });

  it("lets an admin target an explicit facility", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "admin" });
    const res = await GET(
      createAdminRequest("/api/client-activity?facilityId=fac-9")
    );
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.activity_log.findMany.mock.calls[0][0].where.facility_id).toBe("fac-9");
  });

  it("clamps the page size to 100 and defaults to 30", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "client", facilityId: "fac-1", clientId: "c-1" });

    await GET(createMockRequest("/api/client-activity?accessCode=AC&email=o@e.com&limit=500"));
    // @ts-expect-error — inspecting the mock
    expect(mockDb.activity_log.findMany.mock.calls[0][0].take).toBe(100);

    // @ts-expect-error — db is a vi mock
    mockDb.activity_log = { findMany: vi.fn().mockResolvedValue([]) };
    await GET(createMockRequest("/api/client-activity?accessCode=AC&email=o@e.com"));
    // @ts-expect-error — inspecting the mock
    expect(mockDb.activity_log.findMany.mock.calls[0][0].take).toBe(30);
  });

  it("applies the `since` cursor as a created_at lower bound and labels rows", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "client", facilityId: "fac-1", clientId: "c-1" });
    // @ts-expect-error — db is a vi mock
    mockDb.activity_log = {
      findMany: vi.fn().mockResolvedValue([
        { id: "a1", type: "lead_created", lead_name: "Dana", facility_name: "F", detail: "d", created_at: new Date("2026-06-02T00:00:00Z") },
        { id: "a2", type: "mystery_type", lead_name: null, facility_name: "F", detail: null, created_at: new Date("2026-06-01T00:00:00Z") },
      ]),
    };

    const res = await GET(
      createMockRequest("/api/client-activity?accessCode=AC&email=o@e.com&since=2026-06-01T00:00:00Z")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // Known type → friendly label; unknown type → falls back to the raw type.
    expect(body.data[0].label).toBe("New lead submitted");
    expect(body.data[1].label).toBe("mystery_type");
    // @ts-expect-error — inspecting the mock
    const where = mockDb.activity_log.findMany.mock.calls[0][0].where;
    expect(where.created_at.gt).toBeInstanceOf(Date);
    expect(where.created_at.gt.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
});
