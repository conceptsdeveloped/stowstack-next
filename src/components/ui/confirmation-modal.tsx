'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

type ConfirmationTier = 1 | 2 | 3;

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  /** Tier 1: reversible (gold), Tier 2: recoverable (red), Tier 3: irreversible (red + type to confirm) */
  tier?: ConfirmationTier;
  confirmLabel?: string;
  cancelLabel?: string;
  /** For Tier 3: text the user must type to confirm */
  confirmText?: string;
  /** Number of items affected (shown in body) */
  affectedCount?: number;
}

/**
 * 3-tier confirmation modal system.
 * Tier 1: Simple confirm (pause, archive) — gold button
 * Tier 2: Destructive confirm (delete campaign) — red button
 * Tier 3: Type-to-confirm (cancel subscription, delete account) — red button, disabled until match
 */
export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  tier = 2,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmText = 'DELETE',
  affectedCount,
}: ConfirmationModalProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  if (!open) return null;

  const isDestructive = tier >= 2;
  const needsTyping = tier === 3;
  const canConfirm = needsTyping ? input === confirmText : true;

  const defaultConfirmLabel =
    tier === 1 ? 'Confirm' : tier === 2 ? 'Delete' : `Delete permanently`;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setConfirmError('');
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Action failed. Try again.');
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const handleClose = () => {
    setInput('');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
        onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}
      >
        <div
          className="rounded-xl p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-modal-title"
          style={{ backgroundColor: 'var(--color-light)', border: '1px solid var(--color-light-gray)' }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {isDestructive && (
                <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: 'var(--color-red)' }} />
              )}
              <h3
                id="confirmation-modal-title"
                className="text-lg font-medium"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
              >
                {title}
              </h3>
            </div>
            <button type="button" onClick={handleClose} aria-label="Close" style={{ color: 'var(--color-mid-gray)' }}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}>
            {description}
          </p>

          {affectedCount !== undefined && affectedCount > 1 && (
            <p className="text-xs mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
              This will affect {affectedCount} items.
            </p>
          )}

          {needsTyping && (
            <div className="mb-4">
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
              >
                Type {confirmText} to confirm
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={confirmText}
                autoFocus
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  fontFamily: 'var(--font-heading)',
                  backgroundColor: 'var(--color-light)',
                  borderColor: input === confirmText ? 'var(--color-red)' : 'var(--color-light-gray)',
                  color: 'var(--color-dark)',
                }}
              />
            </div>
          )}

          {confirmError && (
            <p className="text-xs mb-3" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-red)' }}>
              {confirmError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-body-text)' }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm || loading}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontFamily: 'var(--font-heading)',
                color: '#fff',
                backgroundColor: isDestructive ? 'var(--color-red)' : 'var(--color-gold)',
              }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel || defaultConfirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
