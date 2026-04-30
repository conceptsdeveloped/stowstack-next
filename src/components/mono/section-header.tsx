"use client";

/**
 * § NN  · KICKER                             RIGHT-META
 * ───────────────────────────────────────────
 * <Display>HEADLINE</Display>
 * <subtitle>optional italic serif</subtitle>
 *
 * The repeating section-header that makes every chapter feel like part
 * of one document. Use above any section's body content.
 */

import type { CSSProperties, ReactNode } from "react";
import { Label, Display, MONO } from "./index";

export function SectionMeta({ text }: { text: string }) {
  return <Label style={{ color: MONO.textDim }}>{text}</Label>;
}

export function SectionHeader({
  number,
  kicker,
  right,
  headline,
  subtitle,
  italic,
  style,
}: {
  number: string | number;
  kicker: string;
  right?: ReactNode;
  headline?: ReactNode;
  subtitle?: ReactNode;
  italic?: boolean;
  style?: CSSProperties;
}) {
  const n = typeof number === "number" ? String(number).padStart(2, "0") : number;
  return (
    <div style={style}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingBottom: 8,
          borderBottom: `1px solid ${MONO.line}`,
          marginBottom: headline ? 20 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <Label style={{ color: MONO.accent, fontWeight: 500 }}>§ {n}</Label>
          <Label style={{ color: MONO.textDim }}>{kicker}</Label>
        </div>
        {right && <div>{right}</div>}
      </div>
      {headline && (
        <Display
          size={64}
          italic={italic}
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4.25rem)",
            display: "block",
            marginBottom: subtitle ? 10 : 0,
          }}
        >
          {headline}
        </Display>
      )}
      {subtitle && (
        <div
          style={{
            fontFamily: MONO.serif,
            fontStyle: "italic",
            fontSize: 15,
            color: MONO.textDim,
            maxWidth: "60ch",
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
