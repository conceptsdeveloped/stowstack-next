import { describe, it, expect, beforeEach } from "vitest";
import { verifyCronSecret } from "../cron-auth";

describe("verifyCronSecret", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
  });

  it("returns true for valid Bearer token", () => {
    const req = new Request("http://localhost:3000/api/cron/test", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    expect(verifyCronSecret(req)).toBe(true);
  });

  it("returns false for wrong secret", () => {
    const req = new Request("http://localhost:3000/api/cron/test", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("returns false when no authorization header", () => {
    const req = new Request("http://localhost:3000/api/cron/test");
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("returns false (fail-closed) when CRON_SECRET is not set", () => {
    delete process.env.CRON_SECRET;
    const req = new Request("http://localhost:3000/api/cron/test", {
      headers: { authorization: "Bearer anything" },
    });
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("returns false (fail-closed) when CRON_SECRET is empty string", () => {
    process.env.CRON_SECRET = "";
    const req = new Request("http://localhost:3000/api/cron/test", {
      headers: { authorization: "Bearer " },
    });
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("returns false when Authorization header is not Bearer format", () => {
    const req = new Request("http://localhost:3000/api/cron/test", {
      headers: { authorization: "Basic test-cron-secret" },
    });
    expect(verifyCronSecret(req)).toBe(false);
  });
});
