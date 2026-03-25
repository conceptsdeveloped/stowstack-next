'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getSessionTracking,
  hasPaidParams,
  getTrafficSource,
} from '@/lib/tracking-params';
import type { TrackingParams } from '@/types/storedge';

interface UseTrackingParamsReturn {
  params: TrackingParams;
  isOrganic: boolean;
  source: 'facebook' | 'google' | 'tiktok' | 'organic' | 'direct';
  capturedAt: Date;
}

/**
 * Hook to capture and persist tracking parameters.
 * First-touch attribution within the session — never overwrites.
 * Fires a visit tracking event on first capture.
 */
export function useTrackingParams(
  landingPageId?: string,
  facilityId?: string
): UseTrackingParamsReturn {
  const searchParams = useSearchParams();
  const firedRef = useRef(false);

  const [result] = useState<UseTrackingParamsReturn>(() => {
    const params = getSessionTracking(searchParams, landingPageId, facilityId);
    return {
      params,
      isOrganic: !hasPaidParams(params),
      source: getTrafficSource(params),
      capturedAt: new Date(params.sa_timestamp || Date.now()),
    };
  });

  // Fire visit tracking event once
  useEffect(() => {
    if (firedRef.current) return;
    if (!hasPaidParams(result.params) && !landingPageId) return;
    firedRef.current = true;

    // Fire-and-forget tracking event
    fetch('/api/tracking/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracking_params: result.params,
        landing_page_id: landingPageId,
        facility_id: facilityId,
        url: typeof window !== 'undefined' ? window.location.href : '',
      }),
    }).catch(() => {
      // Tracking failure should never break the page
    });
  }, [result.params, landingPageId, facilityId]);

  return result;
}
