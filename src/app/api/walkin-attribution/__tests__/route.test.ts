import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { createMockRequest } from "@/test/helpers";
import { GET, POST } from "../route";

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  (mockDb as any).facilities = { findFirst: vi.fn() };
  (mockDb as any).activity_log = { create: vi.fn().mockResolvedValue({}) };
  /* eslint-enable @typescript-eslint/no-explicit-any */
});

describe("GET /api/walkin-attribution — code validation for /walkin/[code]", () => {
  it("returns the facility name for a valid code", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockDb as any).facilities.findFirst.mockResolvedValue({ name: "Sunrise Storage" });
    const res = await GET(createMockRequest("/api/walkin-attribution?code=abc123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.facilityName).toBe("Sunrise Storage");
  });

  it("404s a code that matches no facility", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockDb as any).facilities.findFirst.mockResolvedValue(null);
    const res = await GET(createMockRequest("/api/walkin-attribution?code=nope"));
    expect(res.status).toBe(404);
  });

  it("404s a missing code without querying", async () => {
    const res = await GET(createMockRequest("/api/walkin-attribution"));
    expect(res.status).toBe(404);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mockDb as any).facilities.findFirst).not.toHaveBeenCalled();
  });
});

describe("POST /api/walkin-attribution", () => {
  it("persists a walk-in attribution for a valid code", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockDb as any).facilities.findFirst.mockResolvedValue({
      id: "f1",
      name: "Sunrise Storage",
    });
    const res = await POST(
      createMockRequest("/api/walkin-attribution", {
        method: "POST",
        body: { accessCode: "abc123", source: "drive_by", sawOnlineAd: true },
      })
    );
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mockDb as any).activity_log.create).toHaveBeenCalledOnce();
  });
});
