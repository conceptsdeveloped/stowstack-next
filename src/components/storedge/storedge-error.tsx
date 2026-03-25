'use client';

import type { StorEdgeErrorInfo } from '@/types/storedge';

interface StorEdgeErrorProps {
  error: StorEdgeErrorInfo;
  facilityPhone: string;
  facilityWebsite?: string;
  onRetry: () => void;
}

const ERROR_MESSAGES: Record<StorEdgeErrorInfo['code'], string> = {
  network_error: 'Check your internet connection and try again.',
  invalid_config: 'The reservation system is not configured for this facility.',
  api_down: 'The reservation system is temporarily unavailable.',
  timeout: 'The reservation system is taking too long to load.',
  unknown: 'Something went wrong loading the reservation system.',
};

/** Error state with retry button and phone fallback.
 *  Phone fallback is ALWAYS the safety net. */
export function StorEdgeError({
  error,
  facilityPhone,
  facilityWebsite,
  onRetry,
}: StorEdgeErrorProps) {
  return (
    <div
      className="rounded-xl p-8 text-center"
      style={{
        backgroundColor: 'var(--color-red-light, rgba(176, 74, 58, 0.06))',
        border: '1px solid rgba(176, 74, 58, 0.15)',
      }}
    >
      {/* Warning icon */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        className="mx-auto mb-4"
        style={{ color: 'var(--color-red)' }}
      >
        <path
          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <h3
        className="text-base font-medium mb-2"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-dark)',
        }}
      >
        Unable to load the reservation system
      </h3>

      <p
        className="text-sm mb-6"
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-body-text)',
        }}
      >
        {ERROR_MESSAGES[error.code] || ERROR_MESSAGES.unknown}
      </p>

      {/* Retry button */}
      {error.retryable && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors mb-4"
          style={{
            fontFamily: 'var(--font-heading)',
            color: '#fff',
            backgroundColor: 'var(--color-gold)',
          }}
        >
          Try again
        </button>
      )}

      {/* Phone fallback */}
      <div className="space-y-2">
        {facilityPhone && (
          <p
            className="text-sm"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}
          >
            Or call{' '}
            <a
              href={`tel:${facilityPhone.replace(/[^\d+]/g, '')}`}
              style={{ color: 'var(--color-gold)', fontWeight: 500 }}
            >
              {facilityPhone}
            </a>{' '}
            to reserve
          </p>
        )}
        {facilityWebsite && (
          <p
            className="text-sm"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}
          >
            Or{' '}
            <a
              href={facilityWebsite}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-gold)', fontWeight: 500 }}
            >
              reserve directly
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
