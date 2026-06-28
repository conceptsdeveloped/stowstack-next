import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { Tabs } from "../tabs";
import { StatCard } from "../stat-card";
import { Badge } from "../badge";
import { Button } from "../button";
import { EmptyState } from "../empty-state";
import { Card } from "../card";
import { PageHeader } from "../page-header";
import { PortalPage } from "../portal-page";

const TAB_OPTS = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
];

describe("Tabs", () => {
  it("renders a labelled tablist with roving tabindex + aria-selected", () => {
    render(<Tabs options={TAB_OPTS} value="30d" onChange={() => {}} ariaLabel="Range" />);
    expect(screen.getByRole("tablist", { name: "Range" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    const selected = screen.getByRole("tab", { selected: true });
    expect(selected).toHaveTextContent("30D");
    expect(selected).toHaveAttribute("tabindex", "0");
    tabs
      .filter((t) => t !== selected)
      .forEach((t) => expect(t).toHaveAttribute("tabindex", "-1"));
  });

  it("selects on click", () => {
    const onChange = vi.fn();
    render(<Tabs options={TAB_OPTS} value="30d" onChange={onChange} ariaLabel="Range" />);
    fireEvent.click(screen.getByRole("tab", { name: "90D" }));
    expect(onChange).toHaveBeenCalledWith("90d");
  });

  it("moves selection with ArrowRight/ArrowLeft", () => {
    const onChange = vi.fn();
    render(<Tabs options={TAB_OPTS} value="30d" onChange={onChange} ariaLabel="Range" />);
    const selected = screen.getByRole("tab", { selected: true });
    fireEvent.keyDown(selected, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("90d");
    fireEvent.keyDown(selected, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("7d");
  });

  it("wraps on ArrowLeft from the first tab and supports Home/End", () => {
    const onChange = vi.fn();
    render(<Tabs options={TAB_OPTS} value="7d" onChange={onChange} ariaLabel="Range" />);
    const selected = screen.getByRole("tab", { selected: true });
    fireEvent.keyDown(selected, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("90d");
    fireEvent.keyDown(selected, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("90d");
    fireEvent.keyDown(selected, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("7d");
  });
});

describe("StatCard", () => {
  it("shows an up arrow + absolute value for a non-negative delta", () => {
    const { container } = render(<StatCard label="Leads" value="42" delta={12.34} />);
    expect(screen.getByText("Leads")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("12.3%")).toBeInTheDocument();
    expect(container.querySelector(".lucide-arrow-up")).toBeTruthy();
    expect(container.querySelector(".lucide-arrow-down")).toBeFalsy();
  });

  it("shows a down arrow + absolute value for a negative delta", () => {
    const { container } = render(<StatCard label="CPL" value="$30" delta={-8.5} />);
    expect(screen.getByText("8.5%")).toBeInTheDocument();
    expect(container.querySelector(".lucide-arrow-down")).toBeTruthy();
    expect(container.querySelector(".lucide-arrow-up")).toBeFalsy();
  });

  it("omits the delta row when no delta is given", () => {
    render(<StatCard label="Spend" value="$1k" />);
    expect(screen.queryByText("%", { exact: false })).toBeNull();
  });
});

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge tone="success">Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("is disabled and forwards aria-label while loading", () => {
    render(<Button loading aria-label="Save" />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("forwards click when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire click while loading", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("EmptyState / Card / PageHeader", () => {
  it("EmptyState renders title, message and action", () => {
    render(
      <EmptyState
        title="No data"
        message="Upload a report"
        action={<button>Upload</button>}
      />,
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByText("Upload a report")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("Card renders as the requested element", () => {
    const { container } = render(<Card as="section">body</Card>);
    expect(container.querySelector("section")).toBeTruthy();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("PageHeader renders a heading, subtitle and actions", () => {
    render(
      <PageHeader title="Reports" subtitle="Last 30 days" actions={<button>Export</button>} />,
    );
    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });
});

describe("PortalPage", () => {
  it("renders an optional header (title/subtitle/actions) above its children", () => {
    render(
      <PortalPage title="Billing" subtitle="History" actions={<button>Export</button>}>
        <p>body</p>
      </PortalPage>,
    );
    expect(screen.getByRole("heading", { name: "Billing" })).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("omits the header entirely when no title is given", () => {
    render(
      <PortalPage>
        <p>just body</p>
      </PortalPage>,
    );
    expect(screen.getByText("just body")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("defaults to the 6xl max-width", () => {
    const { container } = render(
      <PortalPage>
        <p>x</p>
      </PortalPage>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("max-w-6xl");
  });

  // Guards the Tailwind v4 class-map fix: exactly one max-width class, chosen by
  // the prop — never the default appended alongside an override.
  it.each([
    ["2xl", "max-w-2xl"],
    ["4xl", "max-w-4xl"],
    ["5xl", "max-w-5xl"],
    ["6xl", "max-w-6xl"],
  ] as const)("applies a single max-width class for maxWidth=%s", (maxWidth, cls) => {
    const { container } = render(
      <PortalPage maxWidth={maxWidth}>
        <p>x</p>
      </PortalPage>,
    );
    const root = container.firstChild as HTMLElement;
    const widths = root.className.split(/\s+/).filter((c) => c.startsWith("max-w-"));
    expect(widths).toEqual([cls]);
  });
});

describe("Badge tones", () => {
  it.each([
    ["neutral", "--color-light-gray"],
    ["success", "--color-green-light"],
    ["warn", "--bg-hi"],
    ["danger", "--color-red-light"],
    ["info", "--color-blue-light"],
  ] as const)("maps tone=%s to a token background (no raw color)", (tone, token) => {
    const { container } = render(<Badge tone={tone}>x</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain(token);
  });
});
