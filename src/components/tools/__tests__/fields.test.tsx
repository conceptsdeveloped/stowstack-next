import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import { useState } from "react";
import { MoneyField, PercentField, PlainNumber } from "../fields";

afterEach(cleanup);

/* A controlled harness mirrors how the calculators drive these fields: the
   parent owns the number, the field reports edits, and the parent can change
   the value out from under the field (basis toggle / reset). */
function MoneyHarness({ external }: { external: number }) {
  const [v, setV] = useState(0);
  return (
    <div>
      <MoneyField label="Amount" value={v} onChange={setV} />
      <span data-testid="v">{v}</span>
      <button type="button" onClick={() => setV(external)}>
        ext
      </button>
    </div>
  );
}

describe("MoneyField", () => {
  it("emits the parsed number while typing", () => {
    render(<MoneyHarness external={0} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1500" } });
    expect(input.value).toBe("1500");
    expect(screen.getByTestId("v").textContent).toBe("1500");
  });

  it("resyncs the text when the parent changes the value externally", () => {
    render(<MoneyHarness external={1200} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "100" } });
    expect(input.value).toBe("100");
    // Simulate a basis toggle / reset: parent pushes a different value in.
    fireEvent.click(screen.getByText("ext"));
    expect(input.value).toBe("1200");
  });

  it("does not clobber a decimal in progress", () => {
    render(<MoneyHarness external={0} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1." } });
    // parses to 1, but the trailing dot must survive so the user can keep typing
    expect(input.value).toBe("1.");
    expect(screen.getByTestId("v").textContent).toBe("1");
    fireEvent.change(input, { target: { value: "1.5" } });
    expect(screen.getByTestId("v").textContent).toBe("1.5");
  });

  it("filters out non-numeric characters", () => {
    render(<MoneyHarness external={0} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12a$3" } });
    expect(input.value).toBe("123");
  });

  it("clears to empty and emits 0", () => {
    render(<MoneyHarness external={0} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "500" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(screen.getByTestId("v").textContent).toBe("0");
  });
});

function PercentHarness() {
  const [v, setV] = useState(0);
  return (
    <div>
      <PercentField label="Rate" value={v} onChange={setV} />
      <span data-testid="v">{v}</span>
    </div>
  );
}

describe("PercentField", () => {
  it("accepts decimals and emits the parsed number", () => {
    render(<PercentHarness />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "6.5" } });
    expect(input.value).toBe("6.5");
    expect(screen.getByTestId("v").textContent).toBe("6.5");
  });
});

function PlainNumberHarness({ external }: { external: number }) {
  const [v, setV] = useState(0);
  return (
    <div>
      <PlainNumber label="Units" value={v} onChange={setV} />
      <span data-testid="v">{v}</span>
      <button type="button" onClick={() => setV(external)}>
        ext
      </button>
    </div>
  );
}

describe("PlainNumber", () => {
  it("strips everything but digits", () => {
    render(<PlainNumberHarness external={0} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,2a3.4" } });
    expect(input.value).toBe("1234");
    expect(screen.getByTestId("v").textContent).toBe("1234");
  });

  it("resyncs on external change", () => {
    render(<PlainNumberHarness external={200} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "50" } });
    fireEvent.click(screen.getByText("ext"));
    expect(input.value).toBe("200");
  });
});
