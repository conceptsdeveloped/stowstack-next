"use client";

import { m, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { DUR, EASE, STAGGER } from "@/lib/motion";

type HeadingTag = "h1" | "h2" | "h3" | "p" | "div";

/**
 * Line-by-line masked headline reveal: each line sits in an
 * overflow-hidden container and translates up from 112%.
 *
 * One useInView observer on the heading drives every line via the
 * `animate` prop (fires once, -90px margin — mirrors lib/motion
 * VIEWPORT). `onLoad` plays immediately instead (hero entrance).
 * Reduced motion renders the finished state.
 *
 * `lines` is explicit — the designer owns the line breaks. On narrow
 * screens a long line may wrap inside its own mask; the reveal still
 * reads correctly.
 */
export function MaskedText({
  lines,
  as: Tag = "h2",
  delay = 0,
  stagger = STAGGER.base,
  duration = DUR.slow,
  onLoad = false,
  className,
  style,
  lineStyle,
}: {
  lines: ReactNode[];
  as?: HeadingTag;
  delay?: number;
  stagger?: number;
  duration?: number;
  onLoad?: boolean;
  className?: string;
  style?: CSSProperties;
  lineStyle?: CSSProperties | ((index: number) => CSSProperties);
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-90px" });
  const play = onLoad || inView;

  const resolveLineStyle = (i: number): CSSProperties | undefined =>
    typeof lineStyle === "function" ? lineStyle(i) : lineStyle;

  // Callback ref keeps the dynamic Tag union happy across h1/h2/h3/p/div.
  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
  };

  return (
    <Tag ref={setRef} className={className} style={style}>
      {lines.map((line, i) => (
        <span
          key={i}
          style={{
            display: "block",
            overflow: "hidden",
            // Keep descenders out of the clip without changing layout.
            paddingBottom: "0.12em",
            marginBottom: "-0.12em",
          }}
        >
          {reduce ? (
            <span style={{ display: "block", ...resolveLineStyle(i) }}>{line}</span>
          ) : (
            <m.span
              style={{ display: "block", willChange: "transform", ...resolveLineStyle(i) }}
              initial={{ y: "112%" }}
              animate={play ? { y: "0%" } : undefined}
              transition={{ duration, ease: EASE.out, delay: delay + i * stagger }}
            >
              {line}
            </m.span>
          )}
        </span>
      ))}
    </Tag>
  );
}
