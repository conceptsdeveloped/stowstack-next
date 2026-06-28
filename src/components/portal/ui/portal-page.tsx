import type { ReactNode } from "react";
import { PageHeader } from "./page-header";

/** Full class strings so Tailwind keeps them; one max-width wins, no conflict. */
const MAX_WIDTHS = {
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

/**
 * Page scaffold: centered max-width container + responsive padding + an
 * optional standard header. Every portal route renders its body inside this
 * so spacing and width are consistent (the dashboard previously had none).
 * Pick `maxWidth` per route: narrow forms ("2xl"), reading width ("4xl"),
 * or wide data views ("6xl", the default).
 */
export function PortalPage({
  title,
  subtitle,
  actions,
  children,
  maxWidth = "6xl",
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: keyof typeof MAX_WIDTHS;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full ${MAX_WIDTHS[maxWidth]} px-4 py-6 md:px-6 md:py-8 ${className}`}>
      {title && <PageHeader title={title} subtitle={subtitle} actions={actions} />}
      {children}
    </div>
  );
}
