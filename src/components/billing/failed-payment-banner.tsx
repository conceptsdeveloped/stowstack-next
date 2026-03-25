'use client';

import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import Link from 'next/link';

interface FailedPaymentBannerProps {
  daysUntilPause?: number;
}

/**
 * Fixed banner shown on ALL admin pages when payment is overdue.
 * Escalates messaging as the grace period runs out.
 * Dismissable per page load (reappears on navigation).
 */
export function FailedPaymentBanner({ daysUntilPause = 7 }: FailedPaymentBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isUrgent = daysUntilPause <= 2;

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 mb-4 rounded-lg"
      style={{
        backgroundColor: 'rgba(176, 74, 58, 0.08)',
        borderLeft: '3px solid var(--color-red)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <AlertCircle className="h-5 w-5 shrink-0" style={{ color: 'var(--color-red)' }} />
        <p
          className="text-sm"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-dark)' }}
        >
          {isUrgent
            ? `Your campaigns will be paused in ${daysUntilPause} day${daysUntilPause === 1 ? '' : 's'}. Update your payment method now.`
            : 'Your last payment failed. Update your payment method to keep your campaigns running.'}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/admin/settings?tab=integrations"
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
          style={{
            fontFamily: 'var(--font-heading)',
            color: '#fff',
            backgroundColor: 'var(--color-gold)',
          }}
        >
          Update payment method
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--color-mid-gray)' }}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
