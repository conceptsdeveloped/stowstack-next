// Date formatting utilities for StorageAds
// All functions accept a timezone string and format dates in that timezone.
// Uses Intl.DateTimeFormat for locale-aware formatting.

import { toLocalDateParts } from '@/lib/timezone';
import type { DateRange } from '@/types/dates';

/** Full date: "March 15, 2026" — report headers, campaign details */
export function formatFullDate(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/** Abbreviated: "Mar 15" — chart axes, table cells (current year implied) */
export function formatShortDate(date: Date, tz: string): string {
  const now = new Date();
  const { year: dateYear } = toLocalDateParts(date, tz);
  const { year: nowYear } = toLocalDateParts(now, tz);
  const sameYear = dateYear === nowYear;

  if (sameYear) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      month: 'short',
      day: 'numeric',
    }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/** With time: "Mar 15, 3:42 PM" — audit logs, notification timestamps */
export function formatDateTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** With time and timezone: "Mar 15, 3:42 PM EST" — when timezone matters */
export function formatDateTimeTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(date);
}

/** Date range: "Mar 1 – Mar 31, 2026" (en dash) */
export function formatDateRange(range: DateRange, tz: string): string {
  const startParts = toLocalDateParts(range.start, tz);
  const endParts = toLocalDateParts(range.end, tz);
  const now = new Date();
  const { year: nowYear } = toLocalDateParts(now, tz);

  const startFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
  }).format(range.start);

  const sameYear = startParts.year === endParts.year;
  const isCurrentYear = endParts.year === nowYear;

  if (sameYear && isCurrentYear) {
    const endFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      month: 'short',
      day: 'numeric',
    }).format(range.end);
    return `${startFmt} – ${endFmt}`;
  }

  const endFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(range.end);

  if (!sameYear) {
    const startWithYear = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(range.start);
    return `${startWithYear} – ${endFmt}`;
  }

  return `${startFmt} – ${endFmt}`;
}

/** ISO date string for API requests: "2026-03-15" */
export function toISODate(date: Date, tz: string): string {
  const { year, month, day } = toLocalDateParts(date, tz);
  return `${year}-${month}-${day}`;
}

/** Chart axis label: "Mar 1" — no year if current year */
export function formatChartDate(date: Date, tz: string): string {
  return formatShortDate(date, tz);
}

/** Time only: "3:42 PM" */
export function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** Check if two dates are the same calendar day in a timezone */
export function isSameDay(a: Date, b: Date, tz: string): boolean {
  const ap = toLocalDateParts(a, tz);
  const bp = toLocalDateParts(b, tz);
  return ap.year === bp.year && ap.month === bp.month && ap.day === bp.day;
}

/** Check if a date is today in a timezone */
export function isToday(date: Date, tz: string): boolean {
  return isSameDay(date, new Date(), tz);
}

/** Get the number of days between two dates */
export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs(b.getTime() - a.getTime()) / msPerDay);
}
