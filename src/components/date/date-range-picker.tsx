'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CalendarGrid } from '@/components/date/calendar-grid';
import { CalendarHeader } from '@/components/date/calendar-header';
import { DatePresets } from '@/components/date/date-presets';
import { useTimezone } from '@/hooks/use-timezone';
import type { DatePresetKey } from '@/types/dates';

interface DateRangePickerProps {
  /** Currently active preset */
  preset: DatePresetKey;
  /** Human-readable label for the trigger button */
  rangeLabel: string;
  /** Whether comparison mode is on */
  compareEnabled: boolean;
  /** Select a preset */
  onPresetSelect: (key: DatePresetKey) => void;
  /** Select a custom range */
  onCustomRange: (start: Date, end: Date) => void;
  /** Toggle comparison */
  onToggleComparison: () => void;
}

export function DateRangePicker({
  preset,
  rangeLabel,
  compareEnabled,
  onPresetSelect,
  onCustomRange,
  onToggleComparison,
}: DateRangePickerProps) {
  const { timezone } = useTimezone();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Custom range selection state
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Calendar months
  const [leftMonth, setLeftMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const rightMonth = useMemo(() => {
    const d = new Date(leftMonth);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, [leftMonth]);

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

  const handlePresetSelect = useCallback(
    (key: DatePresetKey) => {
      onPresetSelect(key);
      setCustomStart(null);
      setCustomEnd(null);
      setOpen(false);
    },
    [onPresetSelect]
  );

  const handleDateClick = useCallback(
    (date: Date) => {
      if (!customStart || customEnd) {
        // Start new selection
        setCustomStart(date);
        setCustomEnd(null);
      } else {
        // Complete selection
        const start = date < customStart ? date : customStart;
        const end = date < customStart ? customStart : date;
        setCustomEnd(end);
        setCustomStart(start);
      }
    },
    [customStart, customEnd]
  );

  const handleApply = useCallback(() => {
    if (customStart && customEnd) {
      onCustomRange(customStart, customEnd);
      setOpen(false);
    }
  }, [customStart, customEnd, onCustomRange]);

  const handleCancel = useCallback(() => {
    setCustomStart(null);
    setCustomEnd(null);
    setOpen(false);
  }, []);

  const prevMonth = useCallback(() => {
    setLeftMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setLeftMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors"
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 500,
          color: 'var(--color-dark)',
          backgroundColor: 'var(--color-light)',
          borderColor: open ? 'var(--color-gold)' : 'var(--color-light-gray)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ color: 'var(--color-mid-gray)' }}
        >
          <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.5 1.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M10.5 1.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {rangeLabel}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ color: 'var(--color-mid-gray)' }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-full right-0 mt-1 rounded-xl shadow-lg z-50 flex flex-col"
          style={{
            backgroundColor: 'var(--color-light)',
            border: '1px solid var(--color-light-gray)',
            width: 'min(600px, calc(100vw - 32px))',
          }}
        >
          <div className="flex">
            {/* Left: presets */}
            <div
              className="p-3 border-r flex-shrink-0"
              style={{ borderColor: 'var(--color-light-gray)' }}
            >
              <DatePresets
                activePreset={preset}
                onSelect={handlePresetSelect}
              />
            </div>

            {/* Right: calendars */}
            <div className="p-3 flex-1">
              <div className="flex gap-4">
                {/* Left calendar */}
                <div className="flex-1">
                  <CalendarHeader
                    month={leftMonth}
                    onPrev={prevMonth}
                    onNext={nextMonth}
                  />
                  <CalendarGrid
                    month={leftMonth}
                    timezone={timezone}
                    selectedStart={customStart}
                    selectedEnd={customEnd}
                    hoveredDate={hoveredDate}
                    onDateClick={handleDateClick}
                    onDateHover={setHoveredDate}
                    maxDate={new Date()}
                  />
                </div>

                {/* Right calendar */}
                <div className="flex-1 hidden sm:block">
                  <CalendarHeader
                    month={rightMonth}
                    onPrev={prevMonth}
                    onNext={nextMonth}
                  />
                  <CalendarGrid
                    month={rightMonth}
                    timezone={timezone}
                    selectedStart={customStart}
                    selectedEnd={customEnd}
                    hoveredDate={hoveredDate}
                    onDateClick={handleDateClick}
                    onDateHover={setHoveredDate}
                    maxDate={new Date()}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--color-light-gray)' }}
          >
            {/* Compare toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={compareEnabled}
                onClick={onToggleComparison}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: compareEnabled
                    ? 'var(--color-gold)'
                    : 'var(--color-light-gray)',
                }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                  style={{
                    transform: compareEnabled
                      ? 'translateX(18px)'
                      : 'translateX(3px)',
                  }}
                />
              </button>
              <span
                className="text-xs"
                style={{
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-body-text)',
                }}
              >
                Compare to previous period
              </span>
            </label>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 500,
                  color: 'var(--color-body-text)',
                  backgroundColor: 'transparent',
                }}
                onMouseOver={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--color-light-gray)')
                }
                onMouseOut={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor =
                    'transparent')
                }
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!customStart || !customEnd}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 500,
                  color:
                    customStart && customEnd ? '#fff' : 'var(--color-mid-gray)',
                  backgroundColor:
                    customStart && customEnd
                      ? 'var(--color-gold)'
                      : 'var(--color-light-gray)',
                  cursor:
                    customStart && customEnd ? 'pointer' : 'not-allowed',
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
