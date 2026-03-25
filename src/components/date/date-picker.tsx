'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CalendarGrid } from '@/components/date/calendar-grid';
import { CalendarHeader } from '@/components/date/calendar-header';
import { useTimezone } from '@/hooks/use-timezone';
import { formatFullDate } from '@/lib/dates';

interface DatePickerProps {
  /** Currently selected date */
  value?: Date | null;
  /** Called when a date is selected */
  onChange: (date: Date) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
}: DatePickerProps) {
  const { timezone } = useTimezone();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value || new Date());
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open]);

  const prevMonth = useCallback(() => {
    setViewMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }, []);

  const handleSelect = useCallback(
    (date: Date) => {
      onChange(date);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors"
        style={{
          fontFamily: 'var(--font-body)',
          color: value ? 'var(--color-dark)' : 'var(--color-mid-gray)',
          backgroundColor: 'var(--color-light)',
          borderColor: open ? 'var(--color-gold)' : 'var(--color-light-gray)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-mid-gray)' }}>
          <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.5 1.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M10.5 1.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {value ? formatFullDate(value, timezone) : placeholder}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 p-3 rounded-xl shadow-lg z-50"
          style={{
            backgroundColor: 'var(--color-light)',
            border: '1px solid var(--color-light-gray)',
            width: '280px',
          }}
        >
          <CalendarHeader
            month={viewMonth}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
          <CalendarGrid
            month={viewMonth}
            timezone={timezone}
            selectedStart={value}
            onDateClick={handleSelect}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      )}
    </div>
  );
}
