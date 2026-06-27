import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { stripe } from "@/lib/stripe";
import { POST } from "../route";

vi.mock("@/lib/stripe", () => ({
  stripe: { billingPortal: { sessions: { create: vi.fn() } } },
}));

const mockDb = vi.mocked(db, true);
const createPortal = stripe.billingPortal.sessions
  .create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/create-billing-portal", () => {
  it("401s an unauthenticated request (no portal client, no admin)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await POST(
      createMockRequest("/api/create-billing-portal", { method: "POST" })
    );
    expect(res.status).toBe(401);
    expect(createPortal).not.toHaveBeenCalled();
  });

  it("400s an admin — there is no client/facility context to bill", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn() };
    const res = await POST(
      createAdminRequest("/api/create-billing-portal", { method: "POST" })
    );
    expect(res.status).toBe(400);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.clients.findFirst).not.toHaveBeenCalled();
  });

  it("400s a client whose organization has no Stripe customer", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facilities = {
      findUnique: vi.fn().mockResolvedValue({ organizations: null }),
    };
    const res = await POST(
      createMockRequest(
        "/api/create-billing-portal?accessCode=AC&email=owner@example.com",
        { method: "POST" }
      )
    );
    expect(res.status).toBe(400);
    expect(createPortal).not.toHaveBeenCalled();
  });

  it("returns a billing-portal url for a client with a Stripe customer", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facilities = {
      findUnique: vi
        .fn()
        .mockResolvedValue({ organizations: { stripe_customer_id: "cus_123" } }),
    };
    createPortal.mockResolvedValue({
      url: "https://billing.stripe.com/session/xyz",
    });

    const res = await POST(
      createMockRequest(
        "/api/create-billing-portal?accessCode=AC&email=owner@example.com",
        { method: "POST" }
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://billing.stripe.com/session/xyz");
    // The Stripe customer is resolved through the client's facility → org.
    expect(createPortal).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_123" })
    );
  });
});
