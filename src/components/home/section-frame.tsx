"use client";

import type { CSSProperties, ReactNode } from "react";
import { MaskedText } from "@/components/motion/masked-text";
import { Reveal } from "@/components/motion/reveal";
import { STAGGER } from "@/lib/motion";

/**
 * The document spine. Every chapter of the page opens with the same
 * ledger header: a hairline rule, "§ NN · KICKER" on the left, optional
 * meta on the right, then an oversized Manrope display lockup revealed
 * line by line, then an optional lede.
 *
 * `headlineWeight` picks the register: "display" (800, tight) or
 * "thin" (200, tighter) — the two instruments.
 */
export default function SectionFrame({
  number,
  kicker,
  meta,
  lines,
  as = "h2",
  headlineWeight = "display",
  lede,
  onInk = false,
  align = "left",
  maxLedeWidth = 560,
  size,
  style,
}: {
  number?: string;
  kicker: string;
  meta?: string;
  lines?: ReactNode[];
  as?: "h1" | "h2" | "h3";
  headlineWeight?: "display" | "thin";
  lede?: ReactNode;
  onInk?: boolean;
  align?: "left" | "center";
  maxLedeWidth?: number;
  size?: string;
  style?: CSSProperties;
}) {
  const dimColor = onInk ? "var(--text-on-ink-dim)" : "var(--text-dim)";
  const lineColor = onInk ? "var(--line-on-ink)" : "var(--line)";
  const centered = align === "center";

  return (
    <div style={style}>
      <Reveal y={8}>
        <div
          className="flex items-center justify-between gap-3"
          style={{
            paddingBottom: 10,
            borderBottom: `1px solid ${lineColor}`,
            marginBottom: lines ? "clamp(28px, 5vw, 52px)" : 0,
          }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {number && (
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "var(--track-label)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                § {number}
              </span>
            )}
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "var(--track-label)",
                textTransform: "uppercase",
                fontWeight: 500,
                color: dimColor,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {kicker}
            </span>
          </div>
          {meta && (
            <span
              className="hidden sm:block"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "var(--track-label)",
                textTransform: "uppercase",
                color: dimColor,
                whiteSpace: "nowrap",
              }}
            >
              {meta}
            </span>
          )}
        </div>
      </Reveal>

      {lines && (
        <MaskedText
          lines={lines}
          as={as}
          stagger={STAGGER.base}
          className={headlineWeight === "thin" ? "hx-thin" : "hx-display"}
          style={{
            fontSize: size ?? "var(--type-display)",
            textAlign: centered ? "center" : "left",
            textWrap: "balance",
          }}
        />
      )}

      {lede && (
        <Reveal delay={0.18}>
          <p
            style={{
              marginTop: "clamp(16px, 2.5vw, 24px)",
              marginLeft: centered ? "auto" : 0,
              marginRight: centered ? "auto" : 0,
              fontSize: "var(--type-lede)",
              lineHeight: 1.6,
              color: dimColor,
              maxWidth: maxLedeWidth,
              textAlign: centered ? "center" : "left",
            }}
          >
            {lede}
          </p>
        </Reveal>
      )}
    </div>
  );
}
