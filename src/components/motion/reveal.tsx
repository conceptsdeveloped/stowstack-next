"use client";

import { m, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { DUR, EASE, RISE, STAGGER, VIEWPORT, fadeRise, staggerParent } from "@/lib/motion";

/**
 * Scroll-triggered fade/translate workhorses. All of them:
 *  - animate transform/opacity only (zero CLS)
 *  - fire once (VIEWPORT.once)
 *  - render static under prefers-reduced-motion
 */

export function Reveal({
  children,
  delay = 0,
  y = RISE,
  duration = DUR.base,
  className,
  style,
  inline = false,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  inline?: boolean;
}) {
  const reduce = useReducedMotion();
  const Tag = inline ? m.span : m.div;
  if (reduce) {
    return inline ? (
      <span className={className} style={style}>{children}</span>
    ) : (
      <div className={className} style={style}>{children}</div>
    );
  }
  return (
    <Tag
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration, delay, ease: EASE.out }}
    >
      {children}
    </Tag>
  );
}

export function RevealStagger({
  children,
  stagger = STAGGER.base,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  stagger?: number;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className} style={style}>{children}</div>;
  }
  return (
    <m.div
      className={className}
      style={style}
      variants={staggerParent(stagger, delay)}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
    >
      {children}
    </m.div>
  );
}

export function RevealItem({
  children,
  y = RISE,
  duration = DUR.base,
  className,
  style,
}: {
  children: ReactNode;
  y?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className} style={style}>{children}</div>;
  }
  return (
    <m.div className={className} style={style} variants={fadeRise(y, duration)}>
      {children}
    </m.div>
  );
}
