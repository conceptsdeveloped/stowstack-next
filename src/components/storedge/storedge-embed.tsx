'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { StorEdgeLoading } from './storedge-loading';
import { StorEdgeError } from './storedge-error';
import { appendTrackingToUrl } from '@/lib/tracking-params';
import type {
  StorEdgeConfig,
  TrackingParams,
  StorEdgeEmbedState,
  StorEdgeErrorInfo,
  StorEdgeEvent,
} from '@/types/storedge';

interface StorEdgeEmbedProps {
  config: StorEdgeConfig;
  trackingParams: TrackingParams;
  facilityPhone: string;
  facilityWebsite?: string;
  className?: string;
  onEvent?: (event: StorEdgeEvent) => void;
}

const DESKTOP_TIMEOUT = 15_000;
const MOBILE_TIMEOUT = 20_000;

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /mobile|iphone|android/i.test(navigator.userAgent);
}

/**
 * Main storEDGE embed component.
 * Handles loading, error, timeout states, tracking param injection,
 * and postMessage event capture for attribution.
 */
export function StorEdgeEmbed({
  config,
  trackingParams,
  facilityPhone,
  facilityWebsite,
  className,
  onEvent,
}: StorEdgeEmbedProps) {
  const [state, setState] = useState<StorEdgeEmbedState>('loading');
  const [errorInfo, setErrorInfo] = useState<StorEdgeErrorInfo | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build embed URL with tracking params
  const embedUrl = appendTrackingToUrl(config.embedUrl, trackingParams);

  // Validate config
  const isValidConfig = !!(config.embedUrl && config.facilityId);

  // Handle iframe load
  const handleLoad = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState('loaded');
  }, []);

  // Handle iframe error
  const handleError = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState('error');
    setErrorInfo({
      code: 'network_error',
      message: 'Failed to load the reservation system.',
      retryable: true,
    });
  }, []);

  // Retry handler
  const handleRetry = useCallback(() => {
    setState('loading');
    setErrorInfo(null);
    setRetryCount((c) => c + 1);
  }, []);

  // Set timeout — use ref to avoid stale closure over `state`
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (state !== 'loading') return;

    const timeout = isMobile() ? MOBILE_TIMEOUT : DESKTOP_TIMEOUT;
    timeoutRef.current = setTimeout(() => {
      if (stateRef.current === 'loading') {
        setState('error');
        setErrorInfo({
          code: 'timeout',
          message: 'The reservation system is taking too long to load.',
          retryable: true,
        });
      }
    }, timeout);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, retryCount]);

  // Listen for postMessage events from storEDGE iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      // Only process messages from the embed origin
      if (!config.embedUrl) return;
      try {
        const embedOrigin = new URL(config.embedUrl).origin;
        if (e.origin !== embedOrigin) return;
      } catch {
        return;
      }

      const data = e.data;
      if (!data || typeof data !== 'object') return;

      // Map storEDGE events to our event types
      const eventType = data.type || data.event;
      if (!eventType) return;

      const event: StorEdgeEvent = {
        type: eventType,
        timestamp: new Date().toISOString(),
        facilityId: config.facilityId,
        trackingParams,
        unitType: data.unit_type || data.unitType,
        unitSize: data.unit_size || data.unitSize,
        monthlyRate: data.monthly_rate || data.monthlyRate,
        tenantName: data.tenant_name || data.tenantName,
        moveInDate: data.move_in_date || data.moveInDate,
        reservationId: data.reservation_id || data.reservationId,
      };

      onEvent?.(event);

      // Forward to tracking API
      fetch('/api/tracking/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {
        // Tracking failure should never break the page
      });

      // Handle iframe resize messages
      if (data.type === 'resize' && data.height && iframeRef.current) {
        iframeRef.current.style.height = `${data.height}px`;
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [config.embedUrl, config.facilityId, trackingParams, onEvent]);

  // Invalid config
  if (!isValidConfig) {
    return (
      <StorEdgeError
        error={{
          code: 'invalid_config',
          message: 'The reservation system is not configured for this facility.',
          retryable: false,
        }}
        facilityPhone={facilityPhone}
        facilityWebsite={facilityWebsite}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className={className}>
      {/* Loading state */}
      {state === 'loading' && <StorEdgeLoading />}

      {/* Error state */}
      {state === 'error' && errorInfo && (
        <StorEdgeError
          error={errorInfo}
          facilityPhone={facilityPhone}
          facilityWebsite={facilityWebsite}
          onRetry={handleRetry}
        />
      )}

      {/* Iframe — always in DOM for loading detection, hidden until loaded */}
      <div style={{ display: state === 'loaded' ? 'block' : 'none' }}>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--color-light-gray)' }}
        >
          <iframe
            ref={iframeRef}
            key={retryCount}
            src={embedUrl}
            title={`Reserve a storage unit at ${config.facilityId}`}
            className="w-full border-0"
            style={{ minHeight: 600 }}
            allow="payment"
            loading="eager"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>

        {/* Phone fallback — always visible even when embed works */}
        {facilityPhone && (
          <p
            className="text-center mt-4 text-sm"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-mid-gray)',
            }}
          >
            Prefer to call?{' '}
            <a
              href={`tel:${facilityPhone.replace(/[^\d+]/g, '')}`}
              style={{ color: 'var(--color-gold)', fontWeight: 500 }}
            >
              {facilityPhone}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
