import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest, createAdminRequest } from "@/test/helpers";
import { GET, PATCH } from "../route";

// alert-history authenticates inline (raw SQL): a client proves itself with
// accessCode+email; clientId targeting and PATCH are admin-only. These tests
// lock that gate and the client_id scoping woven into the WHERE clause.
const mockQueryRaw = vi.mocked(db.$queryRaw);
const mockExecRaw = vi.mocked(db.$executeRaw);

// Bind parameters of a composed Prisma.Sql (where the client_id/severity land).
function valuesOf(call: unknown[] | undefined, argIndex: number): unknown[] {
  const arg = call?.[argIndex] as { values?: unknown[] } | undefined;
  return arg?.values ?? [];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryRaw.mockResolvedValue([] as never);
  mockExecRaw.mockResolvedValue(0 as never);
});

describe("GET /api/alert-history", () => {
  it("fails closed for an anonymous caller with no credentials", async () => {
    const res = await GET(createMockRequest("/api/alert-history"));
    expect(res.status).toBe(401);
    expect(mockQueryRaw).not.toHaveBeenCalled(); // never reaches the data query
  });

  it("401s a client whose accessCode+email do not resolve", async () => {
    mockQueryRaw.mockResolvedValueOnce([] as never); // clients lookup → no row
    const res = await GET(
      createMockRequest("/api/alert-history?accessCode=BAD&email=o@e.com")
    );
    expect(res.status).toBe(401);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1); // only the auth lookup ran
  });

  it("scopes a verified client to their own client_id", async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ id: "cl-1" }] as never) // clients lookup
      .mockResolvedValueOnce([] as never) // alerts
      .mockResolvedValueOnce([] as never) // summary
      .mockResolvedValueOnce([{ count: 0 }] as never); // unacknowledged

    const res = await GET(
      createMockRequest("/api/alert-history?accessCode=AC&email=o@e.com")
    );
    expect(res.status).toBe(200);
    // The alerts query (2nd call) binds this client's id — never another's.
    expect(valuesOf(mockQueryRaw.mock.calls[1], 1)).toContain("cl-1");
  });

  it("401s a non-admin that tries to target an arbitrary clientId", async () => {
    const res = await GET(
      createMockRequest("/api/alert-history?clientId=cl-victim")
    );
    expect(res.status).toBe(401);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("lets an admin target a clientId and returns the rolled-up summary", async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ id: "a1", severity: "high" }] as never) // alerts
      .mockResolvedValueOnce([{ severity: "high", count: 2 }] as never) // summary
      .mockResolvedValueOnce([{ count: 5 }] as never); // unacknowledged

    const res = await GET(
      createAdminRequest("/api/alert-history?clientId=cl-9")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toEqual({ high: 2 });
    expect(body.unacknowledged).toBe(5);
    // First query is the alerts list (no auth lookup for the admin path).
    expect(valuesOf(mockQueryRaw.mock.calls[0], 1)).toContain("cl-9");
  });

  it("clamps the row limit to 200 and binds the severity/acknowledged filters", async () => {
    mockQueryRaw
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ count: 0 }] as never);

    await GET(
      createAdminRequest(
        "/api/alert-history?severity=high&acknowledged=false&limit=500"
      )
    );
    const alertsCall = mockQueryRaw.mock.calls[0];
    // LIMIT is the last interpolated value of the alerts query.
    expect(alertsCall[alertsCall.length - 1]).toBe(200);
    const whereValues = valuesOf(alertsCall, 1);
    expect(whereValues).toContain("high");
    expect(whereValues).toContain(false);
  });
});

describe("PATCH /api/alert-history", () => {
  it("401s a non-admin and writes nothing", async () => {
    const res = await PATCH(
      createMockRequest("/api/alert-history", {
        method: "PATCH",
        body: { id: "a1" },
      })
    );
    expect(res.status).toBe(401);
    expect(mockExecRaw).not.toHaveBeenCalled();
  });

  it("400s an admin acknowledgement with no alert id", async () => {
    const res = await PATCH(
      createAdminRequest("/api/alert-history", { method: "PATCH", body: {} })
    );
    expect(res.status).toBe(400);
  });

  it("acknowledges an alert for an admin", async () => {
    const res = await PATCH(
      createAdminRequest("/api/alert-history", {
        method: "PATCH",
        body: { id: "a1", acknowledgedBy: "blake" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockExecRaw).toHaveBeenCalledTimes(1);
    // The acknowledger and target id are bound into the UPDATE.
    const binds = mockExecRaw.mock.calls[0];
    expect(binds).toContain("blake");
    expect(binds).toContain("a1");
  });
});
