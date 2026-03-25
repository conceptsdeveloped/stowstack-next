'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, TrendingUp, AlertTriangle, AlertCircle,
  ChevronDown, ChevronUp, Zap,
  BarChart3, PiggyBank, CheckCircle2,
  Sun, Snowflake, Leaf, Flower2,
  Maximize2, ShieldAlert, Activity, Users, Target,
  Droplets, SlidersHorizontal,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'

/* ══════════════════════════════════════════════════════════
   Types
══════════════════════════════════════════════════════════ */

interface UnitIntel {
  unit_type: string
  size_label: string
  sqft: number
  total_count: number
  occupied_count: number
  vacant_count: number
  street_rate: number
  actual_avg_rate: number
  gross_potential: number
  actual_revenue: number
  lost_revenue: number
  rate_capture_pct: number
  economic_occupancy: number
  ecri_eligible: number
  rate_signal: string
  occ_signal: string
  action: string
  vacant_lost_monthly: number
  vacant_lost_annual: number
}

interface ECRITenant {
  unit: string
  tenant_name: string
  moved_in: string
  standard_rate: number
  actual_rate: number
  rate_variance: number
  days_as_tenant: number
  ecri_suggested: number
  ecri_revenue_lift: number
}

interface RateDistEntry {
  unit: string
  tenant: string
  variance: number
  actual: number
  standard: number
  days: number
  ecri?: boolean
  suggested?: number
  lift?: number
}

interface RevenueMonth {
  year: number
  month: string
  revenue: number
  move_ins: number
  move_outs: number
}

interface AgingSummary {
  delinquent_count: number
  total_0_30: number
  total_31_60: number
  total_61_90: number
  total_91_120: number
  total_120_plus: number
  total_outstanding: number
  moved_out_count: number
}

interface IntelSummary {
  total_gross_potential: number
  total_actual_revenue: number
  total_lost_revenue: number
  revenue_capture_pct: number
  revenue_trend_pct: number | null
  ecri_eligible_count: number
  ecri_monthly_lift: number
  ecri_annual_lift: number
  tenants_above_street: number
  tenants_at_street: number
  tenants_below_street: number
  total_tenants_rated: number
  total_discount_impact: number
  discounted_tenants: number
}

interface HealthBreakdown {
  overall: number
  occupancy: { score: number; weight: number; value: number }
  rate_capture: { score: number; weight: number; value: number }
  rate_optimization: { score: number; weight: number; value: number }
  delinquency: { score: number; weight: number; value: number }
  trend: { score: number; weight: number; value: number | null }
}

interface Waterfall {
  gross_potential: number
  vacancy_loss: number
  rate_gap_loss: number
  delinquency_loss: number
  net_effective: number
  actual_collected: number
}

interface SqftEntry {
  unit_type: string
  sqft: number
  total_sqft: number
  occupied_sqft: number
  revenue_per_sqft: number
  potential_per_sqft: number
  street_per_sqft: number
  actual_per_sqft: number
}

interface SeasonalEntry {
  month: string
  avg_move_ins: number
  avg_move_outs: number
  avg_revenue: number
  years_of_data: number
}

interface IntelData {
  summary: IntelSummary
  health: HealthBreakdown
  waterfall: Waterfall
  sqft_analysis: SqftEntry[]
  seasonal_pattern: SeasonalEntry[]
  units: UnitIntel[]
  ecri_tenants: ECRITenant[]
  rate_distribution: { above: RateDistEntry[]; below: RateDistEntry[] }
  revenue_history: RevenueMonth[]
  aging: AgingSummary | null
}

/* ══════════════════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════════════════ */

function money(val: number | null | undefined) {
  if (val == null) return '\u2014'
  return '$' + Math.round(val).toLocaleString()
}

function pct(val: number | null | undefined) {
  if (val == null) return '\u2014'
  return val.toFixed(1) + '%'
}

const RATE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  premium: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Premium' },
  above: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Above Street' },
  neutral: { bg: 'bg-[var(--color-light-gray)]', text: 'text-[var(--color-body-text)]', label: 'At Street' },
  below: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Below Street' },
  underpriced: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Underpriced' },
}

const OCC_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  full: { bg: 'bg-[var(--color-blue)]/10', text: 'text-[var(--color-blue)]', label: 'Near Full' },
  healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Healthy' },
  moderate: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Moderate' },
  low: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Low' },
}

function Badge({ signal, map }: { signal: string; map: Record<string, { bg: string; text: string; label: string }> }) {
  const s = map[signal] || map.neutral || { bg: 'bg-[var(--color-light-gray)]', text: 'text-[var(--color-body-text)]', label: signal }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
}

/* ── Section Header ── */

function SectionHeader({ icon, title, subtitle, expanded, onToggle, rightContent }: {
  icon: React.ReactNode; title: string; subtitle: string
  expanded: boolean; onToggle: () => void; rightContent?: React.ReactNode
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h3 className="font-semibold text-[var(--color-dark)]">{title}</h3>
          <p className="text-xs text-[var(--color-mid-gray)]">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {rightContent}
        {expanded ? <ChevronUp size={18} className="text-[var(--color-mid-gray)]" /> : <ChevronDown size={18} className="text-[var(--color-mid-gray)]" />}
      </div>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════ */

export default function RevenueAnalytics({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [data, setData] = useState<IntelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('overview')
  const [ecriSort, setEcriSort] = useState<'lift' | 'variance' | 'days'>('lift')
  const [scenVacancyFill, setScenVacancyFill] = useState(25)
  const [scenRateIncrease, setScenRateIncrease] = useState(0)
  const [scenEcriApply, setScenEcriApply] = useState(100)

  const toggle = (section: string) => setExpandedSection(expandedSection === section ? null : section)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/revenue-intelligence?facilityId=${facilityId}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
      setData(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
    setLoading(false)
  }, [facilityId, adminKey])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
        <Loader2 className="animate-spin mx-auto mb-2 text-[var(--color-gold)]" size={24} />
        <p className="text-[var(--color-body-text)]">Loading revenue intelligence...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={fetchData} className="mt-3 text-sm text-[var(--color-gold)] hover:underline">Try again</button>
      </div>
    )
  }

  if (!data || data.units.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
        <BarChart3 className="mx-auto mb-3 text-[var(--color-mid-gray)]" size={40} />
        <h3 className="text-lg font-semibold text-[var(--color-dark)]">No PMS Data Yet</h3>
        <p className="text-sm mt-1 text-[var(--color-body-text)]">
          Import a storEDGE Consolidated Occupancy report in the PMS Data tab to power revenue intelligence.
        </p>
      </div>
    )
  }

  const { summary: s, units, ecri_tenants, rate_distribution, revenue_history, health, waterfall, sqft_analysis, seasonal_pattern, aging } = data

  return (
    <div className="space-y-4">
      {/* ═══ METRICS STRIP ═══ */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">Gross Potential</p>
            <p className="text-2xl font-bold text-[var(--color-dark)]">{money(s.total_gross_potential)}</p>
            <p className="text-xs text-[var(--color-mid-gray)]">at street rates</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">Actual MRR</p>
            <p className="text-2xl font-bold text-emerald-500">{money(s.total_actual_revenue)}</p>
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
            <p className="text-2xl font-bold text-red-500">{money(s.total_lost_revenue)}</p>
            <p className="text-xs text-[var(--color-mid-gray)]">{money(s.total_lost_revenue * 12)}/yr</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">Revenue Capture</p>
            <p className={`text-2xl font-bold ${s.revenue_capture_pct >= 85 ? 'text-emerald-500' : s.revenue_capture_pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
              {pct(s.revenue_capture_pct)}
            </p>
            <p className="text-xs text-[var(--color-mid-gray)]">actual &divide; potential</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">ECRI Opportunity</p>
            <p className="text-2xl font-bold text-[var(--color-gold)]">{money(s.ecri_monthly_lift)}</p>
            <p className="text-xs text-[var(--color-mid-gray)]">{s.ecri_eligible_count} tenants &middot; {money(s.ecri_annual_lift)}/yr</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">Rate Position</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-emerald-500 text-sm font-bold">{s.tenants_above_street}</span>
              <ArrowUpRight size={14} className="text-emerald-500" />
              <span className="text-sm font-bold text-[var(--color-body-text)]">{s.tenants_at_street}</span>
              <Minus size={14} className="text-[var(--color-body-text)]" />
              <span className="text-red-500 text-sm font-bold">{s.tenants_below_street}</span>
              <ArrowDownRight size={14} className="text-red-500" />
            </div>
            <p className="text-xs text-[var(--color-mid-gray)]">{s.total_tenants_rated} rated</p>
          </div>
        </div>
      </div>

      {/* ═══ UNIT MIX TABLE ═══ */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <SectionHeader
          icon={<BarChart3 size={18} className="text-emerald-500" />}
          title="Unit Mix Intelligence"
          subtitle={`${units.length} unit types \u00b7 ${units.reduce((sum, u) => sum + u.total_count, 0)} total units`}
          expanded={expandedSection === 'overview'}
          onToggle={() => toggle('overview')}
        />
        {expandedSection === 'overview' && (
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

      {/* ═══ LOST REVENUE ═══ */}
      {(() => {
        const vacantUnits = units.filter(u => u.vacant_count > 0).sort((a, b) => b.vacant_lost_monthly - a.vacant_lost_monthly)
        if (vacantUnits.length === 0) return null
        const maxLost = Math.max(...vacantUnits.map(u => u.vacant_lost_monthly), 1)
        return (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <SectionHeader
              icon={<PiggyBank size={18} className="text-red-500" />}
              title="Lost Revenue Calculator"
              subtitle={`${money(s.total_lost_revenue)}/mo lost to vacancy (${money(s.total_lost_revenue * 12)}/yr)`}
              expanded={expandedSection === 'lost'}
              onToggle={() => toggle('lost')}
            />
            {expandedSection === 'lost' && (
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
                          <span className="text-sm font-bold text-red-500">{money(u.vacant_lost_monthly)}/mo</span>
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
                        <p className="text-xl font-bold text-red-500">{money(s.total_lost_revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-mid-gray)]">Annual Impact</p>
                        <p className="text-xl font-bold text-red-500">{money(s.total_lost_revenue * 12)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-mid-gray)]">% of Potential</p>
                        <p className="text-xl font-bold text-[var(--color-dark)]">
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
      })()}

      {/* ═══ ECRI TABLE ═══ */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <SectionHeader
          icon={<TrendingUp size={18} className="text-[var(--color-gold)]" />}
          title="ECRI Recommendations"
          subtitle={ecri_tenants.length > 0 ? `${ecri_tenants.length} tenants eligible \u00b7 +${money(s.ecri_monthly_lift)}/mo potential lift` : 'Import Rent Rates by Tenant report to power ECRI analysis'}
          expanded={expandedSection === 'ecri'}
          onToggle={() => toggle('ecri')}
        />
        {expandedSection === 'ecri' && ecri_tenants.length > 0 && (
          <div className="border-t border-[var(--border-subtle)]">
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg p-3 bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20">
                  <p className="text-xs font-medium text-[var(--color-mid-gray)]">Eligible Tenants</p>
                  <p className="text-xl font-bold text-[var(--color-gold)]">{ecri_tenants.length}</p>
                </div>
                <div className="rounded-lg p-3 bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs font-medium text-[var(--color-mid-gray)]">Monthly Lift</p>
                  <p className="text-xl font-bold text-emerald-500">{money(s.ecri_monthly_lift)}</p>
                </div>
                <div className="rounded-lg p-3 bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs font-medium text-[var(--color-mid-gray)]">Annual Lift</p>
                  <p className="text-xl font-bold text-emerald-500">{money(s.ecri_annual_lift)}</p>
                </div>
                <div className="rounded-lg p-3 bg-[var(--color-light-gray)] border border-[var(--border-subtle)]">
                  <p className="text-xs font-medium text-[var(--color-mid-gray)]">Avg Tenure</p>
                  <p className="text-xl font-bold text-[var(--color-dark)]">
                    {Math.round(ecri_tenants.reduce((sum, t) => sum + (t.days_as_tenant || 0), 0) / ecri_tenants.length / 30)}mo
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
                  {[...ecri_tenants].sort((a, b) => {
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
                      <td className="px-4 py-2 text-right font-bold text-emerald-500">+${t.ecri_revenue_lift?.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {expandedSection === 'ecri' && ecri_tenants.length === 0 && (
          <div className="border-t border-[var(--border-subtle)] p-6 text-center">
            <Users className="mx-auto mb-2 text-[var(--color-mid-gray)]" size={32} />
            <p className="text-sm text-[var(--color-dark)]">No ECRI data available</p>
            <p className="text-xs mt-1 text-[var(--color-mid-gray)]">Upload a &quot;Rent Rates by Tenant&quot; CSV from storEDGE to see tenant-level rate analysis</p>
          </div>
        )}
      </div>

      {/* ═══ RATE VARIANCE HEATMAP ═══ */}
      {(rate_distribution.below.length > 0 || rate_distribution.above.length > 0) && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <SectionHeader
            icon={<TrendingUp size={18} className="text-amber-500" />}
            title="Rate Variance Heatmap"
            subtitle={`${rate_distribution.below.length} below street \u00b7 ${rate_distribution.above.length} above street${s.total_tenants_rated > 0 ? ` \u00b7 ${s.tenants_at_street} at street` : ''}`}
            expanded={expandedSection === 'rates'}
            onToggle={() => toggle('rates')}
          />
          {expandedSection === 'rates' && (
            <div className="border-t border-[var(--border-subtle)] p-4">
              {/* Distribution bar */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-[var(--color-mid-gray)]">Rate Distribution</span>
                </div>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  {rate_distribution.below.length > 0 && (
                    <div className="bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-center" style={{ width: `${(rate_distribution.below.length / s.total_tenants_rated) * 100}%` }}>
                      <span className="text-xs font-bold text-white">{rate_distribution.below.length}</span>
                    </div>
                  )}
                  {s.tenants_at_street > 0 && (
                    <div className="bg-[var(--color-light-gray)] flex items-center justify-center" style={{ width: `${(s.tenants_at_street / s.total_tenants_rated) * 100}%` }}>
                      <span className="text-xs font-bold text-[var(--color-body-text)]">{s.tenants_at_street}</span>
                    </div>
                  )}
                  {rate_distribution.above.length > 0 && (
                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center" style={{ width: `${(rate_distribution.above.length / s.total_tenants_rated) * 100}%` }}>
                      <span className="text-xs font-bold text-white">{rate_distribution.above.length}</span>
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
              {rate_distribution.below.length > 0 && (() => {
                const entries = [...rate_distribution.below].sort((a, b) => a.variance - b.variance).slice(0, 15)
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
              {rate_distribution.above.length > 0 && (() => {
                const entries = [...rate_distribution.above].sort((a, b) => b.variance - a.variance).slice(0, 10)
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
      )}

      {/* ═══ REVENUE TREND ═══ */}
      {revenue_history.length > 0 && (() => {
        const maxRevenue = Math.max(...revenue_history.map(r => r.revenue || 0), 1)
        return (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <SectionHeader
              icon={<TrendingUp size={18} className="text-indigo-500" />}
              title="Revenue Trend"
              subtitle={`${revenue_history.length} months of history`}
              expanded={expandedSection === 'trend'}
              onToggle={() => toggle('trend')}
            />
            {expandedSection === 'trend' && (
              <div className="border-t border-[var(--border-subtle)] p-4">
                <div className="flex items-end gap-1 h-40 mb-3">
                  {revenue_history.map((m, i) => {
                    const h = maxRevenue > 0 ? (m.revenue / maxRevenue * 100) : 0
                    const isLatest = i === revenue_history.length - 1
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative">
                        <div className="w-full relative">
                          <div
                            className={`w-full rounded-t transition-colors ${isLatest ? 'bg-emerald-500' : 'bg-indigo-500/40 group-hover:bg-indigo-500'}`}
                            style={{ height: `${Math.max(h, 2)}%`, minHeight: '2px' }}
                          />
                        </div>
                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap bg-[var(--color-light-gray)] text-[var(--color-dark)] border border-[var(--border-subtle)]">
                          {m.month.slice(0, 3)} {m.year}: {money(m.revenue)}<br />{'\u2191'}{m.move_ins} {'\u2193'}{m.move_outs}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-1">
                  {revenue_history.map((m, i) => (
                    <div key={i} className="flex-1 text-center">
                      {i % 3 === 0 && <span className="text-[9px] text-[var(--color-mid-gray)]">{m.month.slice(0, 3)} &apos;{String(m.year).slice(2)}</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-lg p-3 bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs font-medium text-[var(--color-mid-gray)]">Total Move-Ins (shown period)</p>
                    <p className="text-lg font-bold text-emerald-500">{revenue_history.reduce((sum, m) => sum + (m.move_ins || 0), 0)}</p>
                  </div>
                  <div className="rounded-lg p-3 bg-red-500/5 border border-red-500/20">
                    <p className="text-xs font-medium text-[var(--color-mid-gray)]">Total Move-Outs (shown period)</p>
                    <p className="text-lg font-bold text-red-500">{revenue_history.reduce((sum, m) => sum + (m.move_outs || 0), 0)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ═══ HEALTH SCORE ═══ */}
      {health && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <SectionHeader
            icon={<Activity size={18} className={health.overall >= 75 ? 'text-emerald-500' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'} />}
            title="Facility Health Score"
            subtitle="Composite score across 5 key dimensions"
            expanded={expandedSection === 'health'}
            onToggle={() => toggle('health')}
            rightContent={
              <div className={`text-2xl font-black ${health.overall >= 75 ? 'text-emerald-500' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {health.overall}
              </div>
            }
          />
          {expandedSection === 'health' && (
            <div className="border-t border-[var(--border-subtle)] p-4 space-y-5">
              {/* Big gauge */}
              <div className="flex justify-center">
                <div className="relative w-48 h-24 overflow-hidden">
                  <svg viewBox="0 0 200 100" className="w-full h-full">
                    <path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke="var(--color-light-gray)" strokeWidth="12" strokeLinecap="round" />
                    <path
                      d="M 20 95 A 80 80 0 0 1 180 95"
                      fill="none"
                      stroke={health.overall >= 75 ? '#10b981' : health.overall >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${health.overall * 2.51} 251`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-end justify-center pb-1">
                    <span className={`text-4xl font-black ${health.overall >= 75 ? 'text-emerald-500' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {health.overall}
                    </span>
                    <span className="text-sm ml-1 mb-1 text-[var(--color-mid-gray)]">/100</span>
                  </div>
                </div>
              </div>

              {/* Component breakdowns */}
              <div className="space-y-3">
                {[
                  { label: 'Physical Occupancy', data: health.occupancy, detail: `${health.occupancy.value.toFixed(1)}% occupied`, icon: <Users size={14} /> },
                  { label: 'Rate Capture', data: health.rate_capture, detail: `${health.rate_capture.value.toFixed(1)}% of potential`, icon: <Target size={14} /> },
                  { label: 'Rate Optimization', data: health.rate_optimization, detail: `${health.rate_optimization.value} ECRI eligible`, icon: <TrendingUp size={14} /> },
                  { label: 'Collections Health', data: health.delinquency, detail: money(health.delinquency.value) + ' outstanding', icon: <ShieldAlert size={14} /> },
                  { label: 'Revenue Trend', data: health.trend, detail: health.trend.value != null ? `${health.trend.value > 0 ? '+' : ''}${health.trend.value}% MoM` : 'No history', icon: <TrendingUp size={14} /> },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={item.data.score >= 75 ? 'text-emerald-500' : item.data.score >= 50 ? 'text-amber-500' : 'text-red-500'}>{item.icon}</span>
                        <span className="text-sm font-medium text-[var(--color-dark)]">{item.label}</span>
                        <span className="text-xs text-[var(--color-mid-gray)]">({item.data.weight}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--color-mid-gray)]">{item.detail}</span>
                        <span className={`text-sm font-bold ${item.data.score >= 75 ? 'text-emerald-500' : item.data.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                          {item.data.score}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--color-light-gray)]">
                      <div
                        className={`h-2 rounded-full transition-all ${item.data.score >= 75 ? 'bg-emerald-500' : item.data.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${item.data.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ WATERFALL ═══ */}
      {waterfall && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <SectionHeader
            icon={<Droplets size={18} className="text-cyan-500" />}
            title="Revenue Waterfall"
            subtitle="Where your potential revenue goes"
            expanded={expandedSection === 'waterfall'}
            onToggle={() => toggle('waterfall')}
          />
          {expandedSection === 'waterfall' && (
            <div className="border-t border-[var(--border-subtle)] p-4">
              {(() => {
                const maxVal = waterfall.gross_potential || 1
                const steps = [
                  { label: 'Gross Potential', value: waterfall.gross_potential, color: 'bg-[var(--color-gold)]', type: 'total' as const },
                  { label: 'Vacancy Loss', value: -waterfall.vacancy_loss, color: 'bg-red-400', type: 'loss' as const },
                  { label: 'Rate Gap (Below Street)', value: -waterfall.rate_gap_loss, color: 'bg-amber-400', type: 'loss' as const },
                  { label: 'Delinquency', value: -waterfall.delinquency_loss, color: 'bg-orange-400', type: 'loss' as const },
                  { label: 'Actual Collected', value: waterfall.actual_collected, color: 'bg-emerald-500', type: 'total' as const },
                ]
                let running = waterfall.gross_potential
                return (
                  <div className="space-y-3">
                    {steps.map((step, i) => {
                      const barWidth = Math.abs(step.value) / maxVal * 100
                      const isLoss = step.type === 'loss'
                      const offset = isLoss ? ((running + step.value) / maxVal * 100) : 0
                      if (isLoss) running += step.value
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[var(--color-dark)]">{step.label}</span>
                            <span className={`text-sm font-bold ${isLoss ? 'text-red-500' : i === steps.length - 1 ? 'text-emerald-500' : 'text-[var(--color-dark)]'}`}>
                              {isLoss ? '-' : ''}{money(Math.abs(step.value))}
                            </span>
                          </div>
                          <div className="w-full h-6 rounded bg-[var(--color-light-gray)] relative">
                            <div
                              className={`h-6 rounded ${step.color} transition-all`}
                              style={{ width: `${barWidth}%`, marginLeft: isLoss ? `${offset}%` : '0' }}
                            />
                          </div>
                        </div>
                      )
                    })}
                    <div className="rounded-lg p-3 mt-2 bg-[var(--color-light-gray)] border border-[var(--border-subtle)]">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-[var(--color-mid-gray)]">Total Leakage</p>
                          <p className="text-lg font-bold text-red-500">
                            {money(waterfall.vacancy_loss + waterfall.rate_gap_loss + waterfall.delinquency_loss)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--color-mid-gray)]">Leakage Rate</p>
                          <p className="text-lg font-bold text-[var(--color-dark)]">
                            {waterfall.gross_potential > 0
                              ? ((waterfall.vacancy_loss + waterfall.rate_gap_loss + waterfall.delinquency_loss) / waterfall.gross_potential * 100).toFixed(1)
                              : 0}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--color-mid-gray)]">Collection Rate</p>
                          <p className="text-lg font-bold text-emerald-500">
                            {waterfall.gross_potential > 0 ? (waterfall.actual_collected / waterfall.gross_potential * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ═══ SCENARIO MODELER ═══ */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <SectionHeader
          icon={<SlidersHorizontal size={18} className="text-violet-500" />}
          title="Revenue Scenario Modeler"
          subtitle="What-if analysis \u2014 model revenue impact of actions"
          expanded={expandedSection === 'scenario'}
          onToggle={() => toggle('scenario')}
        />
        {expandedSection === 'scenario' && (
          <div className="border-t border-[var(--border-subtle)] p-4 space-y-5">
            {(() => {
              const totalVacant = units.reduce((sum, u) => sum + u.vacant_count, 0)
              const avgStreetRate = units.reduce((sum, u) => sum + (u.street_rate || 0) * u.vacant_count, 0) / (totalVacant || 1)
              const vacancyRecovery = Math.round(totalVacant * (scenVacancyFill / 100)) * avgStreetRate
              const rateIncreaseGain = s.total_actual_revenue * (scenRateIncrease / 100)
              const ecriRecovery = s.ecri_monthly_lift * (scenEcriApply / 100)
              const totalScenarioGain = vacancyRecovery + rateIncreaseGain + ecriRecovery
              const projectedMRR = s.total_actual_revenue + totalScenarioGain

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-[var(--color-dark)]">Fill Vacancies</label>
                        <span className="text-sm font-bold text-emerald-500">{scenVacancyFill}%</span>
                      </div>
                      <input type="range" min={0} max={100} step={5} value={scenVacancyFill} onChange={e => setScenVacancyFill(Number(e.target.value))} className="w-full accent-emerald-500" />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-[var(--color-mid-gray)]">{Math.round(totalVacant * scenVacancyFill / 100)} of {totalVacant} units</span>
                        <span className="text-xs text-emerald-500">+{money(vacancyRecovery)}/mo</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-[var(--color-dark)]">Rate Increase</label>
                        <span className="text-sm font-bold text-[var(--color-gold)]">{scenRateIncrease}%</span>
                      </div>
                      <input type="range" min={0} max={15} step={1} value={scenRateIncrease} onChange={e => setScenRateIncrease(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-[var(--color-mid-gray)]">Across all occupied units</span>
                        <span className="text-xs text-[var(--color-gold)]">+{money(rateIncreaseGain)}/mo</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-[var(--color-dark)]">Apply ECRI</label>
                        <span className="text-sm font-bold text-violet-500">{scenEcriApply}%</span>
                      </div>
                      <input type="range" min={0} max={100} step={10} value={scenEcriApply} onChange={e => setScenEcriApply(Number(e.target.value))} className="w-full accent-violet-500" />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-[var(--color-mid-gray)]">{Math.round(s.ecri_eligible_count * scenEcriApply / 100)} of {s.ecri_eligible_count} tenants</span>
                        <span className="text-xs text-violet-500">+{money(ecriRecovery)}/mo</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl p-5 bg-gradient-to-r from-emerald-500/5 to-[var(--color-gold)]/5 border border-emerald-500/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-xs font-medium text-[var(--color-mid-gray)]">Current MRR</p>
                        <p className="text-xl font-bold text-[var(--color-dark)]">{money(s.total_actual_revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-mid-gray)]">Scenario Gain</p>
                        <p className="text-xl font-bold text-emerald-500">+{money(totalScenarioGain)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-mid-gray)]">Projected MRR</p>
                        <p className="text-xl font-bold text-[var(--color-gold)]">{money(projectedMRR)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-mid-gray)]">Annual Impact</p>
                        <p className="text-xl font-bold text-violet-500">+{money(totalScenarioGain * 12)}/yr</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[var(--color-mid-gray)]">Revenue Position</span>
                      </div>
                      <div className="w-full h-8 rounded-lg overflow-hidden flex bg-[var(--color-light-gray)]">
                        <div
                          className="h-8 bg-emerald-500 flex items-center justify-center transition-all"
                          style={{ width: `${s.total_gross_potential > 0 ? (s.total_actual_revenue / s.total_gross_potential * 100) : 0}%` }}
                        >
                          <span className="text-xs font-bold text-white">Current</span>
                        </div>
                        {totalScenarioGain > 0 && (
                          <div
                            className="h-8 bg-[var(--color-gold)] flex items-center justify-center transition-all"
                            style={{ width: `${s.total_gross_potential > 0 ? (totalScenarioGain / s.total_gross_potential * 100) : 0}%` }}
                          >
                            <span className="text-xs font-bold text-white">+Scenario</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-[var(--color-mid-gray)]">{money(0)}</span>
                        <span className="text-xs text-[var(--color-mid-gray)]">Gross Potential: {money(s.total_gross_potential)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>

      {/* ═══ SQFT ANALYSIS ═══ */}
      {sqft_analysis.length > 0 && (() => {
        const sorted = [...sqft_analysis].sort((a, b) => b.actual_per_sqft - a.actual_per_sqft)
        const maxPerSqft = Math.max(...sorted.map(s => s.actual_per_sqft), 1)
        return (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <SectionHeader
              icon={<Maximize2 size={18} className="text-orange-500" />}
              title="Revenue per Square Foot"
              subtitle="Which unit types generate the most revenue per sqft"
              expanded={expandedSection === 'sqft'}
              onToggle={() => toggle('sqft')}
            />
            {expandedSection === 'sqft' && (
              <div className="border-t border-[var(--border-subtle)] p-4">
                <div className="space-y-3">
                  {sorted.map((u, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--color-dark)]">{u.unit_type}</span>
                          <span className="text-xs text-[var(--color-mid-gray)]">{u.sqft} sqft</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs text-[var(--color-mid-gray)]">Street: </span>
                            <span className="text-xs font-mono text-[var(--color-mid-gray)]">${u.street_per_sqft.toFixed(2)}/sf</span>
                          </div>
                          <span className={`text-sm font-bold ${u.actual_per_sqft >= u.street_per_sqft ? 'text-emerald-500' : 'text-amber-500'}`}>
                            ${u.actual_per_sqft.toFixed(2)}/sf
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-5 rounded bg-[var(--color-light-gray)] relative overflow-hidden">
                        <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-mid-gray)] z-10" style={{ left: `${(u.street_per_sqft / maxPerSqft * 100)}%` }} />
                        <div
                          className={`h-5 rounded transition-all ${i === 0 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : u.actual_per_sqft >= u.street_per_sqft ? 'bg-emerald-400' : 'bg-amber-400'}`}
                          style={{ width: `${(u.actual_per_sqft / maxPerSqft * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-[var(--color-mid-gray)]">Above street $/sf</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400" /><span className="text-xs text-[var(--color-mid-gray)]">Below street $/sf</span></div>
                    <div className="flex items-center gap-1"><div className="w-0.5 h-3 bg-[var(--color-mid-gray)]" /><span className="text-xs text-[var(--color-mid-gray)]">Street rate line</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ═══ SEASONAL PATTERNS ═══ */}
      {seasonal_pattern.length > 0 && seasonal_pattern.some(p => p.avg_move_ins > 0) && (() => {
        const maxActivity = Math.max(...seasonal_pattern.map(p => Math.max(p.avg_move_ins, p.avg_move_outs)), 1)
        const seasonIcons: Record<string, React.ReactNode> = {
          Jan: <Snowflake size={10} />, Feb: <Snowflake size={10} />, Mar: <Flower2 size={10} />,
          Apr: <Flower2 size={10} />, May: <Flower2 size={10} />, Jun: <Sun size={10} />,
          Jul: <Sun size={10} />, Aug: <Sun size={10} />, Sep: <Leaf size={10} />,
          Oct: <Leaf size={10} />, Nov: <Snowflake size={10} />, Dec: <Snowflake size={10} />,
        }
        const peakMonth = seasonal_pattern.reduce((best, m) => m.avg_move_ins > best.avg_move_ins ? m : best)
        const troughMonth = seasonal_pattern.reduce((best, m) => m.avg_move_ins < best.avg_move_ins && m.avg_move_ins > 0 ? m : best, seasonal_pattern[0])
        const worstNetMonth = seasonal_pattern.reduce((best, m) => (m.avg_move_ins - m.avg_move_outs) < (best.avg_move_ins - best.avg_move_outs) ? m : best)

        return (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <SectionHeader
              icon={<Sun size={18} className="text-yellow-500" />}
              title="Seasonal Patterns"
              subtitle="Average move-in/out activity by month (multi-year)"
              expanded={expandedSection === 'seasonal'}
              onToggle={() => toggle('seasonal')}
            />
            {expandedSection === 'seasonal' && (
              <div className="border-t border-[var(--border-subtle)] p-4">
                <div className="space-y-4">
                  <div className="flex items-end gap-1 h-36">
                    {seasonal_pattern.map((m, i) => {
                      const inH = (m.avg_move_ins / maxActivity * 100)
                      const outH = (m.avg_move_outs / maxActivity * 100)
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative">
                          <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100%' }}>
                            <div className="w-[45%] rounded-t bg-emerald-500 transition-all" style={{ height: `${Math.max(inH, 3)}%` }} />
                            <div className="w-[45%] rounded-t bg-red-400 transition-all" style={{ height: `${Math.max(outH, 3)}%` }} />
                          </div>
                          <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap bg-[var(--color-light-gray)] text-[var(--color-dark)] border border-[var(--border-subtle)]">
                            {m.month}: {'\u2191'}{m.avg_move_ins.toFixed(1)} {'\u2193'}{m.avg_move_outs.toFixed(1)} (net {(m.avg_move_ins - m.avg_move_outs) >= 0 ? '+' : ''}{(m.avg_move_ins - m.avg_move_outs).toFixed(1)})<br />Avg Rev: {money(m.avg_revenue)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-1">
                    {seasonal_pattern.map((m, i) => (
                      <div key={i} className="flex-1 text-center">
                        <span className={`text-[10px] flex flex-col items-center gap-0.5 ${(m.avg_move_ins - m.avg_move_outs) > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                          {seasonIcons[m.month]}{m.month}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500" /><span className="text-xs text-[var(--color-mid-gray)]">Avg Move-Ins</span></div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-400" /><span className="text-xs text-[var(--color-mid-gray)]">Avg Move-Outs</span></div>
                    </div>
                    <span className="text-xs text-[var(--color-mid-gray)]">Based on {seasonal_pattern[0]?.years_of_data || 0} year(s) of data</span>
                  </div>
                  <div className="rounded-lg p-3 bg-yellow-500/5 border border-yellow-500/20">
                    <p className="text-xs text-[var(--color-dark)]">
                      <span className="font-semibold">Insight:</span>{' '}
                      Peak move-in month is <span className="font-bold text-emerald-500">{peakMonth.month}</span> ({peakMonth.avg_move_ins.toFixed(1)} avg).
                      Slowest is <span className="font-bold text-amber-500">{troughMonth.month}</span> ({troughMonth.avg_move_ins.toFixed(1)} avg).
                      Worst net absorption is <span className="font-bold text-red-500">{worstNetMonth.month}</span> (net {(worstNetMonth.avg_move_ins - worstNetMonth.avg_move_outs).toFixed(1)}).
                      <span className="font-semibold"> Ramp ad spend in {seasonal_pattern.filter(m => m.avg_move_ins >= peakMonth.avg_move_ins * 0.8).map(m => m.month).join(', ')}.</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ═══ DELINQUENCY DASHBOARD ═══ */}
      {aging && parseFloat(String(aging.total_outstanding || 0)) > 0 && (() => {
        const total = parseFloat(String(aging.total_outstanding || 0))
        const buckets = [
          { label: '0\u201330 days', value: parseFloat(String(aging.total_0_30 || 0)), color: 'bg-yellow-400', recovery: 0.95 },
          { label: '31\u201360 days', value: parseFloat(String(aging.total_31_60 || 0)), color: 'bg-orange-400', recovery: 0.75 },
          { label: '61\u201390 days', value: parseFloat(String(aging.total_61_90 || 0)), color: 'bg-orange-600', recovery: 0.50 },
          { label: '91\u2013120 days', value: parseFloat(String(aging.total_91_120 || 0)), color: 'bg-red-500', recovery: 0.25 },
          { label: '120+ days', value: parseFloat(String(aging.total_120_plus || 0)), color: 'bg-red-700', recovery: 0.05 },
        ]
        const maxBucket = Math.max(...buckets.map(b => b.value), 1)
        const expectedRecovery = buckets.reduce((sum, b) => sum + b.value * b.recovery, 0)
        const projectedWriteOff = total - expectedRecovery

        return (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <SectionHeader
              icon={<ShieldAlert size={18} className="text-orange-500" />}
              title="Delinquency Risk Dashboard"
              subtitle={`${money(total)} outstanding across ${aging.delinquent_count} accounts`}
              expanded={expandedSection === 'delinquency'}
              onToggle={() => toggle('delinquency')}
            />
            {expandedSection === 'delinquency' && (
              <div className="border-t border-[var(--border-subtle)] p-4 space-y-4">
                <div className="grid grid-cols-5 gap-2">
                  {buckets.map((b, i) => (
                    <div key={i} className="rounded-lg p-3 text-center border border-[var(--border-subtle)]">
                      <div className="w-full h-16 rounded flex items-end justify-center bg-[var(--color-light-gray)]">
                        <div className={`w-3/4 rounded-t ${b.color} transition-all`} style={{ height: `${(b.value / maxBucket * 100)}%`, minHeight: b.value > 0 ? '4px' : '0' }} />
                      </div>
                      <p className="text-xs font-medium mt-2 text-[var(--color-dark)]">{b.label}</p>
                      <p className={`text-sm font-bold ${b.value > 0 ? 'text-red-500' : 'text-[var(--color-mid-gray)]'}`}>{money(b.value)}</p>
                      <p className="text-[10px] text-[var(--color-mid-gray)]">{(b.recovery * 100).toFixed(0)}% recovery</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg p-3 text-center bg-red-500/5 border border-red-500/20">
                    <p className="text-xs font-medium text-[var(--color-mid-gray)]">Total Outstanding</p>
                    <p className="text-lg font-bold text-red-500">{money(total)}</p>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs font-medium text-[var(--color-mid-gray)]">Expected Recovery</p>
                    <p className="text-lg font-bold text-emerald-500">{money(expectedRecovery)}</p>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-[var(--color-light-gray)] border border-[var(--border-subtle)]">
                    <p className="text-xs font-medium text-[var(--color-mid-gray)]">Projected Write-Off</p>
                    <p className="text-lg font-bold text-[var(--color-dark)]">{money(projectedWriteOff)}</p>
                  </div>
                </div>
                <div className="rounded-lg p-3 bg-orange-500/5 border border-orange-500/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-orange-500" />
                    <p className="text-xs text-[var(--color-dark)]">
                      <span className="font-semibold">Delinquency Rate:</span>{' '}
                      {s.total_actual_revenue > 0 ? (total / s.total_actual_revenue * 100).toFixed(1) : 0}% of MRR
                      {aging.moved_out_count > 0 && (
                        <> &middot; {aging.moved_out_count} delinquent accounts already moved out (likely write-off: {money(parseFloat(String(aging.total_120_plus || 0)))})</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
