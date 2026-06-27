import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FacilitySwitcher } from "../facility-switcher";
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
  { id: "c", name: "Hilltop", location: "Holland, MI", status: "active" },
];

function renderSwitcher(facilities: Facility[]) {
  return render(
    <FacilityProvider facilities={facilities}>
      <FacilitySwitcher variant="sidebar" />
    </FacilityProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  nav.sp = new URLSearchParams();
  nav.replace.mockClear();
});
afterEach(cleanup);

describe("FacilitySwitcher", () => {
  it("renders nothing when there are no facilities", () => {
    const { container } = renderSwitcher([]);
    expect(container.firstChild).toBeNull();
  });

  it("shows a static, non-interactive label for a single-facility admin", () => {
    renderSwitcher([FACS[0]]);
    expect(screen.getByLabelText("Active facility: Riverside")).toBeTruthy();
    // No switch affordance — nothing to switch to.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("defaults the trigger to 'All facilities' for a multi-facility admin", () => {
    renderSwitcher(FACS);
    expect(screen.getByRole("button", { name: /switch facility scope/i })).toBeTruthy();
    expect(screen.getByText("All facilities")).toBeTruthy();
  });

  it("opens a searchable list of facilities", () => {
    renderSwitcher(FACS);
    fireEvent.click(screen.getByRole("button", { name: /switch facility scope/i }));
    const listbox = screen.getByRole("listbox", { name: "Facilities" });
    expect(within(listbox).getByText("Riverside")).toBeTruthy();
    expect(within(listbox).getByText("Lakeside")).toBeTruthy();
    expect(within(listbox).getByText("Hilltop")).toBeTruthy();
  });

  it("filters the list by the search query", () => {
    renderSwitcher(FACS);
    fireEvent.click(screen.getByRole("button", { name: /switch facility scope/i }));
    fireEvent.change(screen.getByPlaceholderText("Search facilities"), {
      target: { value: "lake" },
    });
    const listbox = screen.getByRole("listbox", { name: "Facilities" });
    expect(within(listbox).getByText("Lakeside")).toBeTruthy();
    expect(within(listbox).queryByText("Riverside")).toBeNull();
    expect(within(listbox).queryByText("Hilltop")).toBeNull();
  });

  it("selecting a facility scopes the admin (writes ?facility=) and records a recent", () => {
    renderSwitcher(FACS);
    fireEvent.click(screen.getByRole("button", { name: /switch facility scope/i }));
    fireEvent.click(screen.getByText("Hilltop"));
    expect(nav.replace).toHaveBeenCalled();
    expect(String(nav.replace.mock.calls[0][0])).toContain("facility=c");
    expect(JSON.parse(localStorage.getItem("storageads_facility_recents") || "[]")).toContain("c");
  });

  it("reflects the active facility from the URL param", () => {
    nav.sp = new URLSearchParams("facility=b");
    renderSwitcher(FACS);
    // Trigger shows the scoped facility, not "All facilities".
    expect(screen.getByText("Lakeside")).toBeTruthy();
    expect(screen.queryByText("All facilities")).toBeNull();
  });
});
