import { describe, it, expect, vi, beforeEach } from "vitest";

// web-push is the only true side-effect; mock its default export.
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));

// db is auto-mocked by src/test/setup.ts (@/lib/db → $queryRaw/$executeRaw).
import { db } from "@/lib/db";
import webpush from "web-push";
import { sendPushToAll } from "../push";

const mockQueryRaw = vi.mocked(db.$queryRaw);
const mockExecRaw = vi.mocked(db.$executeRaw);
const mockSend = vi.mocked(webpush.sendNotification);

const PAYLOAD = { title: "Hi", body: "there", url: "/portal/messages", tag: "t" };

// A composed Prisma.Sql exposes `.values` = the flattened bind parameters. That's
// where the tenant predicates (user_type / user_id) land, so asserting on it
// proves the query is scoped — the boundary a cross-tenant push would violate.
function whereValues(): unknown[] {
  const arg = mockQueryRaw.mock.calls[0]?.[1] as { values?: unknown[] } | undefined;
  return arg?.values ?? [];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryRaw.mockResolvedValue([] as never);
  mockExecRaw.mockResolvedValue(0 as never);
  mockSend.mockResolvedValue(undefined as never);
});

describe("sendPushToAll", () => {
  // MUST run first: ensureVapid() caches success in module state, so once a
  // later (configured) test flips it on it stays on. With the keys absent here
  // it short-circuits before ever touching the DB.
  it("is a no-op when VAPID is not configured (no DB query)", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;

    await sendPushToAll(PAYLOAD, { userType: "client", userId: "c1" });

    expect(mockQueryRaw).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  describe("with VAPID configured", () => {
    beforeEach(() => {
      process.env.VAPID_PUBLIC_KEY = "pub";
      process.env.VAPID_PRIVATE_KEY = "priv";
      process.env.VAPID_SUBJECT = "mailto:test@storageads.com";
    });

    it("scopes to a single tenant when userType + userId are given", async () => {
      await sendPushToAll(PAYLOAD, { userType: "client", userId: "client-9" });
      // Exactly these two binds — never a broader set that could fan out to
      // other clients' subscriptions.
      expect(whereValues()).toEqual(["client", "client-9"]);
    });

    it("binds only the audience when just userType is given", async () => {
      await sendPushToAll(PAYLOAD, { userType: "admin" });
      expect(whereValues()).toEqual(["admin"]);
    });

    it("adds no user predicates when no filter is given", async () => {
      await sendPushToAll(PAYLOAD, {});
      expect(whereValues()).toEqual([]);
    });

    it("sends the JSON payload to every active subscription returned", async () => {
      mockQueryRaw.mockResolvedValue([
        { id: "s1", endpoint: "https://push/1", p256dh: "k1", auth: "a1" },
        { id: "s2", endpoint: "https://push/2", p256dh: "k2", auth: "a2" },
      ] as never);

      await sendPushToAll(PAYLOAD, { userType: "client", userId: "client-9" });

      expect(mockSend).toHaveBeenCalledTimes(2);
      const [target, message] = mockSend.mock.calls[0];
      expect(target).toEqual({
        endpoint: "https://push/1",
        keys: { p256dh: "k1", auth: "a1" },
      });
      expect(message).toBe(JSON.stringify(PAYLOAD));
    });

    it("deactivates subscriptions that return 410/404 and leaves the rest", async () => {
      mockQueryRaw.mockResolvedValue([
        { id: "stale-1", endpoint: "https://push/1", p256dh: "k1", auth: "a1" },
        { id: "live-2", endpoint: "https://push/2", p256dh: "k2", auth: "a2" },
      ] as never);
      // First sub is gone (410), second delivers.
      mockSend
        .mockRejectedValueOnce({ statusCode: 410 } as never)
        .mockResolvedValueOnce(undefined as never);

      await sendPushToAll(PAYLOAD, { userType: "client", userId: "client-9" });

      // Find the deactivation UPDATE specifically (its SQL sets active = false);
      // the live sub only ever appears in a last_used_at touch, never here.
      const deactivateCall = mockExecRaw.mock.calls.find(
        (c) => Array.isArray(c[0]) && c[0].join("").includes("active = false"),
      );
      expect(deactivateCall).toBeTruthy();
      expect(JSON.stringify(deactivateCall![1])).toContain("stale-1");
      expect(JSON.stringify(deactivateCall![1])).not.toContain("live-2");
    });

    it("never deactivates anything on a non-expiry send error", async () => {
      mockQueryRaw.mockResolvedValue([
        { id: "s1", endpoint: "https://push/1", p256dh: "k1", auth: "a1" },
      ] as never);
      // 500 is transient, not gone — keep the subscription.
      mockSend.mockRejectedValueOnce({ statusCode: 500 } as never);

      await sendPushToAll(PAYLOAD, { userType: "client", userId: "client-9" });

      const deactivateCall = mockExecRaw.mock.calls.find(
        (c) => Array.isArray(c[0]) && c[0].join("").includes("active = false"),
      );
      expect(deactivateCall).toBeFalsy();
    });

    it("makes no send when there are no matching subscriptions", async () => {
      mockQueryRaw.mockResolvedValue([] as never);
      await sendPushToAll(PAYLOAD, { userType: "client", userId: "client-9" });
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
