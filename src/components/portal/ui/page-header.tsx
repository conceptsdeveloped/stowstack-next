import type { ReactNode } from "react";

/**
 * Standard page title row. Use the same label the portal nav source resolves
 * for the route so the in-page heading matches the shell header.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--color-dark)]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-body-text)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
