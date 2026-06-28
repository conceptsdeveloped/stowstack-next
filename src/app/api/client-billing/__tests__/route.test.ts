import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET, POST, PATCH } from "../route";

// M5: invoices are Postgres-backed (client_invoices). Covers auth, the wire
// mapping the portal depends on, admin authoring, and mark-paid.
const mockDb = vi.mocked(db, true);

const ROW = {
  id: "i1",
  amount: 1499,
  ad_spend: 1000,
  fee: 499,
  status: "sent",
  period: "June 2026",
  description: "Monthly",
  due_at: new Date("2026-07-01T00:00:00Z"),
  paid_at: null,
  issued_at: new Date("2026-06-01T00:00:00Z"),
  created_at: new Date("2026-06-01T00:00:00Z"),
  stripe_invoice_id: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/client-billing", () => {
  it("401s without any credentials", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(createMockRequest("/api/client-billing"));
    expect(res.status).toBe(401);
  });

  it("401s when code + email do not resolve to a client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn().mockResolvedValue(null) };
    const res = await GET(
      createMockRequest("/api/client-billing?code=BAD&email=o@e.com")
    );
    expect(res.status).toBe(401);
  });

  it("returns the client's own invoices mapped to the wire contract", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1", facility_id: "f1" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.client_invoices = { findMany: vi.fn().mockResolvedValue([ROW]) };

    const res = await GET(
      createMockRequest("/api/client-billing?code=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices[0]).toEqual({
      id: "i1",
      month: "June 2026",
      amount: 1499,
      adSpend: 1000,
      managementFee: 499,
      status: "sent",
      dueDate: "2026-07-01T00:00:00.000Z",
      paidDate: null,
      notes: "Monthly",
      createdAt: "2026-06-01T00:00:00.000Z",
      stripeInvoiceId: null,
    });
    // Scoped to the authenticated client.
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_invoices.findMany.mock.calls[0][0].where.client_id).toBe("c1");
  });

  it("400s an admin with neither ?code nor ?all=true", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findFirst: vi.fn() };
    const res = await GET(createAdminRequest("/api/client-billing"));
    expect(res.status).toBe(400);
  });

  it("lets an admin list all invoices tagged with each client's code", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.client_invoices = {
      findMany: vi.fn().mockResolvedValue([{ ...ROW, client_id: "c1" }]),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([{ id: "c1", access_code: "AC123" }]),
    };
    const res = await GET(createAdminRequest("/api/client-billing?all=true"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices[0].code).toBe("AC123");
  });
});

describe("POST /api/client-billing", () => {
  const valid = {
    code: "AC",
    month: "June 2026",
    amount: 1998,
    adSpend: 1000,
    managementFee: 499,
    dueDate: "2026-07-01",
    notes: "n",
  };

  it("401s without the admin key", async () => {
    const res = await POST(
      createMockRequest("/api/client-billing", { method: "POST", body: valid })
    );
    expect(res.status).toBe(401);
  });

  it("400s on missing required fields", async () => {
    const res = await POST(
      createAdminRequest("/api/client-billing", { method: "POST", body: { code: "AC" } })
    );
    expect(res.status).toBe(400);
  });

  it("404s when the code resolves to no client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue(null) };
    const res = await POST(
      createAdminRequest("/api/client-billing", { method: "POST", body: valid })
    );
    expect(res.status).toBe(404);
  });

  it("creates an invoice under the resolved client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue({ id: "c1" }) };
    // @ts-expect-error — db is a vi mock
    mockDb.client_invoices = {
      create: vi.fn().mockResolvedValue({ ...ROW, amount: 1998, status: "draft" }),
    };
    const res = await POST(
      createAdminRequest("/api/client-billing", { method: "POST", body: valid })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoice.amount).toBe(1998);
    // @ts-expect-error — inspecting the mock
    const data = mockDb.client_invoices.create.mock.calls[0][0].data;
    expect(data.client_id).toBe("c1");
    expect(data.period).toBe("June 2026");
    // No link given -> stripe_invoice_id is not written (stays null by default).
    expect(data.stripe_invoice_id).toBeUndefined();
  });

  it("persists stripe_invoice_id when an invoice is linked to its Stripe counterpart", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue({ id: "c1" }) };
    // @ts-expect-error — db is a vi mock
    mockDb.client_invoices = {
      create: vi.fn().mockResolvedValue({ ...ROW, stripe_invoice_id: "in_stripe_1" }),
    };
    const res = await POST(
      createAdminRequest("/api/client-billing", {
        method: "POST",
        body: { ...valid, stripeInvoiceId: "in_stripe_1" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoice.stripeInvoiceId).toBe("in_stripe_1");
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_invoices.create.mock.calls[0][0].data.stripe_invoice_id).toBe("in_stripe_1");
  });
});

describe("PATCH /api/client-billing", () => {
  it("400s without invoiceId", async () => {
    const res = await PATCH(
      createAdminRequest("/api/client-billing", { method: "PATCH", body: { status: "paid" } })
    );
    expect(res.status).toBe(400);
  });

  it("404s an unknown invoice", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.client_invoices = { findUnique: vi.fn().mockResolvedValue(null) };
    const res = await PATCH(
      createAdminRequest("/api/client-billing", {
        method: "PATCH",
        body: { invoiceId: "nope", status: "paid" },
      })
    );
    expect(res.status).toBe(404);
  });

  it("marks an invoice paid and stamps paid_at", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.client_invoices = {
      findUnique: vi.fn().mockResolvedValue({ id: "i1" }),
      update: vi.fn().mockResolvedValue({ ...ROW, status: "paid", paid_at: new Date("2026-06-10T00:00:00Z") }),
    };
    const res = await PATCH(
      createAdminRequest("/api/client-billing", {
        method: "PATCH",
        body: { invoiceId: "i1", status: "paid" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoice.status).toBe("paid");
    // paid_at auto-stamped when marking paid without an explicit date.
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_invoices.update.mock.calls[0][0].data.paid_at).toBeInstanceOf(Date);
  });

  it("links or unlinks the Stripe invoice id on PATCH (empty string clears it)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.client_invoices = {
      findUnique: vi.fn().mockResolvedValue({ id: "i1" }),
      update: vi.fn().mockResolvedValue({ ...ROW, stripe_invoice_id: "in_stripe_9" }),
    };
    // Linking.
    await PATCH(
      createAdminRequest("/api/client-billing", {
        method: "PATCH",
        body: { invoiceId: "i1", stripeInvoiceId: "in_stripe_9" },
      })
    );
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_invoices.update.mock.calls[0][0].data.stripe_invoice_id).toBe("in_stripe_9");

    // Clearing: an explicit empty string nulls the link.
    await PATCH(
      createAdminRequest("/api/client-billing", {
        method: "PATCH",
        body: { invoiceId: "i1", stripeInvoiceId: "" },
      })
    );
    // @ts-expect-error — inspecting the mock
    expect(mockDb.client_invoices.update.mock.calls[1][0].data.stripe_invoice_id).toBeNull();
  });
});
