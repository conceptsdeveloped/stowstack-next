// Timezone detection and conversion utilities for StorageAds
// All dashboard dates render in the operator's local timezone

export const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
] as const;

/** Auto-detect browser timezone, e.g. "America/Detroit" */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York'; // safe fallback
  }
}

/** Get timezone abbreviation like "EST", "CST", "PST" */
export function getTimezoneAbbr(tz: string, date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/**
 * Get the start of a day in a specific timezone as a UTC Date.
 * e.g. "2026-03-15" in "America/New_York" → the UTC instant of midnight ET on that day.
 */
export function startOfDayInTz(date: Date, tz: string): Date {
  const dateStr = toLocalDateParts(date, tz);
  // Create a date string that Intl can interpret in the target timezone
  const midnight = new Date(
    `${dateStr.year}-${dateStr.month}-${dateStr.day}T00:00:00`
  );
  // Calculate the offset to convert to UTC
  const utcStr = midnight.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = midnight.toLocaleString('en-US', { timeZone: tz });
  const diff = new Date(utcStr).getTime() - new Date(tzStr).getTime();
  return new Date(midnight.getTime() + diff);
}

/**
 * Get the end of a day (23:59:59.999) in a specific timezone as a UTC Date.
 */
export function endOfDayInTz(date: Date, tz: string): Date {
  const start = startOfDayInTz(date, tz);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Extract year/month/day parts as they appear in a timezone */
export function toLocalDateParts(
  date: Date,
  tz: string
): { year: string; month: string; day: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  return {
    year: parts.find((p) => p.type === 'year')?.value ?? '2026',
    month: parts.find((p) => p.type === 'month')?.value ?? '01',
    day: parts.find((p) => p.type === 'day')?.value ?? '01',
  };
}

/** Create a Date from a local "YYYY-MM-DD" string in a given timezone */
export function fromLocalDate(isoDate: string, tz: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  // Build a date at noon local time to avoid DST edge cases, then adjust to midnight
  const noon = new Date(`${isoDate}T12:00:00`);
  const utcStr = noon.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = noon.toLocaleString('en-US', { timeZone: tz });
  const offset = new Date(utcStr).getTime() - new Date(tzStr).getTime();
  const midnightLocal = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0) + offset
  );
  return midnightLocal;
}
