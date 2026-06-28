import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET, POST } from "../route";

// Pins the auth behavior after migrating portal-upload off its private
// resolveClient onto the shared authenticatePortalRequest. The POST happy path
// (Vercel Blob + multipart) is not exercised here; auth is the point.
const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/portal-upload", () => {
  it("401s without auth", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(createMockRequest("/api/portal-upload"));
    expect(res.status).toBe(401);
  });

  it("returns a client's history scoped to their facility", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.pms_reports = { findMany: vi.fn().mockResolvedValue([{ id: "r1" }]) };
    const res = await GET(
      createMockRequest("/api/portal-upload?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reports).toHaveLength(1);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.pms_reports.findMany.mock.calls[0][0].where.facility_id).toBe("f1");
  });

  it("400s an admin that does not pass facilityId", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn() };
    const res = await GET(createAdminRequest("/api/portal-upload"));
    expect(res.status).toBe(400);
  });

  it("lets an admin list a named facility", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn() };
    // @ts-expect-error — db is a vi mock
    mockDb.pms_reports = { findMany: vi.fn().mockResolvedValue([]) };
    const res = await GET(createAdminRequest("/api/portal-upload?facilityId=f9"));
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.pms_reports.findMany.mock.calls[0][0].where.facility_id).toBe("f9");
  });
});

describe("POST /api/portal-upload", () => {
  it("401s without auth (before any file handling)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await POST(
      createMockRequest("/api/portal-upload", { method: "POST" })
    );
    expect(res.status).toBe(401);
  });

  it("400s an admin — upload requires a client context", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn() };
    const res = await POST(
      createAdminRequest("/api/portal-upload", { method: "POST" })
    );
    expect(res.status).toBe(400);
  });
});
