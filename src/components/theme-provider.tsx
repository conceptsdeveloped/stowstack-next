"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

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
  const id = "stowstack-dark-overrides";
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
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("stowstack-theme") as Theme | null;
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
      applyDarkOverrides(stored === "dark");
    }
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("stowstack-theme", next);
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
