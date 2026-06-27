"use client";

import { Contrast, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

/*
 * The toggle cycles light → dark → black & white → light. The icon and
 * label describe the NEXT theme in the cycle (matching the original
 * "light shows a moon to go dark" behavior).
 */
const NEXT_THEME = {
  light: { label: "dark mode", Icon: Moon },
  dark: { label: "black & white mode", Icon: Contrast },
  bw: { label: "light mode", Icon: Sun },
} as const;

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { label, Icon } = NEXT_THEME[theme];

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] ${className}`}
      aria-label={`Switch to ${label}`}
      title={`Switch to ${label}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
