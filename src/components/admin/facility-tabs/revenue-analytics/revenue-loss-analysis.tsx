'use client'

import { useState } from 'react'
import {
  TrendingUp, PiggyBank, Users,
} from 'lucide-react'
import { money, SectionHeader } from './shared'
import type { UnitIntel, ECRITenant, RateDistEntry, IntelSummary } from './types'

/* ── Lost Revenue Section ── */

function LostRevenueSection({ units, summary: s, expanded, onToggle }: {
  units: UnitIntel[]
  summary: IntelSummary
  expanded: boolean
  onToggle: () => void
}) {
  const vacantUnits = units.filter(u => u.vacant_count > 0).sort((a, b) => b.vacant_lost_monthly - a.vacant_lost_monthly)
  if (vacantUnits.length === 0) return null
  const maxLost = Math.max(...vacantUnits.map(u => u.vacant_lost_monthly), 1)

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<PiggyBank size={18} className="text-red-500" />}
        title="Lost Revenue Calculator"
        subtitle={`${money(s.total_lost_revenue)}/mo lost to vacancy (${money(s.total_lost_revenue * 12)}/yr)`}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4">
          <div className="space-y-3">
            {vacantUnits.map((u, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-dark)]">{u.unit_type}</span>
                    <span className="text-xs text-[var(--color-mid-gray)]">{u.vacant_count} vacant @ ${u.street_rate?.toFixed(0)}/mo</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-red-500">{money(u.vacant_lost_monthly)}/mo</span>
                    <span className="text-xs ml-2 text-[var(--color-mid-gray)]">{money(u.vacant_lost_annual)}/yr</span>
                  </div>
                </div>
                <div className="w-full h-3 rounded bg-[var(--color-light-gray)]">
                  <div className="h-3 rounded bg-gradient-to-r from-red-400 to-red-500" style={{ width: `${(u.vacant_lost_monthly / maxLost) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="rounded-lg p-4 mt-2 bg-red-500/5 border border-red-500/20">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs font-medium text-[var(--color-mid-gray)]">Monthly Lost Revenue</p>
                  <p className="text-xl font-semibold text-red-500">{money(s.total_lost_revenue)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-mid-gray)]">Annual Impact</p>
                  <p className="text-xl font-semibold text-red-500">{money(s.total_lost_revenue * 12)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-mid-gray)]">% of Potential</p>
                  <p className="text-xl font-semibold text-[var(--color-dark)]">
                    {s.total_gross_potential > 0 ? (s.total_lost_revenue / s.total_gross_potential * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── ECRI Recommendations ── */

function EcriRecommendations({ ecriTenants, summary: s, expanded, onToggle }: {
  ecriTenants: ECRITenant[]
  summary: IntelSummary
  expanded: boolean
  onToggle: () => void
}) {
  const [ecriSort, setEcriSort] = useState<'lift' | 'variance' | 'days'>('lift')

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<TrendingUp size={18} className="text-[var(--color-gold)]" />}
        title="ECRI Recommendations"
        subtitle={ecriTenants.length > 0 ? `${ecriTenants.length} tenants eligible \u00b7 +${money(s.ecri_monthly_lift)}/mo potential lift` : 'Import Rent Rates by Tenant report to power ECRI analysis'}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && ecriTenants.length > 0 && (
        <div className="border-t border-[var(--border-subtle)]">
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg p-3 bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20">
                <p className="text-xs font-medium text-[var(--color-mid-gray)]">Eligible Tenants</p>
                <p className="text-xl font-semibold text-[var(--color-gold)]">{ecriTenants.length}</p>
              </div>
              <div className="rounded-lg p-3 bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs font-medium text-[var(--color-mid-gray)]">Monthly Lift</p>
                <p className="text-xl font-semibold text-emerald-500">{money(s.ecri_monthly_lift)}</p>
              </div>
              <div className="rounded-lg p-3 bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs font-medium text-[var(--color-mid-gray)]">Annual Lift</p>
                <p className="text-xl font-semibold text-emerald-500">{money(s.ecri_annual_lift)}</p>
              </div>
              <div className="rounded-lg p-3 bg-[var(--color-light-gray)] border border-[var(--border-subtle)]">
                <p className="text-xs font-medium text-[var(--color-mid-gray)]">Avg Tenure</p>
                <p className="text-xl font-semibold text-[var(--color-dark)]">
                  {Math.round(ecriTenants.reduce((sum, t) => sum + (t.days_as_tenant || 0), 0) / ecriTenants.length / 30)}mo
                </p>
              </div>
            </div>
          </div>
          <div className="px-4 pb-2 flex gap-2">
            <span className="text-xs text-[var(--color-mid-gray)] self-center">Sort by:</span>
            {(['lift', 'variance', 'days'] as const).map(sortKey => (
              <button
                key={sortKey}
                onClick={() => setEcriSort(sortKey)}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  ecriSort === sortKey
                    ? 'bg-[var(--color-gold)] text-[var(--color-light)]'
                    : 'bg-[var(--color-light-gray)] text-[var(--color-body-text)]'
                }`}
              >
                {sortKey === 'lift' ? 'Revenue Lift' : sortKey === 'variance' ? 'Underpaying' : 'Tenure'}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-light-gray)]">
                  {['Unit', 'Tenant', 'Tenure', 'Street', 'Paying', 'Gap', 'Suggested', 'Monthly Lift'].map((h, i) => (
                    <th key={i} className={`${i < 2 ? 'text-left' : i === 2 ? 'text-center' : 'text-right'} ${i === 0 ? 'px-4' : i === 7 ? 'px-4' : 'px-3'} py-2 font-medium text-[var(--color-mid-gray)]`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {[...ecriTenants].sort((a, b) => {
                  if (ecriSort === 'lift') return (b.ecri_revenue_lift || 0) - (a.ecri_revenue_lift || 0)
                  if (ecriSort === 'variance') return (a.rate_variance || 0) - (b.rate_variance || 0)
                  return (b.days_as_tenant || 0) - (a.days_as_tenant || 0)
                }).map((t, i) => (
                  <tr key={i} className="hover:bg-[var(--color-light-gray)]">
                    <td className="px-4 py-2 font-medium text-[var(--color-dark)]">{t.unit}</td>
                    <td className="px-3 py-2 text-[var(--color-dark)]">{t.tenant_name}</td>
                    <td className="px-3 py-2 text-center text-[var(--color-mid-gray)]">{Math.round((t.days_as_tenant || 0) / 30)}mo</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--color-mid-gray)]">${t.standard_rate?.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-500">${t.actual_rate?.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-500">-${Math.abs(t.rate_variance || 0).toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--color-gold)]">${t.ecri_suggested?.toFixed(0)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-emerald-500">+${t.ecri_revenue_lift?.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {expanded && ecriTenants.length === 0 && (
        <div className="border-t border-[var(--border-subtle)] p-6 text-center">
          <Users className="mx-auto mb-2 text-[var(--color-mid-gray)]" size={32} />
          <p className="text-sm text-[var(--color-dark)]">No ECRI data available</p>
          <p className="text-xs mt-1 text-[var(--color-mid-gray)]">Upload a &quot;Rent Rates by Tenant&quot; CSV from storEDGE to see tenant-level rate analysis</p>
        </div>
      )}
    </div>
  )
}

/* ── Rate Variance Heatmap ── */

function RateVarianceHeatmap({ rateDistribution, summary: s, expanded, onToggle }: {
  rateDistribution: { above: RateDistEntry[]; below: RateDistEntry[] }
  summary: IntelSummary
  expanded: boolean
  onToggle: () => void
}) {
  if (rateDistribution.below.length === 0 && rateDistribution.above.length === 0) return null

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<TrendingUp size={18} className="text-amber-500" />}
        title="Rate Variance Heatmap"
        subtitle={`${rateDistribution.below.length} below street \u00b7 ${rateDistribution.above.length} above street${s.total_tenants_rated > 0 ? ` \u00b7 ${s.tenants_at_street} at street` : ''}`}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4">
          {/* Distribution bar */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-[var(--color-mid-gray)]">Rate Distribution</span>
            </div>
            <div className="flex h-8 rounded-lg overflow-hidden">
              {rateDistribution.below.length > 0 && (
                <div className="bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-center" style={{ width: `${(rateDistribution.below.length / s.total_tenants_rated) * 100}%` }}>
                  <span className="text-xs font-semibold text-white">{rateDistribution.below.length}</span>
                </div>
              )}
              {s.tenants_at_street > 0 && (
                <div className="bg-[var(--color-light-gray)] flex items-center justify-center" style={{ width: `${(s.tenants_at_street / s.total_tenants_rated) * 100}%` }}>
                  <span className="text-xs font-semibold text-[var(--color-body-text)]">{s.tenants_at_street}</span>
                </div>
              )}
              {rateDistribution.above.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center" style={{ width: `${(rateDistribution.above.length / s.total_tenants_rated) * 100}%` }}>
                  <span className="text-xs font-semibold text-white">{rateDistribution.above.length}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-red-500">Below Street</span>
              <span className="text-xs text-[var(--color-mid-gray)]">At Street</span>
              <span className="text-xs text-emerald-500">Above Street</span>
            </div>
          </div>

          {/* Below street variance list */}
          {rateDistribution.below.length > 0 && (() => {
            const entries = [...rateDistribution.below].sort((a, b) => a.variance - b.variance).slice(0, 15)
            const maxVar = Math.abs(entries[0]?.variance || 1)
            return (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-[var(--color-dark)]">Largest Gaps (Below Street Rate)</h4>
                <div className="space-y-1.5">
                  {entries.map((t, i) => {
                    const barW = Math.abs(t.variance) / maxVar * 100
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs w-24 truncate text-[var(--color-dark)]">{t.unit}</span>
                        <span className="text-xs w-32 truncate text-[var(--color-mid-gray)]">{t.tenant}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-4 rounded bg-[var(--color-light-gray)]">
                            <div className={`h-4 rounded ${t.ecri ? 'bg-gradient-to-r from-red-500 to-[var(--color-blue)]' : 'bg-red-400'}`} style={{ width: `${barW}%` }} />
                          </div>
                          <span className="text-xs font-mono w-12 text-right text-red-500">-${Math.abs(t.variance).toFixed(0)}</span>
                        </div>
                        {t.ecri && <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold)] font-medium">ECRI</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Above street variance list */}
          {rateDistribution.above.length > 0 && (() => {
            const entries = [...rateDistribution.above].sort((a, b) => b.variance - a.variance).slice(0, 10)
            const maxVar = Math.abs(entries[0]?.variance || 1)
            return (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2 text-[var(--color-dark)]">Highest Premium Tenants (Above Street Rate)</h4>
                <div className="space-y-1.5">
                  {entries.map((t, i) => {
                    const barW = Math.abs(t.variance) / maxVar * 100
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs w-24 truncate text-[var(--color-dark)]">{t.unit}</span>
                        <span className="text-xs w-32 truncate text-[var(--color-mid-gray)]">{t.tenant}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-4 rounded bg-[var(--color-light-gray)]">
                            <div className="h-4 rounded bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${barW}%` }} />
                          </div>
                          <span className="text-xs font-mono w-12 text-right text-emerald-500">+${Math.abs(t.variance).toFixed(0)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

/* ── Composite Export ── */

export default function RevenueLossAnalysis({ units, ecriTenants, rateDistribution, summary, expandedSection, toggle }: {
  units: UnitIntel[]
  ecriTenants: ECRITenant[]
  rateDistribution: { above: RateDistEntry[]; below: RateDistEntry[] }
  summary: IntelSummary
  expandedSection: string | null
  toggle: (section: string) => void
}) {
  return (
    <>
      <LostRevenueSection
        units={units}
        summary={summary}
        expanded={expandedSection === 'lost'}
        onToggle={() => toggle('lost')}
      />
      <EcriRecommendations
        ecriTenants={ecriTenants}
        summary={summary}
        expanded={expandedSection === 'ecri'}
        onToggle={() => toggle('ecri')}
      />
      <RateVarianceHeatmap
        rateDistribution={rateDistribution}
        summary={summary}
        expanded={expandedSection === 'rates'}
        onToggle={() => toggle('rates')}
      />
    </>
  )
}
