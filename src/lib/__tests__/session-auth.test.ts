import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest } from "@/test/helpers";

// We need to test the module's exported functions. Some internal helpers
// (hashToken, generateToken) are not exported, so we test them indirectly.
import { getSession, createSession, destroySession } from "../session-auth";

const mockDb = vi.mocked(db);

function makeSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    session_id: "sess-1",
    id: "user-1",
    organization_id: "org-1",
    email: "test@example.com",
    name: "Test User",
    role: "owner",
    status: "active",
    is_superadmin: false,
    org_id: "org-1",
    org_name: "Test Org",
    org_slug: "test-org",
    logo_url: null,
    primary_color: null,
    accent_color: null,
    white_label: false,
    plan: "pro",
    facility_limit: 10,
    org_settings: {},
    org_status: "active",
    subscription_status: "active",
    stripe_customer_id: "cus_123",
    ...overrides,
  };
}

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: lookupSession returns a valid row
    mockDb.$queryRaw.mockResolvedValue([makeSessionRow()]);
    mockDb.$executeRaw.mockResolvedValue(0);
  });

  it("returns session for valid Bearer ss_ token", async () => {
    const req = createMockRequest("/api/test", {
      headers: { authorization: "Bearer ss_abc123" },
    });
    const session = await getSession(req);
    expect(session).not.toBeNull();
    expect(session!.user.email).toBe("test@example.com");
    expect(session!.organization.slug).toBe("test-org");
  });

  it("returns session for x-org-token with ss_ prefix", async () => {
    const req = createMockRequest("/api/test", {
      headers: { "x-org-token": "ss_abc123" },
    });
    const session = await getSession(req);
    expect(session).not.toBeNull();
    expect(session!.user.id).toBe("user-1");
  });

  it("returns null when no auth headers are present", async () => {
    const req = createMockRequest("/api/test");
    const session = await getSession(req);
    expect(session).toBeNull();
  });

  it("returns null when session lookup returns no rows (expired/invalid)", async () => {
    mockDb.$queryRaw.mockResolvedValue([]);
    const req = createMockRequest("/api/test", {
      headers: { authorization: "Bearer ss_invalid" },
    });
    const session = await getSession(req);
    expect(session).toBeNull();
  });

  it("formats hasStripe correctly based on stripe_customer_id", async () => {
    mockDb.$queryRaw.mockResolvedValue([
      makeSessionRow({ stripe_customer_id: null }),
    ]);
    const req = createMockRequest("/api/test", {
      headers: { authorization: "Bearer ss_abc" },
    });
    const session = await getSession(req);
    expect(session!.organization.hasStripe).toBe(false);
  });

  it("falls back to legacy token for x-org-token without ss_ prefix", async () => {
    // Legacy token is base64("orgId:email")
    const legacyToken = Buffer.from("org-1:test@example.com").toString(
      "base64"
    );
    const req = createMockRequest("/api/test", {
      headers: { "x-org-token": legacyToken },
    });
    const session = await getSession(req);
    expect(session).not.toBeNull();
  });

  it("returns null for malformed legacy token", async () => {
    const req = createMockRequest("/api/test", {
      headers: { "x-org-token": "not-valid-base64-!!!" },
    });
    mockDb.$queryRaw.mockResolvedValue([]);
    const session = await getSession(req);
    expect(session).toBeNull();
  });
});

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$executeRaw.mockResolvedValue(1);
  });

  it("returns a token with ss_ prefix", async () => {
    const req = createMockRequest("/api/test");
    const token = await createSession("user-1", req);
    expect(token).toMatch(/^ss_/);
    expect(token.length).toBeGreaterThan(10);
  });

  it("inserts a session row into the database", async () => {
    const req = createMockRequest("/api/test");
    await createSession("user-1", req);
    expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1);
  });
});

describe("destroySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$executeRaw.mockResolvedValue(1);
  });

  it("deletes the session by token hash", async () => {
    await destroySession("ss_abc123");
    expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
