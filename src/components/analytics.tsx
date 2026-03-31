'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Client-side analytics loader for Meta Pixel, Google Ads (gtag.js), and GA4.
 * Loads scripts once, fires page_view on every SPA route change.
 * All IDs are loaded from NEXT_PUBLIC_* env vars — if unset, that platform is skipped.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window {
    fbq?: any;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '';
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';

// Only load in production or when IDs are explicitly set
function shouldLoad(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(META_PIXEL_ID || GA4_ID || GOOGLE_ADS_ID);
}

function loadMetaPixel() {
  if (!META_PIXEL_ID || typeof window.fbq === 'function') return;

  // Meta Pixel base code (standard Facebook snippet adapted for TypeScript)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const n: any = function (...args: any[]) {
    if (n.callMethod) {
      n.callMethod(...args);
    } else {
      n.queue.push(args);
    }
  };
  if (!window._fbq) window._fbq = n;
  window.fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [] as any[];
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const first = document.getElementsByTagName('script')[0];
  first?.parentNode?.insertBefore(s, first);

  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
}

function loadGtag() {
  // Load gtag for GA4 and/or Google Ads
  const ids = [GA4_ID, GOOGLE_ADS_ID].filter(Boolean);
  if (ids.length === 0 || typeof window.gtag === 'function') return;

  const primaryId = ids[0];

  // gtag.js script
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${primaryId}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());

  // Configure each ID
  if (GA4_ID) {
    window.gtag('config', GA4_ID, {
      send_page_view: false, // We fire page_view manually on route changes
    });
  }
  if (GOOGLE_ADS_ID) {
    window.gtag('config', GOOGLE_ADS_ID);
  }
}

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);

  // Load scripts once
  useEffect(() => {
    if (initializedRef.current || !shouldLoad()) return;
    initializedRef.current = true;

    loadMetaPixel();
    loadGtag();
  }, []);

  // Fire page_view on every route change (SPA-aware)
  useEffect(() => {
    if (!initializedRef.current) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // Meta Pixel PageView on SPA navigation
    if (META_PIXEL_ID && window.fbq) {
      window.fbq('track', 'PageView');
    }

    // GA4 page_view
    if (GA4_ID && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: url,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams]);

  return null;
}
