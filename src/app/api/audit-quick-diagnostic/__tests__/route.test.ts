import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAdminRequest, createMockRequest } from "@/test/helpers";

// Rate limiter is a no-op in tests (avoids hitting Upstash).
vi.mock("@/lib/with-rate-limit", () => ({
  applyRateLimit: vi.fn().mockResolvedValue(null),
}));

// Only resolveSiteUrl is used from the email layer; keep it deterministic.
vi.mock("@/lib/email", () => ({
  resolveSiteUrl: () => "https://test.local",
}));

import { POST } from "../route";

const ADMIN = "test-admin-secret-key";

function adminPost(body: unknown) {
  return POST(
    createAdminRequest("http://localhost:3000/api/audit-quick-diagnostic", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body,
    })
  );
}

const okGenerator = () =>
  ({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      slug: "sunset-storage-ab12",
      auditUrl: "https://storageads.com/audit/sunset-storage-ab12",
      overallScore: 58,
      overallGrade: "C",
    }),
  }) as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.ADMIN_SECRET = ADMIN;
  fetchMock = vi.fn().mockResolvedValue(okGenerator());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("POST /api/audit-quick-diagnostic", () => {
  it("rejects a non-admin request without calling the generator", async () => {
    const res = await POST(
      createMockRequest("http://localhost:3000/api/audit-quick-diagnostic", {
        method: "POST",
        body: { facilityName: "X", facilityAddress: "Y" },
      })
    );
    expect(res.status).not.toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires facilityName and facilityAddress", async () => {
    const res = await adminPost({ facilityName: "Sunset Storage" });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds a full diagnostic from sparse public data and relays the slug", async () => {
    const res = await adminPost({
      facilityName: "Sunset Storage",
      facilityAddress: "123 Main St, Austin, TX",
      websiteUrl: "https://sunsetstorage.com",
      googleRating: "4.2",
      reviewCount: "87",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      success: true,
      slug: "sunset-storage-ab12",
      auditUrl: "https://storageads.com/audit/sunset-storage-ab12",
      overallScore: 58,
    });

    // Delegated to the real generator exactly once, admin-authenticated.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://test.local/api/audit-generate-diagnostic");
    expect(init.headers["x-admin-key"]).toBe(ADMIN);

    const sent = JSON.parse(init.body).diagnosticJson;
    expect(sent.facilityName).toBe("Sunset Storage");
    expect(sent.howHeard).toBe("quick_diagnostic");
    // Public signals flow through to the prompt's "known" data.
    expect(sent.scrapedGoogleRating).toBe(4.2);
    expect(sent.scrapedReviewCount).toBe(87);
    expect(sent.googleRating).toBe("4.2");
    // Unknown intake fields are defaulted, never undefined.
    expect(sent.occupancy).toBe("Not provided");
    expect(sent.leadSources).toEqual([]);
  });

  it("relays a generator failure as an error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Failed to generate audit — check API key" }),
    } as unknown as Response);

    const res = await adminPost({
      facilityName: "Sunset Storage",
      facilityAddress: "123 Main St, Austin, TX",
    });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Failed to generate audit");
  });
});
