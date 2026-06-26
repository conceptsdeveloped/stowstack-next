import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminRequest, createMockRequest } from "@/test/helpers";

vi.mock("@/lib/db", () => ({
  db: {
    tenants: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { POST } from "../letter/route";

const m = db as unknown as {
  tenants: { findFirst: ReturnType<typeof vi.fn> };
  $queryRaw: ReturnType<typeof vi.fn>;
};

const PATH = "/api/ecri/letter";
const TENANT_ID = "aaaaaaaa-0000-0000-0000-000000000001";

const TENANT = {
  id: TENANT_ID,
  name: "Jane Doe",
  unit_number: "B12",
  monthly_rate: 100,
  facilities: {
    name: "Paw Paw Storage",
    location: "Paw Paw, MI",
    google_phone: "(269) 555-0100",
    contact_phone: null,
  },
};

function postBody(body: unknown) {
  return createAdminRequest(PATH, { method: "POST", body });
}

describe("POST /api/ecri/letter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.tenants.findFirst.mockResolvedValue(TENANT);
    m.$queryRaw.mockResolvedValue([{ market_rate: 150, bucket: "very_low" }]);
  });

  it("returns 401 without an admin key", async () => {
    const res = await POST(
      createMockRequest(PATH, { method: "POST", body: { tenantId: TENANT_ID } }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when tenantId is missing", async () => {
    const res = await POST(postBody({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the tenant is not found", async () => {
    m.tenants.findFirst.mockResolvedValue(null);
    const res = await POST(postBody({ tenantId: TENANT_ID }));
    expect(res.status).toBe(404);
  });

  it("generates a letter using the sensitivity-derived suggested rate", async () => {
    const res = await POST(postBody({ tenantId: TENANT_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // very_low cap 12% on 100, market 150 -> suggested 112
    expect(body.newRate).toBe(112);
    expect(body.currentRate).toBe(100);
    expect(body.unit).toBe("B12");
    expect(body.subject).toContain("B12");
    expect(body.body).toContain("Jane Doe");
    expect(body.body).toContain("$112");
    expect(body.body).toContain("Paw Paw Storage");
    expect(body.noticeDays).toBe(45); // default when no effectiveDate
  });

  it("honors an explicit newRate override", async () => {
    const res = await POST(postBody({ tenantId: TENANT_ID, newRate: 130 }));
    const body = await res.json();
    expect(body.newRate).toBe(130);
    expect(body.body).toContain("$130");
  });

  it("computes notice days from an explicit effectiveDate", async () => {
    // Far-future date -> noticeDays well over the default.
    const res = await POST(
      postBody({ tenantId: TENANT_ID, newRate: 130, effectiveDate: "2027-12-31" }),
    );
    const body = await res.json();
    expect(body.effectiveDate).toBe("2027-12-31");
    expect(body.noticeDays).toBeGreaterThan(45);
  });

  it("returns 422 when no increase is recommended and no override is given", async () => {
    m.$queryRaw.mockResolvedValue([{ market_rate: 90, bucket: "low" }]); // below current
    const res = await POST(postBody({ tenantId: TENANT_ID }));
    expect(res.status).toBe(422);
  });

  it("rejects a newRate that is not above the current rate", async () => {
    const res = await POST(postBody({ tenantId: TENANT_ID, newRate: 90 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid effectiveDate", async () => {
    const res = await POST(
      postBody({ tenantId: TENANT_ID, newRate: 130, effectiveDate: "not-a-date" }),
    );
    expect(res.status).toBe(400);
  });
});
