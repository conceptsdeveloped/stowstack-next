// Date range preset definitions for StorageAds dashboard
// "Last 30 days" is the default — operators think in monthly cycles.
// All ranges computed relative to "now" in the operator's timezone.
// "Last X days" = X calendar days ending yesterday (today is incomplete).

import { toLocalDateParts, startOfDayInTz, endOfDayInTz } from '@/lib/timezone';
import type { DatePreset, DatePresetKey, DateRange } from '@/types/dates';

function daysAgo(now: Date, days: number, tz: string): DateRange {
  const end = new Date(now);
  end.setDate(end.getDate() - 1); // yesterday
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return {
    start: startOfDayInTz(start, tz),
    end: endOfDayInTz(end, tz),
    preset: `last_${days}_days` as DatePresetKey,
  };
}

export const DATE_PRESETS: DatePreset[] = [
  {
    key: 'today',
    label: 'Today',
    getRange: (now, tz) => ({
      start: startOfDayInTz(now, tz),
      end: endOfDayInTz(now, tz),
      preset: 'today',
    }),
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    getRange: (now, tz) => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: startOfDayInTz(yesterday, tz),
        end: endOfDayInTz(yesterday, tz),
        preset: 'yesterday',
      };
    },
  },
  {
    key: 'last_7_days',
    label: 'Last 7 days',
    getRange: (now, tz) => daysAgo(now, 7, tz),
  },
  {
    key: 'last_30_days',
    label: 'Last 30 days',
    getRange: (now, tz) => daysAgo(now, 30, tz),
  },
  {
    key: 'last_90_days',
    label: 'Last 90 days',
    getRange: (now, tz) => daysAgo(now, 90, tz),
  },
  {
    key: 'this_month',
    label: 'This month',
    getRange: (now, tz) => {
      const { year, month } = toLocalDateParts(now, tz);
      const firstOfMonth = new Date(`${year}-${month}-01T12:00:00`);
      return {
        start: startOfDayInTz(firstOfMonth, tz),
        end: endOfDayInTz(now, tz),
        preset: 'this_month',
      };
    },
  },
  {
    key: 'last_month',
    label: 'Last month',
    getRange: (now, tz) => {
      const { year, month } = toLocalDateParts(now, tz);
      const y = parseInt(year);
      const m = parseInt(month);
      const prevMonth = m === 1 ? 12 : m - 1;
      const prevYear = m === 1 ? y - 1 : y;
      const firstDay = new Date(
        `${prevYear}-${String(prevMonth).padStart(2, '0')}-01T12:00:00`
      );
      // Last day of previous month = day 0 of current month
      const lastDay = new Date(y, m - 1, 0, 12, 0, 0);
      return {
        start: startOfDayInTz(firstDay, tz),
        end: endOfDayInTz(lastDay, tz),
        preset: 'last_month',
      };
    },
  },
  {
    key: 'this_quarter',
    label: 'This quarter',
    getRange: (now, tz) => {
      const { year, month } = toLocalDateParts(now, tz);
      const m = parseInt(month);
      const quarterStart = Math.floor((m - 1) / 3) * 3 + 1;
      const firstDay = new Date(
        `${year}-${String(quarterStart).padStart(2, '0')}-01T12:00:00`
      );
      return {
        start: startOfDayInTz(firstDay, tz),
        end: endOfDayInTz(now, tz),
        preset: 'this_quarter',
      };
    },
  },
  {
    key: 'this_year',
    label: 'This year',
    getRange: (now, tz) => {
      const { year } = toLocalDateParts(now, tz);
      const firstDay = new Date(`${year}-01-01T12:00:00`);
      return {
        start: startOfDayInTz(firstDay, tz),
        end: endOfDayInTz(now, tz),
        preset: 'this_year',
      };
    },
  },
];

export const DEFAULT_PRESET: DatePresetKey = 'last_30_days';

/** Look up a preset by key */
export function getPreset(key: DatePresetKey): DatePreset | undefined {
  return DATE_PRESETS.find((p) => p.key === key);
}

/** Compute the comparison (previous) period for a given range */
export function getComparisonRange(range: DateRange): DateRange {
  const durationMs = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - durationMs - 1),
    end: new Date(range.start.getTime() - 1),
  };
}
