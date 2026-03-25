'use client';

import { Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/relative-time';

interface StaleDataIndicatorProps {
  lastUpdated: Date | string;
  onRefresh?: () => void;
}

/**
 * Shows when dashboard data might be stale.
 * "Last updated 5 minutes ago" with optional refresh button.
 */
export function StaleDataIndicator({ lastUpdated, onRefresh }: StaleDataIndicatorProps) {
  const d = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;
  const relative = formatRelativeTime(d);

  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-mid-gray)' }}>
      <Clock className="h-3 w-3" />
      <span style={{ fontFamily: 'var(--font-body)' }}>Updated {relative}</span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="font-medium underline"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          Refresh
        </button>
      )}
    </div>
  );
}
