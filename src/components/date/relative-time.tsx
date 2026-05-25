'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const d = useMemo(() => typeof date === 'string' ? new Date(date) : date, [date]);
  // Start as null so SSR + first client render produce matching markup;
  // populate after mount so the relative timestamp doesn't desync against
  // server-rendered HTML (causes hydration mismatches in feeds/lists).
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 60 * 60 * 1000) {
      const interval = setInterval(() => setNow(new Date()), 60_000);
      return () => clearInterval(interval);
    }
  }, [d]);

  const relative = now ? formatRelativeTime(d, now, tz) : '';
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
