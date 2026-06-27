import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import { useState } from "react";
import { DecimalField, SliderField } from "../fields";

afterEach(cleanup);

/* ── DecimalField ───────────────────────────────────────────────────────── */
function DecimalHarness({ external }: { external: number }) {
  const [v, setV] = useState(0);
  return (
    <div>
      <DecimalField label="Target DSCR" suffix="x" value={v} onChange={setV} />
      <span data-testid="v">{v}</span>
      <button type="button" onClick={() => setV(external)}>
        ext
      </button>
    </div>
  );
}

describe("DecimalField", () => {
  it("emits the parsed decimal while typing", () => {
    render(<DecimalHarness external={0} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1.25" } });
    expect(input.value).toBe("1.25");
    expect(screen.getByTestId("v").textContent).toBe("1.25");
  });

  it("keeps a trailing decimal point so the user can keep typing", () => {
    render(<DecimalHarness external={0} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1." } });
    expect(input.value).toBe("1.");
    expect(screen.getByTestId("v").textContent).toBe("1");
  });

  it("filters out non-numeric characters", () => {
    render(<DecimalHarness external={0} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1x2y5" } });
    expect(input.value).toBe("125");
  });

  it("resyncs when the parent changes the value (e.g. reset)", () => {
    render(<DecimalHarness external={1.25} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.click(screen.getByText("ext"));
    expect(input.value).toBe("1.25");
  });

  it("renders the suffix", () => {
    render(<DecimalHarness external={0} />);
    expect(screen.getByText("x")).toBeTruthy();
  });
});

/* ── SliderField ────────────────────────────────────────────────────────── */
function SliderHarness() {
  const [v, setV] = useState(150);
  return (
    <div>
      <SliderField
        label="Total units"
        value={v}
        onChange={setV}
        min={50}
        max={500}
        step={10}
        format={(n) => String(n)}
      />
      <span data-testid="v">{v}</span>
    </div>
  );
}

describe("SliderField", () => {
  it("renders min, max, and current value via the formatter", () => {
    render(<SliderHarness />);
    expect(screen.getByText("50")).toBeTruthy();
    expect(screen.getByText("500")).toBeTruthy();
    // current value 150 appears in the header
    expect(screen.getAllByText("150").length).toBeGreaterThan(0);
  });

  it("emits the numeric value on slider input", () => {
    render(<SliderHarness />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "300" } });
    expect(screen.getByTestId("v").textContent).toBe("300");
  });

  it("exposes an accessible name", () => {
    render(<SliderHarness />);
    expect(screen.getByLabelText("Total units")).toBeTruthy();
  });
});
