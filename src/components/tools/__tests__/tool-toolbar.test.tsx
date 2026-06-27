import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import { ShareButton, CsvButton, ResetButton } from "../tool-toolbar";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ShareButton", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/tools/valuation-calculator");
  });

  it("copies a URL built from the current params and shows confirmation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<ShareButton params={{ noi: 300000, capPct: 6.5 }} />);
    fireEvent.click(screen.getByRole("button"));

    // state flips to "Link copied" once the clipboard promise resolves
    await screen.findByText("Link copied");

    expect(writeText).toHaveBeenCalledTimes(1);
    const url = writeText.mock.calls[0][0] as string;
    expect(url).toContain("/tools/valuation-calculator");
    expect(url).toContain("noi=300000");
    expect(url).toContain("capPct=6.5");
  });

  it("does not throw when the clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    render(<ShareButton params={{ a: 1 }} />);
    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
  });
});

describe("CsvButton", () => {
  it("serializes the rows into a Blob download on click", () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    // jsdom/happy-dom don't implement these by default — attach for the test.
    (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL =
      createObjectURL;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL =
      revokeObjectURL;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(
      <CsvButton
        rows={[
          ["Metric", "Value"],
          ["NOI", "$300,000"],
        ]}
        filename="noi-test.csv"
      />,
    );
    fireEvent.click(screen.getByRole("button"));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });
});

describe("ResetButton", () => {
  it("runs onReset and strips the query string", () => {
    window.history.replaceState(null, "", "/tools/dscr-calculator?noi=120000&mode=size");
    const onReset = vi.fn();

    render(<ResetButton onReset={onReset} />);
    fireEvent.click(screen.getByRole("button"));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
    expect(window.location.pathname).toBe("/tools/dscr-calculator");
  });
});
