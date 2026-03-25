import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

/**
 * Reusable empty state for tables, lists, and sections.
 * Consistent design: icon, title, description, optional gold CTA.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className="rounded-xl border p-10 text-center"
      style={{ borderColor: 'var(--color-light-gray)', backgroundColor: 'var(--color-light)' }}
    >
      {icon && (
        <div className="mb-4 flex justify-center" style={{ color: 'var(--color-mid-gray)' }}>
          {icon}
        </div>
      )}
      <h3
        className="text-base font-medium mb-1"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
      >
        {title}
      </h3>
      <p
        className="text-sm mb-5 max-w-sm mx-auto"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}
      >
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium"
          style={{ fontFamily: 'var(--font-heading)', color: '#fff', backgroundColor: 'var(--color-gold)' }}
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium"
          style={{ fontFamily: 'var(--font-heading)', color: '#fff', backgroundColor: 'var(--color-gold)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
