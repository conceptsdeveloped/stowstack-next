import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FacilityToolPage } from "../facility-tool-page";
import { FacilityProvider } from "@/lib/facility-context";
import { AdminProvider } from "@/lib/admin-context";
import type { Facility } from "@/types/facility";

// Mutable router/searchParams holder (hoisted so the vi.mock factory can read it).
const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  sp: new URLSearchParams(),
  pathname: "/admin/intelligence/occupancy",
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

// >6 facilities so the picker's search field appears.
const MANY: Facility[] = Array.from({ length: 8 }, (_, i) => ({
  id: `f${i}`,
  name: `Facility ${i}`,
  location: `City ${i}`,
  status: i % 2 ? "intake" : "active",
}));

function renderTool(facilities: Facility[]) {
  return render(
    <AdminProvider initialKey="test-key">
      <FacilityProvider facilities={facilities}>
        <FacilityToolPage
          title="Occupancy"
          render={({ facilityId }) => <div>TOOL:{facilityId}</div>}
        />
      </FacilityProvider>
    </AdminProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  nav.sp = new URLSearchParams();
  nav.replace.mockClear();
});
afterEach(cleanup);

describe("FacilityToolPage", () => {
  it("shows the inline picker at 'all' scope (multi-facility, no param)", () => {
    renderTool(FACS);
    expect(screen.getByText("Select a facility")).toBeTruthy();
    expect(screen.getByText("Riverside")).toBeTruthy();
    expect(screen.getByText("Lakeside")).toBeTruthy();
    // The tool itself must not render without a facility.
    expect(screen.queryByText(/^TOOL:/)).toBeNull();
  });

  it("auto-scopes a single facility and renders the tool directly", () => {
    renderTool([FACS[0]]);
    expect(screen.getByText("TOOL:a")).toBeTruthy();
    expect(screen.queryByText("Select a facility")).toBeNull();
  });

  it("renders the tool scoped to a valid ?facility= param", () => {
    nav.sp = new URLSearchParams("facility=b");
    renderTool(FACS);
    expect(screen.getByText("TOOL:b")).toBeTruthy();
    expect(screen.queryByText("Select a facility")).toBeNull();
  });

  it("picking a facility from the inline picker scopes the admin (writes ?facility=)", () => {
    renderTool(FACS);
    fireEvent.click(screen.getByText("Riverside"));
    expect(nav.replace).toHaveBeenCalled();
    expect(String(nav.replace.mock.calls[0][0])).toContain("facility=a");
  });

  it("shows a search field once there are more than six facilities, and filters", () => {
    renderTool(MANY);
    const search = screen.getByPlaceholderText("Search facilities");
    expect(search).toBeTruthy();
    fireEvent.change(search, { target: { value: "Facility 3" } });
    expect(screen.getByText("Facility 3")).toBeTruthy();
    expect(screen.queryByText("Facility 4")).toBeNull();
  });

  it("does not show a search field for a short facility list", () => {
    renderTool(FACS);
    expect(screen.queryByPlaceholderText("Search facilities")).toBeNull();
  });

  it("surfaces recently-used facilities in a Recent section", () => {
    localStorage.setItem("storageads_facility_recents", JSON.stringify(["b"]));
    renderTool(FACS);
    expect(screen.getByText("Recent")).toBeTruthy();
    // With a Recent section, the non-recent rows sit under "All facilities".
    expect(screen.getByText("All facilities")).toBeTruthy();
  });

  it("shows a no-match message when the search excludes everything", () => {
    renderTool(MANY);
    fireEvent.change(screen.getByPlaceholderText("Search facilities"), {
      target: { value: "zzzzz-nope" },
    });
    expect(screen.getByText(/No facility matches/)).toBeTruthy();
  });
});
