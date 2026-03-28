'use client';

import { useState, useEffect, useCallback } from 'react';

interface UndoToastProps {
  message: string;
  /** Duration in seconds before auto-commit (default 8) */
  duration?: number;
  onUndo: () => void;
  onCommit: () => void;
}

/**
 * Undo toast for Tier 1 (reversible) actions.
 * 8-second countdown with gold "Undo" link.
 * Auto-commits when timer expires.
 */
export function UndoToast({
  message,
  duration = 8,
  onUndo,
  onCommit,
}: UndoToastProps) {
  const [remaining, setRemaining] = useState(duration);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (remaining <= 0) {
      setVisible(false); // eslint-disable-line react-hooks/set-state-in-effect -- timer completion
      onCommit();
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onCommit]);

  const handleUndo = useCallback(() => {
    setVisible(false);
    onUndo();
  }, [onUndo]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-xl px-5 py-3 shadow-lg"
      style={{
        backgroundColor: 'var(--color-dark)',
        minWidth: '300px',
      }}
    >
      <p className="text-sm flex-1" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-light)' }}>
        {message}
      </p>
      <button
        type="button"
        onClick={handleUndo}
        className="text-sm font-medium shrink-0"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Undo ({remaining}s)
      </button>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-b-xl transition-all duration-1000 ease-linear"
        style={{
          backgroundColor: 'var(--color-gold)',
          width: `${(remaining / duration) * 100}%`,
        }}
      />
    </div>
  );
}
