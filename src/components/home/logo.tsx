import type { CSSProperties } from "react";

/**
 * Brand wordmark. The two-tone split is brand-mandatory: "storage" reads
 * in the surface text color, "ads" always reads in --brand-gold (the one
 * brand-locked exception to the palette system). The "/attr" suffix is
 * the editorial chrome from the existing nav.
 */
export default function Logo({
  size = 18,
  suffix = "/attr",
  onInk = false,
  style,
}: {
  size?: number;
  suffix?: string | null;
  onInk?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--serif)",
        fontWeight: 700,
        letterSpacing: "-0.02em",
        fontSize: size,
        color: onInk ? "var(--bg)" : "var(--text-accent)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      storage<span style={{ color: "var(--brand-gold)" }}>ads</span>
      {suffix && (
        <span
          style={{
            color: onInk ? "var(--text-on-ink-dim)" : "var(--text-faint)",
            fontWeight: 400,
          }}
        >
          {suffix}
        </span>
      )}
    </span>
  );
}
