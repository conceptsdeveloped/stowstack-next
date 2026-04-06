'use client'

import {
  BarChart3, Zap, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { money, pct, RATE_COLORS, OCC_COLORS, Badge, SectionHeader } from './shared'
import type { UnitIntel, IntelSummary } from './types'

export default function UnitMixTable({ units, summary: s, expanded, onToggle }: {
  units: UnitIntel[]
  summary: IntelSummary
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<BarChart3 size={18} className="text-emerald-500" />}
        title="Unit Mix Intelligence"
        subtitle={`${units.length} unit types \u00b7 ${units.reduce((sum, u) => sum + u.total_count, 0)} total units`}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-light-gray)]">
                  {['Unit Type', 'Total', 'Occupied', 'Vacant', 'Street Rate', 'Avg Actual', 'Gross Potential', 'Actual Rev', 'Rate', 'Occ', 'Action'].map((h, i) => (
                    <th key={i} className={`${i === 0 || i === 10 ? 'text-left' : i < 4 ? 'text-center' : i < 8 ? 'text-right' : 'text-center'} px-3 py-2 font-medium text-[var(--color-mid-gray)] ${i === 0 ? 'pl-4' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {units.map((u, i) => (
                  <tr key={i} className="hover:bg-[var(--color-light-gray)]">
                    <td className="px-4 py-2 font-medium text-[var(--color-dark)]"><div>{u.unit_type}</div><div className="text-xs text-[var(--color-mid-gray)]">{u.size_label}</div></td>
                    <td className="px-3 py-2 text-center text-[var(--color-dark)]">{u.total_count}</td>
                    <td className="px-3 py-2 text-center text-emerald-500 font-medium">{u.occupied_count}</td>
                    <td className={`px-3 py-2 text-center ${u.vacant_count > 0 ? 'text-red-500 font-medium' : 'text-[var(--color-mid-gray)]'}`}>{u.vacant_count}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--color-dark)]">${u.street_rate?.toFixed(0)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${u.actual_avg_rate < u.street_rate ? 'text-amber-500' : 'text-emerald-500'}`}>${u.actual_avg_rate?.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--color-mid-gray)]">{money(u.gross_potential)}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium text-[var(--color-dark)]">{money(u.actual_revenue)}</td>
                    <td className="px-3 py-2 text-center"><Badge signal={u.rate_signal} map={RATE_COLORS} /></td>
                    <td className="px-3 py-2 text-center"><Badge signal={u.occ_signal} map={OCC_COLORS} /></td>
                    <td className="px-3 py-2 text-[var(--color-dark)]">
                      <div className="flex items-center gap-1">
                        {u.action.toLowerCase().includes('raise') && <Zap size={12} className="text-amber-500" />}
                        {u.action.toLowerCase().includes('fill') && <AlertTriangle size={12} className="text-red-500" />}
                        {u.action.toLowerCase().includes('hold') && <CheckCircle2 size={12} className="text-emerald-500" />}
                        <span className="text-xs">{u.action}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold bg-[var(--color-light-gray)] border-t border-[var(--border-medium)]">
                  <td className="px-4 py-2 text-[var(--color-dark)]">Totals</td>
                  <td className="px-3 py-2 text-center text-[var(--color-dark)]">{units.reduce((sum, u) => sum + u.total_count, 0)}</td>
                  <td className="px-3 py-2 text-center text-emerald-500">{units.reduce((sum, u) => sum + u.occupied_count, 0)}</td>
                  <td className="px-3 py-2 text-center text-red-500">{units.reduce((sum, u) => sum + u.vacant_count, 0)}</td>
                  <td className="px-3 py-2 text-right text-[var(--color-mid-gray)]">&mdash;</td>
                  <td className="px-3 py-2 text-right text-[var(--color-mid-gray)]">&mdash;</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-dark)]">{money(s.total_gross_potential)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--color-dark)]">{money(s.total_actual_revenue)}</td>
                  <td colSpan={3} className="px-3 py-2 text-center text-xs text-[var(--color-mid-gray)]">Capture: {pct(s.revenue_capture_pct)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
