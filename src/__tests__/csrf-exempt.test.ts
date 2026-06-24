import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { isCsrfExempt } from "@/proxy";

function req(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://storageads.com${path}`, { headers });
}

describe("isCsrfExempt — portal login footgun guard", () => {
  // Regression: the CSRF gate silently 403s any non-exempt mutating /api POST.
  // Portal login runs pre-auth (no session/token/admin-key header yet), so it
  // CANNOT ride the header exemptions and MUST be path-exempt or login breaks.
  it("exempts the portal login-code send route", () => {
    expect(isCsrfExempt(req("/api/resend-access-code"))).toBe(true);
  });

  it("exempts the portal login-code verify route", () => {
    expect(isCsrfExempt(req("/api/client-data"))).toBe(true);
  });

  it("keeps the other public lead-capture routes exempt", () => {
    expect(isCsrfExempt(req("/api/audit-form"))).toBe(true);
    expect(isCsrfExempt(req("/api/consumer-lead"))).toBe(true);
    expect(isCsrfExempt(req("/api/diagnostic-intake"))).toBe(true);
    expect(isCsrfExempt(req("/api/facility-lookup"))).toBe(true);
  });

  it("exempts webhook / cron / v1 prefixes", () => {
    expect(isCsrfExempt(req("/api/webhooks/anything"))).toBe(true);
    expect(isCsrfExempt(req("/api/stripe-webhook"))).toBe(true);
    expect(isCsrfExempt(req("/api/cron/daily"))).toBe(true);
    expect(isCsrfExempt(req("/api/v1/leads"))).toBe(true);
  });

  it("exempts header-authenticated requests", () => {
    expect(isCsrfExempt(req("/api/admin-leads", { "x-admin-key": "k" }))).toBe(true);
    expect(isCsrfExempt(req("/api/partner/x", { authorization: "Bearer t" }))).toBe(true);
    expect(isCsrfExempt(req("/api/partner/x", { "x-org-token": "t" }))).toBe(true);
  });

  it("does NOT exempt an arbitrary mutating route with no auth header", () => {
    expect(isCsrfExempt(req("/api/some-random-route"))).toBe(false);
  });
});
