import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { createManageToken, HEADER_NAME } from "@/lib/manage-session";
import { GET } from "../route";

const mockDb = vi.mocked(db, true);

const FACILITY_A = "11111111-1111-4111-8111-111111111111";
const FACILITY_B = "22222222-2222-4222-8222-222222222222";
const TENANT_B = "33333333-3333-4333-8333-333333333333";

function tenantRow(facilityId: string) {
  return {
    id: TENANT_B,
    facility_id: facilityId,
    name: "Renter",
    facility_name: "Some Facility",
    facility_location: "Somewhere",
  };
}

function mockDelegates() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  (mockDb as any).tenant_payments = { findMany: vi.fn().mockResolvedValue([]) };
  (mockDb as any).delinquency_escalations = { findMany: vi.fn().mockResolvedValue([]) };
  (mockDb as any).churn_predictions = { findUnique: vi.fn().mockResolvedValue(null) };
  (mockDb as any).upsell_opportunities = { findMany: vi.fn().mockResolvedValue([]) };
  (mockDb as any).tenant_communications = { findMany: vi.fn().mockResolvedValue([]) };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function manageRequest(url: string, facilityIds: string[]) {
  const token = createManageToken(facilityIds, "code");
  if (!token) throw new Error("manage token not configured in test env");
  return createMockRequest(url, { headers: { [HEADER_NAME]: token } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDelegates();
});

describe("GET /api/tenants?tenantId= — cross-facility IDOR guard", () => {
  it("404s when a facility-A manage session requests a facility-B tenant", async () => {
    mockDb.$queryRaw.mockResolvedValue([tenantRow(FACILITY_B)]);
    const res = await GET(
      manageRequest(
        `/api/tenants?facilityId=${FACILITY_A}&tenantId=${TENANT_B}`,
        [FACILITY_A]
      )
    );
    expect(res.status).toBe(404);
    // No sub-resource leakage after the denial.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mockDb as any).tenant_payments.findMany).not.toHaveBeenCalled();
  });

  it("200s when the manage session is scoped to the tenant's own facility", async () => {
    mockDb.$queryRaw.mockResolvedValue([tenantRow(FACILITY_B)]);
    const res = await GET(
      manageRequest(
        `/api/tenants?facilityId=${FACILITY_B}&tenantId=${TENANT_B}`,
        [FACILITY_B]
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenant.id).toBe(TENANT_B);
  });

  it("200s for admin-key callers regardless of facility", async () => {
    mockDb.$queryRaw.mockResolvedValue([tenantRow(FACILITY_B)]);
    const res = await GET(
      createAdminRequest(`/api/tenants?tenantId=${TENANT_B}`)
    );
    expect(res.status).toBe(200);
  });
});
