import { ArrowUp, ArrowDown } from 'lucide-react';
import type { CaseStudyMetric } from '@/types/case-study';

interface MetricComparisonProps {
  metric: CaseStudyMetric;
}

/** Before/after stat block — Before in muted, After in gold, delta with arrow */
export function MetricComparison({ metric }: MetricComparisonProps) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--color-light-gray)', backgroundColor: 'var(--color-light)' }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider mb-3"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
      >
        {metric.label}
      </p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs mb-0.5" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>Before</p>
          <p
            className="text-lg font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
          >
            {metric.before}
          </p>
        </div>
        <div className="text-center px-3">
          <span
            className="inline-flex items-center gap-0.5 text-xs font-medium"
            style={{
              color: metric.isPositive ? 'var(--color-green)' : 'var(--color-red)',
            }}
          >
            {metric.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {metric.change}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs mb-0.5" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>After</p>
          <p
            className="text-lg font-semibold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
          >
            {metric.after}
          </p>
        </div>
      </div>
    </div>
  );
}
