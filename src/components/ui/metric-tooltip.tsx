'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface MetricTooltipProps {
  term: string;
  definition: string;
}

/** Metric definitions — inline help icons on dashboards */
const METRIC_DEFINITIONS: Record<string, string> = {
  'cost_per_move_in': 'Total ad spend divided by the number of attributed move-ins. Measures actual revenue, not just interest.',
  'roas': 'Return on ad spend. Revenue generated divided by ad spend. A ROAS of 5x means $5 revenue per $1 spent.',
  'move_ins': 'Tenants who signed a lease and moved into a unit, attributed to a specific ad campaign.',
  'ctr': 'Click-through rate. Percentage of people who saw your ad and clicked it.',
  'cpc': 'Cost per click. What you pay each time someone clicks your ad.',
  'conversion_rate': 'Percentage of landing page visitors who completed a reservation.',
  'occupancy': 'Percentage of total units currently rented. Industry average is ~92%.',
  'impressions': 'Number of times your ad was shown to someone.',
};

export function MetricTooltip({ term, definition }: MetricTooltipProps) {
  const [show, setShow] = useState(false);
  const def = definition || METRIC_DEFINITIONS[term] || '';

  if (!def) return null;

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="inline-flex items-center justify-center ml-1"
        aria-label={`What is ${term}?`}
      >
        <HelpCircle className="h-3.5 w-3.5" style={{ color: 'var(--color-mid-gray)' }} />
      </button>
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-lg px-3 py-2 text-xs shadow-lg z-50 w-56"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-light)',
            backgroundColor: 'var(--color-dark)',
            lineHeight: 1.5,
          }}
        >
          {def}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid var(--color-dark)',
            }}
          />
        </span>
      )}
    </span>
  );
}

export { METRIC_DEFINITIONS };
