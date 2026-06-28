import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
  SENDERS: { reports: "StorageAds <reports@storageads.com>" },
  resolveSiteUrl: () => "https://storageads.com",
}));
import { sendEmail } from "@/lib/email";
import { notifyClientsReportReady } from "@/lib/report-notify";

const mockDb = vi.mocked(db, true);
const mockSendEmail = vi.mocked(sendEmail);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifyClientsReportReady", () => {
  it("emails the facility's active client with a portal-reports link", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findMany: vi.fn().mockResolvedValue([
        { id: "c1", email: "owner@acme.com", name: "Dana", facility_name: "Acme Storage" },
      ]),
    };

    await notifyClientsReportReady("f1");

    // Only active (non-deleted) clients of this facility are looked up.
    // @ts-expect-error — inspecting the mock
    const where = mockDb.clients.findMany.mock.calls[0][0].where;
    expect(where.facility_id).toBe("f1");
    expect(where.deleted_at).toBeNull();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const params = mockSendEmail.mock.calls[0][0];
    expect(params.to).toBe("owner@acme.com");
    expect(params.subject).toBe("Your latest report is ready");
    expect(params.html).toContain("/portal/reports");
    expect(params.text).toContain("Dana");
    // Idempotency keyed per client per UTC day → no same-day duplicates.
    expect(params.idempotencyKey).toMatch(/^report-ready-c1-\d{4}-\d{2}-\d{2}$/);
  });

  it("notifies every active client of the facility", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findMany: vi.fn().mockResolvedValue([
        { id: "c1", email: "a@x.com", name: "A", facility_name: "F" },
        { id: "c2", email: "b@x.com", name: "B", facility_name: "F" },
      ]),
    };
    await notifyClientsReportReady("f1");
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    const recipients = mockSendEmail.mock.calls.map((c) => c[0].to);
    expect(recipients).toEqual(["a@x.com", "b@x.com"]);
  });

  it("skips a client with no email on file", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findMany: vi.fn().mockResolvedValue([
        { id: "c1", email: "", name: "A", facility_name: "F" },
      ]),
    };
    await notifyClientsReportReady("f1");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing when the facility has no clients", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findMany: vi.fn().mockResolvedValue([]) };
    await notifyClientsReportReady("f1");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("never throws when the client lookup fails", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findMany: vi.fn().mockRejectedValue(new Error("db down")) };
    await expect(notifyClientsReportReady("f1")).resolves.toBeUndefined();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("swallows a per-client send failure and keeps notifying the rest", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findMany: vi.fn().mockResolvedValue([
        { id: "c1", email: "a@x.com", name: "A", facility_name: "F" },
        { id: "c2", email: "b@x.com", name: "B", facility_name: "F" },
      ]),
    };
    mockSendEmail.mockRejectedValueOnce(new Error("resend down"));
    await expect(notifyClientsReportReady("f1")).resolves.toBeUndefined();
    // Both were attempted despite the first throwing.
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });
});
