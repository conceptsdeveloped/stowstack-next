'use client';

import { useState } from 'react';
import { detectTimezone } from '@/lib/timezone';

/**
 * Hook to get the operator's timezone.
 * Reads from localStorage (if operator set a preference in settings),
 * falls back to browser auto-detection.
 */
const STORAGE_KEY = 'storageads_timezone';

export function useTimezone() {
  const [timezone, setTimezoneState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'America/New_York';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || detectTimezone();
  });
  const [loaded, setLoaded] = useState(() => typeof window !== 'undefined');

  function setTimezone(tz: string) {
    setTimezoneState(tz);
    localStorage.setItem(STORAGE_KEY, tz);
  }

  return { timezone, setTimezone, loaded };
}
