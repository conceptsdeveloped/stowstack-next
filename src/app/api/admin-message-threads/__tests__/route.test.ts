import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET } from "../route";

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin-message-threads", () => {
  it("401s without the admin key", async () => {
    const res = await GET(createMockRequest("/api/admin-message-threads"));
    expect(res.status).toBe(401);
  });

  it("returns an empty list when there are no threads", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = { groupBy: vi.fn().mockResolvedValue([]) };
    const res = await GET(createAdminRequest("/api/admin-message-threads"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.threads).toEqual([]);
  });

  it("assembles a thread with last message, unread count, and facility name", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      groupBy: vi
        .fn()
        // main grouping (client_ids + latest + total)
        .mockResolvedValueOnce([
          { client_id: "c1", _max: { created_at: new Date("2026-06-05T00:00:00Z") }, _count: { _all: 4 } },
        ])
        // unread grouping (client messages unread)
        .mockResolvedValueOnce([{ client_id: "c1", _count: { _all: 2 } }]),
      findFirst: vi.fn().mockResolvedValue({
        sender: "client",
        body: "Any update?",
        created_at: new Date("2026-06-05T00:00:00Z"),
      }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.clients = {
      findMany: vi.fn().mockResolvedValue([
        { id: "c1", email: "o@e.com", access_code: "AC123", facility_id: "f1" },
      ]),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.facilities = {
      findMany: vi.fn().mockResolvedValue([{ id: "f1", name: "Acme Storage" }]),
    };

    const res = await GET(createAdminRequest("/api/admin-message-threads"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.threads).toHaveLength(1);
    expect(body.threads[0]).toMatchObject({
      clientId: "c1",
      accessCode: "AC123",
      facilityName: "Acme Storage",
      lastMessage: "Any update?",
      lastFrom: "client",
      unread: 2,
      total: 4,
    });
  });

  it("drops threads whose client can no longer be resolved (no accessCode)", async () => {
    // @ts-expect-error — db is a vi mock
    mockDb.client_messages = {
      groupBy: vi
        .fn()
        .mockResolvedValueOnce([
          { client_id: "gone", _max: { created_at: new Date() }, _count: { _all: 1 } },
        ])
        .mockResolvedValueOnce([]),
      findFirst: vi.fn().mockResolvedValue({ sender: "client", body: "x", created_at: new Date() }),
    };
    // @ts-expect-error — db is a vi mock
    mockDb.clients = { findMany: vi.fn().mockResolvedValue([]) };

    const res = await GET(createAdminRequest("/api/admin-message-threads"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.threads).toEqual([]);
  });
});
