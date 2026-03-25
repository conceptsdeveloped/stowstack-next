'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, AlertCircle, ChevronDown, ChevronUp, BarChart3,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Zap, Eye, Layers, DollarSign, Users, ShieldAlert,
  ArrowRight, Info, XCircle, Building2,
} from 'lucide-react'

/* ── Types ── */

interface FacilityLevel {
  total_units: number
  occupied_units: number
  vacant_units: number
  physical_occ_pct: number
  economic_occ_pct: number
  occupancy_gap: number
  gross_potential: number
  actual_revenue: number
  total_sqft: number
  occupied_sqft: number
  sqft_occ_pct: number
  sqft_econ_occ_pct: number
}

interface GapDecomposition {
  vacancy_loss: number
  vacancy_drag_pct: number
  rate_gap_loss: number
  rate_gap_drag_pct: number
  discount_drag: number
  discount_drag_pct: number
  delinquency_drag: number
  delinquency_drag_pct: number
  total_drag: number
}

interface AgingBuckets {
  current: number
  days_31_60: number
  days_61_90: number
  days_91_120: number
  days_120_plus: number
  total: number
  count: number
}

interface UnitOccupancy {
  unit_type: string
  size_label: string
  sqft: number
  total_count: number
  occupied_count: number
  vacant_count: number
  street_rate: number
  actual_avg_rate: number
  physical_occ_pct: number
  economic_occ_pct: number
  gap: number
  gap_signal: 'aligned' | 'mild' | 'moderate' | 'severe'
  gross_potential: number
  actual_revenue: number
  vacancy_cost_monthly: number
  rate_gap_monthly: number
  total_sqft: number
  occupied_sqft: number
  revenue_per_sqft: number
  potential_per_sqft: number
}

interface OccupancyTrendEntry {
  year: number
  month: string
  month_short: string
  revenue: number
  move_ins: number
  move_outs: number
  net_movement: number
}

interface DiscountedTenant {
  unit: string
  tenant: string
  unit_type: string
  standard_rate: number
  actual_rate: number
  discount: number
  discount_desc: string
  days_as_tenant: number
}

interface DelinquentTenant {
  unit: string
  tenant: string
  size: string
  rent_rate: number
  total_due: number
  days_past_due: number
  paid_thru: string
  risk_level: 'low' | 'moderate' | 'high' | 'critical'
}

interface BelowStreetBand {
  count: number
  loss: number
}

interface Insight {
  type: 'success' | 'warning' | 'critical' | 'opportunity' | 'info'
  title: string
  detail: string
}

interface OccData {
  facility_level: FacilityLevel
  gap_decomposition: GapDecomposition
  aging_buckets: AgingBuckets
  unit_occupancy: UnitOccupancy[]
  occupancy_trend: OccupancyTrendEntry[]
  snapshot_trend: unknown[]
  discounted_tenants: DiscountedTenant[]
  below_street_bands: { slight: BelowStreetBand; moderate: BelowStreetBand; severe: BelowStreetBand }
  delinquent_tenants: DelinquentTenant[]
  insights: Insight[]
}

/* ── Helpers ── */

function money(val: number | null | undefined) {
  if (val == null) return '--'
  return '$' + Math.round(val).toLocaleString()
}

function pct(val: number | null | undefined) {
  if (val == null) return '--'
  return val.toFixed(1) + '%'
}

const GAP_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  aligned: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Aligned' },
  mild: { bg: 'bg-[var(--color-blue)]/10', text: 'text-[var(--color-blue)]', label: 'Mild Gap' },
  moderate: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Moderate Gap' },
  severe: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Severe Gap' },
}

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-[var(--color-blue)]/10', text: 'text-[var(--color-blue)]' },
  moderate: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400' },
}

const INSIGHT_STYLES: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
  critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/5', border: 'border-red-500/20' },
  opportunity: { icon: Zap, color: 'text-[var(--color-gold)]', bg: 'bg-[var(--color-gold)]/5', border: 'border-[var(--color-gold)]/20' },
  info: { icon: Info, color: 'text-[var(--color-body-text)]', bg: 'bg-[var(--color-light-gray)]', border: 'border-[var(--border-subtle)]' },
}

/* ── Dual Gauge SVG ── */

function DualGauge({ physical, economic, size = 200 }: { physical: number; economic: number; size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 12
  const innerR = size / 2 - 30
  const startAngle = -210
  const endAngle = 30
  const sweep = endAngle - startAngle

  function arcPath(r: number, pctVal: number) {
    const angle = startAngle + (sweep * Math.min(pctVal, 100) / 100)
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (angle * Math.PI) / 180
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const largeArc = (angle - startAngle) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  const gap = physical - economic

  return (
    <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.85}`}>
      <path d={arcPath(outerR, 100)} fill="none" stroke="var(--color-light-gray)" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(innerR, 100)} fill="none" stroke="var(--color-light-gray)" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(outerR, physical)} fill="none" stroke="url(#physGrad)" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(innerR, economic)} fill="none" stroke="url(#econGrad)" strokeWidth="10" strokeLinecap="round" />
      <defs>
        <linearGradient id="physGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="econGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <text x={cx} y={cy - 16} textAnchor="middle" fill="var(--color-mid-gray)" fontSize="10" fontWeight="500">GAP</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={gap > 5 ? '#ef4444' : gap > 2 ? '#f59e0b' : '#10b981'} fontSize="28" fontWeight="700">
        {gap.toFixed(1)}
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fill="var(--color-mid-gray)" fontSize="10">points</text>
    </svg>
  )
}

/* ── Stacked Bar ── */

function StackedBar({ segments, height = 28 }: { segments: { value: number; color: string; label: string }[]; height?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null
  return (
    <div className="w-full flex rounded-full overflow-hidden" style={{ height }}>
      {segments.filter(s => s.value > 0).map((seg, i) => (
        <div
          key={i}
          className={`${seg.color} relative group`}
          style={{ width: `${(seg.value / total) * 100}%`, minWidth: seg.value > 0 ? '2px' : 0 }}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-bold text-white drop-shadow-sm whitespace-nowrap">
              {seg.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Section Header ── */

function SectionHeader({ icon, title, subtitle, expanded, onToggle }: {
  icon: React.ReactNode; title: string; subtitle: string
  expanded: boolean; onToggle: () => void
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
      {expanded ? <ChevronUp size={18} className="text-[var(--color-mid-gray)]" /> : <ChevronDown size={18} className="text-[var(--color-mid-gray)]" />}
    </button>
  )
}

/* ── Main Component ── */

export default function OccupancyIntelligence({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [data, setData] = useState<OccData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('overview')

  const toggle = (section: string) => setExpandedSection(expandedSection === section ? null : section)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/occupancy-intelligence?facilityId=${facilityId}`, {
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
        <p className="text-[var(--color-body-text)]">Loading occupancy intelligence...</p>
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

  if (!data || data.unit_occupancy.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
        <Building2 className="mx-auto mb-3 text-[var(--color-mid-gray)]" size={40} />
        <h3 className="text-lg font-semibold text-[var(--color-dark)]">No PMS Data Yet</h3>
        <p className="text-sm mt-1 text-[var(--color-body-text)]">
          Import a storEDGE Consolidated Occupancy report in the PMS Data tab to power occupancy intelligence.
        </p>
      </div>
    )
  }

  const {
    facility_level: fl,
    gap_decomposition: gd,
    aging_buckets: ab,
    unit_occupancy: unitOcc,
    occupancy_trend: trend,
    discounted_tenants: discTenants,
    below_street_bands: bands,
    delinquent_tenants: delTenants,
    insights,
  } = data

  const maxTrend = Math.max(...trend.map(t => t.revenue || 0), 1)

  return (
    <div className="space-y-4">
      {/* ═══ HERO: Physical vs Economic Gauges ═══ */}
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
              <p className="text-xl font-bold text-[var(--color-dark)]">{fl.total_units}</p>
              <p className="text-xs text-[var(--color-mid-gray)]">{fl.occupied_units} occupied</p>
            </div>
            <div className="rounded-lg p-3 bg-[var(--color-light-gray)]">
              <p className="text-xs font-medium text-[var(--color-mid-gray)]">Vacant</p>
              <p className="text-xl font-bold text-red-500">{fl.vacant_units}</p>
              <p className="text-xs text-[var(--color-mid-gray)]">{money(gd.vacancy_loss)}/mo lost</p>
            </div>
            <div className="rounded-lg p-3 bg-[var(--color-light-gray)]">
              <p className="text-xs font-medium text-[var(--color-mid-gray)]">Gross Potential</p>
              <p className="text-xl font-bold text-[var(--color-dark)]">{money(fl.gross_potential)}</p>
              <p className="text-xs text-[var(--color-mid-gray)]">at street rates</p>
            </div>
            <div className="rounded-lg p-3 bg-[var(--color-light-gray)]">
              <p className="text-xs font-medium text-[var(--color-mid-gray)]">Actual MRR</p>
              <p className="text-xl font-bold text-emerald-500">{money(fl.actual_revenue)}</p>
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
                  <span className="text-xs font-bold text-[var(--color-dark)]">{pct(bar.value)}</span>
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

      {/* ═══ AUTO-INSIGHTS ═══ */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <SectionHeader
            icon={<Eye size={18} className="text-indigo-500" />}
            title="Occupancy Insights"
            subtitle={`${insights.length} insight${insights.length !== 1 ? 's' : ''} generated from your data`}
            expanded={expandedSection === 'insights'}
            onToggle={() => toggle('insights')}
          />
          {expandedSection === 'insights' && (
            <div className="border-t border-[var(--border-subtle)] p-4 space-y-3">
              {insights.map((ins, i) => {
                const style = INSIGHT_STYLES[ins.type] || INSIGHT_STYLES.info
                const Icon = style.icon
                return (
                  <div key={i} className={`rounded-lg p-4 border ${style.bg} ${style.border}`}>
                    <div className="flex items-start gap-3">
                      <Icon size={18} className={`${style.color} mt-0.5 shrink-0`} />
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-dark)]">{ins.title}</p>
                        <p className="text-xs mt-1 text-[var(--color-body-text)]">{ins.detail}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ GAP DECOMPOSITION ═══ */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <SectionHeader
          icon={<Layers size={18} className="text-amber-500" />}
          title="Gap Decomposition"
          subtitle={`${money(gd.total_drag)}/mo total revenue drag \u2014 why economic trails physical by ${fl.occupancy_gap}pts`}
          expanded={expandedSection === 'gap'}
          onToggle={() => toggle('gap')}
        />
        {expandedSection === 'gap' && (
          <div className="border-t border-[var(--border-subtle)] p-4 space-y-5">
            {/* Visual waterfall */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)] mb-3">Revenue Drag Breakdown</p>
              <StackedBar
                height={36}
                segments={[
                  { value: gd.vacancy_loss, color: 'bg-red-500', label: `Vacancy ${money(gd.vacancy_loss)}` },
                  { value: gd.rate_gap_loss, color: 'bg-amber-500', label: `Rate Gap ${money(gd.rate_gap_loss)}` },
                  { value: gd.discount_drag, color: 'bg-orange-400', label: `Discounts ${money(gd.discount_drag)}` },
                  { value: gd.delinquency_drag, color: 'bg-purple-500', label: `Delinquency ${money(gd.delinquency_drag)}` },
                ]}
              />
            </div>

            {/* Detailed cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg p-4 border border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={16} className="text-red-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-red-400">Vacancy</span>
                </div>
                <p className="text-2xl font-bold text-red-500">{money(gd.vacancy_loss)}</p>
                <p className="text-xs text-[var(--color-mid-gray)]">/mo &middot; {pct(gd.vacancy_drag_pct)} of potential</p>
                <p className="text-xs mt-2 text-[var(--color-mid-gray)]">{fl.vacant_units} empty units at street rate</p>
              </div>

              <div className="rounded-lg p-4 border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">Rate Gap</span>
                </div>
                <p className="text-2xl font-bold text-amber-500">{money(gd.rate_gap_loss)}</p>
                <p className="text-xs text-[var(--color-mid-gray)]">/mo &middot; {pct(gd.rate_gap_drag_pct)} of potential</p>
                <p className="text-xs mt-2 text-[var(--color-mid-gray)]">
                  {bands.severe.count > 0 && <span className="text-red-500 font-medium">{bands.severe.count} severe</span>}
                  {bands.severe.count > 0 && bands.moderate.count > 0 && ' \u00b7 '}
                  {bands.moderate.count > 0 && <span className="text-amber-500 font-medium">{bands.moderate.count} moderate</span>}
                  {(bands.severe.count > 0 || bands.moderate.count > 0) && bands.slight.count > 0 && ' \u00b7 '}
                  {bands.slight.count > 0 && <span>{bands.slight.count} slight</span>}
                  {bands.severe.count === 0 && bands.moderate.count === 0 && bands.slight.count === 0 && 'No below-street tenants'}
                </p>
              </div>

              <div className="rounded-lg p-4 border border-orange-500/20 bg-orange-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-orange-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-orange-400">Discounts</span>
                </div>
                <p className="text-2xl font-bold text-orange-500">{money(gd.discount_drag)}</p>
                <p className="text-xs text-[var(--color-mid-gray)]">/mo &middot; {pct(gd.discount_drag_pct)} of potential</p>
                <p className="text-xs mt-2 text-[var(--color-mid-gray)]">{discTenants.length} tenants with active discounts</p>
              </div>

              <div className="rounded-lg p-4 border border-purple-500/20 bg-purple-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert size={16} className="text-purple-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-purple-400">Delinquency</span>
                </div>
                <p className="text-2xl font-bold text-purple-500">{money(gd.delinquency_drag)}</p>
                <p className="text-xs text-[var(--color-mid-gray)]">/mo &middot; {pct(gd.delinquency_drag_pct)} of potential</p>
                <p className="text-xs mt-2 text-[var(--color-mid-gray)]">{ab.count} delinquent accounts</p>
              </div>
            </div>

            {/* Revenue bridge */}
            <div className="rounded-lg p-4 bg-[var(--color-light-gray)]">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)] mb-3">Revenue Bridge</p>
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="font-bold text-[var(--color-dark)]">{money(fl.gross_potential)}</span>
                <span className="text-[var(--color-mid-gray)]">Potential</span>
                <ArrowRight size={14} className="text-[var(--color-mid-gray)]" />
                <span className="font-bold text-red-500">-{money(gd.vacancy_loss)}</span>
                <span className="text-[var(--color-mid-gray)]">Vacancy</span>
                <ArrowRight size={14} className="text-[var(--color-mid-gray)]" />
                <span className="font-bold text-amber-500">-{money(gd.rate_gap_loss)}</span>
                <span className="text-[var(--color-mid-gray)]">Rate Gap</span>
                <ArrowRight size={14} className="text-[var(--color-mid-gray)]" />
                <span className="font-bold text-orange-500">-{money(gd.discount_drag)}</span>
                <span className="text-[var(--color-mid-gray)]">Discounts</span>
                <ArrowRight size={14} className="text-[var(--color-mid-gray)]" />
                <span className="font-bold text-purple-500">-{money(gd.delinquency_drag)}</span>
                <span className="text-[var(--color-mid-gray)]">Delinquency</span>
                <ArrowRight size={14} className="text-[var(--color-mid-gray)]" />
                <span className="font-bold text-emerald-500">{money(fl.actual_revenue)}</span>
                <span className="text-[var(--color-mid-gray)]">Collected</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ UNIT-TYPE OCCUPANCY HEATMAP ═══ */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <SectionHeader
          icon={<BarChart3 size={18} className="text-emerald-500" />}
          title="Occupancy by Unit Type"
          subtitle="Physical vs economic occupancy per size with gap analysis"
          expanded={expandedSection === 'heatmap'}
          onToggle={() => toggle('heatmap')}
        />
        {expandedSection === 'heatmap' && (
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
                          <span className="text-[10px] font-bold text-[var(--color-dark)]">{pct(u.physical_occ_pct)}</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-[var(--color-light-gray)]">
                          <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min(u.physical_occ_pct, 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[10px] font-medium text-[var(--color-mid-gray)]">Economic</span>
                          <span className="text-[10px] font-bold text-[var(--color-dark)]">{pct(u.economic_occ_pct)}</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-[var(--color-light-gray)]">
                          <div className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400" style={{ width: `${Math.min(u.economic_occ_pct, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-dashed border-[var(--border-subtle)]">
                      <div className="text-center">
                        <p className="text-[10px] text-[var(--color-mid-gray)]">Gap</p>
                        <p className={`text-sm font-bold ${gapColor}`}>{u.gap > 0 ? '+' : ''}{u.gap}pt</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-[var(--color-mid-gray)]">Vacancy $</p>
                        <p className="text-sm font-bold text-red-500">{money(u.vacancy_cost_monthly)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-[var(--color-mid-gray)]">Rate Gap $</p>
                        <p className="text-sm font-bold text-amber-500">{money(u.rate_gap_monthly)}</p>
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
                          <span className={`text-sm font-bold ${u.physical_occ_pct >= 85 ? 'text-emerald-500' : u.physical_occ_pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                            {pct(u.physical_occ_pct)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${u.economic_occ_pct >= 85 ? 'text-indigo-500' : u.economic_occ_pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
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
                            ? <span className="text-red-500 font-bold">{money(totalDrag)}</span>
                            : <span className="text-emerald-500 font-medium">$0</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--color-light-gray)] border-t border-[var(--border-medium)]">
                    <td className="px-4 py-3 font-bold text-[var(--color-dark)]">FACILITY</td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-[var(--color-dark)]">{fl.occupied_units}</span>
                      <span className="text-[var(--color-mid-gray)]">/{fl.total_units}</span>
                    </td>
                    <td className="px-3 py-3 text-center"><span className="font-bold text-emerald-500">{pct(fl.physical_occ_pct)}</span></td>
                    <td className="px-3 py-3 text-center"><span className="font-bold text-indigo-500">{pct(fl.economic_occ_pct)}</span></td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-bold ${fl.occupancy_gap > 5 ? 'text-red-500' : fl.occupancy_gap > 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {fl.occupancy_gap > 0 ? '+' : ''}{fl.occupancy_gap}pt
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-[var(--color-dark)]">{money(fl.gross_potential)}</td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-500">{money(fl.actual_revenue)}</td>
                    <td className="px-3 py-3 text-right text-[var(--color-mid-gray)]">--</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">{money(gd.total_drag)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MOVE-IN / MOVE-OUT TREND ═══ */}
      {trend.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <SectionHeader
            icon={<TrendingUp size={18} className="text-[var(--color-gold)]" />}
            title="Occupancy Trend"
            subtitle="Move-in/out activity and revenue trend over time"
            expanded={expandedSection === 'trend'}
            onToggle={() => toggle('trend')}
          />
          {expandedSection === 'trend' && (
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
                            <p className={t.net_movement >= 0 ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
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
                    <span className={trend.reduce((s, t) => s + t.net_movement, 0) >= 0 ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
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
      )}

      {/* ═══ DELINQUENCY IMPACT ═══ */}
      {(delTenants.length > 0 || ab.total > 0) && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <SectionHeader
            icon={<ShieldAlert size={18} className="text-purple-500" />}
            title="Delinquency & Economic Drag"
            subtitle={`${money(ab.total)} outstanding across ${ab.count} accounts \u2014 eroding economic occupancy by ${pct(gd.delinquency_drag_pct)}`}
            expanded={expandedSection === 'delinquency'}
            onToggle={() => toggle('delinquency')}
          />
          {expandedSection === 'delinquency' && (
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
                            <td className={`px-3 py-2 text-center font-bold ${
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
      )}

      {/* ═══ DISCOUNT & CONCESSION ANALYSIS ═══ */}
      {discTenants.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <SectionHeader
            icon={<DollarSign size={18} className="text-orange-500" />}
            title="Active Discounts & Concessions"
            subtitle={`${discTenants.length} tenants with discounts totaling ${money(gd.discount_drag)}/mo drag`}
            expanded={expandedSection === 'discounts'}
            onToggle={() => toggle('discounts')}
          />
          {expandedSection === 'discounts' && (
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
                    <td colSpan={5} className="px-4 py-2.5 font-bold text-[var(--color-dark)]">
                      Total Discount Impact ({discTenants.length} tenants)
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-orange-500 font-bold">
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
      )}

      {/* ═══ BELOW-STREET RATE BANDS ═══ */}
      {(bands.slight.count > 0 || bands.moderate.count > 0 || bands.severe.count > 0) && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <SectionHeader
            icon={<TrendingDown size={18} className="text-red-500" />}
            title="Below-Street Rate Distribution"
            subtitle={`${bands.slight.count + bands.moderate.count + bands.severe.count} tenants paying below street \u2014 ${money(bands.slight.loss + bands.moderate.loss + bands.severe.loss)}/mo gap`}
            expanded={expandedSection === 'bands'}
            onToggle={() => toggle('bands')}
          />
          {expandedSection === 'bands' && (
            <div className="border-t border-[var(--border-subtle)] p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg p-4 border border-[var(--color-blue)]/20 bg-[var(--color-blue)]/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-blue)]" />
                    <span className="text-sm font-semibold text-[var(--color-dark)]">Slight ($1-10 below)</span>
                  </div>
                  <p className="text-3xl font-bold text-[var(--color-blue)]">{bands.slight.count}</p>
                  <p className="text-xs text-[var(--color-mid-gray)]">tenants &middot; {money(bands.slight.loss)}/mo</p>
                  <p className="text-xs mt-2 text-[var(--color-mid-gray)]">Low priority \u2014 monitor at next lease renewal</p>
                </div>
                <div className="rounded-lg p-4 border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="text-sm font-semibold text-[var(--color-dark)]">Moderate ($11-30 below)</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-500">{bands.moderate.count}</p>
                  <p className="text-xs text-[var(--color-mid-gray)]">tenants &middot; {money(bands.moderate.loss)}/mo</p>
                  <p className="text-xs mt-2 text-[var(--color-mid-gray)]">ECRI candidates \u2014 phase increases over 2-3 months</p>
                </div>
                <div className="rounded-lg p-4 border border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm font-semibold text-[var(--color-dark)]">Severe ($30+ below)</span>
                  </div>
                  <p className="text-3xl font-bold text-red-500">{bands.severe.count}</p>
                  <p className="text-xs text-[var(--color-mid-gray)]">tenants &middot; {money(bands.severe.loss)}/mo</p>
                  <p className="text-xs mt-2 text-[var(--color-mid-gray)]">Immediate action \u2014 largest revenue recovery opportunity</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
