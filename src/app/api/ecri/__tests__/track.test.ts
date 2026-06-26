import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminRequest, createMockRequest } from "@/test/helpers";

// This route uses Prisma model methods, so supply a focused db mock.
vi.mock("@/lib/db", () => ({
  db: {
    tenants: { findFirst: vi.fn() },
    upsell_opportunities: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { POST } from "../track/route";

const m = db as unknown as {
  tenants: { findFirst: ReturnType<typeof vi.fn> };
  upsell_opportunities: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const PATH = "/api/ecri/track";
const TENANT_ID = "aaaaaaaa-0000-0000-0000-000000000001";

function postBody(body: unknown) {
  return createAdminRequest(PATH, { method: "POST", body });
}

describe("POST /api/ecri/track", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.tenants.findFirst.mockResolvedValue({
      id: TENANT_ID,
      facility_id: "fac-1",
      monthly_rate: 100,
    });
  });

  it("returns 401 without an admin key", async () => {
    const res = await POST(
      createMockRequest(PATH, { method: "POST", body: { tenantId: TENANT_ID, status: "sent" } }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when tenantId is missing", async () => {
    const res = await POST(postBody({ status: "sent" }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid status", async () => {
    const res = await POST(postBody({ tenantId: TENANT_ID, status: "bogus" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/status must be one of/i);
  });

  it("returns 404 when the tenant does not exist", async () => {
    m.tenants.findFirst.mockResolvedValue(null);
    const res = await POST(postBody({ tenantId: TENANT_ID, status: "sent" }));
    expect(res.status).toBe(404);
  });

  it("creates a new ecri opportunity when none exists and stamps sent_at on 'sent'", async () => {
    m.upsell_opportunities.findFirst.mockResolvedValue(null);
    m.upsell_opportunities.create.mockResolvedValue({
      id: "new",
      status: "sent",
      sent_at: new Date("2026-06-26T00:00:00Z"),
    });

    const res = await POST(
      postBody({ tenantId: TENANT_ID, status: "sent", currentRate: 100, newRate: 112 }),
    );
    expect(res.status).toBe(200);

    expect(m.upsell_opportunities.create).toHaveBeenCalledTimes(1);
    const arg = m.upsell_opportunities.create.mock.calls[0][0].data;
    expect(arg.type).toBe("ecri");
    expect(arg.tenant_id).toBe(TENANT_ID);
    expect(arg.facility_id).toBe("fac-1");
    expect(arg.status).toBe("sent");
    expect(arg.current_value).toBe(100);
    expect(arg.proposed_value).toBe(112);
    expect(arg.monthly_uplift).toBe(12); // derived newRate - currentRate
    expect(arg.sent_at).toBeInstanceOf(Date);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("sent");
    expect(body.sentAt).toBeTruthy();
  });

  it("updates the existing opportunity and does not overwrite an earlier sent_at", async () => {
    const earlier = new Date("2026-01-01T00:00:00Z");
    m.upsell_opportunities.findFirst.mockResolvedValue({
      id: "existing",
      status: "scheduled",
      sent_at: earlier,
    });
    m.upsell_opportunities.update.mockResolvedValue({
      id: "existing",
      status: "done",
      sent_at: earlier,
    });

    const res = await POST(postBody({ tenantId: TENANT_ID, status: "done" }));
    expect(res.status).toBe(200);

    expect(m.upsell_opportunities.update).toHaveBeenCalledTimes(1);
    const data = m.upsell_opportunities.update.mock.calls[0][0].data;
    expect(data.status).toBe("done");
    // sent_at already set -> must not be re-stamped
    expect(data.sent_at).toBeUndefined();
  });

  it("does not stamp sent_at for non-sent statuses", async () => {
    m.upsell_opportunities.findFirst.mockResolvedValue(null);
    m.upsell_opportunities.create.mockResolvedValue({
      id: "new",
      status: "scheduled",
      sent_at: null,
    });
    await POST(postBody({ tenantId: TENANT_ID, status: "scheduled" }));
    const arg = m.upsell_opportunities.create.mock.calls[0][0].data;
    expect(arg.sent_at).toBeNull();
  });

  it("returns 500 when the write throws", async () => {
    m.upsell_opportunities.findFirst.mockRejectedValue(new Error("boom"));
    const res = await POST(postBody({ tenantId: TENANT_ID, status: "sent" }));
    expect(res.status).toBe(500);
  });
});
