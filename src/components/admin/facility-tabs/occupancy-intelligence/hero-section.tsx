'use client'

import { DualGauge, pct, money } from './shared'
import type { FacilityLevel, GapDecomposition } from './shared'

export function HeroSection({ fl, gd }: { fl: FacilityLevel; gd: GapDecomposition }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dual gauge */}
        <div className="flex flex-col items-center">
          <DualGauge physical={fl.physical_occ_pct} economic={fl.economic_occ_pct} size={220} />
          <div className="flex items-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <span className="text-xs font-medium text-[var(--color-body-text)]">Physical {pct(fl.physical_occ_pct)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400" />
              <span className="text-xs font-medium text-[var(--color-body-text)]">Economic {pct(fl.economic_occ_pct)}</span>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 content-center">
          <div className="rounded-lg p-3 bg-[var(--color-light-gray)]">
            <p className="text-xs font-medium text-[var(--color-mid-gray)]">Total Units</p>
            <p className="text-xl font-semibold text-[var(--color-dark)]">{fl.total_units}</p>
            <p className="text-xs text-[var(--color-mid-gray)]">{fl.occupied_units} occupied</p>
          </div>
          <div className="rounded-lg p-3 bg-[var(--color-light-gray)]">
            <p className="text-xs font-medium text-[var(--color-mid-gray)]">Vacant</p>
            <p className="text-xl font-semibold text-red-500">{fl.vacant_units}</p>
            <p className="text-xs text-[var(--color-mid-gray)]">{money(gd.vacancy_loss)}/mo lost</p>
          </div>
          <div className="rounded-lg p-3 bg-[var(--color-light-gray)]">
            <p className="text-xs font-medium text-[var(--color-mid-gray)]">Gross Potential</p>
            <p className="text-xl font-semibold text-[var(--color-dark)]">{money(fl.gross_potential)}</p>
            <p className="text-xs text-[var(--color-mid-gray)]">at street rates</p>
          </div>
          <div className="rounded-lg p-3 bg-[var(--color-light-gray)]">
            <p className="text-xs font-medium text-[var(--color-mid-gray)]">Actual MRR</p>
            <p className="text-xl font-semibold text-emerald-500">{money(fl.actual_revenue)}</p>
            <p className="text-xs text-[var(--color-mid-gray)]">{pct(fl.economic_occ_pct)} capture</p>
          </div>
        </div>

        {/* Multi-dimensional occupancy */}
        <div className="space-y-4 flex flex-col justify-center">
          <h4 className="text-sm font-semibold text-[var(--color-dark)]">Multi-Dimensional Occupancy</h4>
          {[
            { label: 'Unit Count', value: fl.physical_occ_pct, gradient: 'from-emerald-500 to-emerald-400' },
            { label: 'Square Footage', value: fl.sqft_occ_pct, gradient: 'from-[var(--color-blue)] to-[var(--color-blue)]' },
            { label: 'Economic (Revenue)', value: fl.economic_occ_pct, gradient: 'from-indigo-500 to-indigo-400' },
            { label: 'Sqft Economic', value: fl.sqft_econ_occ_pct, gradient: 'from-purple-500 to-purple-400' },
          ].map(bar => (
            <div key={bar.label}>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium text-[var(--color-body-text)]">{bar.label}</span>
                <span className="text-xs font-semibold text-[var(--color-dark)]">{pct(bar.value)}</span>
              </div>
              <div className="w-full h-4 rounded-full bg-[var(--color-light-gray)]">
                <div
                  className={`h-4 rounded-full bg-gradient-to-r ${bar.gradient} transition-all`}
                  style={{ width: `${Math.min(bar.value, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
