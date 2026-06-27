import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warn" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-[var(--color-light-gray)] text-[var(--color-body-text)]",
  success: "bg-[var(--color-green-light)] text-[var(--color-green)]",
  warn: "bg-[var(--bg-hi)] text-[var(--color-dark)]",
  danger: "bg-[var(--color-red-light)] text-[var(--color-red)]",
  info: "bg-[var(--color-blue-light)] text-[var(--color-blue)]",
};

/** Status pill. Token-only tones; no gold. */
export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
