'use client'

import { BarChart3 } from 'lucide-react'
import { SectionHeader, GAP_COLORS, money, pct } from './shared'
import type { FacilityLevel, GapDecomposition, UnitOccupancy } from './shared'

export function UnitTypeHeatmap({
  unitOcc, fl, gd, expanded, onToggle,
}: {
  unitOcc: UnitOccupancy[]
  fl: FacilityLevel
  gd: GapDecomposition
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<BarChart3 size={18} className="text-emerald-500" />}
        title="Occupancy by Unit Type"
        subtitle="Physical vs economic occupancy per size with gap analysis"
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)]">
          {/* Visual heatmap cards */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unitOcc.map((u, i) => {
              const gapColor = u.gap > 10 ? 'text-red-500' : u.gap > 5 ? 'text-amber-500' : u.gap > 2 ? 'text-[var(--color-blue)]' : 'text-emerald-500'
              const gapStyle = GAP_COLORS[u.gap_signal] || GAP_COLORS.aligned
              return (
                <div key={i} className="rounded-lg p-4 border border-[var(--border-subtle)] bg-[var(--color-light-gray)]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-dark)]">{u.unit_type}</p>
                      <p className="text-xs text-[var(--color-mid-gray)]">{u.sqft} sqft &middot; {u.total_count} units</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gapStyle.bg} ${gapStyle.text}`}>
                      {gapStyle.label}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px] font-medium text-[var(--color-mid-gray)]">Physical</span>
                        <span className="text-[10px] font-semibold text-[var(--color-dark)]">{pct(u.physical_occ_pct)}</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[var(--color-light-gray)]">
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min(u.physical_occ_pct, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px] font-medium text-[var(--color-mid-gray)]">Economic</span>
                        <span className="text-[10px] font-semibold text-[var(--color-dark)]">{pct(u.economic_occ_pct)}</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[var(--color-light-gray)]">
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400" style={{ width: `${Math.min(u.economic_occ_pct, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-dashed border-[var(--border-subtle)]">
                    <div className="text-center">
                      <p className="text-[10px] text-[var(--color-mid-gray)]">Gap</p>
                      <p className={`text-sm font-semibold ${gapColor}`}>{u.gap > 0 ? '+' : ''}{u.gap}pt</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-[var(--color-mid-gray)]">Vacancy $</p>
                      <p className="text-sm font-semibold text-red-500">{money(u.vacancy_cost_monthly)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-[var(--color-mid-gray)]">Rate Gap $</p>
                      <p className="text-sm font-semibold text-amber-500">{money(u.rate_gap_monthly)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detailed table */}
          <div className="border-t border-[var(--border-subtle)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-light-gray)]">
                  {['Unit Type', 'Units', 'Physical', 'Economic', 'Gap', 'Street', 'Avg Actual', '$/sqft', 'Total Drag'].map((h, i) => (
                    <th key={i} className={`${i === 0 ? 'text-left px-4' : i < 5 ? 'text-center px-3' : 'text-right px-3'} py-3 font-medium text-[var(--color-mid-gray)] ${i === 8 ? 'pr-4' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {unitOcc.map((u, i) => {
                  const gapStyle = GAP_COLORS[u.gap_signal] || GAP_COLORS.aligned
                  const totalDrag = u.vacancy_cost_monthly + u.rate_gap_monthly
                  return (
                    <tr key={i} className="hover:bg-[var(--color-light-gray)]">
                      <td className="px-4 py-3 font-medium text-[var(--color-dark)]">
                        <div>{u.unit_type}</div>
                        <div className="text-xs text-[var(--color-mid-gray)]">{u.sqft} sqft</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-[var(--color-dark)]">{u.occupied_count}</span>
                        <span className="text-[var(--color-mid-gray)]">/{u.total_count}</span>
                        {u.vacant_count > 0 && <span className="text-red-500 text-xs ml-1">({u.vacant_count}v)</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-sm font-semibold ${u.physical_occ_pct >= 85 ? 'text-emerald-500' : u.physical_occ_pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                          {pct(u.physical_occ_pct)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-sm font-semibold ${u.economic_occ_pct >= 85 ? 'text-indigo-500' : u.economic_occ_pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                          {pct(u.economic_occ_pct)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gapStyle.bg} ${gapStyle.text}`}>
                          {u.gap > 0 ? '+' : ''}{u.gap}pt
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[var(--color-dark)]">${u.street_rate?.toFixed(0)}</td>
                      <td className={`px-3 py-3 text-right font-mono ${u.actual_avg_rate >= u.street_rate ? 'text-emerald-500' : 'text-red-500'}`}>
                        {u.actual_avg_rate > 0 ? `$${u.actual_avg_rate.toFixed(0)}` : '--'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[var(--color-dark)]">
                        {u.revenue_per_sqft > 0 ? `$${u.revenue_per_sqft.toFixed(2)}` : '--'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {totalDrag > 0
                          ? <span className="text-red-500 font-semibold">{money(totalDrag)}</span>
                          : <span className="text-emerald-500 font-medium">$0</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--color-light-gray)] border-t border-[var(--border-medium)]">
                  <td className="px-4 py-3 font-semibold text-[var(--color-dark)]">FACILITY</td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-semibold text-[var(--color-dark)]">{fl.occupied_units}</span>
                    <span className="text-[var(--color-mid-gray)]">/{fl.total_units}</span>
                  </td>
                  <td className="px-3 py-3 text-center"><span className="font-semibold text-emerald-500">{pct(fl.physical_occ_pct)}</span></td>
                  <td className="px-3 py-3 text-center"><span className="font-semibold text-indigo-500">{pct(fl.economic_occ_pct)}</span></td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-semibold ${fl.occupancy_gap > 5 ? 'text-red-500' : fl.occupancy_gap > 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {fl.occupancy_gap > 0 ? '+' : ''}{fl.occupancy_gap}pt
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-[var(--color-dark)]">{money(fl.gross_potential)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-500">{money(fl.actual_revenue)}</td>
                  <td className="px-3 py-3 text-right text-[var(--color-mid-gray)]">--</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-500">{money(gd.total_drag)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
