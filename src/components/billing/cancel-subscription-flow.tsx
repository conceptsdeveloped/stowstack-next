'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface CancelSubscriptionFlowProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  periodEndDate: string;
  moveInsThisMonth?: number;
}

const CANCEL_REASONS = [
  'Too expensive',
  'Not seeing results',
  'Switching to a competitor',
  'Closing facility',
  'Seasonal pause',
  'Other',
];

export function CancelSubscriptionFlow({
  open,
  onClose,
  onConfirm,
  periodEndDate,
  moveInsThisMonth,
}: CancelSubscriptionFlowProps) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [_error, setError] = useState('');

  if (!open) return null;

  const handleConfirm = async () => {
    setError('');
    setCancelling(true);
    try {
      await onConfirm(reason === 'Other' ? otherReason : reason);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancellation failed. Try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setReason('');
    setOtherReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{ backgroundColor: 'var(--color-light)', border: '1px solid var(--color-light-gray)' }}
      >
        {/* Step 1: Reason */}
        {step === 1 && (
          <>
            <h3
              className="text-lg font-medium mb-2"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
            >
              We&apos;re sorry to see you go
            </h3>
            <p className="text-sm mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
              Can you tell us why you&apos;re cancelling?
            </p>
            <div className="space-y-2 mb-5">
              {CANCEL_REASONS.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors"
                  style={{
                    borderColor: reason === r ? 'var(--color-gold)' : 'var(--color-light-gray)',
                    backgroundColor: reason === r ? 'var(--color-gold-light)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-[var(--color-gold)]"
                  />
                  <span className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-dark)' }}>
                    {r}
                  </span>
                </label>
              ))}
              {reason === 'Other' && (
                <textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Tell us more..."
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)] resize-none"
                  style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleClose} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-body-text)' }}>
                Never mind
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!reason}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-body-text)', border: '1px solid var(--color-light-gray)' }}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 2: What you'll lose */}
        {step === 2 && (
          <>
            <h3
              className="text-lg font-medium mb-2"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
            >
              Here&apos;s what you&apos;ll lose
            </h3>
            <div className="space-y-2 mb-4">
              {[
                'Active ad campaigns will be paused',
                'Landing pages will go offline',
                'Attribution tracking will stop',
                'Performance data will become read-only',
                'Team member access will be revoked',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-body-text)', fontFamily: 'var(--font-body)' }}>
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-red)' }} />
                  {item}
                </div>
              ))}
            </div>
            {moveInsThisMonth !== undefined && moveInsThisMonth > 0 && (
              <div
                className="rounded-lg p-3 mb-4"
                style={{ backgroundColor: 'var(--color-gold-light)' }}
              >
                <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-dark)' }}>
                  You&apos;ve attributed <strong style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>{moveInsThisMonth} move-ins</strong> this month through StorageAds.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setStep(1)} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-body-text)' }}>
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-body-text)', border: '1px solid var(--color-light-gray)' }}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 3: Final confirm */}
        {step === 3 && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5" style={{ color: 'var(--color-red)' }} />
              <h3
                className="text-lg font-medium"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
              >
                Are you sure?
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}>
              Your subscription will remain active until{' '}
              <strong>{new Date(periodEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
              After that, your campaigns will stop and dashboard access will become read-only.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleClose} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-body-text)' }}>
                Keep my subscription
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={cancelling}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ fontFamily: 'var(--font-heading)', color: '#fff', backgroundColor: 'var(--color-red)' }}
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                Cancel subscription
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
