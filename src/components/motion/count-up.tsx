"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { DUR, EASE } from "@/lib/motion";

/**
 * Eased number count-up with tabular numerals. Plays once when scrolled
 * into view; reduced motion (or SSR) shows the final number immediately.
 */
export function CountUp({
  to,
  from = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = DUR.max,
  className,
  style,
}: {
  to: number;
  from?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();

  const fmt = (v: number) =>
    `${prefix}${v.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = fmt(to);
      return;
    }
    const controls = animate(from, to, {
      duration,
      ease: EASE.out,
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    return () => controls.stop();
    // fmt is stable for fixed props; exhaustive deps would re-run on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, to, from, duration, decimals, prefix, suffix]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums", ...style }}
    >
      {/* SSR fallback: final value, so no-JS / crawlers see the real number */}
      {fmt(to)}
    </span>
  );
}
