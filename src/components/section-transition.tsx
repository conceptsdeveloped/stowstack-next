import type { ReactNode, CSSProperties } from "react";

interface SectionTransitionProps {
  children: ReactNode;
  fromColor?: string;
  toColor?: string;
  className?: string;
}

/**
 * Wraps a section with a 240px gradient bleed that smoothly transitions
 * between section background colors using CSS custom properties.
 */
export default function SectionTransition({
  children,
  fromColor = "transparent",
  toColor = "transparent",
  className = "",
}: SectionTransitionProps) {
  return (
    <div
      className={`section-transition ${className}`}
      style={
        {
          "--section-color-from": fromColor,
          "--section-color-to": toColor,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
