import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";

// Mock db with the Prisma model methods this cron touches. The delete runs
// inside db.$transaction(tx => ...), so $transaction invokes the callback with
// the same mock object — assertions on db.organizations.delete still observe
// calls made via `tx`.
vi.mock("@/lib/db", () => {
  const db = {
    organizations: {
      findMany: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    },
    activity_log: {
      create: vi.fn().mockResolvedValue({}),
    },
    $executeRaw: vi.fn().mockResolvedValue(0),
    $transaction: vi.fn(async (cb) => cb(db)),
  };
  return { db };
});

import { GET } from "../route";
import { createMockRequest } from "@/test/helpers";

const mockDb = vi.mocked(db);
const PATH = "/api/cron/cleanup-organizations";
const AUTH = { authorization: "Bearer test-cron-secret" };

// A Stripe DELETE response shaped like fetch's Response (only the bits the route reads).
function stripeResponse(status: number) {
  return { ok: status >= 200 && status < 300, status, text: async () => "" };
}

let fetchMock: ReturnType<typeof vi.fn>;

describe("GET /api/cron/cleanup-organizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    fetchMock = vi.fn().mockResolvedValue(stripeResponse(200));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 401 without a valid cron secret", async () => {
    const res = await GET(createMockRequest(PATH));
    expect(res.status).toBe(401);
    expect(mockDb.organizations.findMany).not.toHaveBeenCalled();
  });

  it("returns deleted:0 and calls Stripe for nothing when no orgs are due", async () => {
    mockDb.organizations.findMany.mockResolvedValue([] as never);
    const res = await GET(createMockRequest(PATH, { headers: AUTH }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, deleted: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cancels the Stripe subscription BEFORE deleting the org", async () => {
    mockDb.organizations.findMany.mockResolvedValue([
      { id: "org-1", name: "Acme", stripe_subscription_id: "sub_1" },
    ] as never);

    const res = await GET(createMockRequest(PATH, { headers: AUTH }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, deleted: 1 });

    // Stripe DELETE fired with the subscription id and secret key
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.stripe.com/v1/subscriptions/sub_1",
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer sk_test_x" },
      }),
    );
    // ...and the org was deleted
    expect(mockDb.organizations.delete).toHaveBeenCalledWith({ where: { id: "org-1" } });
  });

  it("does NOT delete the org when the Stripe cancel fails (non-404) — the billing-safety invariant", async () => {
    mockDb.organizations.findMany.mockResolvedValue([
      { id: "org-1", name: "Acme", stripe_subscription_id: "sub_1" },
    ] as never);
    fetchMock.mockResolvedValue(stripeResponse(500));

    const res = await GET(createMockRequest(PATH, { headers: AUTH }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ deleted: 0, attempted: 1 });

    expect(fetchMock).toHaveBeenCalled();
    // Org data must survive so the cron can retry the cancel next run.
    expect(mockDb.organizations.delete).not.toHaveBeenCalled();
  });

  it("proceeds to delete when Stripe returns 404 (subscription already gone)", async () => {
    mockDb.organizations.findMany.mockResolvedValue([
      { id: "org-1", name: "Acme", stripe_subscription_id: "sub_1" },
    ] as never);
    fetchMock.mockResolvedValue(stripeResponse(404));

    const res = await GET(createMockRequest(PATH, { headers: AUTH }));
    expect(await res.json()).toMatchObject({ deleted: 1 });
    expect(mockDb.organizations.delete).toHaveBeenCalledWith({ where: { id: "org-1" } });
  });

  it("skips the Stripe call when the org has no subscription id, and still deletes it", async () => {
    mockDb.organizations.findMany.mockResolvedValue([
      { id: "org-2", name: "NoSub", stripe_subscription_id: null },
    ] as never);

    const res = await GET(createMockRequest(PATH, { headers: AUTH }));
    expect(await res.json()).toMatchObject({ deleted: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockDb.organizations.delete).toHaveBeenCalledWith({ where: { id: "org-2" } });
  });
});
