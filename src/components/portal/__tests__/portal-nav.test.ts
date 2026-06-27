import { describe, it, expect } from "vitest";
import {
  PORTAL_NAV,
  PORTAL_BOTTOM_TABS,
  PORTAL_TITLES,
  isNavItemActive,
} from "../portal-nav";

describe("portal nav source", () => {
  it("lists all nine portal routes in sidebar order", () => {
    expect(PORTAL_NAV.map((i) => i.href)).toEqual([
      "/portal",
      "/portal/campaigns",
      "/portal/gbp",
      "/portal/reports",
      "/portal/upload",
      "/portal/messages",
      "/portal/billing",
      "/portal/onboarding",
      "/portal/settings",
    ]);
  });

  it("every item has a non-empty sidebar label, header title, and icon", () => {
    for (const item of PORTAL_NAV) {
      expect(item.sidebarLabel.length).toBeGreaterThan(0);
      expect(item.headerTitle.length).toBeGreaterThan(0);
      expect(item.icon).toBeTypeOf("object");
    }
  });

  it("bottom tabs are the seven expected items in order, omitting billing + onboarding", () => {
    expect(PORTAL_BOTTOM_TABS.map((i) => i.href)).toEqual([
      "/portal",
      "/portal/campaigns",
      "/portal/gbp",
      "/portal/reports",
      "/portal/upload",
      "/portal/messages",
      "/portal/settings",
    ]);
    expect(PORTAL_BOTTOM_TABS.map((i) => i.href)).not.toContain("/portal/billing");
    expect(PORTAL_BOTTOM_TABS.map((i) => i.href)).not.toContain("/portal/onboarding");
  });

  it("every bottom tab has a tabLabel", () => {
    for (const item of PORTAL_BOTTOM_TABS) {
      expect(item.tabLabel && item.tabLabel.length).toBeGreaterThan(0);
    }
  });

  it("preserves the per-surface relabels (Dashboard->Home, GBP->Reviews)", () => {
    const dashboard = PORTAL_NAV.find((i) => i.href === "/portal")!;
    expect(dashboard.sidebarLabel).toBe("Dashboard");
    expect(dashboard.tabLabel).toBe("Home");

    const gbp = PORTAL_NAV.find((i) => i.href === "/portal/gbp")!;
    expect(gbp.sidebarLabel).toBe("GBP");
    expect(gbp.headerTitle).toBe("Reviews");
    expect(gbp.tabLabel).toBe("Reviews");
  });

  it("title lookup maps each route to its header title", () => {
    expect(PORTAL_TITLES["/portal"]).toBe("Dashboard");
    expect(PORTAL_TITLES["/portal/gbp"]).toBe("Reviews");
    expect(PORTAL_TITLES["/portal/billing"]).toBe("Billing");
  });

  describe("isNavItemActive", () => {
    it("matches the dashboard root only on an exact path", () => {
      expect(isNavItemActive("/portal", "/portal")).toBe(true);
      expect(isNavItemActive("/portal", "/portal/campaigns")).toBe(false);
    });

    it("matches non-root items by prefix so nested routes stay active", () => {
      expect(isNavItemActive("/portal/campaigns", "/portal/campaigns")).toBe(true);
      expect(isNavItemActive("/portal/campaigns", "/portal/campaigns/123")).toBe(true);
      expect(isNavItemActive("/portal/reports", "/portal/campaigns")).toBe(false);
    });
  });
});
