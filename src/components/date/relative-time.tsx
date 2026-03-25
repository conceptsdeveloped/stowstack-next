'use client';

import { useState, useEffect } from 'react';
import { formatRelativeTime } from '@/lib/relative-time';
import { formatDateTimeTz } from '@/lib/dates';
import { useTimezone } from '@/hooks/use-timezone';

interface RelativeTimeProps {
  /** The date to display relative to now */
  date: Date | string;
  /** Override timezone (defaults to operator timezone) */
  timezone?: string;
}

/**
 * Renders a relative time string ("3 hours ago") with a tooltip showing
 * the full absolute date ("Mar 15, 3:42 PM EST").
 * Auto-updates every 60 seconds for recent timestamps.
 */
export function RelativeTime({ date, timezone: tzOverride }: RelativeTimeProps) {
  const { timezone: autoTz } = useTimezone();
  const tz = tzOverride || autoTz;
  const d = typeof date === 'string' ? new Date(date) : date;
  const [now, setNow] = useState(() => new Date());

  // Auto-update for recent timestamps (< 1 hour old)
  useEffect(() => {
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 60 * 60 * 1000) {
      const interval = setInterval(() => setNow(new Date()), 60_000);
      return () => clearInterval(interval);
    }
  }, [d]);

  const relative = formatRelativeTime(d, now, tz);
  const absolute = formatDateTimeTz(d, tz);

  return (
    <time
      dateTime={d.toISOString()}
      title={absolute}
      style={{
        fontFamily: 'var(--font-body)',
        color: 'var(--color-body-text)',
        cursor: 'default',
      }}
    >
      {relative}
    </time>
  );
}
