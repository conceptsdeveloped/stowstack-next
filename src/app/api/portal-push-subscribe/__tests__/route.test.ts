import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest } from "@/test/helpers";
import { POST, DELETE } from "../route";

// M6: the client-authenticated push subscribe path. Auth is access-code + email
// in the BODY (not the X-Admin-Key header that gates /api/push-subscribe), and
// rows are pinned to user_type='client'/user_id=<client>. These tests lock the
// auth boundary and the per-client scoping of unsubscribe.
const mockDb = vi.mocked(db, true);

const SUB = {
  endpoint: "https://push.example/abc",
  keys: { p256dh: "p", auth: "a" },
};

beforeEach(() => {
  vi.clearAllMocks();
  // @ts-expect-error — db is a vi mock
  mockDb.$executeRaw = vi.fn().mockResolvedValue(1);
});

function post(body: unknown) {
  return createMockRequest("/api/portal-push-subscribe", { method: "POST", body });
}
function del(body: unknown) {
  return createMockRequest("/api/portal-push-subscribe", { method: "DELETE", body });
}

describe("POST /api/portal-push-subscribe", () => {
  it("401s when the access code does not resolve to a client", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue(null) };
    const res = await POST(post({ subscription: SUB, email: "o@e.com", code: "BADCODE123456" }));
    expect(res.status).toBe(401);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.$executeRaw).not.toHaveBeenCalled();
  });

  it("401s when email and code are missing entirely", async () => {
    const res = await POST(post({ subscription: SUB }));
    expect(res.status).toBe(401);
  });

  it("400s a resolved client with a malformed subscription object", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findUnique: vi.fn().mockResolvedValue({ id: "c1", email: "o@e.com" }),
    };
    const res = await POST(post({ subscription: { endpoint: "x" }, email: "o@e.com", code: "PERMACODE1234567" }));
    expect(res.status).toBe(400);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.$executeRaw).not.toHaveBeenCalled();
  });

  it("saves the subscription for a valid permanent access code", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findUnique: vi.fn().mockResolvedValue({ id: "c1", email: "o@e.com" }),
    };
    const res = await POST(post({ subscription: SUB, email: "O@E.com", code: "PERMACODE1234567" }));
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.$executeRaw).toHaveBeenCalledOnce();
  });

  it("resolves a 4-digit login code via portal_login_codes", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.portal_login_codes = {
      findFirst: vi.fn().mockResolvedValue({ id: "lc1", email: "o@e.com", code: "1234" }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findFirst: vi.fn().mockResolvedValue({ id: "c1" }),
    };
    const res = await POST(post({ subscription: SUB, email: "o@e.com", code: "1234" }));
    expect(res.status).toBe(200);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.portal_login_codes.findFirst).toHaveBeenCalledOnce();
  });
});

describe("DELETE /api/portal-push-subscribe", () => {
  it("401s an unresolved client (cannot unsubscribe without auth)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findUnique: vi.fn().mockResolvedValue(null) };
    const res = await DELETE(del({ endpoint: SUB.endpoint, email: "o@e.com", code: "BADCODE123456" }));
    expect(res.status).toBe(401);
    // @ts-expect-error — inspecting the mock
    expect(mockDb.$executeRaw).not.toHaveBeenCalled();
  });

  it("400s when endpoint is missing", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findUnique: vi.fn().mockResolvedValue({ id: "c1", email: "o@e.com" }),
    };
    const res = await DELETE(del({ email: "o@e.com", code: "PERMACODE1234567" }));
    expect(res.status).toBe(400);
  });

  it("deactivates only the authenticated client's own subscription", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findUnique: vi.fn().mockResolvedValue({ id: "c1", email: "o@e.com" }),
    };
    const res = await DELETE(del({ endpoint: SUB.endpoint, email: "o@e.com", code: "PERMACODE1234567" }));
    expect(res.status).toBe(200);
    // The UPDATE is scoped by user_id — verify the client id is bound into the query.
    // @ts-expect-error — inspecting the mock
    const values = mockDb.$executeRaw.mock.calls[0].slice(1);
    expect(values).toContain("c1");
  });
});
