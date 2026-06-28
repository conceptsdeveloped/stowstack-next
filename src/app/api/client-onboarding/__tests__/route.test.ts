import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest } from "@/test/helpers";
import { GET, PATCH } from "../route";

// Pins the auth behavior after migrating client-onboarding onto the shared
// authenticatePortalRequest. Note PATCH credentials moved from the JSON body to
// the query string (the onboarding page was updated to match).
const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/client-onboarding", () => {
  it("401s when code + email do not resolve to a client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(
      createMockRequest("/api/client-onboarding?code=BAD&email=o@e.com")
    );
    expect(res.status).toBe(401);
  });

  it("returns an empty scaffold for a new client (via the `code` alias)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_onboarding = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(
      createMockRequest("/api/client-onboarding?code=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completionPct).toBe(0);
    expect(body.onboarding.steps.facilityDetails.completed).toBe(false);
  });
});

describe("PATCH /api/client-onboarding", () => {
  it("401s without valid query credentials", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await PATCH(
      createMockRequest("/api/client-onboarding?code=BAD&email=o@e.com", {
        method: "PATCH",
        body: { step: "facilityDetails", data: { x: 1 } },
      })
    );
    expect(res.status).toBe(401);
  });

  it("400s an invalid step", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    const res = await PATCH(
      createMockRequest("/api/client-onboarding?code=AC&email=o@e.com", {
        method: "PATCH",
        body: { step: "bogus", data: { x: 1 } },
      })
    );
    expect(res.status).toBe(400);
  });

  it("saves a step for an authenticated client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_onboarding = {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: "ob1", client_id: "c1", steps: {} }),
      update: vi.fn().mockResolvedValue({}),
    };
    const res = await PATCH(
      createMockRequest("/api/client-onboarding?code=AC&email=o@e.com", {
        method: "PATCH",
        body: { step: "competitorIntel", data: { differentiation: "we are closer" } },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_onboarding.update).toHaveBeenCalled();
  });
});
