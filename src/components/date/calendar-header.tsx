'use client';

interface CalendarHeaderProps {
  /** Current month being displayed */
  month: Date;
  /** Navigate to previous month */
  onPrev: () => void;
  /** Navigate to next month */
  onNext: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CalendarHeader({ month, onPrev, onNext }: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <button
        type="button"
        onClick={onPrev}
        className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
        style={{ color: 'var(--color-body-text)' }}
        onMouseOver={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-light-gray)')
        }
        onMouseOut={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
        aria-label="Previous month"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <span
        className="text-sm font-medium"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-dark)',
          fontWeight: 500,
        }}
      >
        {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
      </span>

      <button
        type="button"
        onClick={onNext}
        className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
        style={{ color: 'var(--color-body-text)' }}
        onMouseOver={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-light-gray)')
        }
        onMouseOut={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
        aria-label="Next month"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
