'use client'

import {
  TrendingUp, TrendingDown, ShieldAlert, DollarSign,
} from 'lucide-react'
import {
  SectionHeader, StackedBar, RISK_COLORS,
  money, pct,
} from './shared'
import type {
  FacilityLevel, GapDecomposition, AgingBuckets,
  OccupancyTrendEntry, DiscountedTenant, DelinquentTenant, BelowStreetBand,
} from './shared'

/* ── Occupancy Trend Section ── */

export function TrendSection({
  trend, expanded, onToggle,
}: {
  trend: OccupancyTrendEntry[]
  expanded: boolean
  onToggle: () => void
}) {
  if (trend.length === 0) return null

  const maxTrend = Math.max(...trend.map(t => t.revenue || 0), 1)

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<TrendingUp size={18} className="text-[var(--color-gold)]" />}
        title="Occupancy Trend"
        subtitle="Move-in/out activity and revenue trend over time"
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-4">
          {/* Revenue sparkline */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)] mb-2">Monthly Revenue</p>
            <div className="flex items-end gap-1" style={{ height: 100 }}>
              {trend.map((t, i) => {
                const h = maxTrend > 0 ? (t.revenue / maxTrend) * 100 : 0
                const isLatest = i === trend.length - 1
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className={`w-full rounded-t transition-all ${isLatest ? 'bg-emerald-500' : 'bg-[var(--color-light-gray)] group-hover:bg-emerald-500/40'}`}
                      style={{ height: `${Math.max(h, 2)}%` }}
                    />
                    <span className="text-[8px] text-[var(--color-mid-gray)] leading-none">{t.month_short}</span>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                      <div className="rounded-lg p-2 text-xs shadow-lg whitespace-nowrap bg-[var(--color-light-gray)] text-[var(--color-dark)] border border-[var(--border-subtle)]">
                        <p className="font-semibold">{t.month} {t.year}</p>
                        <p>Revenue: {money(t.revenue)}</p>
                        <p className="text-emerald-500">Move-ins: {t.move_ins}</p>
                        <p className="text-red-500">Move-outs: {t.move_outs}</p>
                        <p className={t.net_movement >= 0 ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                          Net: {t.net_movement >= 0 ? '+' : ''}{t.net_movement}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Net movement chart */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)] mb-2">
              Net Unit Movement (Move-ins minus Move-outs)
            </p>
            <div className="flex items-center gap-1" style={{ height: 80 }}>
              {trend.map((t, i) => {
                const maxNet = Math.max(...trend.map(x => Math.abs(x.net_movement)), 1)
                const h = (Math.abs(t.net_movement) / maxNet) * 50
                const isPositive = t.net_movement >= 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center relative" style={{ height: '100%' }}>
                    <div className="absolute top-1/2 w-full" style={{ height: '1px', background: 'var(--color-light-gray)' }} />
                    <div
                      className="absolute w-full"
                      style={{ [isPositive ? 'bottom' : 'top']: '50%', height: `${Math.max(h, 1)}%` }}
                    >
                      <div className={`w-full h-full rounded-sm ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="absolute bottom-0">
                      <span className="text-[8px] text-[var(--color-mid-gray)]">{t.month_short}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[var(--color-mid-gray)]">
                Total net:{' '}
                <span className={trend.reduce((s, t) => s + t.net_movement, 0) >= 0 ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                  {trend.reduce((s, t) => s + t.net_movement, 0) >= 0 ? '+' : ''}{trend.reduce((s, t) => s + t.net_movement, 0)} units
                </span>
              </span>
              <span className="text-[10px] text-[var(--color-mid-gray)]">
                Avg/mo: <span className="font-medium">{(trend.reduce((s, t) => s + t.move_ins, 0) / trend.length).toFixed(1)} in / {(trend.reduce((s, t) => s + t.move_outs, 0) / trend.length).toFixed(1)} out</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Delinquency Section ── */

export function DelinquencySection({
  delTenants, ab, fl, gd, expanded, onToggle,
}: {
  delTenants: DelinquentTenant[]
  ab: AgingBuckets
  fl: FacilityLevel
  gd: GapDecomposition
  expanded: boolean
  onToggle: () => void
}) {
  if (delTenants.length === 0 && ab.total <= 0) return null

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<ShieldAlert size={18} className="text-purple-500" />}
        title="Delinquency & Economic Drag"
        subtitle={`${money(ab.total)} outstanding across ${ab.count} accounts \u2014 eroding economic occupancy by ${pct(gd.delinquency_drag_pct)}`}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-4">
          {/* Aging buckets */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)] mb-3">Aging Distribution</p>
            <StackedBar
              height={32}
              segments={[
                { value: ab.current, color: 'bg-[var(--color-blue)]', label: `0-30d: ${money(ab.current)}` },
                { value: ab.days_31_60, color: 'bg-amber-400', label: `31-60d: ${money(ab.days_31_60)}` },
                { value: ab.days_61_90, color: 'bg-orange-500', label: `61-90d: ${money(ab.days_61_90)}` },
                { value: ab.days_91_120, color: 'bg-red-500', label: `91-120d: ${money(ab.days_91_120)}` },
                { value: ab.days_120_plus, color: 'bg-red-700', label: `120+d: ${money(ab.days_120_plus)}` },
              ]}
            />
            <div className="flex gap-3 mt-2 flex-wrap">
              {[
                { label: '0-30d', value: ab.current, color: 'bg-[var(--color-blue)]' },
                { label: '31-60d', value: ab.days_31_60, color: 'bg-amber-400' },
                { label: '61-90d', value: ab.days_61_90, color: 'bg-orange-500' },
                { label: '91-120d', value: ab.days_91_120, color: 'bg-red-500' },
                { label: '120+d', value: ab.days_120_plus, color: 'bg-red-700' },
              ].filter(b => b.value > 0).map(b => (
                <div key={b.label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-sm ${b.color}`} />
                  <span className="text-xs text-[var(--color-mid-gray)]">{b.label}: <span className="font-medium text-[var(--color-dark)]">{money(b.value)}</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Delinquent tenant table */}
          {delTenants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-light-gray)]">
                    <th className="text-left px-4 py-2 font-medium text-[var(--color-mid-gray)]">Unit</th>
                    <th className="text-left px-3 py-2 font-medium text-[var(--color-mid-gray)]">Tenant</th>
                    <th className="text-right px-3 py-2 font-medium text-[var(--color-mid-gray)]">Rent</th>
                    <th className="text-right px-3 py-2 font-medium text-[var(--color-mid-gray)]">Owed</th>
                    <th className="text-center px-3 py-2 font-medium text-[var(--color-mid-gray)]">Days Past Due</th>
                    <th className="text-center px-4 py-2 font-medium text-[var(--color-mid-gray)]">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {delTenants.slice(0, 20).map((t, i) => {
                    const risk = RISK_COLORS[t.risk_level] || RISK_COLORS.low
                    return (
                      <tr key={i} className="hover:bg-[var(--color-light-gray)]">
                        <td className="px-4 py-2 font-medium text-[var(--color-dark)]">{t.unit}</td>
                        <td className="px-3 py-2 text-[var(--color-dark)]">{t.tenant}</td>
                        <td className="px-3 py-2 text-right font-mono text-[var(--color-dark)]">{money(t.rent_rate)}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-500 font-medium">{money(t.total_due)}</td>
                        <td className={`px-3 py-2 text-center font-semibold ${
                          t.days_past_due > 90 ? 'text-red-500' : t.days_past_due > 60 ? 'text-orange-500' : t.days_past_due > 30 ? 'text-amber-500' : 'text-[var(--color-blue)]'
                        }`}>{t.days_past_due}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${risk.bg} ${risk.text}`}>
                            {t.risk_level}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {delTenants.length > 20 && (
                <p className="text-xs text-center py-2 text-[var(--color-mid-gray)]">
                  Showing top 20 of {delTenants.length} delinquent accounts
                </p>
              )}
            </div>
          )}

          {/* Impact callout */}
          <div className="rounded-lg p-4 border border-purple-500/20 bg-purple-500/5">
            <div className="flex items-start gap-3">
              <TrendingDown size={18} className="text-purple-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-dark)]">
                  Delinquency is reducing economic occupancy by {pct(gd.delinquency_drag_pct)}
                </p>
                <p className="text-xs mt-1 text-[var(--color-body-text)]">
                  These {ab.count} accounts owe {money(ab.total)} total.
                  {ab.days_120_plus > 0 && ` ${money(ab.days_120_plus)} is 120+ days old and likely uncollectable \u2014 consider write-off and lien process.`}
                  {' '}Resolving delinquency would lift economic occupancy from {pct(fl.economic_occ_pct)} to ~{pct(fl.economic_occ_pct + gd.delinquency_drag_pct)}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Discounts Section ── */

export function DiscountsSection({
  discTenants, gd, expanded, onToggle,
}: {
  discTenants: DiscountedTenant[]
  gd: GapDecomposition
  expanded: boolean
  onToggle: () => void
}) {
  if (discTenants.length === 0) return null

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<DollarSign size={18} className="text-orange-500" />}
        title="Active Discounts & Concessions"
        subtitle={`${discTenants.length} tenants with discounts totaling ${money(gd.discount_drag)}/mo drag`}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-light-gray)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--color-mid-gray)]">Unit</th>
                <th className="text-left px-3 py-3 font-medium text-[var(--color-mid-gray)]">Tenant</th>
                <th className="text-left px-3 py-3 font-medium text-[var(--color-mid-gray)]">Type</th>
                <th className="text-right px-3 py-3 font-medium text-[var(--color-mid-gray)]">Standard</th>
                <th className="text-right px-3 py-3 font-medium text-[var(--color-mid-gray)]">Actual</th>
                <th className="text-right px-3 py-3 font-medium text-[var(--color-mid-gray)]">Discount</th>
                <th className="text-left px-3 py-3 font-medium text-[var(--color-mid-gray)]">Reason</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--color-mid-gray)]">Tenure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {discTenants.map((t, i) => (
                <tr key={i} className="hover:bg-[var(--color-light-gray)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-dark)]">{t.unit}</td>
                  <td className="px-3 py-2.5 text-[var(--color-dark)]">{t.tenant}</td>
                  <td className="px-3 py-2.5 text-[var(--color-body-text)]">{t.unit_type}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[var(--color-dark)]">${t.standard_rate.toFixed(0)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-amber-500">${t.actual_rate.toFixed(0)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-orange-500 font-medium">-${t.discount.toFixed(0)}</td>
                  <td className="px-3 py-2.5 text-xs text-[var(--color-mid-gray)]">{t.discount_desc || '--'}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--color-mid-gray)]">{Math.round(t.days_as_tenant / 30)}mo</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--color-light-gray)] border-t border-[var(--border-medium)]">
                <td colSpan={5} className="px-4 py-2.5 font-semibold text-[var(--color-dark)]">
                  Total Discount Impact ({discTenants.length} tenants)
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-orange-500 font-semibold">
                  -{money(gd.discount_drag)}
                </td>
                <td colSpan={2} className="px-3 py-2.5 text-right text-xs text-[var(--color-mid-gray)]">
                  {money(gd.discount_drag * 12)}/yr
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Below-Street Rate Bands ── */

export function BelowStreetBandsSection({
  bands, expanded, onToggle,
}: {
  bands: { slight: BelowStreetBand; moderate: BelowStreetBand; severe: BelowStreetBand }
  expanded: boolean
  onToggle: () => void
}) {
  if (bands.slight.count === 0 && bands.moderate.count === 0 && bands.severe.count === 0) return null

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<TrendingDown size={18} className="text-red-500" />}
        title="Below-Street Rate Distribution"
        subtitle={`${bands.slight.count + bands.moderate.count + bands.severe.count} tenants paying below street \u2014 ${money(bands.slight.loss + bands.moderate.loss + bands.severe.loss)}/mo gap`}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg p-4 border border-[var(--color-blue)]/20 bg-[var(--color-blue)]/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-[var(--color-blue)]" />
                <span className="text-sm font-semibold text-[var(--color-dark)]">Slight ($1-10 below)</span>
              </div>
              <p className="text-3xl font-semibold text-[var(--color-blue)]">{bands.slight.count}</p>
              <p className="text-xs text-[var(--color-mid-gray)]">tenants &middot; {money(bands.slight.loss)}/mo</p>
              <p className="text-xs mt-2 text-[var(--color-mid-gray)]">Low priority \u2014 monitor at next lease renewal</p>
            </div>
            <div className="rounded-lg p-4 border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-sm font-semibold text-[var(--color-dark)]">Moderate ($11-30 below)</span>
              </div>
              <p className="text-3xl font-semibold text-amber-500">{bands.moderate.count}</p>
              <p className="text-xs text-[var(--color-mid-gray)]">tenants &middot; {money(bands.moderate.loss)}/mo</p>
              <p className="text-xs mt-2 text-[var(--color-mid-gray)]">ECRI candidates \u2014 phase increases over 2-3 months</p>
            </div>
            <div className="rounded-lg p-4 border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-semibold text-[var(--color-dark)]">Severe ($30+ below)</span>
              </div>
              <p className="text-3xl font-semibold text-red-500">{bands.severe.count}</p>
              <p className="text-xs text-[var(--color-mid-gray)]">tenants &middot; {money(bands.severe.loss)}/mo</p>
              <p className="text-xs mt-2 text-[var(--color-mid-gray)]">Immediate action \u2014 largest revenue recovery opportunity</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
