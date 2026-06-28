import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET } from "../route";

// Mock the heavy PDF renderer — the route's job (auth, scoping, data, headers)
// is what we test; PDF layout is covered by the component itself.
vi.mock("@/lib/occupancy-pdf", () => ({
  generateOccupancyPdf: vi.fn(async () => Buffer.from("%PDF-1.7 fake")),
}));

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/client-report-pdf", () => {
  it("401s without portal credentials", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(createMockRequest("/api/client-report-pdf"));
    expect(res.status).toBe(401);
  });

  it("400s an admin that does not name a clientId", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn() };
    const res = await GET(createAdminRequest("/api/client-report-pdf"));
    expect(res.status).toBe(400);
  });

  it("404s when the client has no facility", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
      findUnique: vi.fn().mockResolvedValue(null),
    };
    const res = await GET(
      createMockRequest("/api/client-report-pdf?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(404);
  });

  it("returns a PDF for an authenticated client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
      findUnique: vi.fn().mockResolvedValue({ facility_id: "f1", signed_at: null }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facilities = { findUnique: vi.fn().mockResolvedValue({ name: "Acme" }) };
    // No snapshot → occupancy null path (skips lead_status_events counting).
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_snapshots = { findFirst: vi.fn().mockResolvedValue(null) };
    // @ts-expect-error — db is a vi mock
    mockDb.facility_pms_units = { findMany: vi.fn().mockResolvedValue([]) };

    const res = await GET(
      createMockRequest("/api/client-report-pdf?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("acme-report.pdf");
  });
});
