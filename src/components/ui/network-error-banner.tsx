'use client';

import { useState } from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';

interface NetworkErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Banner shown when a network request fails.
 * Appears at top of content area with retry action.
 */
export function NetworkErrorBanner({
  message = 'Unable to connect. Check your internet connection.',
  onRetry,
}: NetworkErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 mb-4"
      style={{
        backgroundColor: 'rgba(176, 74, 58, 0.08)',
        border: '1px solid rgba(176, 74, 58, 0.15)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="h-4 w-4 shrink-0" style={{ color: 'var(--color-red)' }} />
        <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-dark)' }}>
          {message}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)', backgroundColor: 'var(--color-gold-light)' }}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
        <button type="button" onClick={() => setDismissed(true)} style={{ color: 'var(--color-mid-gray)' }}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
