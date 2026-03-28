'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * Detects online/offline status and shows a banner when offline.
 * Also shows a brief "Back online" confirmation when connection is restored.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => typeof window === 'undefined' ? true : navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3000);
    }
    function handleOffline() {
      setOnline(false);
      setShowRestored(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online && !showRestored) return null;

  if (showRestored) {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-2 text-sm"
        style={{
          backgroundColor: 'rgba(120, 140, 93, 0.1)',
          color: 'var(--color-green)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <Wifi className="h-4 w-4" />
        Back online
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 text-sm"
      style={{
        backgroundColor: 'rgba(176, 74, 58, 0.08)',
        color: 'var(--color-red)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <WifiOff className="h-4 w-4" />
      You&apos;re offline. Some features may not be available.
    </div>
  );
}
