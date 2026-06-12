"use client";

import { m, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { DUR, EASE, STAGGER, VIEWPORT } from "@/lib/motion";

type HeadingTag = "h1" | "h2" | "h3" | "p" | "div";

/**
 * Line-by-line masked headline reveal: each line sits in an
 * overflow-hidden container and translates up from 112%.
 *
 * `lines` is explicit — the designer owns the line breaks. On narrow
 * screens a long line may wrap inside its own mask; the reveal still
 * reads correctly.
 *
 * `onLoad` plays the reveal immediately (hero entrance) instead of on
 * scroll. Reduced motion renders the finished state.
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

  const resolveLineStyle = (i: number): CSSProperties | undefined =>
    typeof lineStyle === "function" ? lineStyle(i) : lineStyle;

  return (
    <Tag className={className} style={style}>
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
              {...(onLoad
                ? { animate: { y: "0%" } }
                : { whileInView: { y: "0%" }, viewport: VIEWPORT })}
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
