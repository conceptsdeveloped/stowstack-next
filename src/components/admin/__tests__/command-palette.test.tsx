import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { CommandPalette } from "../command-palette";
import { FacilityProvider } from "@/lib/facility-context";
import type { Facility } from "@/types/facility";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  sp: new URLSearchParams(),
  pathname: "/admin/console",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.sp,
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => nav.pathname,
}));

const FACS: Facility[] = [
  { id: "a", name: "Riverside", location: "Paw Paw, MI", status: "active" },
  { id: "b", name: "Lakeside", location: "Kalamazoo, MI", status: "intake" },
];

function open(facilities: Facility[] = FACS) {
  const utils = render(
    <FacilityProvider facilities={facilities}>
      <CommandPalette />
    </FacilityProvider>,
  );
  act(() => {
    window.dispatchEvent(new Event("admin:open-palette"));
  });
  return utils;
}

function type(value: string) {
  fireEvent.change(screen.getByPlaceholderText("Search tools and actions"), {
    target: { value },
  });
}

beforeEach(() => {
  localStorage.clear();
  nav.sp = new URLSearchParams();
  nav.replace.mockClear();
  nav.push.mockClear();
});
afterEach(cleanup);

describe("CommandPalette", () => {
  it("opens on the admin:open-palette event", () => {
    open();
    expect(screen.getByPlaceholderText("Search tools and actions")).toBeTruthy();
  });

  it("indexes routes derived from the shared spine", () => {
    open();
    type("occupancy");
    // Spine label (sidebar uses "Occupancy", not the old "Occupancy Intelligence").
    expect(screen.getByText("Occupancy")).toBeTruthy();
  });

  it("keeps the portfolio variant distinct from the scoped tool (no drift)", () => {
    open();
    type("funnels");
    // Scoped channel funnels + the palette-only all-facilities variant.
    expect(screen.getByText("Funnels")).toBeTruthy();
    expect(screen.getByText("Funnels (all facilities)")).toBeTruthy();
  });

  it("tags scope-aware tools as Facility", () => {
    open();
    type("tenants");
    const row = screen.getByText("Tenants").closest("button");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText("Facility")).toBeTruthy();
  });

  it("switches facility scope when a facility is picked from search", () => {
    open();
    type("lakeside");
    fireEvent.click(screen.getByText("Lakeside"));
    expect(nav.replace).toHaveBeenCalled();
    expect(String(nav.replace.mock.calls[0][0])).toContain("facility=b");
  });

  it("surfaces recently-used facilities in the default view for quick switching", () => {
    localStorage.setItem("storageads_facility_recents", JSON.stringify(["b"]));
    open();
    // No query typed: the recent facility appears under "Switch facility".
    expect(screen.getByText("Switch facility")).toBeTruthy();
    expect(screen.getByText("Lakeside")).toBeTruthy();
  });

  it("navigates to a tool route on select", () => {
    open();
    type("kanban");
    fireEvent.click(screen.getByText("Kanban"));
    expect(nav.push).toHaveBeenCalledWith("/admin/kanban");
  });
});
