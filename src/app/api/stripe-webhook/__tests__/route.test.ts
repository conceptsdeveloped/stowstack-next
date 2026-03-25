import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";

// Mock stripe module — must be before importing the route
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    customers: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
  getStripe: vi.fn(),
}));

// Mock db with Prisma model methods
vi.mock("@/lib/db", () => ({
  db: {
    organizations: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    org_users: {
      create: vi.fn(),
    },
    activity_log: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

import { POST } from "../route";
import { stripe } from "@/lib/stripe";
import { NextRequest } from "next/server";

const mockStripe = vi.mocked(stripe);
const mockDb = vi.mocked(db);

function createWebhookRequest(body = "{}") {
  return new NextRequest("http://localhost:3000/api/stripe-webhook", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": "test-sig",
      "content-type": "application/json",
    },
  });
}

function makeEvent(type: string, data: Record<string, unknown>) {
  return { type, data: { object: data } };
}

describe("POST /api/stripe-webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    // Default: constructEvent returns a valid event
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent("checkout.session.completed", {}) as never
    );
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/stripe-webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when STRIPE_WEBHOOK_SECRET is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(createWebhookRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await POST(createWebhookRequest());
    expect(res.status).toBe(400);
  });

  describe("checkout.session.completed", () => {
    it("creates org, user, and activity log for new checkout", async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(
        makeEvent("checkout.session.completed", {
          customer: "cus_new",
          customer_email: "blake@test.com",
          metadata: {
            plan: "launch",
            companyName: "Test Storage",
            facilityCount: "2",
          },
        }) as never
      );

      // No existing org
      mockDb.organizations.findFirst.mockResolvedValue(null);
      mockDb.organizations.create.mockResolvedValue({
        id: "org-new",
        slug: "test-storage",
      } as never);
      mockDb.org_users.create.mockResolvedValue({} as never);
      mockDb.activity_log.create.mockResolvedValue({} as never);

      const res = await POST(createWebhookRequest());
      expect(res.status).toBe(200);

      // Verify org was created with correct data
      expect(mockDb.organizations.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Test Storage",
          plan: "launch",
          facility_limit: 2,
          subscription_status: "active",
          stripe_customer_id: "cus_new",
        }),
      });

      // Verify admin user was created
      expect(mockDb.org_users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organization_id: "org-new",
          email: "blake@test.com",
          role: "org_admin",
          status: "active",
        }),
      });

      // Verify activity log
      expect(mockDb.activity_log.create).toHaveBeenCalled();
    });

    it("is idempotent — skips if org already exists for customer", async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(
        makeEvent("checkout.session.completed", {
          customer: "cus_existing",
          customer_email: "blake@test.com",
          metadata: { plan: "launch", companyName: "Existing Co" },
        }) as never
      );

      mockDb.organizations.findFirst.mockResolvedValue({
        id: "org-existing",
      } as never);

      const res = await POST(createWebhookRequest());
      expect(res.status).toBe(200);
      expect(mockDb.organizations.create).not.toHaveBeenCalled();
    });

    it("skips when required metadata is missing", async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(
        makeEvent("checkout.session.completed", {
          customer: "cus_no_meta",
          customer_email: "test@test.com",
          metadata: {},
        }) as never
      );

      const res = await POST(createWebhookRequest());
      expect(res.status).toBe(200);
      expect(mockDb.organizations.create).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.updated", () => {
    it("updates org subscription status", async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(
        makeEvent("customer.subscription.updated", {
          customer: "cus_123",
          status: "active",
          metadata: { plan: "growth" },
        }) as never
      );

      mockDb.organizations.findFirst.mockResolvedValue({
        id: "org-1",
      } as never);
      mockDb.organizations.update.mockResolvedValue({} as never);

      const res = await POST(createWebhookRequest());
      expect(res.status).toBe(200);
      expect(mockDb.organizations.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: { subscription_status: "active", plan: "growth" },
      });
    });

    it("maps trialing status correctly", async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(
        makeEvent("customer.subscription.updated", {
          customer: "cus_123",
          status: "trialing",
          metadata: {},
        }) as never
      );

      mockDb.organizations.findFirst.mockResolvedValue({
        id: "org-1",
      } as never);
      mockDb.organizations.update.mockResolvedValue({} as never);

      await POST(createWebhookRequest());
      expect(mockDb.organizations.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: { subscription_status: "trialing" },
      });
    });

    it("does nothing when org not found", async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(
        makeEvent("customer.subscription.updated", {
          customer: "cus_unknown",
          status: "active",
          metadata: {},
        }) as never
      );

      mockDb.organizations.findFirst.mockResolvedValue(null);
      await POST(createWebhookRequest());
      expect(mockDb.organizations.update).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.deleted", () => {
    it("sets subscription_status to canceled and logs activity", async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(
        makeEvent("customer.subscription.deleted", {
          customer: "cus_123",
        }) as never
      );

      mockDb.organizations.findFirst.mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      } as never);
      mockDb.organizations.update.mockResolvedValue({} as never);
      mockDb.activity_log.create.mockResolvedValue({} as never);

      const res = await POST(createWebhookRequest());
      expect(res.status).toBe(200);
      expect(mockDb.organizations.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: { subscription_status: "canceled" },
      });
      expect(mockDb.activity_log.create).toHaveBeenCalled();
    });
  });

  describe("invoice.payment_failed", () => {
    it("sets subscription_status to past_due", async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(
        makeEvent("invoice.payment_failed", {
          customer: "cus_123",
        }) as never
      );

      mockDb.organizations.findFirst.mockResolvedValue({
        id: "org-1",
      } as never);
      mockDb.organizations.update.mockResolvedValue({} as never);

      const res = await POST(createWebhookRequest());
      expect(res.status).toBe(200);
      expect(mockDb.organizations.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: { subscription_status: "past_due" },
      });
    });
  });

  describe("invoice.payment_succeeded", () => {
    it("restores active status when previously past_due", async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(
        makeEvent("invoice.payment_succeeded", {
          customer: "cus_123",
        }) as never
      );

      mockDb.organizations.findFirst.mockResolvedValue({
        id: "org-1",
        subscription_status: "past_due",
      } as never);
      mockDb.organizations.update.mockResolvedValue({} as never);

      const res = await POST(createWebhookRequest());
      expect(res.status).toBe(200);
      expect(mockDb.organizations.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: { subscription_status: "active" },
      });
    });

    it("does NOT update when org is already active", async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(
        makeEvent("invoice.payment_succeeded", {
          customer: "cus_123",
        }) as never
      );

      mockDb.organizations.findFirst.mockResolvedValue({
        id: "org-1",
        subscription_status: "active",
      } as never);

      await POST(createWebhookRequest());
      expect(mockDb.organizations.update).not.toHaveBeenCalled();
    });
  });
});
