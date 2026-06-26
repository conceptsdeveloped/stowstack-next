import { describe, expect, it } from "vitest";
import { findRouteMeta, NAV_GROUPS } from "@/lib/admin-nav";

describe("findRouteMeta", () => {
  it("resolves an exact spine route with its group, title-cased", () => {
    const r = findRouteMeta("/admin/intelligence/occupancy");
    expect(r.title).toBe("Occupancy");
    expect(r.group).toBe("Intelligence");
    expect(r.scoped).toBe(true);
  });

  it("marks non-facility routes as not scoped", () => {
    const pipeline = findRouteMeta("/admin");
    expect(pipeline.title).toBe("Pipeline");
    expect(pipeline.group).toBe("Leads");
    expect(pipeline.scoped).toBe(false);
  });

  it("does not treat the Facility Manager hub as a scoped (header-chip) route", () => {
    // It reads ?facility= directly and has its own in-page facility header.
    expect(findRouteMeta("/admin/facilities").scoped).toBe(false);
  });

  it("keeps facility sub-tools scoped via exact match (no /admin/facilities prefix bleed)", () => {
    expect(findRouteMeta("/admin/facilities/tenants").scoped).toBe(true);
    expect(findRouteMeta("/admin/facilities/pms").scoped).toBe(true);
  });

  it("resolves supplemental routes that have no sidebar entry", () => {
    expect(findRouteMeta("/admin/campaigns/create").title).toBe("New Campaign");
    expect(findRouteMeta("/admin/campaigns/create").group).toBeNull();
  });

  it("inherits a parent title for nested/detail routes via longest prefix", () => {
    // /admin/funnels is supplemental; its [id] detail page should inherit it.
    expect(findRouteMeta("/admin/funnels/abc123").title).toBe("Funnels");
  });

  it("does not let /admin prefix-match every admin route", () => {
    expect(findRouteMeta("/admin/totally-unknown-route").title).toBe("Admin");
  });

  it("falls back to Admin for unknown routes", () => {
    const r = findRouteMeta("/admin/nope");
    expect(r).toEqual({ title: "Admin", group: null, scoped: false });
  });

  it("resolves every spine route to its own exact title (no drift)", () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        const r = findRouteMeta(item.href);
        expect(r.title).toBe(item.label);
        // /admin's group is "Leads"; every item resolves to a real group here.
        expect(r.group).not.toBeNull();
      }
    }
  });
});
