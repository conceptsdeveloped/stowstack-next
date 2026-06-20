"use client";

const FONT = "var(--font), var(--font-manrope), system-ui, sans-serif";

/**
 * Editorial section header: `§ 00 · TITLE`, an optional count badge, a hairline
 * rule that fills the row, and optional right-aligned meta (date, scope note).
 */
export function ConsoleSection({
  index,
  title,
  count,
  meta,
}: {
  index: number;
  title: string;
  count?: number;
  meta?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span
        style={{
          fontFamily: FONT,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.16em",
          color: "var(--ink3)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        § {String(index).padStart(2, "0")}
      </span>
      <span
        style={{
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink2)",
        }}
      >
        {title}
      </span>
      {typeof count === "number" && count > 0 && (
        <span
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fontWeight: 600,
            color: "var(--bg)",
            background: "var(--ink)",
            borderRadius: 10,
            padding: "1px 7px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count}
        </span>
      )}
      <span style={{ flex: 1, height: 1, background: "var(--bdr)" }} />
      {meta && (
        <span style={{ fontFamily: FONT, fontSize: 11, color: "var(--ink3)" }}>{meta}</span>
      )}
    </div>
  );
}
