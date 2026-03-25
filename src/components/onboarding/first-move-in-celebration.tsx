'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface FirstMoveInCelebrationProps {
  tenantName?: string;
  campaignName?: string;
  cost?: number;
  onDismiss: () => void;
}

/**
 * Gold celebration toast for the first attributed move-in.
 * Stays for 10 seconds (longer than normal toasts).
 * Designed to be screenshot-worthy.
 */
export function FirstMoveInCelebration({
  tenantName,
  campaignName,
  cost,
  onDismiss,
}: FirstMoveInCelebrationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 10_000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 w-80 rounded-xl p-4 shadow-lg animate-in"
      style={{
        backgroundColor: 'var(--color-light)',
        border: '2px solid var(--color-gold)',
        animation: 'slideInRight 400ms ease-out',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: 'var(--color-gold)' }} />
          <span
            className="text-sm font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
          >
            Your first move-in!
          </span>
        </div>
        <button type="button" onClick={() => { setVisible(false); onDismiss(); }} style={{ color: 'var(--color-mid-gray)' }}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <p
        className="text-sm"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}
      >
        {tenantName && <strong style={{ color: 'var(--color-dark)' }}>{tenantName}</strong>}
        {tenantName && ' moved in'}
        {campaignName && (
          <>
            {' via '}
            <span style={{ color: 'var(--color-gold)', fontWeight: 500 }}>{campaignName}</span>
          </>
        )}
        {cost !== undefined && (
          <>
            {'. Cost: '}
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                color: 'var(--color-gold)',
              }}
            >
              ${cost.toFixed(2)}
            </span>
          </>
        )}
      </p>

      {/* Progress bar (auto-dismiss indicator) */}
      <div
        className="mt-3 h-0.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-light-gray)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: 'var(--color-gold)',
            animation: 'shrinkWidth 10s linear forwards',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
