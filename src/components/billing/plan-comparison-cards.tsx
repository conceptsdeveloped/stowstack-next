'use client';

import { Check } from 'lucide-react';
import { PLANS } from '@/types/billing';
import type { Plan } from '@/types/billing';

interface PlanComparisonCardsProps {
  currentPlanId?: string;
  onSelect?: (plan: Plan) => void;
}

export function PlanComparisonCards({ currentPlanId, onSelect }: PlanComparisonCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PLANS.map((plan) => {
        const isCurrent = plan.id === currentPlanId;

        return (
          <div
            key={plan.id}
            className="rounded-xl p-5 relative"
            style={{
              backgroundColor: 'var(--color-light)',
              border: plan.isPopular
                ? '2px solid var(--color-gold)'
                : '1px solid var(--color-light-gray)',
            }}
          >
            {plan.isPopular && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-medium"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: '#fff',
                  backgroundColor: 'var(--color-gold)',
                }}
              >
                Recommended
              </span>
            )}

            <h4
              className="text-base font-medium mb-1"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
            >
              {plan.name}
            </h4>

            <div className="mb-4">
              <span
                className="text-2xl font-semibold"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
              >
                ${plan.pricePerFacility.toLocaleString()}
              </span>
              <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
                /facility/month
              </span>
            </div>

            <ul className="space-y-2 mb-5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-gold)' }} />
                  <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)', fontSize: '13px' }}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(plan)}
                disabled={isCurrent}
                className="w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: isCurrent ? 'var(--color-mid-gray)' : plan.isPopular ? '#fff' : 'var(--color-gold)',
                  backgroundColor: isCurrent
                    ? 'var(--color-light-gray)'
                    : plan.isPopular
                      ? 'var(--color-gold)'
                      : 'var(--color-gold-light)',
                }}
              >
                {isCurrent ? 'Current plan' : 'Select plan'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
