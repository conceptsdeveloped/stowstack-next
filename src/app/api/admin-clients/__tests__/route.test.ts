import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET } from "../route";

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin-clients", () => {
  it("401s without the admin key (fails closed, never queries)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findMany: vi.fn() };
    const res = await GET(createMockRequest("/api/admin-clients"));
    expect(res.status).toBe(401);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.clients.findMany).not.toHaveBeenCalled();
  });

  it("returns the signed-client directory mapped to a stable shape", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findMany: vi.fn().mockResolvedValue([
        { id: "c1", name: "Acme", email: "a@e.com", facility_name: "Acme Storage" },
        { id: "c2", name: "Bex", email: "b@e.com", facility_name: null },
      ]),
    };
    const res = await GET(createAdminRequest("/api/admin-clients"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clients).toEqual([
      { id: "c1", name: "Acme", email: "a@e.com", facilityName: "Acme Storage" },
      { id: "c2", name: "Bex", email: "b@e.com", facilityName: null },
    ]);
    // Sorted by facility then name so the picker is scannable.
    // @ts-expect-error — inspecting the mock
    const args = mockDb.clients.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual([{ facility_name: "asc" }, { name: "asc" }]);
  });
});
