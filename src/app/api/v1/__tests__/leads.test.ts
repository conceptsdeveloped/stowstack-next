import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createBearerRequest, createMockRequest } from "@/test/helpers";

vi.mock("@/lib/webhook", () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST, PATCH } from "../leads/route";

const mockDb = vi.mocked(db);

// Mock a valid API key lookup
const validApiKey = {
  id: "key-1",
  organization_id: "org-1",
  name: "Test Key",
  scopes: ["leads:read", "leads:write"],
  rate_limit: null,
  expires_at: null,
  revoked: false,
};

describe("GET /api/v1/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // First $queryRaw call = API key lookup, second = actual query
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // requireApiAuth
      .mockResolvedValue([]); // actual data queries
    mockDb.$queryRawUnsafe.mockResolvedValue([]);
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns 401 without auth header", async () => {
    const req = createMockRequest("/api/v1/leads");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 without leads:read scope", async () => {
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw.mockResolvedValueOnce([
      { ...validApiKey, scopes: ["facilities:read"] },
    ]);
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest("/api/v1/leads", "sk_live_test");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns paginated leads for valid request", async () => {
    const mockLeads = [
      { id: "lead-1", name: "John", email: "john@test.com" },
    ];
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValue([]); // fallback
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce(mockLeads) // leads query
      .mockResolvedValueOnce([{ total: 1 }]); // count query
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest("/api/v1/leads", "sk_live_test");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leads).toEqual(mockLeads);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
  });

  it("returns single lead by id", async () => {
    const mockLead = { id: "lead-1", name: "John" };
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce([mockLead]); // lead query
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest("/api/v1/leads?id=lead-1", "sk_live_test");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead).toEqual(mockLead);
  });

  it("returns 404 for lead not found", async () => {
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce([]); // no lead found
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest(
      "/api/v1/leads?id=nonexistent",
      "sk_live_test"
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValue([]); // default
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns 400 when facilityId is missing", async () => {
    const req = createBearerRequest("/api/v1/leads", "sk_live_test", {
      method: "POST",
      body: { name: "John" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when no contact info provided", async () => {
    const req = createBearerRequest("/api/v1/leads", "sk_live_test", {
      method: "POST",
      body: { facilityId: "fac-1" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when facility belongs to different org", async () => {
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce([{ id: "fac-1", organization_id: "org-OTHER" }]); // facility lookup
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest("/api/v1/leads", "sk_live_test", {
      method: "POST",
      body: { facilityId: "fac-1", name: "John" },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("creates lead when facility belongs to same org", async () => {
    const newLead = { id: "lead-new", name: "John" };
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw
      .mockResolvedValueOnce([validApiKey]) // auth
      .mockResolvedValueOnce([{ id: "fac-1", organization_id: "org-1" }]) // facility
      .mockResolvedValueOnce([newLead]); // insert returning
    mockDb.$executeRaw.mockResolvedValue(0);

    const req = createBearerRequest("/api/v1/leads", "sk_live_test", {
      method: "POST",
      body: { facilityId: "fac-1", name: "John", email: "john@test.com" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead.id).toBe("lead-new");
  });
});

describe("PATCH /api/v1/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockReset();
    mockDb.$queryRaw.mockResolvedValueOnce([validApiKey]); // auth
    mockDb.$queryRawUnsafe.mockResolvedValue([]);
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns 400 when id param is missing", async () => {
    const req = createBearerRequest("/api/v1/leads", "sk_live_test", {
      method: "PATCH",
      body: { leadStatus: "contacted" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when lead not found (wrong org)", async () => {
    mockDb.$queryRawUnsafe.mockResolvedValue([]); // no matching lead
    const req = createBearerRequest(
      "/api/v1/leads?id=lead-1",
      "sk_live_test",
      {
        method: "PATCH",
        body: { leadStatus: "contacted" },
      }
    );
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it("updates lead and returns it", async () => {
    const updated = { id: "lead-1", lead_status: "contacted" };
    mockDb.$queryRawUnsafe.mockResolvedValue([updated]);

    const req = createBearerRequest(
      "/api/v1/leads?id=lead-1",
      "sk_live_test",
      {
        method: "PATCH",
        body: { leadStatus: "contacted" },
      }
    );
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead.lead_status).toBe("contacted");
  });
});
