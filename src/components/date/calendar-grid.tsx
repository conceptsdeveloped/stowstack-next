'use client';

import { useMemo } from 'react';
import { toLocalDateParts } from '@/lib/timezone';

interface CalendarGridProps {
  /** The month to display (any date within that month) */
  month: Date;
  /** Operator timezone */
  timezone: string;
  /** Currently selected date (single picker) or start of range */
  selectedStart?: Date | null;
  /** End of selected range (range picker only) */
  selectedEnd?: Date | null;
  /** Date being hovered (for range preview) */
  hoveredDate?: Date | null;
  /** Called when a day is clicked */
  onDateClick: (date: Date) => void;
  /** Called when a day is hovered */
  onDateHover?: (date: Date | null) => void;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarGrid({
  month,
  timezone,
  selectedStart,
  selectedEnd,
  hoveredDate,
  onDateClick,
  onDateHover,
  minDate,
  maxDate,
}: CalendarGridProps) {
  const { year: monthYear, month: monthNum } = toLocalDateParts(month, timezone);
  const y = parseInt(monthYear);
  const m = parseInt(monthNum);

  const weeks = useMemo(() => {
    // First day of this month
    const firstOfMonth = new Date(y, m - 1, 1);
    const startDay = firstOfMonth.getDay(); // 0=Sun

    // Total days in this month
    const daysInMonth = new Date(y, m, 0).getDate();

    // Build grid: 6 weeks max
    const cells: Date[] = [];

    // Days from previous month to fill first row
    const prevMonthDays = new Date(y, m - 1, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push(new Date(y, m - 2, prevMonthDays - i));
    }

    // Days of this month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(y, m - 1, d));
    }

    // Fill remaining to complete last week
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        cells.push(new Date(y, m, d));
      }
    }

    // Split into weeks
    const result: Date[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [y, m]);

  const todayStr = toLocalDateParts(new Date(), timezone);
  const todayKey = `${todayStr.year}-${todayStr.month}-${todayStr.day}`;

  function dateKey(d: Date): string {
    const p = toLocalDateParts(d, timezone);
    return `${p.year}-${p.month}-${p.day}`;
  }

  function isCurrentMonth(d: Date): boolean {
    return d.getMonth() === m - 1 && d.getFullYear() === y;
  }

  function isDisabled(d: Date): boolean {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  }

  function isSelected(d: Date): boolean {
    if (!selectedStart) return false;
    const dk = dateKey(d);
    if (dk === dateKey(selectedStart)) return true;
    if (selectedEnd && dk === dateKey(selectedEnd)) return true;
    return false;
  }

  function isInRange(d: Date): boolean {
    if (!selectedStart) return false;
    const end = selectedEnd || hoveredDate;
    if (!end) return false;
    const t = d.getTime();
    const s = Math.min(selectedStart.getTime(), end.getTime());
    const e = Math.max(selectedStart.getTime(), end.getTime());
    return t > s && t < e;
  }

  return (
    <div className="select-none">
      {/* Day name headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="text-center text-xs font-medium"
            style={{ color: 'var(--color-mid-gray)', fontFamily: 'var(--font-heading)' }}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            const key = dateKey(day);
            const disabled = isDisabled(day);
            const selected = isSelected(day);
            const inRange = isInRange(day);
            const currentMonth = isCurrentMonth(day);
            const today = key === todayKey;

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onDateClick(day)}
                onMouseEnter={() => onDateHover?.(day)}
                onMouseLeave={() => onDateHover?.(null)}
                className="relative flex items-center justify-center h-9 w-full text-sm transition-colors"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 400,
                  borderRadius: '6px',
                  color: disabled
                    ? 'var(--color-mid-gray)'
                    : selected
                      ? '#fff'
                      : currentMonth
                        ? 'var(--color-dark)'
                        : 'var(--color-mid-gray)',
                  backgroundColor: selected
                    ? 'var(--color-gold)'
                    : inRange
                      ? 'var(--color-gold-light)'
                      : 'transparent',
                  opacity: disabled ? 0.4 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
                onMouseOver={(e) => {
                  if (!disabled && !selected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      inRange ? 'var(--color-gold-light)' : 'var(--color-light-gray)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!disabled && !selected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      inRange ? 'var(--color-gold-light)' : 'transparent';
                  }
                }}
              >
                {day.getDate()}
                {today && !selected && (
                  <span
                    className="absolute inset-0 rounded-md pointer-events-none"
                    style={{
                      border: '2px solid var(--color-gold)',
                      borderRadius: '6px',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
