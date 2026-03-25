// Relative time formatting: "3 minutes ago", "Yesterday", etc.
// Falls back to absolute dates after 7 days.

import { formatShortDate } from '@/lib/dates';

/**
 * Format a date as relative time.
 * < 1 min: "Just now"
 * 1-59 min: "X minutes ago"
 * 1-23 hours: "X hours ago"
 * 1 day: "Yesterday"
 * 2-6 days: "X days ago"
 * >= 7 days: absolute date (e.g. "Mar 15")
 */
export function formatRelativeTime(
  date: Date | string,
  now: Date = new Date(),
  tz: string = 'America/New_York'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();

  // Future dates (shouldn't happen but handle gracefully)
  if (diffMs < 0) {
    return formatShortDate(d, tz);
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHr === 1) return '1 hour ago';
  if (diffHr < 24) return `${diffHr} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatShortDate(d, tz);
}
