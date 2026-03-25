'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NAV_SHORTCUT_ROUTES } from '@/types/shortcuts';

interface UseKeyboardShortcutsOptions {
  onOpenPalette: () => void;
  onOpenShortcutsHelp: () => void;
  enabled?: boolean;
}

/**
 * Global keyboard shortcut listener.
 * Handles G+key navigation combos (500ms window), single-key actions,
 * and disables when typing in inputs.
 */
export function useKeyboardShortcuts({
  onOpenPalette,
  onOpenShortcutsHelp,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const router = useRouter();
  const pendingRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    pendingRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if ((el as HTMLElement).isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Never intercept when typing in inputs
      if (isInputFocused()) return;

      // Never intercept modifier combos (except Cmd+K which is handled by useCommandPalette)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toUpperCase();

      // Two-key combo: G + second key
      if (pendingRef.current === 'G') {
        clearPending();
        const route = NAV_SHORTCUT_ROUTES[key];
        if (route) {
          e.preventDefault();
          router.push(route);
          return;
        }
        // No match — ignore
        return;
      }

      // Start G combo
      if (key === 'G') {
        e.preventDefault();
        pendingRef.current = 'G';
        timeoutRef.current = setTimeout(clearPending, 500);
        return;
      }

      // Single-key shortcuts
      if (e.key === '/' && !pendingRef.current) {
        e.preventDefault();
        onOpenPalette();
        return;
      }

      if (e.key === '?' && !e.shiftKey) {
        // ? is shift+/ on most keyboards, but check for the actual ? character
      }
      if (e.key === '?') {
        e.preventDefault();
        onOpenShortcutsHelp();
        return;
      }

      if (key === 'C' && !pendingRef.current) {
        e.preventDefault();
        router.push('/admin/campaigns/create');
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearPending();
    };
  }, [enabled, router, onOpenPalette, onOpenShortcutsHelp, clearPending]);
}
