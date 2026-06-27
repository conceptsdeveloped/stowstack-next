"use client";

import { createContext, useContext, useState, useCallback } from "react";

type Theme = "light" | "dark" | "bw";

/* Cycle order for the toggle: light → dark → black & white → light. */
const THEME_CYCLE: Theme[] = ["light", "dark", "bw"];

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "bw";
}

function nextTheme(current: Theme): Theme {
  const i = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(i + 1) % THEME_CYCLE.length];
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/*
 * Dark mode overrides for hardcoded Tailwind arbitrary values.
 * Since CSS can't target escaped bracket classes easily (PostCSS chokes),
 * we inject a <style> tag dynamically when dark mode is active.
 */
const DARK_OVERRIDES = `
[data-theme="dark"] [style*="background"][style*="#FFFFFF"],
[data-theme="dark"] [style*="background"][style*="#F9FAFB"],
[data-theme="dark"] [style*="background"][style*="rgb(249"] {
  background-color: #0A0A0A !important;
}
[data-theme="dark"] [style*="background"][style*="#F3F4F6"] {
  background-color: #1A1A1A !important;
}
[data-theme="dark"] [style*="color: rgb(17, 24, 39)"],
[data-theme="dark"] [style*="color: #111827"] {
  color: #F5F5F7 !important;
}
`;

function applyDarkOverrides(isDark: boolean) {
  const id = "storageads-dark-overrides";
  let el = document.getElementById(id);

  if (isDark && !el) {
    el = document.createElement("style");
    el.id = id;
    el.textContent = DARK_OVERRIDES;
    document.head.appendChild(el);
  } else if (!isDark && el) {
    el.remove();
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("storageads-theme");
    if (isTheme(stored)) {
      document.documentElement.setAttribute("data-theme", stored);
      applyDarkOverrides(stored === "dark");
      return stored;
    }
    return "light";
  });
  const [mounted, _setMounted] = useState(() => typeof window !== "undefined");

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = nextTheme(prev);
      localStorage.setItem("storageads-theme", next);
      document.documentElement.setAttribute("data-theme", next);
      applyDarkOverrides(next === "dark");
      return next;
    });
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
