'use client';

import { CreditCard, AlertCircle } from 'lucide-react';
import type { PaymentMethod } from '@/types/billing';

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onUpdate?: () => void;
  onRemove?: () => void;
}

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
};

export function PaymentMethodCard({ method, onUpdate, onRemove }: PaymentMethodCardProps) {
  const now = new Date();
  const expiresWithin30Days =
    new Date(method.expYear, method.expMonth - 1) <= new Date(now.getFullYear(), now.getMonth() + 1);

  return (
    <div
      className="flex items-center justify-between rounded-xl border p-4"
      style={{ borderColor: 'var(--color-light-gray)', backgroundColor: 'var(--color-light)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-14 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--color-light-gray)' }}
        >
          <CreditCard className="h-5 w-5" style={{ color: 'var(--color-body-text)' }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
            >
              {BRAND_LABELS[method.brand] || method.brand} •••• {method.last4}
            </span>
            {method.isDefault && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-gold)',
                  backgroundColor: 'var(--color-gold-light)',
                }}
              >
                Default
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
              Expires {String(method.expMonth).padStart(2, '0')}/{method.expYear}
            </span>
            {expiresWithin30Days && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-gold)' }}>
                <AlertCircle className="h-3 w-3" />
                Expires soon
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onUpdate && (
          <button
            type="button"
            onClick={onUpdate}
            className="text-xs font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
          >
            Update
          </button>
        )}
        {onRemove && !method.isDefault && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
