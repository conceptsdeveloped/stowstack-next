import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createBearerRequest, createMockRequest } from "@/test/helpers";

vi.mock("@/lib/webhook", () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST, PATCH } from "../facilities/route";

const mockDb = vi.mocked(db);

const validApiKey = {
  id: "key-1",
  organization_id: "org-1",
  name: "Test Key",
  scopes: ["facilities:read", "facilities:write"],
  rate_limit: null,
  expires_at: null,
  revoked: false,
};

describe("GET /api/v1/facilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValue([]); // data
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns 401 without auth", async () => {
    const req = createMockRequest("/api/v1/facilities");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 without facilities:read scope", async () => {
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw.mockResolvedValueOnce([
      { ...validApiKey, scopes: ["leads:read"] },
    ]);
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest("/api/v1/facilities", "sk_live_test");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns paginated facilities", async () => {
    const mockFacs = [{ id: "fac-1", name: "Main Storage" }];
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce(mockFacs) // facilities
      .mockResolvedValueOnce([{ total: 1 }]); // count
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest("/api/v1/facilities", "sk_live_test");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.facilities).toEqual(mockFacs);
    expect(body.total).toBe(1);
  });

  it("returns single facility by id", async () => {
    const fac = { id: "fac-1", name: "Main Storage" };
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce([fac]); // facility
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest(
      "/api/v1/facilities?id=fac-1",
      "sk_live_test"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.facility.name).toBe("Main Storage");
  });

  it("returns 404 for facility not found (org scoped)", async () => {
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce([]); // no facility
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest(
      "/api/v1/facilities?id=fac-other",
      "sk_live_test"
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/facilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw.mockResolvedValueOnce([validApiKey]); // auth
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns 400 when name or location missing", async () => {
    const req = createBearerRequest("/api/v1/facilities", "sk_live_test", {
      method: "POST",
      body: { name: "Test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates facility with org scoping", async () => {
    const created = { id: "fac-new", name: "New Storage" };
    mockDb.$queryRaw.mockResolvedValueOnce([created]); // insert returning

    const req = createBearerRequest("/api/v1/facilities", "sk_live_test", {
      method: "POST",
      body: { name: "New Storage", location: "123 Main St" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.facility.name).toBe("New Storage");
  });
});

describe("PATCH /api/v1/facilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw.mockResolvedValueOnce([validApiKey]); // auth
    mockDb.$queryRawUnsafe.mockResolvedValue([]);
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns 400 when id param missing", async () => {
    const req = createBearerRequest("/api/v1/facilities", "sk_live_test", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when facility not found (org scoped UPDATE)", async () => {
    mockDb.$queryRawUnsafe.mockResolvedValue([]); // no matching row
    const req = createBearerRequest(
      "/api/v1/facilities?id=fac-other",
      "sk_live_test",
      {
        method: "PATCH",
        body: { name: "Hacked Name" },
      }
    );
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it("updates and returns facility", async () => {
    const updated = { id: "fac-1", name: "Updated Storage" };
    mockDb.$queryRawUnsafe.mockResolvedValue([updated]);

    const req = createBearerRequest(
      "/api/v1/facilities?id=fac-1",
      "sk_live_test",
      {
        method: "PATCH",
        body: { name: "Updated Storage" },
      }
    );
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.facility.name).toBe("Updated Storage");
  });
});
