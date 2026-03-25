'use client';

import { useState, useEffect } from 'react';
import { detectTimezone } from '@/lib/timezone';

/**
 * Hook to get the operator's timezone.
 * Reads from localStorage (if operator set a preference in settings),
 * falls back to browser auto-detection.
 */
const STORAGE_KEY = 'storageads_timezone';

export function useTimezone() {
  const [timezone, setTimezoneState] = useState<string>('America/New_York');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const tz = stored || detectTimezone();
    setTimezoneState(tz);
    setLoaded(true);
  }, []);

  function setTimezone(tz: string) {
    setTimezoneState(tz);
    localStorage.setItem(STORAGE_KEY, tz);
  }

  return { timezone, setTimezone, loaded };
}
