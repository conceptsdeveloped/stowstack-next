'use client';

import { SUBSCRIPTION_STATUS_CONFIG } from '@/types/billing';
import type { Subscription } from '@/types/billing';

interface PlanDisplayProps {
  subscription: Subscription;
  onChangePlan?: () => void;
}

export function PlanDisplay({ subscription, onChangePlan }: PlanDisplayProps) {
  const { plan, status, facilityCount, monthlyTotal, currentPeriodEnd, cancelAtPeriodEnd } = subscription;
  const statusCfg = SUBSCRIPTION_STATUS_CONFIG[status];

  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: 'var(--color-light)',
        border: plan.isPopular ? '2px solid var(--color-gold)' : '1px solid var(--color-light-gray)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
            >
              {plan.name}
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ fontFamily: 'var(--font-heading)', color: statusCfg.color, backgroundColor: statusCfg.bg }}
            >
              {statusCfg.label}
            </span>
            {cancelAtPeriodEnd && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-red)', backgroundColor: 'rgba(176,74,58,0.1)' }}
              >
                Cancelling
              </span>
            )}
          </div>
          <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
            {facilityCount} {facilityCount === 1 ? 'facility' : 'facilities'}
          </p>
        </div>

        <div className="text-right">
          <div
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
          >
            ${monthlyTotal.toLocaleString()}
          </div>
          <p className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
            ${plan.pricePerFacility.toLocaleString()}/facility/month
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--color-light-gray)' }}>
        <p className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
          Next invoice: {new Date(currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        {onChangePlan && (
          <button
            type="button"
            onClick={onChangePlan}
            className="text-xs font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
          >
            Change plan
          </button>
        )}
      </div>
    </div>
  );
}
