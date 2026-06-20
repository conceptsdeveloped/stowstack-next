"use client";

import { useMemo } from "react";

/**
 * Tiny inline sparkline. Pure SVG, no library — normalizes the series into the
 * box with a small inset so the stroke never clips. Renders nothing for fewer
 * than two finite points.
 */
export function ConsoleSparkline({
  values,
  width = 64,
  height = 16,
  stroke = "var(--ink2)",
}: {
  values: number[] | undefined;
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const points = useMemo(() => {
    const v = (values ?? []).filter((n) => Number.isFinite(n));
    if (v.length < 2) return "";
    const pad = 1.5;
    const min = Math.min(...v);
    const max = Math.max(...v);
    const span = max - min || 1;
    const stepX = width / (v.length - 1);
    const usableH = height - pad * 2;
    return v
      .map((n, i) => {
        const x = i * stepX;
        const y = pad + (1 - (n - min) / span) * usableH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [values, width, height]);

  if (!points) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
