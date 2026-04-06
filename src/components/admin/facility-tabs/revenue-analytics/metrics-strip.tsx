'use client'

import {
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import { money, pct } from './shared'
import type { IntelSummary } from './types'

export default function MetricsStrip({ summary: s }: { summary: IntelSummary }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">Gross Potential</p>
          <p className="text-2xl font-semibold text-[var(--color-dark)]">{money(s.total_gross_potential)}</p>
          <p className="text-xs text-[var(--color-mid-gray)]">at street rates</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">Actual MRR</p>
          <p className="text-2xl font-semibold text-emerald-500">{money(s.total_actual_revenue)}</p>
          <p className="text-xs text-[var(--color-mid-gray)]">
            {s.revenue_trend_pct != null && (
              <span className={s.revenue_trend_pct >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                {s.revenue_trend_pct >= 0 ? '\u2191' : '\u2193'} {Math.abs(s.revenue_trend_pct)}% MoM
              </span>
            )}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">Lost to Vacancy</p>
          <p className="text-2xl font-semibold text-red-500">{money(s.total_lost_revenue)}</p>
          <p className="text-xs text-[var(--color-mid-gray)]">{money(s.total_lost_revenue * 12)}/yr</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">Revenue Capture</p>
          <p className={`text-2xl font-semibold ${s.revenue_capture_pct >= 85 ? 'text-emerald-500' : s.revenue_capture_pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
            {pct(s.revenue_capture_pct)}
          </p>
          <p className="text-xs text-[var(--color-mid-gray)]">actual &divide; potential</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">ECRI Opportunity</p>
          <p className="text-2xl font-semibold text-[var(--color-gold)]">{money(s.ecri_monthly_lift)}</p>
          <p className="text-xs text-[var(--color-mid-gray)]">{s.ecri_eligible_count} tenants &middot; {money(s.ecri_annual_lift)}/yr</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">Rate Position</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-emerald-500 text-sm font-semibold">{s.tenants_above_street}</span>
            <ArrowUpRight size={14} className="text-emerald-500" />
            <span className="text-sm font-semibold text-[var(--color-body-text)]">{s.tenants_at_street}</span>
            <Minus size={14} className="text-[var(--color-body-text)]" />
            <span className="text-red-500 text-sm font-semibold">{s.tenants_below_street}</span>
            <ArrowDownRight size={14} className="text-red-500" />
          </div>
          <p className="text-xs text-[var(--color-mid-gray)]">{s.total_tenants_rated} rated</p>
        </div>
      </div>
    </div>
  )
}
