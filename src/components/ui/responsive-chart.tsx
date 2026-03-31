"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer } from "recharts";

interface ResponsiveChartProps {
  children: React.ReactElement;
  mobileHeight?: number;
  desktopHeight?: number;
  aspectRatio?: number;
}

export function ResponsiveChart({
  children,
  mobileHeight = 220,
  desktopHeight = 350,
  aspectRatio,
}: ResponsiveChartProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const height = isMobile ? mobileHeight : desktopHeight;

  return (
    <div style={aspectRatio && isMobile ? { aspectRatio } : { height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
