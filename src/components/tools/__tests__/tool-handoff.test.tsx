import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import ToolHandoff from "../tool-handoff";

afterEach(cleanup);

describe("ToolHandoff", () => {
  it("renders the title, subtitle, and a link per entry", () => {
    render(
      <ToolHandoff
        title="Use this NOI"
        subtitle="Carry it forward"
        links={[
          { href: "/tools/valuation-calculator?noi=300000", label: "Value it" },
          { href: "/tools/dscr-calculator?noi=300000", label: "Size a loan", sub: "1.25x DSCR" },
        ]}
      />,
    );

    expect(screen.getByText("Use this NOI")).toBeTruthy();
    expect(screen.getByText("Carry it forward")).toBeTruthy();

    const value = screen.getByText("Value it").closest("a") as HTMLAnchorElement;
    expect(value.getAttribute("href")).toBe("/tools/valuation-calculator?noi=300000");

    const loan = screen.getByText("Size a loan").closest("a") as HTMLAnchorElement;
    expect(loan.getAttribute("href")).toBe("/tools/dscr-calculator?noi=300000");
    expect(screen.getByText("1.25x DSCR")).toBeTruthy();
  });

  it("renders nothing when there are no links", () => {
    const { container } = render(<ToolHandoff title="Empty" links={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
