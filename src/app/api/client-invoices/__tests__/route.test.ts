import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";

// Email is a side-effect; portal-auth is the GET gate. Admin-key auth on POST
// uses the REAL requireAdminKey (createAdminRequest carries the matching header).
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
  SENDERS: { billing: "StorageAds Billing <billing@storageads.com>" },
}));
vi.mock("@/lib/portal-auth", () => ({ authenticatePortalRequest: vi.fn() }));

import { authenticatePortalRequest } from "@/lib/portal-auth";
import { GET, POST } from "../route";

const mockDb = vi.mocked(db, true);
const mockQueryRaw = vi.mocked(db.$queryRaw);
const mockAuth = vi.mocked(authenticatePortalRequest);

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryRaw.mockResolvedValue([] as never);
});

// A client row as returned by the POST's raw join (clients + facility + org).
const clientRow = (over: Record<string, unknown> = {}) => ({
  id: "client-1",
  name: "Pawpaw Storage",
  email: "owner@pawpaw.com",
  facility_id: "fac-1",
  facility_name: "Pawpaw Self Storage",
  fac_name: "Pawpaw Self Storage",
  plan: "growth", // 999
  ...over,
});

describe("POST /api/client-invoices (admin-only authoring)", () => {
  it("rejects a non-admin request before touching the DB", async () => {
    const res = await POST(
      createMockRequest("/api/client-invoices", {
        method: "POST",
        body: { clientId: "client-1" },
      })
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(200);
    // Fail-closed: the client lookup must never run for an unauthenticated caller.
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("400s an admin request with no clientId", async () => {
    const res = await POST(
      createAdminRequest("/api/client-invoices", { method: "POST", body: {} })
    );
    expect(res.status).toBe(400);
  });

  it("404s when the clientId resolves to no client", async () => {
    mockQueryRaw.mockResolvedValue([] as never);
    const res = await POST(
      createAdminRequest("/api/client-invoices", {
        method: "POST",
        body: { clientId: "missing" },
      })
    );
    expect(res.status).toBe(404);
  });

  it("authors an invoice: emails it, persists the canonical row, returns the total", async () => {
    mockQueryRaw.mockResolvedValue([clientRow()] as never);
    // @ts-expect-error — db is a vi mock; per-test methods assigned here.
    mockDb.client_invoices = { create: vi.fn().mockResolvedValue({}) };
    // @ts-expect-error — db is a vi mock
    mockDb.activity_log = { create: vi.fn().mockResolvedValue({}) };

    const res = await POST(
      createAdminRequest("/api/client-invoices", {
        method: "POST",
        body: {
          clientId: "client-1",
          adSpend: 100,
          additionalItems: [{ description: "Setup", amount: 50 }],
        },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    // growth plan 999 + adSpend 100 + extra 50.
    expect(body.total).toBe(1149);
    expect(body.sentTo).toBe("owner@pawpaw.com");
    expect(typeof body.invoiceNumber).toBe("string");

    // Persisted to the single source of record with the same total + 'sent' status.
    // @ts-expect-error — inspecting the mock
    const persisted = mockDb.client_invoices.create.mock.calls[0][0].data;
    expect(persisted.client_id).toBe("client-1");
    expect(persisted.amount).toBe(1149);
    expect(persisted.status).toBe("sent");
  });

  it("defaults to the launch price when the org has no plan", async () => {
    mockQueryRaw.mockResolvedValue([clientRow({ plan: null })] as never);
    // @ts-expect-error — db is a vi mock
    mockDb.client_invoices = { create: vi.fn().mockResolvedValue({}) };
    // @ts-expect-error — db is a vi mock
    mockDb.activity_log = { create: vi.fn().mockResolvedValue({}) };

    const res = await POST(
      createAdminRequest("/api/client-invoices", {
        method: "POST",
        body: { clientId: "client-1" },
      })
    );
    const body = await res.json();
    expect(body.total).toBe(499); // launch fallback, no add-ons
  });
});

describe("GET /api/client-invoices (scoped listing)", () => {
  it("fails closed when the request is unauthenticated", async () => {
    mockAuth.mockResolvedValue(
      NextResponse.json({ error: "unauthorized" }, { status: 401 }) as never
    );
    // @ts-expect-error — db is a vi mock
    mockDb.activity_log = { findMany: vi.fn().mockResolvedValue([]) };

    const res = await GET(createMockRequest("/api/client-invoices"));
    expect(res.status).toBe(401);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.activity_log.findMany).not.toHaveBeenCalled();
  });

  it("scopes a client to ONLY their own facility", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "client", facilityId: "fac-1", clientId: "c-1" });
    // @ts-expect-error — db is a vi mock
    mockDb.activity_log = { findMany: vi.fn().mockResolvedValue([]) };

    const res = await GET(
      createMockRequest("/api/client-invoices?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    const where = mockDb.activity_log.findMany.mock.calls[0][0].where;
    expect(where.facility_id).toBe("fac-1"); // never another tenant's facility
    expect(where.type).toBe("invoice_sent");
  });

  it("lets an admin list every facility's invoices when no clientId is given", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "admin" });
    // @ts-expect-error — db is a vi mock
    mockDb.activity_log = { findMany: vi.fn().mockResolvedValue([]) };

    const res = await GET(createAdminRequest("/api/client-invoices"));
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    const where = mockDb.activity_log.findMany.mock.calls[0][0].where;
    expect(where.facility_id).toBeUndefined(); // god-mode: no facility filter
    expect(where.type).toBe("invoice_sent");
  });

  it("narrows an admin listing to a facility when clientId is supplied", async () => {
    // @ts-expect-error — mocked scope
    mockAuth.mockResolvedValue({ kind: "admin" });
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue({ facility_id: "fac-9" }) };
    // @ts-expect-error — db is a vi mock
    mockDb.activity_log = { findMany: vi.fn().mockResolvedValue([]) };

    const res = await GET(
      createAdminRequest("/api/client-invoices?clientId=client-9")
    );
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.clients.findUnique).toHaveBeenCalled();
    // @ts-expect-error — inspecting the mock
    const where = mockDb.activity_log.findMany.mock.calls[0][0].where;
    expect(where.facility_id).toBe("fac-9");
  });
});
