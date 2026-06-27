import { describe, it, expect } from "vitest";
import {
  PORTAL_NAV_GROUPS,
  PORTAL_NAV_ITEMS,
  PORTAL_BOTTOM_TABS,
  PORTAL_ONBOARDING_ITEM,
  PORTAL_TITLES,
  portalNavTitle,
  portalNavGroups,
  isNavItemActive,
} from "../portal-nav";

// These tests lock the *invariants* of the single portal nav source rather than
// exact labels, so they protect against drift (a second nav array, a bottom tab
// that isn't a real route, a title that can't resolve) without fighting ongoing
// IA/label iteration.

describe("portal nav source", () => {
  it("has at least one group and every group has items", () => {
    expect(PORTAL_NAV_GROUPS.length).toBeGreaterThan(0);
    for (const group of PORTAL_NAV_GROUPS) {
      expect(group.label.length).toBeGreaterThan(0);
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it("PORTAL_NAV_ITEMS is exactly the flattened group items, in order", () => {
    expect(PORTAL_NAV_ITEMS).toEqual(PORTAL_NAV_GROUPS.flatMap((g) => g.items));
  });

  it("every nav item (incl. onboarding) has a unique href, non-empty label, and icon", () => {
    const all = [...PORTAL_NAV_ITEMS, PORTAL_ONBOARDING_ITEM];
    const hrefs = all.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const item of all) {
      expect(item.href.startsWith("/portal")).toBe(true);
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon).toBeTypeOf("object");
    }
  });

  it("onboarding is conditional, not part of the always-on primary items", () => {
    expect(PORTAL_NAV_ITEMS.map((i) => i.href)).not.toContain(PORTAL_ONBOARDING_ITEM.href);
  });

  it("bottom tabs are a real subset of nav items and stay within the native cap", () => {
    const navHrefs = new Set(PORTAL_NAV_ITEMS.map((i) => i.href));
    expect(PORTAL_BOTTOM_TABS.length).toBeGreaterThan(0);
    expect(PORTAL_BOTTOM_TABS.length).toBeLessThanOrEqual(5);
    for (const tab of PORTAL_BOTTOM_TABS) {
      expect(navHrefs.has(tab.href)).toBe(true);
    }
  });

  it("the dashboard root is the first bottom tab", () => {
    expect(PORTAL_BOTTOM_TABS[0].href).toBe("/portal");
  });

  describe("PORTAL_TITLES + portalNavTitle", () => {
    it("titles map covers every nav item and the onboarding route", () => {
      for (const item of [...PORTAL_NAV_ITEMS, PORTAL_ONBOARDING_ITEM]) {
        expect(PORTAL_TITLES[item.href]).toBe(item.label);
      }
    });

    it("resolves a title for known routes and falls back to 'Portal'", () => {
      expect(portalNavTitle("/portal")).toBe(PORTAL_TITLES["/portal"]);
      expect(portalNavTitle("/portal/campaigns/123")).toBe(PORTAL_TITLES["/portal/campaigns"]);
      expect(portalNavTitle("/not-a-portal-route")).toBe("Portal");
    });
  });

  describe("portalNavGroups", () => {
    it("omits the onboarding group when setup is complete", () => {
      const groups = portalNavGroups(false);
      const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
      expect(hrefs).not.toContain(PORTAL_ONBOARDING_ITEM.href);
      expect(groups).toEqual(PORTAL_NAV_GROUPS);
    });

    it("appends an onboarding group when setup is incomplete", () => {
      const groups = portalNavGroups(true);
      const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
      expect(hrefs).toContain(PORTAL_ONBOARDING_ITEM.href);
      expect(groups.length).toBe(PORTAL_NAV_GROUPS.length + 1);
    });
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
