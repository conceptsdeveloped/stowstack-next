import type { ReactNode } from "react";
import { PageHeader } from "./page-header";

/**
 * Page scaffold: centered max-width container + responsive padding + an
 * optional standard header. Every portal route renders its body inside this
 * so spacing and width are consistent (the dashboard previously had none).
 */
export function PortalPage({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8 ${className}`}>
      {title && <PageHeader title={title} subtitle={subtitle} actions={actions} />}
      {children}
    </div>
  );
}
