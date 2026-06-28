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

describe("Button variants/sizes/icon", () => {
  it.each([
    ["primary", "bg-[var(--color-dark)]"],
    ["secondary", "border-[var(--border-medium)]"],
    ["ghost", "hover:bg-[var(--color-light-gray)]"],
    ["danger", "bg-[var(--color-red)]"],
  ] as const)("variant=%s applies its token classes", (variant, cls) => {
    render(<Button variant={variant}>x</Button>);
    expect(screen.getByRole("button", { name: "x" }).className).toContain(cls);
  });

  it.each([
    ["sm", "px-3"],
    ["md", "px-4"],
  ] as const)("size=%s applies its padding", (size, cls) => {
    render(<Button size={size}>x</Button>);
    expect(screen.getByRole("button", { name: "x" }).className).toContain(cls);
  });

  it("renders the icon when not loading, swaps to a spinner when loading", () => {
    const { container, rerender } = render(
      <Button icon={<span data-testid="ico">i</span>}>Go</Button>,
    );
    expect(screen.getByTestId("ico")).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeFalsy();

    rerender(
      <Button loading icon={<span data-testid="ico">i</span>}>
        Go
      </Button>,
    );
    expect(screen.queryByTestId("ico")).toBeNull();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("forwards arbitrary button attributes (type)", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });
});

describe("StatCard hint/icon/value", () => {
  it("renders a hint string and an icon node", () => {
    render(
      <StatCard label="Occupancy" value="92%" hint="120 / 130 units" icon={<span data-testid="ico">i</span>} />,
    );
    expect(screen.getByText("120 / 130 units")).toBeInTheDocument();
    expect(screen.getByTestId("ico")).toBeInTheDocument();
  });

  it("accepts a ReactNode value", () => {
    render(<StatCard label="Status" value={<strong>Live</strong>} />);
    expect(screen.getByText("Live").tagName).toBe("STRONG");
  });
});

describe("Card element/className/rest", () => {
  it("renders the requested element and forwards className + rest props", () => {
    const { container } = render(
      <Card as="article" className="custom-x" aria-label="panel">
        body
      </Card>,
    );
    const el = container.querySelector("article") as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.className).toContain("custom-x");
    expect(el).toHaveAttribute("aria-label", "panel");
  });

  it("defaults to a div surface", () => {
    const { container } = render(<Card>body</Card>);
    expect((container.firstChild as HTMLElement).tagName).toBe("DIV");
  });
});

describe("EmptyState minimal", () => {
  it("renders with only a title (no icon/message/action)", () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    // no buttons/links rendered when action is omitted
    expect(container.querySelector("button")).toBeNull();
  });
});
