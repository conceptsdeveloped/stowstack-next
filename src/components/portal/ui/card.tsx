import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article";
}

/**
 * Standard portal surface: subtle border, surface fill, token-driven.
 * Replaces the ad-hoc inline `border rounded bg-white` divs across pages.
 */
export function Card({ as = "div", className = "", children, ...rest }: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={`rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
