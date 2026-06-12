"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * CSS-transform infinite marquee. Two copies of the content scroll by
 * -50%; edges are masked; hover pauses. Under prefers-reduced-motion the
 * global killswitch freezes the animation at frame 0 (first copy fully
 * visible). Ambient loop — exempt from the 1.2s ceiling.
 *
 * Styles live in globals.css (.home-ticker*) so the animation is pure
 * CSS — no JS on the main thread.
 */
export function Ticker({
  children,
  seconds = 38,
  className,
  style,
}: {
  children: ReactNode;
  seconds?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`home-ticker ${className ?? ""}`} style={style} aria-hidden="true">
      <div className="home-ticker-track" style={{ animationDuration: `${seconds}s` }}>
        <div className="home-ticker-seg">{children}</div>
        <div className="home-ticker-seg">{children}</div>
      </div>
    </div>
  );
}
