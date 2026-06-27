import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../theme-provider";
import ThemeToggle from "../theme-toggle";

const STORAGE_KEY = "storageads-theme";
const DARK_OVERRIDES_ID = "storageads-dark-overrides";

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

function toggle() {
  return screen.getByRole("button");
}

function darkOverridesPresent() {
  return document.getElementById(DARK_OVERRIDES_ID) !== null;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.getElementById(DARK_OVERRIDES_ID)?.remove();
});

afterEach(() => {
  cleanup();
});

describe("ThemeToggle three-way cycle", () => {
  it("defaults to light and offers dark as the next step", () => {
    renderToggle();
    expect(toggle().getAttribute("aria-label")).toBe("Switch to dark mode");
    // No theme has been chosen yet, so the attribute stays unset on first paint.
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    expect(darkOverridesPresent()).toBe(false);
  });

  it("cycles light -> dark -> bw -> light on successive clicks", () => {
    renderToggle();

    // light -> dark
    fireEvent.click(toggle());
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(toggle().getAttribute("aria-label")).toBe("Switch to black & white mode");
    expect(darkOverridesPresent()).toBe(true);

    // dark -> bw
    fireEvent.click(toggle());
    expect(document.documentElement.getAttribute("data-theme")).toBe("bw");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("bw");
    expect(toggle().getAttribute("aria-label")).toBe("Switch to light mode");
    // Dark-only inline overrides are torn down for the monochrome theme.
    expect(darkOverridesPresent()).toBe(false);

    // bw -> light
    fireEvent.click(toggle());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(toggle().getAttribute("aria-label")).toBe("Switch to dark mode");
    expect(darkOverridesPresent()).toBe(false);
  });

  it("renders the icon for the next theme in the cycle", () => {
    renderToggle();
    // lucide tags each icon with a `lucide-<name>` class.
    expect(toggle().querySelector(".lucide-moon")).not.toBeNull();

    fireEvent.click(toggle()); // now on dark, next is bw
    expect(toggle().querySelector(".lucide-contrast")).not.toBeNull();

    fireEvent.click(toggle()); // now on bw, next is light
    expect(toggle().querySelector(".lucide-sun")).not.toBeNull();
  });
});

describe("ThemeProvider persistence and validation", () => {
  it("restores a stored bw theme and applies it on mount", () => {
    localStorage.setItem(STORAGE_KEY, "bw");
    renderToggle();
    expect(document.documentElement.getAttribute("data-theme")).toBe("bw");
    expect(toggle().getAttribute("aria-label")).toBe("Switch to light mode");
    expect(darkOverridesPresent()).toBe(false);
  });

  it("restores a stored dark theme and re-injects the dark overrides", () => {
    localStorage.setItem(STORAGE_KEY, "dark");
    renderToggle();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(darkOverridesPresent()).toBe(true);
  });

  it("falls back to light when the stored value is not a known theme", () => {
    localStorage.setItem(STORAGE_KEY, "neon");
    renderToggle();
    expect(toggle().getAttribute("aria-label")).toBe("Switch to dark mode");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });
});
