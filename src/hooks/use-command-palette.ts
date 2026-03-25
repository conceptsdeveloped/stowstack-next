'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing command palette open/close state and keyboard shortcut.
 * Cmd+K (Mac) / Ctrl+K (Win) toggles the palette.
 * "/" also opens when not in an input field.
 * Escape closes.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const openPalette = useCallback(() => setOpen(true), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
        return;
      }

      // "/" to open (only when not in an input)
      if (
        e.key === '/' &&
        !open &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        openPalette();
        return;
      }

      // Escape to close
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        close();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, toggle, close, openPalette]);

  return { open, setOpen, toggle, close, openPalette };
}
