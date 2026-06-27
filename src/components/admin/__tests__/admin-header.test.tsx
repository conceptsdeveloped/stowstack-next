import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AdminHeader } from "../admin-header";
import { FacilityProvider } from "@/lib/facility-context";
import { AdminProvider } from "@/lib/admin-context";
import type { Facility } from "@/types/facility";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  sp: new URLSearchParams(),
  pathname: "/admin",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.sp,
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => nav.pathname,
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isSignedIn: false, user: null, isLoaded: true }),
  UserButton: () => null,
}));

const FACS: Facility[] = [
  { id: "a", name: "Riverside", location: "Paw Paw, MI", status: "active" },
  { id: "b", name: "Lakeside", location: "Kalamazoo, MI", status: "intake" },
];

function renderHeader(pathname: string) {
  nav.pathname = pathname;
  return render(
    <AdminProvider initialKey="test-key">
      <FacilityProvider facilities={FACS}>
        <AdminHeader onToggleSidebar={() => {}} />
      </FacilityProvider>
    </AdminProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  nav.sp = new URLSearchParams();
  // The header fetches notifications on mount; stub it out.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdminHeader breadcrumb", () => {
  it("derives the page title and section from the route spine", () => {
    renderHeader("/admin/intelligence/occupancy");
    expect(screen.getByText("Occupancy")).toBeTruthy();
    expect(screen.getByText("Intelligence")).toBeTruthy();
  });

  it("shows the facility switcher on a scope-aware route", () => {
    renderHeader("/admin/intelligence/occupancy");
    expect(
      screen.getByRole("button", { name: /switch facility scope/i }),
    ).toBeTruthy();
  });

  it("titles the leads root 'Pipeline' under 'Leads' (not the old 'Dashboard')", () => {
    renderHeader("/admin");
    expect(screen.getByText("Pipeline")).toBeTruthy();
    expect(screen.getByText("Leads")).toBeTruthy();
  });

  it("falls back to 'Admin' for an unknown route", () => {
    renderHeader("/admin/some-unknown-route");
    expect(screen.getByText("Admin")).toBeTruthy();
  });
});
