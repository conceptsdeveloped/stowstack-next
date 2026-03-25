'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useOnboarding } from '@/hooks/use-onboarding';

/**
 * Persistent onboarding checklist widget for the admin sidebar.
 * Shows until all items are complete, then dismissable.
 */
export function OnboardingChecklist() {
  const { checklist, progress, completedCount, totalCount, isOnboarding } = useOnboarding();
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !isOnboarding) return null;

  return (
    <div
      className="mx-3 mb-3 rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--color-gold)', backgroundColor: 'var(--color-light)' }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2.5"
        style={{ backgroundColor: 'var(--color-gold-light)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
          >
            Setup Progress
          </span>
          <span
            className="text-[10px]"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-body-text)' }}
          >
            {completedCount} of {totalCount}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" style={{ color: 'var(--color-gold)' }} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--color-gold)' }} />
        )}
      </button>

      {/* Progress bar */}
      <div className="h-1" style={{ backgroundColor: 'var(--color-light-gray)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: 'var(--color-gold)' }}
        />
      </div>

      {/* Checklist items */}
      {expanded && (
        <div className="px-3 py-2 space-y-1">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-start gap-2 py-1">
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full mt-0.5"
                style={{
                  backgroundColor: item.isComplete ? 'var(--color-gold)' : 'transparent',
                  border: item.isComplete ? 'none' : '1.5px solid var(--color-light-gray)',
                }}
              >
                {item.isComplete && <Check className="h-2.5 w-2.5 text-white" />}
              </span>
              <div className="min-w-0 flex-1">
                {item.isComplete ? (
                  <span
                    className="text-xs line-through"
                    style={{
                      fontFamily: 'var(--font-body)',
                      color: 'var(--color-mid-gray)',
                    }}
                  >
                    {item.label}
                  </span>
                ) : item.actionUrl ? (
                  <Link
                    href={item.actionUrl}
                    className="text-xs font-medium"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      color: 'var(--color-dark)',
                    }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className="text-xs"
                    style={{
                      fontFamily: 'var(--font-body)',
                      color: 'var(--color-mid-gray)',
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* All complete */}
          {completedCount === totalCount && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="w-full text-center text-[10px] pt-1"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
