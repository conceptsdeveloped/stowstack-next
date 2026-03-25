import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createBearerRequest, createMockRequest } from "@/test/helpers";

import { GET, POST, PATCH } from "../tenants/route";

const mockDb = vi.mocked(db);

const validApiKey = {
  id: "key-1",
  organization_id: "org-1",
  name: "Test Key",
  scopes: ["tenants:read", "tenants:write"],
  rate_limit: null,
  expires_at: null,
  revoked: false,
};

describe("GET /api/v1/tenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValue([]); // data
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns 401 without auth", async () => {
    const req = createMockRequest("/api/v1/tenants?facilityId=fac-1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 without tenants:read scope", async () => {
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw.mockResolvedValueOnce([
      { ...validApiKey, scopes: ["leads:read"] },
    ]);
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest(
      "/api/v1/tenants?facilityId=fac-1",
      "sk_live_test"
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when neither id nor facilityId provided", async () => {
    const req = createBearerRequest("/api/v1/tenants", "sk_live_test");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns single tenant by id with org scoping", async () => {
    const tenant = { id: "t-1", name: "Jane Doe" };
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce([tenant]) // tenant query
      .mockResolvedValueOnce([]); // payments
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest(
      "/api/v1/tenants?id=t-1",
      "sk_live_test"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenant.name).toBe("Jane Doe");
    expect(body.payments).toEqual([]);
  });

  it("returns 404 for tenant not in org", async () => {
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce([]); // no tenant
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest(
      "/api/v1/tenants?id=t-other",
      "sk_live_test"
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("enforces facility ownership via requireOrgFacility", async () => {
    // Facility belongs to different org
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce([{ id: "fac-1", organization_id: "org-OTHER" }]); // requireOrgFacility
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest(
      "/api/v1/tenants?facilityId=fac-1",
      "sk_live_test"
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns paginated tenants for valid facility", async () => {
    const mockTenants = [{ id: "t-1", name: "Jane" }];
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce([{ id: "fac-1", organization_id: "org-1" }]) // requireOrgFacility
      .mockResolvedValueOnce(mockTenants) // tenants
      .mockResolvedValueOnce([{ total: 1 }]); // count
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest(
      "/api/v1/tenants?facilityId=fac-1",
      "sk_live_test"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenants).toEqual(mockTenants);
    expect(body.total).toBe(1);
  });
});

describe("POST /api/v1/tenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw.mockResolvedValueOnce([validApiKey]); // auth
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns 400 when facilityId or tenants[] missing", async () => {
    const req = createBearerRequest("/api/v1/tenants", "sk_live_test", {
      method: "POST",
      body: { facilityId: "fac-1" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when facility belongs to different org", async () => {
    mockDb.$queryRaw.mockResolvedValueOnce([
      { id: "fac-1", organization_id: "org-OTHER" },
    ]);

    const req = createBearerRequest("/api/v1/tenants", "sk_live_test", {
      method: "POST",
      body: {
        facilityId: "fac-1",
        tenants: [{ name: "Jane" }],
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("imports tenants for valid facility", async () => {
    mockDb.$queryRaw
      .mockResolvedValueOnce([{ id: "fac-1", organization_id: "org-1" }]) // requireOrgFacility
      .mockResolvedValueOnce([{ id: "t-1" }]) // tenant insert
      .mockResolvedValueOnce([{ id: "t-2" }]); // tenant insert

    const req = createBearerRequest("/api/v1/tenants", "sk_live_test", {
      method: "POST",
      body: {
        facilityId: "fac-1",
        tenants: [
          { name: "Jane", unitNumber: "A1" },
          { name: "Bob", unitNumber: "B2" },
        ],
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(2);
    expect(body.errors).toEqual([]);
  });
});

describe("PATCH /api/v1/tenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw.mockResolvedValueOnce([validApiKey]); // auth
    mockDb.$queryRawUnsafe.mockResolvedValue([]);
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns 400 when id param missing", async () => {
    const req = createBearerRequest("/api/v1/tenants", "sk_live_test", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when tenant not in org (org-scoped UPDATE)", async () => {
    mockDb.$queryRawUnsafe.mockResolvedValue([]);
    const req = createBearerRequest(
      "/api/v1/tenants?id=t-other",
      "sk_live_test",
      {
        method: "PATCH",
        body: { status: "moved_out" },
      }
    );
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it("updates and returns tenant", async () => {
    const updated = { id: "t-1", name: "Jane Updated" };
    mockDb.$queryRawUnsafe.mockResolvedValue([updated]);

    const req = createBearerRequest(
      "/api/v1/tenants?id=t-1",
      "sk_live_test",
      {
        method: "PATCH",
        body: { name: "Jane Updated" },
      }
    );
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenant.name).toBe("Jane Updated");
  });
});
