import type { ReactNode } from "react";

/**
 * Single component for "no data yet" states across the portal, replacing the
 * ad-hoc inline empty text each page wrote.
 */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[6px] border border-dashed border-[var(--border-subtle)] px-6 py-12 text-center">
      {icon && <div className="mb-3 text-[var(--color-mid-gray)]">{icon}</div>}
      <p className="text-sm font-medium text-[var(--color-dark)]">{title}</p>
      {message && <p className="mt-1 max-w-xs text-xs text-[var(--color-body-text)]">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
